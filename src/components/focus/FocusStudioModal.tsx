import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Headphones,
  Clock,
  Flame,
  Check,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { soundscapeEngine } from '../../lib/soundscapes';
import { formatLocalDate } from '../../lib/dateUtils';
import { sendOsNotification } from '../../lib/reminders';
import { formatHms } from './LiveHabitTimerBar';
import type { SoundscapeType } from '../../lib/types';

const SOUNDSCAPES: Array<{ id: SoundscapeType; label: string; desc: string }> = [
  { id: 'none', label: 'Silence', desc: 'No background audio' },
  { id: 'brown_noise', label: 'Brown Noise', desc: 'Deep warm focus shield' },
  { id: 'rain', label: 'Rainfall', desc: 'Natural steady rain' },
  { id: 'gamma_40hz', label: '40Hz Gamma', desc: 'Cognitive focus wave' },
  { id: 'lofi_pad', label: 'Studio Pad', desc: 'Calm ambient drone' },
];

const PRESETS = [
  { label: '25m', mins: 25 },
  { label: '45m', mins: 45 },
  { label: '1h', mins: 60 },
  { label: '2h', mins: 120 },
  { label: '3h', mins: 180 },
];

export const FocusStudioModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.focusStudioOpen);
  if (!isOpen) return null;
  return <FocusStudioModalInner />;
};

const FocusStudioModalInner: React.FC = () => {
  const setFocusStudioOpen = useHabitStore((s) => s.setFocusStudioOpen);
  const habits = useHabitStore((s) => s.habits || []);
  const focusSessions = useHabitStore((s) => s.focusSessions || []);
  const currentDate = useHabitStore((s) => s.currentDate || new Date());
  const logFocusSession = useHabitStore((s) => s.logFocusSession);

  const activeHabitTimer = useHabitStore((s) => s.activeHabitTimer);
  const startHabitTimer = useHabitStore((s) => s.startHabitTimer);
  const pauseHabitTimer = useHabitStore((s) => s.pauseHabitTimer);
  const resumeHabitTimer = useHabitStore((s) => s.resumeHabitTimer);
  const stopAndLogHabitTimer = useHabitStore((s) => s.stopAndLogHabitTimer);
  const discardHabitTimer = useHabitStore((s) => s.discardHabitTimer);
  const setHabitTimerSoundscape = useHabitStore((s) => s.setHabitTimerSoundscape);

  const activeHabits = useMemo(() => habits.filter((h) => !h?.archived), [habits]);

  // Local setup state when no global activeHabitTimer is running
  const [initialMinutes, setInitialMinutes] = useState<number>(25);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('25');
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isLocalRunning, setIsLocalRunning] = useState<boolean>(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [autoCheckin, setAutoCheckin] = useState<boolean>(true);
  const [localSoundscape, setLocalSoundscape] = useState<SoundscapeType>('none');
  const [volume, setVolume] = useState<number>(soundscapeEngine.getVolume());
  const [sessionCompletedBanner, setSessionCompletedBanner] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const todayStr = formatLocalDate(currentDate);
  const todayFocusMins = useMemo(
    () =>
      focusSessions
        .filter((s) => s.date === todayStr)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
    [focusSessions, todayStr]
  );

  // Live tick for activeHabitTimer
  useEffect(() => {
    if (!activeHabitTimer?.startedAtMs) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(id);
  }, [activeHabitTimer?.startedAtMs]);

  useEffect(() => {
    soundscapeEngine.setVolume(volume);
  }, [volume]);

  // Local non-habit fallback timer
  useEffect(() => {
    if (activeHabitTimer || !isLocalRunning) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsLocalRunning(false);
          soundscapeEngine.stop();
          void logFocusSession({
            habit_name: 'Deep Work Session',
            duration_minutes: initialMinutes,
            soundscape: localSoundscape,
            autoCheckin: false,
          });
          void sendOsNotification(
            'Deep Focus Complete!',
            `${initialMinutes}m Deep Work Session logged.`
          );
          setSessionCompletedBanner(`Logged ${initialMinutes}m Deep Work session!`);
          return initialMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeHabitTimer, isLocalRunning, initialMinutes, localSoundscape, logFocusSession]);

  // When selecting a habit with a daily_focus_minutes goal, auto-fill duration
  const handleSelectHabit = (id: string) => {
    setSelectedHabitId(id);
    const h = activeHabits.find((item) => item.id === id);
    if (h?.daily_focus_minutes && h.daily_focus_minutes > 0) {
      setInitialMinutes(h.daily_focus_minutes);
      setCustomMinutesInput(String(h.daily_focus_minutes));
      setSecondsLeft(h.daily_focus_minutes * 60);
    }
  };

  const applyPreset = (mins: number) => {
    const clamped = Math.max(1, Math.min(480, mins));
    setIsLocalRunning(false);
    setInitialMinutes(clamped);
    setCustomMinutesInput(String(clamped));
    setSecondsLeft(clamped * 60);
    setSessionCompletedBanner(null);
  };

  const handleStart = () => {
    setSessionCompletedBanner(null);
    if (activeHabitTimer) {
      if (activeHabitTimer.startedAtMs) pauseHabitTimer();
      else resumeHabitTimer();
      return;
    }

    const chosenHabit = activeHabits.find((h) => h.id === selectedHabitId);
    if (chosenHabit) {
      startHabitTimer(chosenHabit, initialMinutes, 'countdown');
      if (localSoundscape !== 'none') {
        setHabitTimerSoundscape(localSoundscape);
      }
      return;
    }

    // General Deep Work (no habit linked)
    if (secondsLeft === 0) setSecondsLeft(initialMinutes * 60);
    const nextRun = !isLocalRunning;
    setIsLocalRunning(nextRun);
    if (nextRun && localSoundscape !== 'none') {
      soundscapeEngine.play(localSoundscape);
    } else {
      soundscapeEngine.stop();
    }
  };

  const handleFinishAndLog = async () => {
    if (activeHabitTimer) {
      const mins = await stopAndLogHabitTimer(autoCheckin);
      setSessionCompletedBanner(`Logged ${mins}m for "${activeHabitTimer.habitName}"!`);
      return;
    }
    const elapsed = Math.max(1, Math.floor((initialMinutes * 60 - secondsLeft) / 60));
    setIsLocalRunning(false);
    soundscapeEngine.stop();
    await logFocusSession({
      habit_name: 'Deep Work Session',
      duration_minutes: elapsed,
      soundscape: localSoundscape,
      autoCheckin: false,
    });
    setSessionCompletedBanner(`Logged ${elapsed}m Deep Work session!`);
    setSecondsLeft(initialMinutes * 60);
  };

  const handleSoundscapeChange = (s: SoundscapeType) => {
    if (activeHabitTimer) {
      setHabitTimerSoundscape(s);
    } else {
      setLocalSoundscape(s);
      if (isLocalRunning) {
        if (s === 'none') soundscapeEngine.stop();
        else soundscapeEngine.play(s);
      }
    }
  };

  // Compute display values (from activeHabitTimer if present, else local timer)
  const isUsingGlobal = Boolean(activeHabitTimer);
  const isRunning = isUsingGlobal ? Boolean(activeHabitTimer?.startedAtMs) : isLocalRunning;
  const activeSoundscape = isUsingGlobal ? activeHabitTimer!.soundscape : localSoundscape;

  let displayTimeText = formatHms(secondsLeft);
  let progress = Math.min(1, Math.max(0, 1 - secondsLeft / Math.max(1, initialMinutes * 60)));
  let displayHabitName = 'Deep Work Session';
  let elapsedMinutes = Math.floor((initialMinutes * 60 - secondsLeft) / 60);
  let accentColor = 'var(--accent-primary)';

  if (activeHabitTimer) {
    const elapsedSecs =
      activeHabitTimer.accumulatedSeconds +
      (activeHabitTimer.startedAtMs ? Math.max(0, Math.floor((nowMs - activeHabitTimer.startedAtMs) / 1000)) : 0);
    const remSecs = Math.max(0, activeHabitTimer.targetSeconds - elapsedSecs);
    displayTimeText = elapsedSecs >= activeHabitTimer.targetSeconds ? formatHms(elapsedSecs) : formatHms(remSecs);
    progress = Math.min(1, Math.max(0, elapsedSecs / Math.max(1, activeHabitTimer.targetSeconds)));
    displayHabitName = activeHabitTimer.habitName;
    elapsedMinutes = Math.floor(elapsedSecs / 60);
    accentColor = activeHabitTimer.habitColor || 'var(--accent-primary)';
  }

  const radius = 84;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={() => setFocusStudioOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Headphones size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Deep Focus Studio
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Real-time persistent habit timer, offline soundscapes & auto check-in
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <Flame size={13} className="text-amber-400" />
              <span className="font-num">{todayFocusMins}m</span>
              <span>today</span>
            </div>
            <button
              onClick={() => setFocusStudioOpen(false)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
              title="Minimize to floating bar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {sessionCompletedBanner && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{sessionCompletedBanner}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            {/* Left: Circular Progress Timer */}
            <div
              className="flex flex-col items-center justify-center p-5 rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                  <span className="font-num text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {displayTimeText}
                  </span>
                  <span className="text-[11px] font-medium mt-1 truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                    {displayHabitName}
                  </span>
                </div>
              </div>

              {/* Primary Timer Controls */}
              <div className="flex flex-wrap items-center gap-2 mt-4 w-full justify-center">
                <button
                  onClick={handleStart}
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                  className="px-4 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  {isRunning ? <Pause size={15} /> : <Play size={15} fill="white" />}
                  <span>{isRunning ? 'Pause' : isUsingGlobal ? 'Resume' : 'Start Focus'}</span>
                </button>

                {isUsingGlobal ? (
                  <>
                    <button
                      onClick={() => void handleFinishAndLog()}
                      className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Finish session, log minutes, and check in habit"
                    >
                      <Check size={14} />
                      <span>Finish & Log</span>
                    </button>
                    <button
                      onClick={discardHabitTimer}
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-muted)',
                      }}
                      className="p-2.5 rounded-xl border hover:text-rose-400 transition-colors cursor-pointer"
                      title="Discard active timer"
                    >
                      <RotateCcw size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsLocalRunning(false);
                        setSecondsLeft(initialMinutes * 60);
                      }}
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                      className="p-2.5 rounded-xl border hover:text-[var(--text-primary)] cursor-pointer"
                      title="Reset Timer"
                    >
                      <RotateCcw size={15} />
                    </button>
                    {elapsedMinutes >= 1 && (
                      <button
                        onClick={() => void handleFinishAndLog()}
                        className="px-3 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold cursor-pointer"
                      >
                        Log {elapsedMinutes}m
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right: Session Configuration */}
            <div className="space-y-4">
              {!isUsingGlobal && (
                <>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>
                      Duration Target (up to 8h)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {PRESETS.map((p) => {
                        const active = initialMinutes === p.mins;
                        return (
                          <button
                            key={p.mins}
                            onClick={() => applyPreset(p.mins)}
                            style={{
                              backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                              borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                              color: active ? '#ffffff' : 'var(--text-secondary)',
                            }}
                            className="py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer"
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min={1}
                        max={480}
                        value={customMinutesInput}
                        onChange={(e) => setCustomMinutesInput(e.target.value)}
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                        className="w-20 h-8 px-2.5 rounded-lg border text-xs font-num outline-none focus:border-[var(--accent-primary)]"
                      />
                      <button
                        onClick={() => {
                          const parsed = parseInt(customMinutesInput, 10);
                          if (!isNaN(parsed) && parsed > 0) applyPreset(parsed);
                        }}
                        style={{
                          backgroundColor: 'var(--bg-surface-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                        className="h-8 px-3 rounded-lg border text-xs font-semibold hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Set Custom (min)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Link to Habit
                    </label>
                    <select
                      value={selectedHabitId}
                      onChange={(e) => handleSelectHabit(e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                      className="w-full h-9 px-3 rounded-xl border text-xs outline-none focus:border-[var(--accent-primary)]"
                    >
                      <option value="">General Deep Work (No Habit Linked)</option>
                      {activeHabits.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                          {h.daily_focus_minutes ? ` (${h.daily_focus_minutes}m goal)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {isUsingGlobal && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  className="p-3 rounded-xl border text-xs space-y-1.5"
                >
                  <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    Active Background Session
                  </div>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Your timer keeps running in real time even if you close this window or switch tabs.
                  </p>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={autoCheckin}
                      onChange={(e) => setAutoCheckin(e.target.checked)}
                      className="rounded accent-indigo-500"
                    />
                    <span>Auto check-in habit on Finish & Log</span>
                  </label>
                </div>
              )}

              {/* Offline Soundscapes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Sparkles size={11} className="text-indigo-400" />
                    <span>Offline Soundscape</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {volume === 0 || activeSoundscape === 'none' ? (
                      <VolumeX size={13} style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <Volume2 size={13} className="text-indigo-400" />
                    )}
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-20 accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {SOUNDSCAPES.map((s) => {
                    const active = activeSoundscape === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSoundscapeChange(s.id)}
                        style={{
                          backgroundColor: active ? 'rgba(99,102,241,0.16)' : 'var(--bg-surface-elevated)',
                          borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                        className="p-2 rounded-xl border text-left transition-all cursor-pointer"
                      >
                        <div className="text-[11px] font-bold truncate">{s.label}</div>
                        <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {s.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Focus Sessions */}
          {focusSessions.length > 0 && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={12} />
                  <span>Recent Sessions</span>
                </span>
                <span className="text-[11px] font-num" style={{ color: 'var(--text-muted)' }}>
                  {focusSessions.length} total logged
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {focusSessions.slice(0, 4).map((s) => (
                  <div
                    key={s.id}
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                    className="px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1.5"
                  >
                    <span className="font-bold text-indigo-400 font-num">{s.duration_minutes}m</span>
                    <span style={{ color: 'var(--text-primary)' }} className="truncate max-w-[140px]">
                      {s.habit_name}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>· {s.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
