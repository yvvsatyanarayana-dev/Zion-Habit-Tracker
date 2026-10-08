import React from 'react';
import { Card } from '../ui/Card';
import { Check, Flame } from 'lucide-react';
import { computeStreakStats } from '../../lib/statsUtils';
import { useHabitStore } from '../../store/useHabitStore';

export const StreakCard: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const streakThreshold = useHabitStore((s) => s.settings.streak_threshold);
  const currentDate = useHabitStore((s) => s.currentDate);

  const stats = computeStreakStats(
    habits,
    allCheckinsList,
    streakThreshold,
    currentDate
  );

  return (
    <Card className="flex flex-col justify-between !p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2
          style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}
          className="text-[12.5px] font-bold uppercase flex items-center gap-1.5"
        >
          <Flame size={15} className="text-[#f59e0b]" />
          Consistency Streak
        </h2>
        <span
          style={{
            backgroundColor: 'var(--bg-surface-hover)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[6px] border"
        >
          Weekly view
        </span>
      </div>

      {/* Hero Streak Number */}
      <div className="my-1">
        <div className="flex items-baseline gap-2">
          <span
            style={{ color: '#f59e0b', letterSpacing: '-0.03em' }}
            className="text-[40px] font-black font-num leading-none"
          >
            {stats.currentStreak}
          </span>
          <span style={{ color: '#f59e0b' }} className="text-[15px] font-bold opacity-90">
            days
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium mt-1">
          {stats.currentStreak > 0
            ? 'Momentum active! ≥ 50% completed daily'
            : 'Complete habits today to ignite your streak'}
        </p>
      </div>

      {/* Row of 7 Day Circles for Current Week */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
        className="rounded-[12px] p-2.5 my-2 border"
      >
        <div className="flex items-center justify-between">
          {stats.currentWeekDays.map((day) => {
            return (
              <div key={day.dateStr} className="flex flex-col items-center gap-1">
                <span style={{ color: 'var(--text-secondary)' }} className="text-[11px] font-bold font-num">
                  {day.weekdayLabel}
                </span>

                <div
                  style={{
                    backgroundColor: day.isCompleted ? '#f59e0b' : 'transparent',
                    borderColor: day.isCompleted ? '#f59e0b' : 'var(--border-medium)',
                  }}
                  className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all ${
                    day.isToday ? 'ring-2 ring-[#f59e0b] ring-offset-2 ring-offset-[var(--bg-surface-elevated)]' : ''
                  } ${
                    day.isCompleted
                      ? 'text-black shadow-sm'
                      : 'border-2 text-transparent'
                  }`}
                  title={`${day.dateStr}: ${day.isCompleted ? 'Streak Achieved' : 'Incomplete'}`}
                >
                  {day.isCompleted && (
                    <Check size={14} strokeWidth={3.5} color="#000000" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row Stats */}
      <div
        style={{ borderColor: 'var(--border-subtle)' }}
        className="grid grid-cols-3 gap-2 pt-2 border-t"
      >
        <div>
          <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-wider font-semibold block">
            Best Streak
          </span>
          <span style={{ color: 'var(--text-primary)' }} className="text-[16px] font-extrabold font-num">
            {stats.longestStreak} <span style={{ color: 'var(--text-muted)' }} className="text-[11px] font-medium">d</span>
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-wider font-semibold block">
            Perfect Days
          </span>
          <span style={{ color: 'var(--text-primary)' }} className="text-[16px] font-extrabold font-num">
            {stats.perfectDaysCount}
          </span>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-wider font-semibold block">
            Check-ins
          </span>
          <span style={{ color: 'var(--text-primary)' }} className="text-[16px] font-extrabold font-num">
            {stats.totalCheckinsCount}
          </span>
        </div>
      </div>
    </Card>
  );
};
