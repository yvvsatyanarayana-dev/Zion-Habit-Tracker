import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, X, RotateCcw, FastForward, Play, Pause } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import type { Habit, Checkin, WellnessLog } from '../../lib/types';
import { formatLocalDate, getDayName, getMonthName } from '../../lib/dateUtils';
import { clsx } from 'clsx';

interface HabitReplaySliderProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HabitReplaySlider: React.FC<HabitReplaySliderProps> = ({ isOpen, onClose }) => {
  const { habits, checkins, wellnessLogs, currentDate, selectedYear, selectedMonth } = useHabitStore();
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
          // Stop at today
          if (formatLocalDate(replayDate) >= todayStr) {
            setIsPlaying(false);
          }
        } else {
          goToPreviousDay();
          // Stop at 1 year ago
          const oneYearAgo = new Date(currentDate);
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (replayDate <= oneYearAgo) {
            setIsPlaying(false);
          }
        }
      }, 800);
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

  // Close on Escape
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-0"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          className="bg-background rounded-t-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header with Date Display */}
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                aria-label="Close replay"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="flex-1 flex items-center justify-center gap-4">
                <button
                  onClick={goToPreviousDay}
                  disabled={isPlaying}
                  className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center min-w-0">
                  <div className="flex items-center justify-center gap-2">
                    <motion.span
                      key={replayDateStr}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-2xl font-bold text-foreground"
                    >
                      {replayDate.getDate()} {getMonthName(replayDate.getMonth())} {replayDate.getFullYear()}
                    </motion.span>
                    {isToday && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                        TODAY
                      </span>
                    )}
                    {isFuture && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                        FUTURE
                      </span>
                    )}
                    {!isToday && !isFuture && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                        {getDayName(replayDate.getDay())}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {scheduledCount} scheduled • {completedCount} completed • {Math.round(completionRate)}% rate
                  </p>
                </div>

                <button
                  onClick={goToNextDay}
                  disabled={isPlaying || isFuture}
                  className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Next day"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={goToToday}
                disabled={isToday}
                className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 text-primary"
                aria-label="Go to today"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => setPlaySpeed('backward')}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  isPlaying && playDirection === 'backward'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
                aria-label="Play backward"
              >
                <FastForward className="w-5 h-5" style={{ transform: 'rotate(180deg)' }} />
              </button>
              <button
                onClick={togglePlay}
                className={clsx(
                  'p-3 rounded-xl transition-colors',
                  isPlaying ? 'bg-primary text-primary-foreground' : 'bg-accent'
                )}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setPlaySpeed('forward')}
                className={clsx(
                  'p-2 rounded-lg transition-colors',
                  isPlaying && playDirection === 'forward'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
                aria-label="Play forward"
              >
                <FastForward className="w-5 h-5" />
              </button>
              <span className="text-xs text-muted-foreground px-2">
                {isPlaying ? (playDirection === 'forward' ? '▶' : '◀') : '⏸'}
              </span>
            </div>
          </div>

          {/* Wellness Log Display */}
          <AnimatePresence mode="wait">
            {(wellnessLog || isToday) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-3 border-b border-border bg-muted/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Calendar className="w-4 h-4" />
                    Daily Reflection
                  </h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔋</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Energy</p>
                      <p className="font-semibold text-foreground">
                        {wellnessLog?.energy ?? '—'}/5
                        {wellnessLog && (
                          <span className="ml-2">
                            {'★'.repeat(wellnessLog.energy)}{'☆'.repeat(5 - wellnessLog.energy)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-border mx-2" />
                  <div className="flex items-center gap-2">
                    <span className="text-lg">😊</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Mood</p>
                      <p className="font-semibold text-foreground">
                        {wellnessLog?.mood ?? '—'}/5
                        {wellnessLog && (
                          <span className="ml-2">
                            {['😞', '😐', '🙂', '😊', '😄'][wellnessLog.mood - 1] || ''}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {wellnessLog?.note && (
                    <div className="flex-1 text-sm text-muted-foreground italic">
                      "{wellnessLog.note}"
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Habits List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {scheduledToday.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-lg">No habits scheduled</p>
                <p className="text-sm mt-1">for {getDayName(replayDate.getDay())}</p>
              </div>
            ) : (
              scheduledToday.map((habit, index) => {
                const checkinData = replayCheckins.find(c => c.habit.id === habit.id);
                const isCompleted = checkinData?.isCompleted || false;
                const isNumeric = habit.type === 'numeric';

                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className={clsx(
                      'group relative p-4 rounded-xl border transition-all',
                      isCompleted
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-card border-border/50 hover:border-border'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Completion indicator */}
                      <motion.div
                        className={clsx(
                          'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg transition-all',
                          isCompleted
                            ? 'bg-green-500 text-white scale-100'
                            : 'bg-muted border-2 border-border'
                        )}
                        animate={{ scale: isCompleted ? 1 : 1 }}
                      >
                        {isCompleted && <span className="text-xl">✓</span>}
                        {!isCompleted && habit.emoji}
                      </motion.div>

                      {/* Habit info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">{habit.name}</span>
                          {isNumeric && habit.target_value && habit.unit && (
                            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                              Target: {habit.target_value} {habit.unit}
                            </span>
                          )}
                        </div>
                        {isNumeric && checkinData && checkinData.value > 0 && (
                          <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-primary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (checkinData.value / (habit.target_value || 1)) * 100)}%` }}
                              transition={{ delay: 0.2, duration: 0.5 }}
                            />
                          </div>
                        )}
                        {checkinData?.note && (
                          <p className="mt-1 text-sm text-muted-foreground italic truncate">
                            {checkinData.note}
                          </p>
                        )}
                      </div>

                      {/* Status badge */}
                      {isCompleted && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium"
                        >
                          Done
                        </motion.span>
                      )}
                    </div>

                    {/* Mood indicator on checkin */}
                    {checkinData?.mood && (
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
                        <span className="text-sm">Mood:</span>
                        <span className="text-lg">
                          {['😞', '😐', '🙂', '😊', '😄'][checkinData.mood - 1] || ''}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {checkinData.mood === 1 ? 'tired' : checkinData.mood === 2 ? 'neutral' : checkinData.mood === 3 ? 'good' : 'energized'}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* Unscheduled habits (collapsed) */}
            {activeHabits.filter(h => !scheduledToday.includes(h)).length > 0 && (
              <details className="group">
                <summary className="flex items-center justify-between p-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                  <span>+ {activeHabits.filter(h => !scheduledToday.includes(h)).length} unscheduled habits</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="space-y-1 px-4 pb-2">
                  {activeHabits.filter(h => !scheduledToday.includes(h)).map(habit => {
                    const checkinData = replayCheckins.find(c => c.habit.id === habit.id);
                    const isCompleted = checkinData?.isCompleted || false;
                    return (
                      <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={clsx(
                          'p-3 rounded-lg text-sm transition-colors',
                          isCompleted ? 'bg-green-500/10' : 'hover:bg-muted'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{habit.emoji}</span>
                          <span className={clsx('truncate', isCompleted ? 'text-green-400' : 'text-foreground')}>
                            {habit.name}
                          </span>
                          {isCompleted && <span className="ml-auto text-xs text-green-400">✓ Done</span>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* Date Scrubber at bottom */}
          <div className="p-4 border-t border-border flex-shrink-0">
            <div className="relative">
              <input
                type="range"
                min={0}
                max={365}
                value={Math.floor((currentDate.getTime() - replayDate.getTime()) / (1000 * 60 * 60 * 24))}
                onChange={e => {
                  const daysBack = parseInt(e.target.value);
                  const newDate = new Date(currentDate);
                  newDate.setDate(newDate.getDate() - daysBack);
                  setReplayDate(newDate);
                }}
                className="w-full h-2 bg-muted appearance-none rounded-full cursor-pointer"
                style={{
                  background: 'linear-gradient(to right, var(--primary) 0%, var(--primary) 50%, var(--muted) 50%, var(--muted) 100%)'
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Today</span>
                <span>1 Year Ago</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};