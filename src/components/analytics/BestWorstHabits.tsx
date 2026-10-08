import React from 'react';
import { Card } from '../ui/Card';
import { useHabitStore } from '../../store/useHabitStore';
import { computeHabitsMonthlyProgress } from '../../lib/statsUtils';
import { TrendingUp, AlertCircle } from 'lucide-react';

export const BestWorstHabits: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const currentDate = useHabitStore((s) => s.currentDate);

  const progressList = computeHabitsMonthlyProgress(
    habits,
    checkins,
    selectedYear,
    selectedMonth,
    currentDate
  );

  if (progressList.length < 2) return null;

  const topHabits = progressList.slice(0, 3);
  const lowestHabits = [...progressList].reverse().slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Top Performing */}
      <Card className="flex flex-col justify-between">
        <div style={{ color: 'var(--status-success)' }} className="flex items-center gap-2 mb-3">
          <TrendingUp size={18} />
          <h3
            style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}
            className="text-[13px] font-bold uppercase tracking-wider"
          >
            Top Performing Habits
          </h3>
        </div>

        <div className="space-y-2.5">
          {topHabits.map((item) => (
            <div
              key={item.habit.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-3 rounded-[12px] border flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.habit.color }}
                />
                <span style={{ color: 'var(--text-primary)' }} className="text-[13.5px] font-semibold">
                  {item.habit.name}
                </span>
              </div>
              <span
                style={{ color: 'var(--status-success)' }}
                className="font-num text-[14px] font-bold"
              >
                {Math.round(item.rate * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Needs Attention */}
      <Card className="flex flex-col justify-between">
        <div style={{ color: 'var(--status-danger)' }} className="flex items-center gap-2 mb-3">
          <AlertCircle size={18} />
          <h3
            style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}
            className="text-[13px] font-bold uppercase tracking-wider"
          >
            Needs More Attention
          </h3>
        </div>

        <div className="space-y-2.5">
          {lowestHabits.map((item) => (
            <div
              key={item.habit.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-3 rounded-[12px] border flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.habit.color }}
                />
                <span style={{ color: 'var(--text-primary)' }} className="text-[13.5px] font-semibold">
                  {item.habit.name}
                </span>
              </div>
              <span
                style={{ color: 'var(--status-danger)' }}
                className="font-num text-[14px] font-bold"
              >
                {Math.round(item.rate * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
