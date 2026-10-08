import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Sparkles } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';

interface FocusTimerProps {
  collapsed?: boolean;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ collapsed = false }) => {
  const [initialMinutes, setInitialMinutes] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedHabitName, setSelectedHabitName] = useState<string>('Focus Session');
  
  const habits = useHabitStore((s) => s.habits);
  const activeHabits = habits.filter((h) => !h.archived);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (window.api) {
              window.api.notify(
                'Focus Timer Completed!',
                `Great work! Your ${selectedHabitName} session has ended.`
              );
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, secondsLeft, selectedHabitName]);

  const toggleTimer = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(initialMinutes * 60);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(initialMinutes * 60);
  };

  const setPreset = (mins: number) => {
    setIsRunning(false);
    setInitialMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const progressRate = 1 - secondsLeft / (initialMinutes * 60);

  // If sidebar is collapsed (icon rail view)
  if (collapsed) {
    return (
      <div className="flex flex-col items-center">
        <button
          onClick={toggleTimer}
          style={{
            backgroundColor: isRunning ? 'var(--accent-primary)' : 'var(--bg-surface)',
            color: isRunning ? '#ffffff' : 'var(--text-secondary)',
            borderColor: isRunning ? 'var(--accent-primary)' : 'var(--border-subtle)',
          }}
          className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-all relative border cursor-pointer hover:text-[var(--text-primary)]"
          title={isRunning ? `Focus Timer: ${formattedTime} (Click to pause)` : 'Start 25m Focus Timer'}
        >
          {isRunning ? (
            <span className="font-num text-[10px] font-bold">
              {mins}m
            </span>
          ) : (
            <Timer size={16} />
          )}
        </button>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
      className="border rounded-[14px] p-2.5 space-y-2"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div style={{ color: 'var(--accent-primary)' }} className="flex items-center gap-1.5">
          <Timer size={13} />
          <span
            style={{ color: 'var(--text-primary)' }}
            className="text-[10px] font-bold uppercase tracking-wider"
          >
            Habit Timer
          </span>
        </div>

        {/* Preset chips (15m, 25m, 45m) */}
        <div className="flex items-center gap-1">
          {[15, 25, 45].map((m) => (
            <button
              key={m}
              onClick={() => setPreset(m)}
              style={{
                backgroundColor: initialMinutes === m ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                borderColor: initialMinutes === m ? 'var(--accent-primary)' : 'transparent',
                color: initialMinutes === m ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
              className="px-1.5 py-0.5 rounded text-[10px] font-num font-bold transition-colors border cursor-pointer hover:text-[var(--text-primary)]"
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Main Countdown Display */}
      <div className="flex items-center justify-between px-1">
        <div>
          <div
            style={{ color: 'var(--text-primary)' }}
            className="font-num text-[22px] font-black leading-tight tracking-tight"
          >
            {formattedTime}
          </div>
          <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-medium">
            {isRunning ? 'Session running' : 'Ready to start'}
          </span>
        </div>

        {/* Play/Pause & Reset Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={resetTimer}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            className="w-7 h-7 rounded-[8px] border hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={toggleTimer}
            style={{
              backgroundColor: isRunning ? 'var(--bg-surface-elevated)' : 'var(--accent-primary)',
              borderColor: isRunning ? 'var(--border-subtle)' : 'var(--accent-primary)',
              color: isRunning ? 'var(--text-primary)' : '#ffffff',
              boxShadow: !isRunning ? '0 0 12px var(--accent-glow)' : 'none',
            }}
            className="h-7 px-2.5 rounded-[8px] flex items-center gap-1 font-bold text-[11px] transition-all border cursor-pointer"
          >
            {isRunning ? (
              <>
                <Pause size={11} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={11} fill="currentColor" />
                <span>Start</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Subtle Progress Bar */}
      <div
        style={{ backgroundColor: 'var(--bg-surface-hover)' }}
        className="w-full h-1 rounded-full overflow-hidden"
      >
        <div
          style={{
            width: `${Math.round(progressRate * 100)}%`,
            backgroundColor: 'var(--accent-primary)',
          }}
          className="h-full transition-all duration-300"
        />
      </div>
    </div>
  );
};
