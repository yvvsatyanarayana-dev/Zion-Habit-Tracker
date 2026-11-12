import React, { useEffect, useState } from 'react';
import { Play, Pause, Check, Maximize2, X, Timer } from 'lucide-react';
import { formatHms } from './LiveHabitTimerBar';
import type { ActiveHabitTimer } from '../../lib/types';

export const DesktopTimerWidget: React.FC = () => {
  const [timer, setTimer] = useState<ActiveHabitTimer | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    if (window.api?.desktopTimer) {
      void window.api.desktopTimer.get().then((t) => {
        if (t) setTimer(t as ActiveHabitTimer);
      });
      const unsub = window.api.desktopTimer.onSync((t) => {
        setTimer((t as ActiveHabitTimer | null) || null);
      });
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (!timer?.startedAtMs) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer?.startedAtMs]);

  if (!timer) {
    return null;
  }

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
  const isRunning = Boolean(timer.startedAtMs);

  const sendAction = (action: 'pause' | 'resume' | 'finish' | 'discard' | 'open-main') => {
    void window.api?.desktopTimer?.sendAction(action);
  };

  return (
    <div
      style={
        {
          WebkitAppRegion: 'drag',
          backgroundColor: 'rgba(13, 13, 18, 0.94)',
          borderColor: targetReached ? '#10b981' : 'rgba(255, 255, 255, 0.14)',
        } as React.CSSProperties
      }
      className="w-screen h-screen rounded-2xl border shadow-2xl overflow-hidden flex flex-col justify-between select-none text-white"
    >
      {/* Top Progress Bar */}
      <div className="w-full h-1.5 bg-white/10">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPct}%`,
            backgroundColor: targetReached ? '#10b981' : timer.habitColor || '#6366f1',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2.5 flex-1">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isRunning ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor: `${timer.habitColor || '#6366f1'}28`,
              color: timer.habitColor || '#818cf8',
            }}
          >
            <Timer size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-zinc-300 truncate">{timer.habitName}</div>
            <div className="font-mono text-xl font-bold tracking-tight leading-tight">
              <span style={{ color: targetReached ? '#34d399' : '#ffffff' }}>{displayTime}</span>
              <span className="text-[10px] font-normal text-zinc-400 ml-1.5">
                / {formatHms(timer.targetSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Controls (no-drag) */}
        <div
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex items-center gap-1 shrink-0"
        >
          <button
            onClick={() => sendAction(isRunning ? 'pause' : 'resume')}
            className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center cursor-pointer transition-colors"
            title={isRunning ? 'Pause' : 'Resume'}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} fill="white" />}
          </button>

          <button
            onClick={() => sendAction('finish')}
            className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Finish & Log"
          >
            <Check size={14} />
          </button>

          <button
            onClick={() => sendAction('open-main')}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 flex items-center justify-center cursor-pointer transition-colors"
            title="Open Zion Main Window"
          >
            <Maximize2 size={13} />
          </button>

          <button
            onClick={() => sendAction('discard')}
            className="w-7 h-8 rounded-xl hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors"
            title="Discard Timer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Subtle Drag Hint */}
      <div className="px-3.5 pb-1.5 flex items-center justify-between text-[9px] text-zinc-500">
        <span>ZION DESKTOP TIMER · ALWAYS ON TOP</span>
        <span>DRAG TO MOVE</span>
      </div>
    </div>
  );
};
