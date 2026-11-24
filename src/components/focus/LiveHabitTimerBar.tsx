import React, { useEffect, useState } from 'react';
import { Play, Pause, Check, X, Maximize2, Plus, Sparkles } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { sendOsNotification } from '../../lib/reminders';
import { sound } from '../../lib/audio';
import { HabitIconView } from '../../lib/habitIcons';

export function formatHms(totalSeconds: number, padHours = true): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    const hrsStr = padHours ? String(hrs).padStart(2, '0') : String(hrs);
    return `${hrsStr}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatHmsParts(totalSeconds: number): { hrs: string | null; mins: string; secs: string } {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return {
    hrs: hrs > 0 ? String(hrs).padStart(2, '0') : null,
    mins: String(mins).padStart(2, '0'),
    secs: String(secs).padStart(2, '0'),
  };
}

export function formatDurationHuman(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.round((safe % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${Math.max(1, mins)}m`;
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
  const extendHabitTimer = useHabitStore((s) => s.extendHabitTimer);
  const stopAndLogHabitTimer = useHabitStore((s) => s.stopAndLogHabitTimer);
  const discardHabitTimer = useHabitStore((s) => s.discardHabitTimer);
  const setFocusStudioOpen = useHabitStore((s) => s.setFocusStudioOpen);
  const markHabitTimerTargetNotified = useHabitStore((s) => s.markHabitTimerTargetNotified);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showElapsed, setShowElapsed] = useState<boolean>(false);

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
  const progressRatio = Math.min(1, Math.max(0, elapsedSeconds / Math.max(1, timer.targetSeconds)));
  const progressPct = Math.min(100, Math.round(progressRatio * 100));

  const activeSeconds = showElapsed || targetReached ? elapsedSeconds : remainingSeconds;
  const parts = formatHmsParts(activeSeconds);
  const displayTime = formatHms(activeSeconds);
  const isRunning = Boolean(timer.startedAtMs);
  const habitColor = timer.habitColor || '#6366f1';

  // SVG Radial Gauge Calculations
  const ringRadius = 16;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~100.5px
  const strokeDashoffset = ringCircumference * (1 - progressRatio);

  // Sync window title in real time
  useEffect(() => {
    const prevTitle = document.title;
    if (timer.startedAtMs) {
      document.title = `${displayTime} · ${timer.habitName} — Zion`;
    } else {
      document.title = `Paused (${displayTime}) · ${timer.habitName} — Zion`;
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

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: targetReached ? '#10b981' : `${habitColor}45`,
        boxShadow: `0 18px 40px -10px rgba(0, 0, 0, 0.45), 0 0 20px -4px ${targetReached ? '#10b98125' : `${habitColor}20`}`,
      }}
      className="fixed bottom-20 md:bottom-5 right-3 left-3 sm:left-auto sm:w-[385px] z-40 rounded-2xl border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200 backdrop-blur-xl select-none"
    >
      {/* Live Top Embedded Progress Strip */}
      <div className="w-full h-1 bg-white/[0.06] overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            backgroundColor: targetReached ? '#10b981' : habitColor,
          }}
        />
      </div>

      <div className="p-3 flex items-center justify-between gap-2.5">
        {/* Left: Concentric Gauge + Real-Time Digital Clock */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Circular SVG Gauge around Habit Icon */}
          <div
            onClick={() => setFocusStudioOpen(true)}
            className="relative w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer group/gauge"
            title="Open Deep Focus Studio"
          >
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 38 38">
              <circle
                cx="19"
                cy="19"
                r={ringRadius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="2.8"
              />
              <circle
                cx="19"
                cy="19"
                r={ringRadius}
                fill="none"
                stroke={targetReached ? '#10b981' : habitColor}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease',
                  filter: `drop-shadow(0 0 3px ${targetReached ? '#10b981' : habitColor})`,
                }}
              />
            </svg>
            <div
              className={`absolute inset-0 flex items-center justify-center ${
                isRunning ? 'animate-pulse' : ''
              }`}
            >
              {targetReached ? (
                <Sparkles size={15} className="text-emerald-400" />
              ) : (
                <HabitIconView
                  iconId={timer.habitEmoji || 'target'}
                  color={habitColor}
                  size={15}
                />
              )}
            </div>
          </div>

          {/* Habit Details & Perfect Tabular Digital Clock */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                onClick={() => setFocusStudioOpen(true)}
                className="text-xs font-bold truncate cursor-pointer hover:underline"
                style={{ color: 'var(--text-primary)' }}
                title={timer.habitName}
              >
                {timer.habitName}
              </span>
              <span
                style={{
                  backgroundColor: `${habitColor}18`,
                  borderColor: `${habitColor}35`,
                  color: habitColor,
                }}
                className="px-1.5 py-[1px] rounded text-[9.5px] font-bold font-mono border shrink-0"
              >
                {formatDurationHuman(timer.targetSeconds)}
              </span>
            </div>

            {/* Click to flip remaining vs elapsed */}
            <div
              onClick={() => setShowElapsed((prev) => !prev)}
              className="flex items-baseline gap-1 mt-0.5 cursor-pointer group/time"
              title={`Click to flip: currently showing ${showElapsed ? 'Elapsed Time' : 'Remaining Time'}`}
            >
              <div className="font-mono text-base font-extrabold tracking-tight leading-none flex items-center tabular-nums">
                {parts.hrs && (
                  <>
                    <span style={{ color: 'var(--text-primary)' }}>{parts.hrs}</span>
                    <span className={`mx-[1.5px] opacity-60 ${isRunning ? 'animate-pulse' : ''}`}>:</span>
                  </>
                )}
                <span style={{ color: 'var(--text-primary)' }}>{parts.mins}</span>
                <span className={`mx-[1.5px] opacity-60 ${isRunning ? 'animate-pulse' : ''}`}>:</span>
                <span style={{ color: targetReached ? '#10b981' : habitColor }}>{parts.secs}</span>
              </div>
              <span className="text-[9px] font-mono font-bold text-[var(--text-muted)] uppercase group-hover/time:text-[var(--text-primary)] transition-colors ml-1">
                {targetReached ? 'OVER' : showElapsed ? 'ELAPSED' : 'LEFT'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pause / Resume */}
          <button
            onClick={() => (isRunning ? pauseHabitTimer() : resumeHabitTimer())}
            style={{
              backgroundColor: isRunning ? 'var(--bg-surface-elevated)' : habitColor,
              color: isRunning ? 'var(--text-primary)' : '#ffffff',
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm border border-transparent"
            title={isRunning ? 'Pause timer' : 'Resume timer'}
          >
            {isRunning ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* Finish & Check In */}
          <button
            onClick={() => void stopAndLogHabitTimer(true)}
            className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Finish, log focus minutes, and check off habit"
          >
            <Check size={13} strokeWidth={2.4} />
            <span>Done</span>
          </button>

          {/* Quick Extend +5m */}
          <button
            onClick={() => extendHabitTimer(5)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            className="h-8 px-1.5 rounded-xl border text-[10px] font-bold font-mono flex items-center gap-0.5 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Extend by +5 minutes"
          >
            <Plus size={10} />
            <span>5m</span>
          </button>

          {/* Maximize to Studio */}
          <button
            onClick={() => setFocusStudioOpen(true)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
            }}
            className="w-7 h-8 rounded-xl flex items-center justify-center hover:text-[var(--text-primary)] cursor-pointer"
            title="Expand Deep Focus Studio"
          >
            <Maximize2 size={12} />
          </button>

          {/* Discard */}
          <button
            onClick={discardHabitTimer}
            style={{ color: 'var(--text-muted)' }}
            className="w-6 h-8 rounded-xl flex items-center justify-center hover:text-rose-400 cursor-pointer"
            title="Discard timer"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
