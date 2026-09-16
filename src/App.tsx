import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Volume2, VolumeX, Sparkles, Trophy, RotateCcw, 
  Lightbulb, ArrowRight, Eye, EyeOff, CheckCircle2, 
  XCircle, Zap, Flame, Award, Grid, AlertCircle, Shuffle
} from 'lucide-react';

// Sound Synthesizer via Web Audio API
class SoundPlayer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Initialized lazily on first user interaction
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playKeySound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  playCorrectSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    });
  }

  playWrongSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.25);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.15, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.38);
    });
  }
}

const soundPlayer = new SoundPlayer();

// Hebrew praise words
const PRAISES = [
  'כל הכבוד!',
  'מעולה!',
  'אלופים!',
  'מדויק להפליא!',
  'פנטסטי!',
  'יופי של פתרון!',
  'מושלם!',
  'תותח/ית!'
];

// Shuffled deck generator for selected multiplication tables
function createShuffledDeck(tables: number[]): Array<{ a: number; b: number }> {
  const activeTables = tables.length > 0 ? tables : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const deck: Array<{ a: number; b: number }> = [];

  for (const t of activeTables) {
    for (let m = 1; m <= 10; m++) {
      // 50% random chance for orientation (e.g. 4 × 7 vs 7 × 4) for rich variety!
      if (Math.random() < 0.5) {
        deck.push({ a: t, b: m });
      } else {
        deck.push({ a: m, b: t });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export default function App() {
  // Tab State: 'board' | 'quiz'
  const [activeTab, setActiveTab] = useState<'board' | 'quiz'>('board');

  // Sound settings
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('multiplication_muted') === 'true';
  });

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundPlayer.setMuted(nextMuted);
    localStorage.setItem('multiplication_muted', String(nextMuted));
  };

  useEffect(() => {
    soundPlayer.setMuted(isMuted);
  }, [isMuted]);

  // ==========================================
  // TAB 1: MULTIPLICATION BOARD STATE
  // ==========================================
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 6, col: 7 });
  const [filterTable, setFilterTable] = useState<number | null>(null); // null = all, 1..10
  const [showSquaresOnly, setShowSquaresOnly] = useState<boolean>(false);
  const [hideValues, setHideValues] = useState<boolean>(false);
  const [revealedCells, setRevealedCells] = useState<Record<string, boolean>>({});

  const handleCellClick = (row: number, col: number) => {
    soundPlayer.playKeySound();
    setSelectedCell({ row, col });
    if (hideValues) {
      const key = `${row}-${col}`;
      setRevealedCells(prev => ({ ...prev, [key]: true }));
    }
  };

  const jumpToQuizWithProblem = (r: number, c: number) => {
    soundPlayer.playKeySound();
    setQuizFactorA(r);
    setQuizFactorB(c);
    setQuizSelectedTables([r]);
    deckRef.current = createShuffledDeck([r]);
    setActiveTab('quiz');
    setUserInput('');
    setFeedback(null);
    setWrongAttempts(0);
  };

  // ==========================================
  // TAB 2: QUIZ & PRACTICE STATE
  // ==========================================
  const [quizMode, setQuizMode] = useState<'practice' | 'timed'>('practice');
  // Multi-select tables: default all (1 to 10)
  const [quizSelectedTables, setQuizSelectedTables] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [quizFactorA, setQuizFactorA] = useState<number>(7);
  const [quizFactorB, setQuizFactorB] = useState<number>(8);
  const [userInput, setUserInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string; isFinal?: boolean } | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [wrongAttempts, setWrongAttempts] = useState<number>(0);

  // Deck of shuffled questions for high variety and zero immediate repetition
  const deckRef = useRef<Array<{ a: number; b: number }>>([]);

  // Statistics
  const [stats, setStats] = useState({
    totalAnswered: 0,
    totalQuestions: 0,
    correctCount: 0,
    currentStreak: 0,
    bestStreak: Number(localStorage.getItem('multiplication_best_streak') || '0'),
  });

  // Timed Mode (60s challenge)
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timedScore, setTimedScore] = useState<number>(0);
  const [timedHighScore, setTimedHighScore] = useState<number>(() => {
    return Number(localStorage.getItem('multiplication_timed_high') || '0');
  });
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);

  // Generate a new multiplication question from shuffled deck
  const generateNewQuestion = useCallback((tablesChoice = quizSelectedTables, prevA?: number, prevB?: number) => {
    const activeTables = tablesChoice.length > 0 ? tablesChoice : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // If deck is empty or depleted, refill and shuffle
    if (deckRef.current.length === 0) {
      deckRef.current = createShuffledDeck(activeTables);
    }

    let nextProblem = deckRef.current.pop();

    // Prevent immediate consecutive duplicate
    if (nextProblem && prevA !== undefined && prevB !== undefined && nextProblem.a === prevA && nextProblem.b === prevB) {
      if (deckRef.current.length > 0) {
        const alt = deckRef.current.pop()!;
        deckRef.current.unshift(nextProblem);
        nextProblem = alt;
      }
    }

    if (!nextProblem) {
      const randTable = activeTables[Math.floor(Math.random() * activeTables.length)];
      const randMultiplier = Math.floor(Math.random() * 10) + 1;
      nextProblem = Math.random() < 0.5 
        ? { a: randTable, b: randMultiplier } 
        : { a: randMultiplier, b: randTable };
    }

    setQuizFactorA(nextProblem.a);
    setQuizFactorB(nextProblem.b);
    setUserInput('');
    setFeedback(null);
    setShowHint(false);
    setWrongAttempts(0);
  }, [quizSelectedTables]);

  // Multi-table toggle and preset handlers
  const toggleTableSelection = (num: number) => {
    soundPlayer.playKeySound();
    let updated: number[];
    if (quizSelectedTables.includes(num)) {
      if (quizSelectedTables.length === 1) {
        // Always keep at least 1 table selected
        return;
      }
      updated = quizSelectedTables.filter(n => n !== num);
    } else {
      updated = [...quizSelectedTables, num].sort((a, b) => a - b);
    }
    setQuizSelectedTables(updated);
    deckRef.current = createShuffledDeck(updated);
    generateNewQuestion(updated);
  };

  const selectAllTables = () => {
    soundPlayer.playKeySound();
    const all = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    setQuizSelectedTables(all);
    deckRef.current = createShuffledDeck(all);
    generateNewQuestion(all);
  };

  const selectEvenTables = () => {
    soundPlayer.playKeySound();
    const even = [2, 4, 6, 8, 10];
    setQuizSelectedTables(even);
    deckRef.current = createShuffledDeck(even);
    generateNewQuestion(even);
  };

  const selectOddTables = () => {
    soundPlayer.playKeySound();
    const odd = [1, 3, 5, 7, 9];
    setQuizSelectedTables(odd);
    deckRef.current = createShuffledDeck(odd);
    generateNewQuestion(odd);
  };

  // Timed challenge countdown effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (quizMode === 'timed' && isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsTimeUp(true);
            soundPlayer.playFanfare();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizMode, isTimerRunning, timeLeft]);

  // Start timed challenge
  const startTimedChallenge = () => {
    soundPlayer.playKeySound();
    setTimeLeft(60);
    setTimedScore(0);
    setIsTimeUp(false);
    setIsTimerRunning(true);
    generateNewQuestion();
  };

  // Check answer handler
  const checkAnswer = () => {
    if (!userInput.trim()) return;

    const parsed = parseInt(userInput, 10);
    const correctAnswer = quizFactorA * quizFactorB;
    const isCorrect = parsed === correctAnswer;

    if (isCorrect) {
      soundPlayer.playCorrectSound();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 }
      });

      const randomPraise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
      setFeedback({
        isCorrect: true,
        isFinal: true,
        message: wrongAttempts > 0 ? 'כל הכבוד! הצלחת לתקן! 🎉' : randomPraise
      });

      // Update stats
      setStats(prev => {
        const nextStreak = wrongAttempts === 0 ? prev.currentStreak + 1 : prev.currentStreak;
        const nextBest = Math.max(prev.bestStreak, nextStreak);
        localStorage.setItem('multiplication_best_streak', String(nextBest));
        if (nextStreak > 0 && nextStreak % 5 === 0) {
          soundPlayer.playFanfare();
        }
        return {
          totalAnswered: prev.totalAnswered + 1,
          totalQuestions: prev.totalQuestions + 1,
          correctCount: prev.correctCount + 1,
          currentStreak: nextStreak,
          bestStreak: nextBest
        };
      });

      // Timed score
      if (quizMode === 'timed' && isTimerRunning) {
        setTimedScore(prev => {
          const nextScore = prev + 1;
          if (nextScore > timedHighScore) {
            setTimedHighScore(nextScore);
            localStorage.setItem('multiplication_timed_high', String(nextScore));
          }
          return nextScore;
        });
      }

      // Auto advance to next question after 1.1s
      setTimeout(() => {
        generateNewQuestion(quizSelectedTables, quizFactorA, quizFactorB);
      }, 1100);

    } else {
      soundPlayer.playWrongSound();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);

      if (quizMode === 'practice') {
        const nextAttempts = wrongAttempts + 1;
        setWrongAttempts(nextAttempts);

        // Reset streak on error
        setStats(prev => ({
          ...prev,
          currentStreak: 0
        }));

        if (nextAttempts > 3) {
          // Wrong more than 3 times: reveal answer!
          setFeedback({
            isCorrect: false,
            isFinal: true,
            message: `לא נורא! התשובה הנכונה היא ${correctAnswer} (${quizFactorA} פעמים ${quizFactorB} זה ${correctAnswer})`
          });
          setStats(prev => ({
            ...prev,
            totalQuestions: prev.totalQuestions + 1
          }));
        } else {
          // 1, 2, or 3 mistakes: DO NOT reveal answer! Give encouraging retry prompt.
          let msg = '';
          if (nextAttempts === 1) {
            msg = `לא מדויק, נסה שוב! 💪 (טעות 1 מתוך 3)`;
          } else if (nextAttempts === 2) {
            msg = `עוד לא... נסה שוב! אפשר ללחוץ על רמז 💡 (טעות 2 מתוך 3)`;
          } else {
            msg = `עדיין לא נכון... ניסיון אחרון בעצמך! 🤔 (טעות 3 מתוך 3)`;
          }
          setFeedback({
            isCorrect: false,
            isFinal: false,
            message: msg
          });
          // Clear user input so student can immediately type next attempt
          setUserInput('');
        }
      } else {
        // Timed mode: reveal immediately
        setFeedback({
          isCorrect: false,
          isFinal: true,
          message: `לא מדויק! ${quizFactorA} × ${quizFactorB} = ${correctAnswer}`
        });

        setStats(prev => ({
          ...prev,
          totalQuestions: prev.totalQuestions + 1,
          currentStreak: 0
        }));
      }
    }
  };

  // Keypad button click
  const handleKeypadPress = (val: string) => {
    soundPlayer.playKeySound();
    if (userInput.length < 3) {
      setUserInput(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    soundPlayer.playKeySound();
    setUserInput(prev => prev.slice(0, -1));
  };

  // Keyboard navigation support
  useEffect(() => {
    if (activeTab !== 'quiz') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (userInput.length < 3) {
          soundPlayer.playKeySound();
          setUserInput(prev => prev + e.key);
        }
      } else if (e.key === 'Backspace') {
        soundPlayer.playKeySound();
        setUserInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (feedback?.isCorrect || feedback?.isFinal) {
          generateNewQuestion();
        } else {
          checkAnswer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, userInput, feedback, generateNewQuestion]);

  const accuracyPercent = stats.totalQuestions > 0
    ? Math.round((stats.totalAnswered / stats.totalQuestions) * 100)
    : 0;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="top-bar">
          <div className="brand-badge">
            <Sparkles size={16} />
            <span>לימוד כפל מהנה וחכם</span>
          </div>

          <button 
            className="sound-toggle-btn"
            onClick={toggleSound}
            title={isMuted ? 'הפעל צלילים' : 'השתק צלילים'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            <span>{isMuted ? 'ללא צליל' : 'צלילים פעילים'}</span>
          </button>
        </div>

        <div className="title-wrap">
          <h1 className="main-title">לוח הכפל ומשחק תרגול</h1>
          <p className="sub-title">תרגול כפל מ-1 עד 10 ללא 0 • עם המחשות ויזואליות ומשוב מיידי בעברית</p>
        </div>

        {/* Tab Switcher */}
        <nav className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => {
              soundPlayer.playKeySound();
              setActiveTab('board');
            }}
          >
            <Grid size={20} />
            <span>לוח הכפל האינטראקטיבי</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => {
              soundPlayer.playKeySound();
              setActiveTab('quiz');
            }}
          >
            <Zap size={20} />
            <span>חידון ותרגול שאלות</span>
          </button>
        </nav>
      </header>

      {/* =========================================================
          TAB 1: INTERACTIVE MULTIPLICATION BOARD
         ========================================================= */}
      {activeTab === 'board' && (
        <section className="board-section">
          {/* Board Toolbar */}
          <div className="board-toolbar">
            <div className="filter-group">
              <span className="filter-label">הדגש לוח:</span>
              <button 
                className={`filter-chip ${filterTable === null ? 'active' : ''}`}
                onClick={() => {
                  soundPlayer.playKeySound();
                  setFilterTable(null);
                }}
              >
                הכל
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <button
                  key={num}
                  className={`filter-chip ${filterTable === num ? 'active' : ''}`}
                  onClick={() => {
                    soundPlayer.playKeySound();
                    setFilterTable(prev => prev === num ? null : num);
                  }}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="tool-actions">
              <button 
                className={`action-btn ${showSquaresOnly ? 'active' : ''}`}
                onClick={() => {
                  soundPlayer.playKeySound();
                  setShowSquaresOnly(prev => !prev);
                }}
              >
                <Award size={16} />
                <span>ריבועים (x²)</span>
              </button>

              <button 
                className={`action-btn ${hideValues ? 'active' : ''}`}
                onClick={() => {
                  soundPlayer.playKeySound();
                  setHideValues(prev => !prev);
                }}
              >
                {hideValues ? <Eye size={16} /> : <EyeOff size={16} />}
                <span>{hideValues ? 'גלה הכל' : 'מצב גילוי (?)'}</span>
              </button>
            </div>
          </div>

          {/* Grid View */}
          <div className="board-container">
            <div className="multiplication-grid">
              {/* Corner Cell */}
              <div className="grid-cell corner-cell">✖</div>

              {/* Column Headers (1 to 10) */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => {
                const isHoveredCol = hoveredCell?.col === c;
                const isSelectedCol = selectedCell.col === c;
                const isFilteredCol = filterTable === c;
                return (
                  <div 
                    key={`col-${c}`} 
                    className={`grid-cell col-header ${isHoveredCol || isSelectedCol || isFilteredCol ? 'header-active' : ''}`}
                    onClick={() => {
                      soundPlayer.playKeySound();
                      setFilterTable(prev => prev === c ? null : c);
                    }}
                    title={`לוח ${c}`}
                  >
                    {c}
                  </div>
                );
              })}

              {/* Grid Rows (1 to 10) */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                <React.Fragment key={`row-frag-${r}`}>
                  {/* Row Header */}
                  <div 
                    className={`grid-cell row-header ${hoveredCell?.row === r || selectedCell.row === r || filterTable === r ? 'header-active' : ''}`}
                    onClick={() => {
                      soundPlayer.playKeySound();
                      setFilterTable(prev => prev === r ? null : r);
                    }}
                    title={`לוח ${r}`}
                  >
                    {r}
                  </div>

                  {/* 10 Data Cells */}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => {
                    const value = r * c;
                    const isSelected = selectedCell.row === r && selectedCell.col === c;
                    const isCrosshair = (hoveredCell?.row === r || hoveredCell?.col === c) && !isSelected;
                    const isDiagonal = r === c;
                    const cellKey = `${r}-${c}`;
                    const isRevealed = revealedCells[cellKey];

                    // Filtering logic
                    const isFilterMatched = filterTable !== null && (r === filterTable || c === filterTable);
                    const isFilterDimmed = filterTable !== null && !isFilterMatched;

                    return (
                      <div
                        key={`cell-${r}-${c}`}
                        className={`grid-cell data-cell 
                          ${isSelected ? 'selected' : ''} 
                          ${isCrosshair ? 'crosshair' : ''} 
                          ${isDiagonal ? 'diagonal' : ''}
                          ${isDiagonal && showSquaresOnly ? 'diagonal-highlight' : ''}
                          ${isFilterMatched ? 'filter-matched' : ''}
                          ${isFilterDimmed ? 'filter-dimmed' : ''}
                          ${hideValues && !isRevealed && !isSelected ? 'hidden-val' : ''}
                        `}
                        onMouseEnter={() => setHoveredCell({ row: r, col: c })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => handleCellClick(r, c)}
                        title={`${r} × ${c} = ${value}`}
                      >
                        {hideValues && !isRevealed && !isSelected ? '?' : value}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Interactive Cell Detail & Visualizer */}
          {selectedCell && (
            <div className="cell-detail-card">
              <div className="detail-header">
                <div className="equation-banner">
                  <span className="factor-num">{selectedCell.row}</span>
                  <span className="op-sym">×</span>
                  <span className="factor-num">{selectedCell.col}</span>
                  <span className="eq-sym">=</span>
                  <span className="product-num">{selectedCell.row * selectedCell.col}</span>
                </div>

                <div className="verbal-explanation">
                  💡 <strong>הסבר:</strong> {selectedCell.row} קבוצות של {selectedCell.col} שוות ל-<strong>{selectedCell.row * selectedCell.col}</strong>
                </div>

                <button 
                  className="action-btn active"
                  onClick={() => jumpToQuizWithProblem(selectedCell.row, selectedCell.col)}
                >
                  <Zap size={16} />
                  <span>תרגל תרגיל זה בחידון</span>
                </button>
              </div>

              {/* Repeated Addition representation */}
              <div className="repeated-addition">
                {Array.from({ length: selectedCell.row }).map((_, i) => (
                  <span key={i}>
                    {selectedCell.col} {i < selectedCell.row - 1 ? '+ ' : `= ${selectedCell.row * selectedCell.col}`}
                  </span>
                ))}
              </div>

              {/* Dot Matrix Visualizer */}
              <div className="dot-matrix-container">
                <span className="matrix-title">
                  המחשה גיאומטרית: רשת של {selectedCell.row} שורות ובכל שורה {selectedCell.col} נקודות:
                </span>
                <div className="dot-grid">
                  {Array.from({ length: selectedCell.row }).map((_, rowIndex) => (
                    <div key={`dot-row-${rowIndex}`} className="dot-row">
                      <span className="dot-row-label">{rowIndex + 1}</span>
                      {Array.from({ length: selectedCell.col }).map((_, colIndex) => (
                        <div 
                          key={`dot-${rowIndex}-${colIndex}`} 
                          className="dot" 
                          title={`שורה ${rowIndex + 1}, עמודה ${colIndex + 1}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================
          TAB 2: QUIZ & PRACTICE
         ========================================================= */}
      {activeTab === 'quiz' && (
        <section className="quiz-section">
          {/* Quiz Top Stats */}
          <div className="quiz-top-stats">
            <div className="stat-box">
              <span className="stat-label">שאלות שנענו</span>
              <span className="stat-val">{stats.totalAnswered}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">אחוז דיוק</span>
              <span className="stat-val">{accuracyPercent}%</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">רצף נוכחי</span>
              <span className="stat-val streak">
                <Flame size={18} />
                {stats.currentStreak}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">שיא רצף</span>
              <span className="stat-val streak">
                <Trophy size={18} />
                {stats.bestStreak}
              </span>
            </div>
          </div>

          {/* Mode Selector & Table Filter */}
          <div className="quiz-mode-bar">
            <button 
              className={`mode-btn ${quizMode === 'practice' ? 'active' : ''}`}
              onClick={() => {
                soundPlayer.playKeySound();
                setQuizMode('practice');
                setIsTimerRunning(false);
                setIsTimeUp(false);
              }}
            >
              תרגול חופשי
            </button>
            <button 
              className={`mode-btn ${quizMode === 'timed' ? 'active' : ''}`}
              onClick={() => {
                soundPlayer.playKeySound();
                setQuizMode('timed');
                startTimedChallenge();
              }}
            >
              אתגר 60 שניות ⏱️
            </button>
          </div>

          {/* Multi-Select Focus Tables */}
          <div className="table-select-section">
            <div className="table-select-header">
              <div className="table-select-title">
                <Shuffle size={18} />
                <span>בחר כפולות לתרגול:</span>
              </div>
              <div className="table-preset-buttons">
                <button 
                  type="button"
                  className={`preset-btn ${quizSelectedTables.length === 10 ? 'active' : ''}`}
                  onClick={selectAllTables}
                  title="בחר את כל לוח הכפל"
                >
                  כל הלוח (1-10)
                </button>
                <button 
                  type="button"
                  className={`preset-btn ${quizSelectedTables.length === 5 && [2,4,6,8,10].every(n => quizSelectedTables.includes(n)) ? 'active' : ''}`}
                  onClick={selectEvenTables}
                  title="כפולות זוגיות: 2, 4, 6, 8, 10"
                >
                  זוגיים
                </button>
                <button 
                  type="button"
                  className={`preset-btn ${quizSelectedTables.length === 5 && [1,3,5,7,9].every(n => quizSelectedTables.includes(n)) ? 'active' : ''}`}
                  onClick={selectOddTables}
                  title="כפולות אי-זוגיות: 1, 3, 5, 7, 9"
                >
                  אי-זוגיים
                </button>
              </div>
            </div>

            {/* Chips 1 to 10 */}
            <div className="table-chips-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
                const isSelected = quizSelectedTables.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    className={`table-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleTableSelection(n)}
                    title={`כפולות של ${n}`}
                  >
                    <span>×{n}</span>
                    {isSelected && <span className="table-chip-check">✓</span>}
                  </button>
                );
              })}
            </div>

            {/* Status caption */}
            <div className="table-select-status">
              <span>
                {quizSelectedTables.length === 10
                  ? 'נבחרו כל 10 הכפולות'
                  : `נבחרו ${quizSelectedTables.length} כפולות: ${quizSelectedTables.join(', ')}`}
              </span>
              <span className="table-status-tag">🔀 תרגילים מעורבבים</span>
            </div>
          </div>

          {/* Timed Mode Finished View */}
          {quizMode === 'timed' && isTimeUp ? (
            <div className="glass-card challenge-summary">
              <div className="trophy-icon">🏆</div>
              <h2>הזמן נגמר!</h2>
              <p>פתרת בהצלחה <strong>{timedScore}</strong> תרגילים בדקה אחת!</p>
              <div className="challenge-stats-grid">
                <div className="challenge-stat-card">
                  <div className="stat-label">תוצאה נוכחית</div>
                  <div className="stat-val">{timedScore}</div>
                </div>
                <div className="challenge-stat-card">
                  <div className="stat-label">שיא אישי</div>
                  <div className="stat-val">{timedHighScore}</div>
                </div>
              </div>
              <button 
                className="next-btn"
                style={{ width: '100%', maxWidth: '280px', marginTop: '1rem' }}
                onClick={startTimedChallenge}
              >
                <RotateCcw size={18} />
                <span>שחק שוב</span>
              </button>
            </div>
          ) : (
            /* Question Card */
            <div className={`glass-card question-card ${isShaking ? 'shake' : ''}`}>
              {/* Timed challenge progress */}
              {quizMode === 'timed' && (
                <div className="timer-indicator">
                  <div className="timer-text">
                    <span>זמן שנותר: {timeLeft} שניות</span>
                    <span>ניקוד: {timedScore}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${(timeLeft / 60) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* The Multiplication Equation */}
              <div className="question-display">
                <span className="math-num">{quizFactorA}</span>
                <span className="math-op">×</span>
                <span className="math-num">{quizFactorB}</span>
                <span className="math-eq">=</span>
                <div className={`answer-box ${!userInput ? 'pulse' : ''}`}>
                  <span>{userInput || ''}</span>
                  {!userInput && <span className="blinking-cursor" />}
                </div>
              </div>

              {/* Practice Mode Attempts Tracker */}
              {quizMode === 'practice' && (
                <div className="practice-attempts-tracker">
                  <div className="attempts-dots-row">
                    <span className="attempts-title">פסילות בשאלה זו:</span>
                    <div className="attempts-chips">
                      {[1, 2, 3].map(attemptNum => (
                        <span
                          key={attemptNum}
                          className={`attempt-chip ${wrongAttempts >= attemptNum ? 'failed' : 'clean'}`}
                          title={wrongAttempts >= attemptNum ? `טעות ${attemptNum}` : `ניסיון ${attemptNum} פנוי`}
                        >
                          {wrongAttempts >= attemptNum ? '✕' : attemptNum}
                        </span>
                      ))}
                    </div>
                  </div>
                  {wrongAttempts > 0 && wrongAttempts <= 3 && (
                    <div className="attempts-subtext">
                      {wrongAttempts === 3 
                        ? '⚠️ הזדמנות אחרונה! בטעות הבאה התשובה תיחשף' 
                        : `נותרו עוד ${3 - wrongAttempts} ניסיונות לפני גילוי התשובה`}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Alert */}
              {feedback && (
                <div className={`feedback-banner ${feedback.isCorrect ? 'success' : feedback.isFinal ? 'error' : 'retry'}`}>
                  <div className="feedback-banner-content">
                    <div className="feedback-row">
                      {feedback.isCorrect ? (
                        <CheckCircle2 size={24} />
                      ) : feedback.isFinal ? (
                        <XCircle size={24} />
                      ) : (
                        <AlertCircle size={24} />
                      )}
                      <span>{feedback.message}</span>
                    </div>

                    {/* Prominent Next Question button if answer is revealed */}
                    {feedback.isFinal && !feedback.isCorrect && (
                      <button 
                        type="button"
                        className="next-question-callout"
                        onClick={() => {
                          soundPlayer.playKeySound();
                          generateNewQuestion();
                        }}
                      >
                        <span>לשאלה הבאה</span>
                        <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Hint Display */}
              {showHint && (
                <div className="hint-content">
                  💡 <strong>רמז:</strong> כדי לחשב {quizFactorA} × {quizFactorB}, נחבר את המספר {quizFactorB} בדיוק {quizFactorA} פעמים!
                </div>
              )}

              {/* Virtual Keypad */}
              <div className="keypad-container">
                <div className="keypad-grid">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                    <button
                      key={digit}
                      className="key-btn"
                      onClick={() => handleKeypadPress(digit)}
                    >
                      {digit}
                    </button>
                  ))}
                  <button 
                    className="key-btn action-key"
                    onClick={handleBackspace}
                    title="מחק ספרה אחרונה"
                  >
                    ⌫ מחק
                  </button>
                  <button 
                    className="key-btn"
                    onClick={() => handleKeypadPress('0')}
                  >
                    0
                  </button>
                  <button 
                    className="key-btn submit-key"
                    onClick={checkAnswer}
                    title="בדוק תשובה"
                  >
                    אישור ✓
                  </button>
                </div>

                <div className="keypad-secondary-row">
                  <button 
                    className="hint-toggle-btn"
                    onClick={() => {
                      soundPlayer.playKeySound();
                      setShowHint(prev => !prev);
                    }}
                  >
                    <Lightbulb size={18} />
                    <span>{showHint ? 'הסתר רמז' : 'צריך רמז?'}</span>
                  </button>

                  <button 
                    className="next-btn"
                    onClick={() => {
                      soundPlayer.playKeySound();
                      generateNewQuestion();
                    }}
                  >
                    <span>שאלה הבאה</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
