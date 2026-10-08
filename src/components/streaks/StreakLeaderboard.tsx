import React from 'react';
import { Card } from '../ui/Card';
import { computeHabitsMonthlyProgress } from '../../lib/statsUtils';
import { useHabitStore } from '../../store/useHabitStore';
import { Flame } from 'lucide-react';
import { HabitIconView } from '../../lib/habitIcons';

export const StreakLeaderboard: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const currentDate = useHabitStore((s) => s.currentDate);
  const showEmoji = useHabitStore((s) => s.settings.show_emoji);

  const list = computeHabitsMonthlyProgress(
    habits,
    checkins,
    selectedYear,
    selectedMonth,
    currentDate
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
          className="text-[19px] font-bold flex items-center gap-2"
        >
          <Flame size={20} className="text-[#f59e0b]" />
          Individual Habit Streaks
        </h2>
        <span
          style={{ color: 'var(--text-muted)' }}
          className="text-[12px] font-semibold uppercase tracking-wider"
        >
          Active Streaks
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((item) => (
          <Card key={item.habit.id} className="flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-3">
              <div
                style={{
                  backgroundColor: `${item.habit.color}20`,
                  borderColor: `${item.habit.color}40`,
                  color: item.habit.color,
                }}
                className="w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0"
              >
                <HabitIconView iconId={item.habit.emoji} color={item.habit.color} size={15} />
              </div>
              <h3
                style={{ color: 'var(--text-primary)' }}
                className="text-[14.5px] font-semibold truncate"
              >
                {item.habit.name}
              </h3>
            </div>

            <div
              style={{ borderColor: 'var(--border-subtle)' }}
              className="grid grid-cols-2 gap-2 pt-2 border-t"
            >
              <div>
                <span
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10.5px] font-bold uppercase tracking-wider block"
                >
                  Current Streak
                </span>
                <div
                  style={{ color: '#f59e0b' }}
                  className="text-[24px] font-black font-num leading-tight"
                >
                  {item.currentStreak}{' '}
                  <span style={{ color: 'var(--text-muted)' }} className="text-[13px] font-medium">days</span>
                </div>
              </div>

              <div>
                <span
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10.5px] font-bold uppercase tracking-wider block"
                >
                  Longest Streak
                </span>
                <div
                  style={{ color: 'var(--text-primary)' }}
                  className="text-[24px] font-black font-num leading-tight"
                >
                  {item.longestStreak}{' '}
                  <span style={{ color: 'var(--text-muted)' }} className="text-[13px] font-medium">days</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
