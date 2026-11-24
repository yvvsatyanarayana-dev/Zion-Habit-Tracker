import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  Volume2,
  VolumeX,
  Headphones,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowRight,
  Clock,
  Radio,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { useLiveTimetable } from '../../hooks/useLiveTimetable';
import { formatTimeRange12h } from '../../lib/timetableParser';
import { ambientSound, type AmbientSoundType } from '../../lib/ambientSound';
import { TimetableIcon } from '../timetable/TimetableIcon';

export const ZenStudioModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.zenStudioModalOpen);
  const setOpen = useHabitStore((s) => s.setZenStudioModalOpen);
  const activeTimer = useHabitStore((s) => s.activeHabitTimer);
  const pauseTimer = useHabitStore((s) => s.pauseHabitTimer);
  const resumeTimer = useHabitStore((s) => s.resumeHabitTimer);
  const stopAndLog = useHabitStore((s) => s.stopAndLogHabitTimer);
  const startBlockTimer = useHabitStore((s) => s.startTimetableBlockTimer);

  const { activeStatus, nextBlock } = useLiveTimetable();

  const [soundType, setSoundType] = useState<AmbientSoundType>('none');
  const [volume, setVolume] = useState<number>(0.35);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Clock string
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setCurrentTimeStr(
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync timer ticks
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => {
      const elapsed =
        activeTimer.accumulatedSeconds +
        (activeTimer.startedAtMs ? Math.max(0, Math.floor((Date.now() - activeTimer.startedAtMs) / 1000)) : 0);
      setElapsedSeconds(elapsed);
    }, 500);
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Ambient sound handler
  const handleSelectSound = (type: AmbientSoundType) => {
    setSoundType(type);
    ambientSound.play(type);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    ambientSound.setVolume(v);
  };

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) {
      ambientSound.stop();
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.code === 'Space' && activeTimer) {
        e.preventDefault();
        if (activeTimer.startedAtMs) {
          pauseTimer();
        } else {
          resumeTimer();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      ambientSound.stop();
    };
  }, [isOpen, activeTimer, pauseTimer, resumeTimer, setOpen]);

  if (!isOpen) return null;

  // Format time display
  const targetSeconds = activeTimer?.targetSeconds || (activeStatus ? activeStatus.totalDurationMinutes * 60 : 1500);
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const isCountdown = activeTimer?.mode === 'countdown';

  const displayMins = Math.floor((isCountdown ? remainingSeconds : elapsedSeconds) / 60);
  const displaySecs = (isCountdown ? remainingSeconds : elapsedSeconds) % 60;
  const timeFormatted = `${displayMins.toString().padStart(2, '0')}:${displaySecs.toString().padStart(2, '0')}`;
  const progressRatio = Math.min(1, elapsedSeconds / Math.max(1, targetSeconds));

  const activeTitle = activeTimer?.habitName || activeStatus?.block.title || 'Studio Focus Session';
  const activeCategory = activeStatus?.block.category || 'work';

  return (
    <div className="fixed inset-0 z-50 bg-[#06080d] text-white flex flex-col justify-between p-6 sm:p-10 select-none animate-fade-in overflow-hidden">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight block">Zion Zen Studio</span>
            <span className="text-[11px] font-mono text-zinc-400">
              Desk & Multi-Monitor Deep Focus Companion
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-zinc-400 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
            <Clock size={12} className="text-emerald-400" />
            <span>{currentTimeStr}</span>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer text-zinc-300 hover:text-white"
            title="Exit Zen Mode (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Center Piece: Massive Visual Timer Ring & Focus Objective */}
      <div className="flex flex-col items-center justify-center my-auto py-8 space-y-6 z-10 text-center">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold">
          <TimetableIcon category={activeCategory as any} size={13} />
          <span className="uppercase tracking-wider">{activeCategory}</span>
        </div>

        {/* Active Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight max-w-2xl px-4 text-zinc-100">
          {activeTitle}
        </h1>

        {/* Radial Time Display */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-zinc-800"
              strokeWidth="4"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-indigo-500"
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
              strokeWidth="4"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - progressRatio)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-md">
              {timeFormatted}
            </span>
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest mt-1">
              {isCountdown ? 'Time Remaining' : 'Elapsed Focus'}
            </span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-3 pt-2">
          {activeTimer ? (
            <>
              <button
                onClick={() => (activeTimer.startedAtMs ? pauseTimer() : resumeTimer())}
                className="px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {activeTimer.startedAtMs ? (
                  <>
                    <Pause size={16} fill="currentColor" />
                    <span>Pause (Space)</span>
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    <span>Resume (Space)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => void stopAndLog(true)}
                className="px-5 py-3 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <CheckCircle2 size={16} />
                <span>Finish & Log</span>
              </button>
            </>
          ) : activeStatus?.block ? (
            <button
              onClick={() => startBlockTimer(activeStatus.block)}
              className="px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Play size={16} fill="currentColor" />
              <span>Start Routine Focus</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Bottom Bar: Ambient Soundscape Generator & Up Next Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10 z-10 items-center">
        {/* Soundscape Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-400 font-semibold mr-1">
            <Headphones size={13} className="text-indigo-400" />
            <span>Ambient Focus:</span>
          </span>

          {[
            { id: 'none', label: 'Off' },
            { id: 'rain', label: 'Rain' },
            { id: 'brown_noise', label: 'Brown Noise' },
            { id: 'white_noise', label: 'White Noise' },
            { id: 'gamma_40hz', label: '40Hz Gamma' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectSound(item.id as AmbientSoundType)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                soundType === item.id
                  ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                  : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}

          {soundType !== 'none' && (
            <div className="flex items-center gap-1.5 ml-2">
              <Volume2 size={13} className="text-zinc-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 accent-indigo-500 h-1 bg-zinc-700 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Up Next Teaser */}
        {nextBlock && (
          <div className="flex items-center justify-end gap-2 text-xs text-zinc-400">
            <span>Next up:</span>
            <span className="font-bold text-zinc-200">
              {nextBlock.title}
            </span>
            <span className="font-mono text-zinc-500">
              ({formatTimeRange12h(nextBlock.startTime, nextBlock.endTime)})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
