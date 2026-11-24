import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Check,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Shield,
  Layers,
  Target,
  Compass,
  Calendar,
  Flame,
  CheckCircle2,
  Clock,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { formatHms } from './LiveHabitTimerBar';
import { HabitIconView } from '../../lib/habitIcons';
import type { ActiveHabitTimer } from '../../lib/types';
import { useLiveTimetable } from '../../hooks/useLiveTimetable';
import { useHabitStore } from '../../store/useHabitStore';
import { TimetableIcon } from '../timetable/TimetableIcon';
import { formatTimeRange12h } from '../../lib/timetableParser';
import { formatLocalDate } from '../../lib/dateUtils';
import { format } from 'date-fns';
import { isHabitScheduledOnDay, computeStreakStats } from '../../lib/statsUtils';
import { sound } from '../../lib/audio';

const EqualizerWaveform: React.FC<{ isRunning: boolean; color?: string }> = ({ isRunning }) => {
  return (
    <div className="flex items-center gap-[2.5px] h-3 px-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-[2px] rounded-full transition-all duration-300 ${
            isRunning ? 'animate-pulse' : 'opacity-40'
          }`}
          style={{
            height: isRunning ? `${(i * 3) % 9 + 4}px` : '3px',
            backgroundColor: '#ffffff',
            animationDelay: `${i * 140}ms`,
          }}
        />
      ))}
    </div>
  );
};

export const DesktopTimerWidget: React.FC = () => {
  const [timer, setTimer] = useState<ActiveHabitTimer | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showElapsed, setShowElapsed] = useState<boolean>(false);
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zion_mini_hud_compact');
      if (saved !== null) return saved === 'true';
      return true; // Default to true: True sleek Dynamic Island
    } catch {
      return true;
    }
  });
  const resizingRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const startBlockTimer = useHabitStore((s) => s.startTimetableBlockTimer);
  const toggleExecution = useHabitStore((s) => s.toggleTimetableExecution);
  const executions = useHabitStore((s) => s.timetableExecutions);
  const currentDate = useHabitStore((s) => s.currentDate);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const streakThreshold = useHabitStore((s) => s.settings?.streak_threshold ?? 50);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const startHabitTimer = useHabitStore((s) => s.startHabitTimer);
  const saveHabit = useHabitStore((s) => s.saveHabit);
  const init = useHabitStore((s) => s.init);

  const streakStats = computeStreakStats(habits, allCheckinsList, streakThreshold, currentDate);

  const [northStar, setNorthStar] = useState<string>(() => {
    try {
      return localStorage.getItem('zion_hud_north_star') || 'Focus on today’s primary mission';
    } catch {
      return 'Focus on today’s primary mission';
    }
  });
  const [isEditingNorthStar, setIsEditingNorthStar] = useState(false);
  const [northStarDraft, setNorthStarDraft] = useState('');

  const saveNorthStar = () => {
    const val = (northStarDraft.trim() || 'Focus on today’s primary mission');
    setNorthStar(val);
    setIsEditingNorthStar(false);
    try {
      localStorage.setItem('zion_hud_north_star', val);
    } catch {}
  };

  const { activeStatus } = useLiveTimetable();
  const todayStr = formatLocalDate(currentDate);

  const [showAllHabits, setShowAllHabits] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [companionTab, setCompanionTab] = useState<'habits' | 'routine'>('habits');

  const todayWday = currentDate.getDay();
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const scheduledToday = useMemo(
    () => activeHabits.filter((h) => isHabitScheduledOnDay(h, todayWday)),
    [activeHabits, todayWday]
  );
  const displayedHabits = useMemo(() => {
    if (showAllHabits) return activeHabits;
    return scheduledToday.length > 0 ? scheduledToday : activeHabits;
  }, [showAllHabits, scheduledToday, activeHabits]);

  useEffect(() => {
    void init();

    // Re-fetch when the companion window is focused
    const onFocus = () => {
      void init();
    };
    window.addEventListener('focus', onFocus);

    // Cross-window storage events (triggers when habits/checkins change in another window)
    const onStorage = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key.includes('habit') ||
        e.key.includes('checkin') ||
        e.key.includes('user') ||
        e.key.includes('ht_')
      ) {
        void init();
      }
    };
    window.addEventListener('storage', onStorage);

    // Real-time Electron IPC broadcast sync from main window
    const unsubIpc = window.api?.onDataChanged?.(() => {
      void init();
    });

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
      unsubIpc?.();
    };
  }, [init]);

  const updateWindowDimensions = (compact: boolean, hasTimer: boolean) => {
    if (!window.api?.desktopTimer) return;
    if (compact) {
      void window.api.desktopTimer.setSize(320, 48);
    } else if (hasTimer) {
      void window.api.desktopTimer.setSize(380, 110);
    } else {
      void window.api.desktopTimer.setSize(380, 440);
    }
  };

  useEffect(() => {
    document.documentElement.classList.add('timer-widget-mode');
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'transparent';

    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.background = 'transparent';
      rootEl.style.backgroundColor = 'transparent';
    }

    if (window.api?.desktopTimer) {
      updateWindowDimensions(isCompact, Boolean(timer));

      void window.api.desktopTimer.get().then((t) => {
        if (t) setTimer(t as ActiveHabitTimer);
      });
      const unsub = window.api.desktopTimer.onSync((t) => {
        setTimer((t as ActiveHabitTimer | null) || null);
      });
      return () => unsub();
    }
  }, [isCompact, Boolean(timer)]);

  useEffect(() => {
    if (!timer?.startedAtMs) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer?.startedAtMs]);

  const ringRadius = 14;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const toggleCompactMode = () => {
    sound.playClick();
    const next = !isCompact;
    setIsCompact(next);
    try {
      localStorage.setItem('zion_mini_hud_compact', String(next));
    } catch {}
    updateWindowDimensions(next, Boolean(timer));
  };

  const sendAction = (action: 'pause' | 'resume' | 'finish' | 'discard' | 'open-main' | 'add-5m') => {
    void window.api?.desktopTimer?.sendAction(action);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      startX: e.screenX,
      startY: e.screenY,
      startW: window.innerWidth,
      startH: window.innerHeight,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const deltaX = moveEvent.screenX - resizingRef.current.startX;
      const deltaY = moveEvent.screenY - resizingRef.current.startY;
      const newW = Math.max(200, Math.min(550, resizingRef.current.startW + deltaX));
      const newH = Math.max(46, Math.min(220, resizingRef.current.startH + deltaY));
      void window.api?.desktopTimer?.setSize(newW, newH);
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // ─────────────────────────────────────────────────────────────
  // MODE 1: Active Focus Timer Running
  // ─────────────────────────────────────────────────────────────
  if (timer) {
    const elapsedSeconds =
      timer.accumulatedSeconds +
      (timer.startedAtMs ? Math.max(0, Math.floor((nowMs - timer.startedAtMs) / 1000)) : 0);

    const remainingSeconds = Math.max(0, timer.targetSeconds - elapsedSeconds);
    const targetReached = timer.mode === 'countdown' && elapsedSeconds >= timer.targetSeconds;
    const progressRatio = Math.min(1, Math.max(0, elapsedSeconds / Math.max(1, timer.targetSeconds)));
    const progressPct = Math.min(100, Math.round(progressRatio * 100));

    const activeSeconds = showElapsed || targetReached ? elapsedSeconds : remainingSeconds;
    const displayTime = formatHms(activeSeconds);
    const isRunning = Boolean(timer.startedAtMs);
    const habitColor = timer.habitColor || '#6366f1';
    const strokeDashoffset = ringCircumference * (1 - progressRatio);

    if (isCompact) {
      return (
        <div
          style={{
            backgroundColor: '#000000',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 1)',
          }}
          className="w-full h-full rounded-full border px-3 flex items-center justify-between select-none text-white"
        >
          <div
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            className="flex items-center gap-2 cursor-move flex-1 min-w-0"
          >
            <div
              className="w-7 h-7 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center shrink-0 text-white"
            >
              <HabitIconView iconId={timer.habitEmoji} color="#ffffff" size={13} />
            </div>
            <div className="min-w-0 flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-black tracking-tight text-white tabular-nums">
                {displayTime}
              </span>
              <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[65px]">
                {timer.habitName}
              </span>
            </div>
          </div>

          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => sendAction(isRunning ? 'pause' : 'resume')}
              className="w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white cursor-pointer transition-colors"
              title={isRunning ? 'Pause' : 'Resume'}
            >
              {isRunning ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
            </button>
            <button
              onClick={() => sendAction('finish')}
              className="w-6 h-6 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
              title="Finish Goal"
            >
              <Check size={11} strokeWidth={2.8} />
            </button>
            <button
              onClick={toggleCompactMode}
              className="w-5 h-5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Expand Card"
            >
              <Maximize2 size={10} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          backgroundColor: '#000000',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 1)',
        }}
        className="w-full h-full rounded-2xl border overflow-hidden flex flex-col justify-between select-none text-white"
      >
        {/* Top Embedded Micro-Progress Line */}
        <div className="mx-3 mt-1.5 h-[2.5px] bg-zinc-900 rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-white transition-all duration-300 rounded-full"
            style={{
              width: `${progressPct}%`,
            }}
          />
        </div>

        {/* Main Core: Gauge + Info + Controls */}
        <div className="px-3.5 pt-1.5 pb-0.5 flex items-center justify-between gap-2.5 flex-1 min-h-0">
          <div
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            className="relative w-8 h-8 flex items-center justify-center shrink-0 cursor-move"
          >
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r={ringRadius} stroke="#27272a" strokeWidth="2.5" fill="none" />
              <circle
                cx="16"
                cy="16"
                r={ringRadius}
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-white">
              <HabitIconView iconId={timer.habitEmoji} color="#ffffff" size={13} />
            </div>
          </div>

          <div style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} className="flex-1 min-w-0 cursor-move">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[12.5px] text-zinc-100 truncate tracking-tight">
                {timer.habitName}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono text-[20px] font-black text-white tracking-tight tabular-nums leading-none">
                {displayTime}
              </span>
              <EqualizerWaveform isRunning={isRunning} color={habitColor} />
              <span className="text-[8.5px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                {targetReached ? 'GOAL HIT' : isRunning ? 'FOCUSING' : 'PAUSED'}
              </span>
            </div>
          </div>

          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex flex-col items-end justify-between h-full py-0.5 shrink-0 gap-1"
          >
            <div className="flex items-center gap-1 text-zinc-400">
              <button
                onClick={() => sendAction('add-5m')}
                className="h-[18px] px-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-[9px] font-bold font-mono flex items-center gap-0.5 cursor-pointer transition-colors active:scale-95"
                title="Add +5 minutes"
              >
                <span>+5m</span>
              </button>
              <button
                onClick={toggleCompactMode}
                className="w-5 h-[18px] rounded hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Compact Dynamic Island Mode"
              >
                <Minimize2 size={10} />
              </button>
              <button
                onClick={() => sendAction('open-main')}
                className="w-5 h-[18px] rounded hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Open Zion Main App"
              >
                <Maximize2 size={10} />
              </button>
              <button
                onClick={() => sendAction('discard')}
                className="w-5 h-[18px] rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors"
                title="Dismiss Widget"
              >
                <X size={11} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => sendAction(isRunning ? 'pause' : 'resume')}
                className="w-7 h-7 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
                title={isRunning ? 'Pause Timer' : 'Resume Timer'}
              >
                {isRunning ? (
                  <Pause size={12} fill="currentColor" />
                ) : (
                  <Play size={12} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              <button
                onClick={() => sendAction('finish')}
                className="w-7 h-7 rounded-lg bg-white text-black hover:bg-zinc-200 flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-sm font-bold"
                title="Finish & Check In"
              >
                <Check size={13} strokeWidth={2.8} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="px-3 pb-1 pt-0.5 flex items-center justify-between text-[8.5px] font-mono text-zinc-400 bg-black border-t border-zinc-900 shrink-0">
          <div
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            className="flex items-center gap-1.5 cursor-move flex-1 min-w-0"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                targetReached
                  ? 'bg-white animate-ping'
                  : isRunning
                  ? 'bg-white animate-pulse'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="font-semibold text-zinc-300 tracking-wider">
              {targetReached ? 'GOAL HIT' : isRunning ? 'FOCUSING' : 'PAUSED'}
            </span>
            <span className="text-zinc-600">·</span>
            <span>
              {progressPct}% ({formatHms(elapsedSeconds)})
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div
              onMouseDown={handleResizeMouseDown}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className="w-3.5 h-3 flex items-end justify-center cursor-se-resize opacity-40 hover:opacity-100 transition-opacity"
              title="Drag corner to resize"
            >
              <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                <circle cx="5" cy="5" r="0.8" fill="#71717a" />
                <circle cx="2.5" cy="5" r="0.8" fill="#71717a" />
                <circle cx="5" cy="2.5" r="0.8" fill="#71717a" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MODE 2 & 3: Zion Desktop Focus Companion (summons with Ctrl+Alt+Space or tray)
  // Seamlessly integrates Today's Habits Matrix and Active Timetable Routine
  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  const targetPool = scheduledToday.length > 0 ? scheduledToday : activeHabits;
  const doneCount = targetPool.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length;
  const totalCount = targetPool.length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && doneCount >= totalCount;
  const firstPending = displayedHabits.find((h) => !checkins[`${h.id}_${todayStr}`]?.completed);
  const formattedDayTitle = format(currentDate, 'EEEE, MMM d');

  const handleQuickAddHabit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = newHabitName.trim();
    if (!trimmed) return;
    setIsAddingHabit(true);
    try {
      await saveHabit({
        name: trimmed,
        emoji: 'star',
        color: '#ffffff',
        monthly_goal: 30,
        schedule_days: [0, 1, 2, 3, 4, 5, 6],
      });
      setNewHabitName('');
      sound.playCheckin();
    } finally {
      setIsAddingHabit(false);
    }
  };

  // Compact Dynamic Island Pill (280x46) - Solid Black Monochrome
  if (isCompact) {
    return (
      <div
        style={{
          backgroundColor: '#000000',
          borderColor: 'rgba(255, 255, 255, 0.18)',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 1)',
        }}
        className="w-full h-full rounded-full border px-3 flex items-center justify-between select-none text-white"
      >
        <div
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          className="flex items-center gap-2 cursor-move flex-1 min-w-0"
        >
          <div className="w-6 h-6 rounded-lg border border-zinc-700 bg-zinc-900 flex items-center justify-center text-white shrink-0">
            {activeStatus ? (
              <TimetableIcon icon={activeStatus.block.icon || activeStatus.block.emoji} category={activeStatus.block.category} color="#ffffff" size={12} />
            ) : firstPending ? (
              <HabitIconView iconId={firstPending.emoji} color="#ffffff" size={12} />
            ) : (
              <Compass size={12} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-white tracking-tight truncate">
              {activeStatus
                ? activeStatus.block.title
                : firstPending
                ? firstPending.name
                : allDone
                ? 'All Protocols Complete'
                : 'Zion Companion'}
            </div>
            <div className="text-[9px] font-mono text-zinc-400">
              {activeStatus
                ? `${activeStatus.remainingFormatted} left • ${activeStatus.progressPct}%`
                : `${doneCount}/${totalCount} completed • ${completionPct}%`}
            </div>
          </div>
        </div>

        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex items-center gap-1 shrink-0">
          {activeStatus ? (
            <button
              onClick={() => void toggleExecution(todayStr, activeStatus.block.id)}
              className="w-6 h-6 rounded-lg border border-white bg-white text-black flex items-center justify-center cursor-pointer transition-colors"
              title={`Check off routine block "${activeStatus.block.title}"`}
            >
              <Check size={12} strokeWidth={2.8} />
            </button>
          ) : firstPending ? (
            <button
              onClick={() => void toggleCheckin(firstPending.id, todayStr)}
              className="w-6 h-6 rounded-lg border border-white bg-white text-black flex items-center justify-center cursor-pointer transition-colors"
              title={`Quick check-in "${firstPending.name}"`}
            >
              <Check size={12} strokeWidth={2.8} />
            </button>
          ) : null}

          <button
            onClick={toggleCompactMode}
            className="w-5 h-5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Expand Companion"
          >
            <Maximize2 size={10} />
          </button>
          <button
            onClick={() => void window.api?.os?.toggleTimerWidget?.()}
            className="w-5 h-5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Dismiss"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Command Companion Window - Pure Monochrome Solid Black
  return (
    <div
      style={{
        backgroundColor: '#000000',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 1)',
      }}
      className="w-full h-full rounded-2xl border overflow-hidden flex flex-col select-none text-white"
    >
      {/* Top Header Bar */}
      <div
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="px-3.5 py-2.5 border-b border-zinc-800 flex items-center justify-between cursor-move bg-black"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] shrink-0" />
          {activeStatus ? (
            <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <button
                type="button"
                onClick={() => setCompanionTab('habits')}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition-all ${
                  companionTab === 'habits'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ⚡ Habits ({doneCount}/{totalCount})
              </button>
              <button
                type="button"
                onClick={() => setCompanionTab('routine')}
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                  companionTab === 'routine'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Clock size={10} />
                <span>Routine ({activeStatus.remainingFormatted})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-white tracking-tight">Zion Companion</span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {formattedDayTitle}
              </span>
            </div>
          )}
        </div>

        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleCompactMode}
            className="w-6 h-6 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Compact Mini-Bar"
          >
            <Minimize2 size={11} />
          </button>
          <button
            onClick={() => sendAction('open-main')}
            className="w-6 h-6 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Open Zion App"
          >
            <Maximize2 size={11} />
          </button>
          <button
            onClick={() => void window.api?.os?.toggleTimerWidget?.()}
            className="w-6 h-6 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Close Companion"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {companionTab === 'routine' && activeStatus ? (
        <div className="flex-1 flex flex-col justify-between p-4 bg-black min-h-0 select-none">
          {/* Top Micro Progress Bar */}
          <div className="w-full h-[3px] bg-zinc-900 rounded-full overflow-hidden mb-3 shrink-0">
            <div
              className="h-full bg-white transition-all duration-300 rounded-full"
              style={{ width: `${activeStatus.progressPct}%` }}
            />
          </div>

          <div className="flex flex-col items-center justify-center text-center my-auto py-3">
            <div className="w-14 h-14 rounded-2xl border border-zinc-700 bg-zinc-900 flex items-center justify-center text-white mb-3 shadow-xl">
              <TimetableIcon icon={activeStatus.block.icon || activeStatus.block.emoji} category={activeStatus.block.category} color="#ffffff" size={24} />
            </div>
            <span className="px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900 text-[10px] font-mono font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
              {activeStatus.block.category || 'SCHEDULED ROUTINE'}
            </span>
            <h3 className="text-base font-bold text-white tracking-tight max-w-[280px] truncate">
              {activeStatus.block.title}
            </h3>
            <div className="font-mono text-3xl font-black text-white tabular-nums mt-1 tracking-tight">
              {activeStatus.remainingFormatted}
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">
              {formatTimeRange12h(activeStatus.block.startTime, activeStatus.block.endTime)} · {activeStatus.totalDurationMinutes}m total
            </span>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-zinc-900 shrink-0">
            <button
              onClick={() => startBlockTimer(activeStatus.block)}
              className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <Play size={13} fill="currentColor" />
              <span>START FOCUS TIMER</span>
            </button>
            <button
              onClick={() => void toggleExecution(todayStr, activeStatus.block.id)}
              className={`px-4 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                executions[`${todayStr}_${activeStatus.block.id}`]
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <Check size={13} strokeWidth={2.8} />
              <span>{executions[`${todayStr}_${activeStatus.block.id}`] ? 'DONE' : 'CHECK OFF'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Active Routine Mini-Banner (if routine block is running) */}
          {activeStatus?.block && (
            <div
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              className="px-3.5 py-2 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between text-xs gap-2 shrink-0"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
                  <TimetableIcon icon={activeStatus.block.icon || activeStatus.block.emoji} category={activeStatus.block.category} color="#ffffff" size={12} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-bold text-white truncate max-w-[130px]">{activeStatus.block.title}</span>
                    <span className="text-[9.5px] font-mono text-zinc-400">({activeStatus.remainingFormatted})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => startBlockTimer(activeStatus.block)}
                  className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono font-bold text-white flex items-center gap-1 border border-zinc-700 cursor-pointer shadow-sm"
                  title="Start Focus Session"
                >
                  <Play size={8} fill="currentColor" /> FOCUS
                </button>
                <button
                  onClick={() => void toggleExecution(todayStr, activeStatus.block.id)}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center cursor-pointer transition-colors shadow-sm ${
                    executions[`${todayStr}_${activeStatus.block.id}`]
                      ? 'bg-white border-white text-black font-bold'
                      : 'border-zinc-700 bg-transparent text-white hover:border-white'
                  }`}
                  title="Check Off Routine Block"
                >
                  <Check size={11} strokeWidth={2.8} />
                </button>
              </div>
            </div>
          )}

          {/* Daily Intention / Focus Target - Monochrome */}
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="px-3.5 py-1.5 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between text-xs gap-2 shrink-0"
          >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Target size={12} className="text-zinc-400 shrink-0" />
          {isEditingNorthStar ? (
            <input
              type="text"
              value={northStarDraft}
              autoFocus
              onChange={(e) => setNorthStarDraft(e.target.value)}
              onBlur={saveNorthStar}
              onKeyDown={(e) => e.key === 'Enter' && saveNorthStar()}
              className="w-full bg-transparent border-none text-[11px] font-medium text-white focus:outline-none"
              placeholder="Set priority goal..."
            />
          ) : (
            <span
              onClick={() => {
                setNorthStarDraft(northStar);
                setIsEditingNorthStar(true);
              }}
              className="text-[11px] font-medium text-zinc-300 hover:text-white truncate cursor-pointer transition-colors"
              title="Click to edit intention"
            >
              {northStar}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300 text-[10px] font-mono font-bold shrink-0">
          <span>✦ {streakStats.currentStreak}d streak</span>
        </div>
      </div>

      {/* Habits Action List */}
      <div
        className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar min-h-0 bg-black"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {displayedHabits.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-2">
              <Calendar size={15} />
            </div>
            <div className="text-xs font-bold text-white mb-0.5">No Active Protocols</div>
            <p className="text-[10px] text-zinc-400 mb-2.5 max-w-[250px]">
              Add a protocol name below to start tracking directly from your companion.
            </p>

            <form onSubmit={handleQuickAddHabit} className="w-full flex items-center gap-1.5 mb-2">
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="e.g. Read 20m, Deep Work..."
                className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-white text-xs px-2.5 py-1.5 rounded-lg text-white placeholder-zinc-500 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!newHabitName.trim() || isAddingHabit}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all disabled:opacity-30 cursor-pointer shrink-0"
              >
                Add
              </button>
            </form>

            <button
              type="button"
              onClick={() => sendAction('open-main')}
              className="text-[10px] text-zinc-400 hover:text-white underline transition-colors cursor-pointer"
            >
              Open Full Zion App
            </button>
          </div>
        ) : allDone ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white mb-2 shadow-inner">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-xs font-bold text-white">All protocols completed today</span>
            <span className="text-[10px] text-zinc-400 mt-0.5 mb-3">
              {doneCount} of {totalCount} completed • 100% Protocol rate
            </span>
            <button
              onClick={() => {
                if (displayedHabits[0]) startHabitTimer(displayedHabits[0], 25);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Play size={10} fill="black" />
              <span>Start 25m Focus Session</span>
            </button>
          </div>
        ) : (
          displayedHabits.map((h) => {
            const isDone = Boolean(checkins[`${h.id}_${todayStr}`]?.completed);

            return (
              <div
                key={h.id}
                className="group p-2 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 transition-all flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Custom Monochrome Checkbox */}
                  <button
                    onClick={() => {
                      sound.playClick();
                      void toggleCheckin(h.id, todayStr);
                    }}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      isDone
                        ? 'bg-white border-white text-black'
                        : 'bg-transparent border-zinc-700 hover:border-white text-transparent'
                    }`}
                    title={isDone ? 'Mark Incomplete' : 'Complete Habit'}
                  >
                    <Check size={11} strokeWidth={3} className={isDone ? 'opacity-100' : 'opacity-0'} />
                  </button>

                  {/* Habit Icon */}
                  <div className="w-6 h-6 rounded-md border border-zinc-800 bg-zinc-900 flex items-center justify-center shrink-0 text-white">
                    <HabitIconView iconId={h.emoji} color="#ffffff" size={12} />
                  </div>

                  {/* Habit Title */}
                  <span
                    className={`text-[12px] font-medium truncate transition-colors ${
                      isDone ? 'line-through text-zinc-500' : 'text-white'
                    }`}
                  >
                    {h.name}
                  </span>
                </div>

                {/* Quick Action Button */}
                <div className="shrink-0 flex items-center gap-1.5">
                  {!isDone ? (
                    <button
                      onClick={() => startHabitTimer(h, 25)}
                      className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-white text-zinc-300 hover:text-black border border-zinc-700 hover:border-white text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Launch 25m Focus Timer"
                    >
                      <Play size={8} fill="currentColor" />
                      <span>25m</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900">
                      Done
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 7-Day Consistency Strip - Monochrome */}
      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="px-3.5 py-1.5 bg-black border-t border-zinc-900 flex items-center justify-between"
      >
        <div className="flex items-center gap-1.5">
          {streakStats.currentWeekDays.map((day) => (
            <div
              key={day.dateStr}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-bold font-mono transition-all ${
                day.isToday ? 'border-2 border-white' : ''
              } ${
                day.isCompleted
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
              }`}
              title={`${day.dateStr}: ${day.isCompleted ? 'Completed' : 'Pending'}`}
            >
              {day.weekdayLabel}
            </div>
          ))}
        </div>

        <div className="text-[9.5px] font-mono text-zinc-400 font-semibold">
          {completionPct}% Done
        </div>
      </div>

      {/* Monochrome Footer */}
      <div
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="px-3.5 py-1.5 bg-black border-t border-zinc-900 flex items-center justify-between text-[9px] font-mono text-zinc-500 cursor-move"
      >
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold">
            Ctrl+Alt+Space
          </kbd>
          <span>toggle companion</span>
        </div>

        <div
          onMouseDown={handleResizeMouseDown}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="w-3.5 h-3 flex items-end justify-center cursor-se-resize opacity-40 hover:opacity-100 transition-opacity"
          title="Drag corner to resize"
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
            <circle cx="5" cy="5" r="0.8" fill="#ffffff" />
            <circle cx="2.5" cy="5" r="0.8" fill="#ffffff" />
            <circle cx="5" cy="2.5" r="0.8" fill="#ffffff" />
          </svg>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
