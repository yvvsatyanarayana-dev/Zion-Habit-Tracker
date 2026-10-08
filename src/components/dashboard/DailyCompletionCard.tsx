import React from 'react';
import { Card } from '../ui/Card';
import { RoundedBarChart, DayBarData } from '../ui/RoundedBar';
import { computeMonthDayStats } from '../../lib/statsUtils';
import { useHabitStore } from '../../store/useHabitStore';

export const DailyCompletionCard: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const weekStartDay = useHabitStore((s) => s.settings.week_start_day);
  const streakThreshold = useHabitStore((s) => s.settings.streak_threshold);
  const currentDate = useHabitStore((s) => s.currentDate);

  const { days, overallAverageRate } = computeMonthDayStats(
    habits,
    checkins,
    selectedYear,
    selectedMonth,
    weekStartDay,
    streakThreshold,
    currentDate
  );

  const barData: DayBarData[] = days.map((d) => ({
    dateStr: d.dateStr,
    dayOfMonth: d.dayOfMonth,
    weekdayLabel: d.weekdayLabel,
    completed: d.completedCount,
    total: d.scheduledCount,
    rate: d.rate,
    isToday: d.isToday,
    isPast: d.isPast,
    isFuture: d.isFuture,
  }));

  const avgPct = Math.round(overallAverageRate * 100);

  return (
    <Card className="flex flex-col justify-between !p-5">
      {/* Header with Average Stats */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
              className="text-[28px] font-black font-num leading-tight"
            >
              {avgPct}%
            </span>
            <span style={{ color: 'var(--text-muted)' }} className="text-[13px] font-semibold">
              average
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-normal mt-0.5">
            Daily completion rate across all scheduled habits this month
          </p>
        </div>

        <span
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-[6px] border"
        >
          Monthly Pace
        </span>
      </div>

      {/* Chart */}
      <div className="mt-1 pt-1">
        <RoundedBarChart days={barData} barWidth={11} chartHeight={125} accentColor="#10b981" />
      </div>
    </Card>
  );
};
