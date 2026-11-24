import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, X, RotateCcw, FastForward, Play, Pause, Check, Zap, Smile, Meh, Frown } from 'lucide-react';
import { HabitIconView } from '../../lib/habitIcons';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate, getDayName, getMonthName } from '../../lib/dateUtils';
import { clsx } from 'clsx';

interface HabitReplaySliderProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HabitReplaySlider: React.FC<HabitReplaySliderProps> = ({ isOpen, onClose }) => {
  const { habits, checkins, wellnessLogs, currentDate } = useHabitStore();
  const [replayDate, setReplayDate] = useState(currentDate);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDirection, setPlayDirection] = useState<'forward' | 'backward'>('forward');
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeHabits = habits.filter(h => !h.archived);
  const todayStr = formatLocalDate(currentDate);
  const replayDateStr = formatLocalDate(replayDate);

  // Get checkins for replay date
  const replayCheckins = activeHabits.map(habit => {
    const key = `${habit.id}_${replayDateStr}`;
    const checkin = checkins[key];
    return {
      habit,
      checkin,
      isCompleted: checkin?.completed || false,
      value: checkin?.value || 0,
      note: checkin?.note || '',
      mood: checkin?.mood,
    };
  });

  // Get wellness log for replay date
  const wellnessLog = wellnessLogs[replayDateStr];

  // Calculate completion stats for replay date
  const scheduledToday = activeHabits.filter(h => {
    const dayOfWeek = replayDate.getDay();
    return h.schedule_days.includes(dayOfWeek);
  });
  const completedCount = replayCheckins.filter(c => c.isCompleted).length;
  const scheduledCount = scheduledToday.length;
  const completionRate = scheduledCount > 0 ? (completedCount / scheduledCount) * 100 : 0;

  // Date navigation
  const goToPreviousDay = () => {
    setReplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    setReplayDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setReplayDate(currentDate);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const setPlaySpeed = (direction: 'forward' | 'backward') => {
    setPlayDirection(direction);
    setIsPlaying(true);
  };

  // Auto-play effect
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        if (playDirection === 'forward') {
          goToNextDay();
          if (formatLocalDate(replayDate) >= todayStr) {
            setIsPlaying(false);
          }
        } else {
          goToPreviousDay();
          const oneYearAgo = new Date(currentDate);
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (replayDate <= oneYearAgo) {
            setIsPlaying(false);
          }
        }
      }, 750);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playDirection, replayDate, currentDate, todayStr]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPreviousDay();
      if (e.key === 'ArrowRight') goToNextDay();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const isToday = formatLocalDate(replayDate) === todayStr;
  const isFuture = replayDate > currentDate;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-[16px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] bg-[#131316]"
          style={{
            backgroundColor: '#131316',
            borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.08)',
            color: 'var(--text-primary, #f4f4f6)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header with Date Display & Controls */}
          <div
            className="p-4 sm:p-5 border-b flex-shrink-0 bg-[#0e0e11]"
            style={{
              borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
              backgroundColor: '#0e0e11',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                title="Close Replay"
                aria-label="Close replay"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Date Navigator */}
              <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3">
                <button
                  onClick={goToPreviousDay}
                  disabled={isPlaying}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                  title="Previous Day (Left Arrow)"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center min-w-0">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <motion.span
                      key={replayDateStr}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="text-lg sm:text-2xl font-bold tracking-tight"
                      style={{ color: 'var(--text-primary, #f4f4f6)' }}
                    >
                      {replayDate.getDate()} {getMonthName(replayDate.getMonth())} {replayDate.getFullYear()}
                    </motion.span>
                    {isToday && (
                      <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-[11px] font-bold tracking-wide">
                        TODAY
                      </span>
                    )}
                    {isFuture && (
                      <span className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full text-[11px] font-bold tracking-wide">
                        FUTURE
                      </span>
                    )}
                    {!isToday && !isFuture && (
                      <span className="px-2.5 py-0.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-full text-[11px] font-bold tracking-wide">
                        {getDayName(replayDate.getDay()).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, #9898a4)' }}>
                    {scheduledCount} scheduled • {completedCount} completed • {Math.round(completionRate)}% completed
                  </p>
                </div>

                <button
                  onClick={goToNextDay}
                  disabled={isPlaying || isFuture}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                  title="Next Day (Right Arrow)"
                  aria-label="Next day"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={goToToday}
                disabled={isToday}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 flex-shrink-0"
                title="Jump to Today"
                aria-label="Go to today"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.065))' }}>
              <button
                onClick={() => setPlaySpeed('backward')}
                className={clsx(
                  'p-2 rounded-xl transition-all border',
                  isPlaying && playDirection === 'backward'
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border-transparent'
                )}
                title="Play Backward"
                aria-label="Play backward"
              >
                <FastForward className="w-4 h-4 rotate-180" />
              </button>
              <button
                onClick={togglePlay}
                className={clsx(
                  'px-4 py-2 rounded-xl font-semibold text-xs tracking-wide transition-all shadow-md flex items-center gap-2 border',
                  isPlaying
                    ? 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                )}
                title="Spacebar to Play/Pause"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause Replay' : 'Play Time-Lapse'}</span>
              </button>
              <button
                onClick={() => setPlaySpeed('forward')}
                className={clsx(
                  'p-2 rounded-xl transition-all border',
                  isPlaying && playDirection === 'forward'
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border-transparent'
                )}
                title="Play Forward"
                aria-label="Play forward"
              >
                <FastForward className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Daily Reflection / Wellness Summary Card */}
          <AnimatePresence mode="wait">
            {(wellnessLog || isToday) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 sm:px-5 py-3.5 border-b flex-shrink-0"
                style={{
                  backgroundColor: 'var(--bg-surface-card, #17171a)',
                  borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary, #9898a4)' }}>
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Daily Reflection
                  </h4>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 flex-shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted, #5e5e6c)' }}>Energy</p>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                        {wellnessLog?.energy ? `${wellnessLog.energy}/5` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="w-px h-7 bg-white/10" />

                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-pink-500/15 border border-pink-500/25 text-pink-400 flex-shrink-0">
                      <Smile className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted, #5e5e6c)' }}>Mood</p>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                        {wellnessLog?.mood ? `${wellnessLog.mood}/5` : '—'}
                      </p>
                    </div>
                  </div>

                  {wellnessLog?.note && (
                    <div className="flex-1 min-w-[200px] text-xs italic px-3 py-1.5 rounded-lg border bg-white/[0.02]" style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.065))', color: 'var(--text-secondary, #9898a4)' }}>
                      "{wellnessLog.note}"
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Habits List */}
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5"
            style={{ backgroundColor: 'var(--bg-surface-elevated, #131316)' }}
          >
            {scheduledToday.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-white/[0.03] border border-white/5">
                  <Calendar className="w-6 h-6 text-zinc-500" />
                </div>
                <p className="text-sm font-semibold text-zinc-300">No habits scheduled</p>
                <p className="text-xs text-zinc-500 mt-1">None of your active routines were scheduled for {getDayName(replayDate.getDay())}</p>
              </div>
            ) : (
              scheduledToday.map((habit, index) => {
                const checkinData = replayCheckins.find(c => c.habit.id === habit.id);
                const isCompleted = checkinData?.isCompleted || false;
                const isNumeric = habit.type === 'numeric';

                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: index * 0.02 }}
                    className={clsx(
                      'p-3.5 sm:p-4 rounded-2xl border transition-all',
                      isCompleted
                        ? 'border-emerald-500/30'
                        : 'border-white/[0.065]'
                    )}
                    style={{
                      backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-surface-card, #17171a)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Completion indicator */}
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all flex-shrink-0 border',
                          isCompleted
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950/50'
                            : 'bg-white/[0.04] border-white/10'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5 text-white stroke-[2.5]" />
                        ) : (
                          <HabitIconView iconId={habit.emoji} color={habit.color} size={18} />
                        )}
                      </div>

                      {/* Habit info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                            {habit.name}
                          </span>
                          {isNumeric && habit.target_value && habit.unit && (
                            <span
                              className="text-[11px] px-2 py-0.5 rounded-md border font-medium"
                              style={{
                                backgroundColor: 'var(--bg-surface-subtle, #1c1c20)',
                                borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
                                color: 'var(--text-secondary, #9898a4)',
                              }}
                            >
                              Target: {habit.target_value} {habit.unit}
                            </span>
                          )}
                        </div>

                        {/* Numeric Progress Bar */}
                        {isNumeric && checkinData && checkinData.value > 0 && (
                          <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-emerald-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (checkinData.value / (habit.target_value || 1)) * 100)}%` }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                        )}

                        {checkinData?.note && (
                          <p className="mt-1 text-xs italic truncate" style={{ color: 'var(--text-secondary, #9898a4)' }}>
                            "{checkinData.note}"
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      {isCompleted ? (
                        <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold flex-shrink-0">
                          Done
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-white/[0.04] border border-white/5 text-zinc-500 rounded-full text-xs font-medium flex-shrink-0">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Mood indicator on checkin */}
                    {checkinData?.mood && (
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-2">
                        <span className="text-[11px]" style={{ color: 'var(--text-muted, #5e5e6c)' }}>Mood:</span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                          {checkinData.mood === 'energized' && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                          {checkinData.mood === 'good' && <Smile className="w-3.5 h-3.5 text-emerald-400" />}
                          {checkinData.mood === 'neutral' && <Meh className="w-3.5 h-3.5 text-blue-400" />}
                          {checkinData.mood === 'tired' && <Frown className="w-3.5 h-3.5 text-rose-400" />}
                          {checkinData.mood}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* Unscheduled habits (collapsed) */}
            {activeHabits.filter(h => !scheduledToday.includes(h)).length > 0 && (
              <details className="group pt-2">
                <summary className="flex items-center justify-between p-3 text-xs font-semibold rounded-xl cursor-pointer border hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.065))', color: 'var(--text-secondary, #9898a4)' }}>
                  <span>+ {activeHabits.filter(h => !scheduledToday.includes(h)).length} unscheduled habits</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-zinc-500" />
                </summary>
                <div className="space-y-1.5 px-2 pt-2">
                  {activeHabits.filter(h => !scheduledToday.includes(h)).map(habit => {
                    const checkinData = replayCheckins.find(c => c.habit.id === habit.id);
                    const isCompleted = checkinData?.isCompleted || false;
                    return (
                      <div
                        key={habit.id}
                        className="p-2.5 rounded-xl text-xs flex items-center justify-between border"
                        style={{
                          backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-card, #17171a)',
                          borderColor: isCompleted ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle, rgba(255,255,255,0.065))',
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <HabitIconView iconId={habit.emoji} color={habit.color} size={15} />
                          <span className={clsx('truncate font-medium', isCompleted ? 'text-emerald-400' : 'text-zinc-300')}>
                            {habit.name}
                          </span>
                        </div>
                        {isCompleted && (
                          <span className="text-[11px] font-semibold text-emerald-400 inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Done
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* Date Scrubber Timeline Slider at Bottom */}
          <div
            className="p-4 sm:p-5 border-t flex-shrink-0"
            style={{
              borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
              backgroundColor: 'var(--bg-surface, #0e0e11)',
            }}
          >
            <div className="relative">
              <input
                type="range"
                min={0}
                max={365}
                value={Math.max(0, Math.floor((currentDate.getTime() - replayDate.getTime()) / (1000 * 60 * 60 * 24)))}
                onChange={e => {
                  const daysBack = parseInt(e.target.value);
                  const newDate = new Date(currentDate);
                  newDate.setDate(newDate.getDate() - daysBack);
                  setReplayDate(newDate);
                }}
                className="w-full h-2 rounded-full cursor-pointer appearance-none accent-indigo-500"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle, #1c1c20)',
                }}
              />
              <div className="flex justify-between text-xs font-semibold mt-2" style={{ color: 'var(--text-muted, #5e5e6c)' }}>
                <span>Today</span>
                <span>1 Year Ago</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
