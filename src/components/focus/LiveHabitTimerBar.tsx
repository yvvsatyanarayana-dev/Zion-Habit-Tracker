import React, { useEffect, useState } from 'react';
import { Play, Pause, Check, X, Maximize2, Timer } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { sendOsNotification } from '../../lib/reminders';
import { sound } from '../../lib/audio';

export function formatHms(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const LiveHabitTimerBar: React.FC = () => {
  const activeHabitTimer = useHabitStore((s) => s.activeHabitTimer);
  if (!activeHabitTimer) return null;
  return <LiveHabitTimerBarInner />;
};

const LiveHabitTimerBarInner: React.FC = () => {
  const timer = useHabitStore((s) => s.activeHabitTimer)!;
  const pauseHabitTimer = useHabitStore((s) => s.pauseHabitTimer);
  const resumeHabitTimer = useHabitStore((s) => s.resumeHabitTimer);
  const stopAndLogHabitTimer = useHabitStore((s) => s.stopAndLogHabitTimer);
  const discardHabitTimer = useHabitStore((s) => s.discardHabitTimer);
  const setFocusStudioOpen = useHabitStore((s) => s.setFocusStudioOpen);
  const markHabitTimerTargetNotified = useHabitStore((s) => s.markHabitTimerTargetNotified);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    if (!timer.startedAtMs) return;
    const id = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer.startedAtMs]);

  const elapsedSeconds =
    timer.accumulatedSeconds +
    (timer.startedAtMs ? Math.max(0, Math.floor((nowMs - timer.startedAtMs) / 1000)) : 0);

  const remainingSeconds = Math.max(0, timer.targetSeconds - elapsedSeconds);
  const targetReached = timer.mode === 'countdown' && elapsedSeconds >= timer.targetSeconds;
  const progressPct = Math.min(100, Math.round((elapsedSeconds / Math.max(1, timer.targetSeconds)) * 100));

  const displayTime =
    timer.mode === 'countdown' && !targetReached
      ? formatHms(remainingSeconds)
      : formatHms(elapsedSeconds);

  // Sync window title in real time
  useEffect(() => {
    const prevTitle = document.title;
    if (timer.startedAtMs) {
      document.title = `⏱ ${displayTime} · ${timer.habitName} — Zion`;
    } else {
      document.title = `⏸ ${displayTime} · ${timer.habitName} — Zion`;
    }
    return () => {
      document.title = prevTitle;
    };
  }, [displayTime, timer.habitName, timer.startedAtMs]);

  // Fire OS notification & chime the instant target is reached
  useEffect(() => {
    if (targetReached && !timer.notifiedTargetReached) {
      markHabitTimerTargetNotified();
      sound.playCelebration();
      const targetMins = Math.round(timer.targetSeconds / 60);
      void sendOsNotification(
        `${timer.habitName} Target Reached!`,
        `You completed your ${targetMins}m goal. Tap Finish & Log to check it off!`
      );
    }
  }, [targetReached, timer.notifiedTargetReached, timer.habitName, timer.targetSeconds, markHabitTimerTargetNotified]);

  const isRunning = Boolean(timer.startedAtMs);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: targetReached ? '#10b981' : 'var(--border-medium)',
      }}
      className="fixed bottom-20 md:bottom-5 right-3 left-3 sm:left-auto sm:w-[370px] z-40 rounded-2xl border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
    >
      {/* Live Top Progress Strip */}
      <div className="w-full h-1" style={{ backgroundColor: 'var(--bg-surface-elevated)' }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            backgroundColor: targetReached ? '#10b981' : timer.habitColor,
          }}
        />
      </div>

      <div className="p-3 flex items-center justify-between gap-2.5">
        {/* Left: Habit Indicator & Real-Time Clock */}
        <div
          onClick={() => setFocusStudioOpen(true)}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          title="Open Deep Focus Studio"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isRunning ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor: `${timer.habitColor}20`,
              color: timer.habitColor,
            }}
          >
            <Timer size={17} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs font-bold truncate group-hover:underline"
                style={{ color: 'var(--text-primary)' }}
              >
                {timer.habitName}
              </span>
              {targetReached && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400">
                  GOAL HIT
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-num" style={{ color: 'var(--text-muted)' }}>
              <span className="font-bold text-sm" style={{ color: targetReached ? '#10b981' : 'var(--text-primary)' }}>
                {displayTime}
              </span>
              <span>/ {formatHms(timer.targetSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => (isRunning ? pauseHabitTimer() : resumeHabitTimer())}
            style={{ backgroundColor: 'var(--accent-primary)' }}
            className="w-8 h-8 rounded-xl text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            title={isRunning ? 'Pause timer' : 'Resume timer'}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} fill="white" />}
          </button>

          <button
            onClick={() => void stopAndLogHabitTimer(true)}
            className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            title="Finish, log focus minutes, and check off habit"
          >
            <Check size={13} />
            <span>Done</span>
          </button>

          <button
            onClick={() => setFocusStudioOpen(true)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:text-[var(--text-primary)] cursor-pointer"
            title="Expand Deep Focus Studio"
          >
            <Maximize2 size={13} />
          </button>

          <button
            onClick={discardHabitTimer}
            style={{ color: 'var(--text-muted)' }}
            className="w-7 h-8 rounded-xl flex items-center justify-center hover:text-rose-400 cursor-pointer"
            title="Discard timer"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
