import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { computeMonthDayStats } from '../../lib/statsUtils';
import { getWeekdayLabels } from '../../lib/dateUtils';
import { useHabitStore } from '../../store/useHabitStore';

export const MonthCalendarCard: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const weekStartDay = useHabitStore((s) => s.settings.week_start_day);
  const streakThreshold = useHabitStore((s) => s.settings.streak_threshold);
  const currentDate = useHabitStore((s) => s.currentDate);

  const [hoveredDate, setHoveredDate] = useState<{
    dateStr: string;
    completed: number;
    total: number;
    rate: number;
    x: number;
    y: number;
  } | null>(null);

  const { days } = computeMonthDayStats(
    habits,
    checkins,
    selectedYear,
    selectedMonth,
    weekStartDay,
    streakThreshold,
    currentDate
  );

  const weekdayHeaders = getWeekdayLabels(weekStartDay);

  const firstDay = days[0];
  const firstDayOffset = firstDay ? (firstDay.isFirstDayOfWeek ? 0 : (firstDay.weekday - (weekStartDay === 'sun' ? 0 : weekStartDay === 'mon' ? 1 : 4) + 7) % 7) : 0;

  const getCircleColor = (rate: number, isFuture: boolean) => {
    if (isFuture) return 'var(--bg-surface-hover)';
    if (rate <= 0) return 'var(--bg-surface-subtle)';
    if (rate <= 0.25) return 'rgba(16, 185, 129, 0.25)';
    if (rate <= 0.5) return 'rgba(16, 185, 129, 0.5)';
    if (rate <= 0.75) return 'rgba(16, 185, 129, 0.75)';
    return '#10b981';
  };

  return (
    <Card className="flex flex-col justify-between !p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2
          style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}
          className="text-[12.5px] font-bold uppercase"
        >
          Month Calendar
        </h2>
        <span
          style={{
            backgroundColor: 'var(--bg-surface-hover)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[6px] border"
        >
          Heat Circles
        </span>
      </div>

      {/* 7-column calendar grid */}
      <div className="w-full">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
          {weekdayHeaders.map((w) => (
            <span
              key={w}
              style={{ color: 'var(--text-muted)' }}
              className="text-[10px] font-semibold uppercase"
            >
              {w.slice(0, 2)}
            </span>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 place-items-center">
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="w-7 h-7" />
          ))}

          {days.map((d) => {
            const circleBg = getCircleColor(d.rate, d.isFuture);
            const isFilled = !d.isFuture && d.rate > 0;

            return (
              <div
                key={d.dateStr}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredDate({
                    dateStr: d.dateStr,
                    completed: d.completedCount,
                    total: d.scheduledCount,
                    rate: d.rate,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  });
                }}
                onMouseLeave={() => setHoveredDate(null)}
                style={{
                  backgroundColor: circleBg,
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-num text-[11px] font-semibold transition-transform cursor-pointer hover:scale-110 ${
                  d.isToday ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[var(--bg-surface-elevated)] font-black' : ''
                } ${
                  d.isFuture
                    ? 'text-[var(--text-dim)]'
                    : isFilled && d.rate >= 0.75
                    ? 'text-white font-extrabold'
                    : 'text-[var(--text-primary)] font-bold'
                }`}
              >
                {d.dayOfMonth}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend below calendar */}
      <div
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        className="flex items-center justify-between pt-2.5 mt-2 border-t text-[10.5px] font-medium"
      >
        <span>Less</span>
        <div className="flex items-center gap-1">
          <div style={{ backgroundColor: 'var(--bg-surface-subtle)' }} className="w-3 h-3 rounded-full" />
          <div className="w-3 h-3 rounded-full bg-[rgba(16,185,129,0.25)]" />
          <div className="w-3 h-3 rounded-full bg-[rgba(16,185,129,0.5)]" />
          <div className="w-3 h-3 rounded-full bg-[rgba(16,185,129,0.75)]" />
          <div className="w-3 h-3 rounded-full bg-[#10b981]" />
        </div>
        <span>More</span>
      </div>

      {/* Floating tooltip */}
      {hoveredDate && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredDate.x}px`,
            top: `${hoveredDate.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
          className="z-50 px-2.5 py-1.5 rounded-[10px] pointer-events-none whitespace-nowrap text-center animate-in fade-in duration-100 border"
        >
          <div style={{ color: 'var(--text-primary)' }} className="text-[11.5px] font-semibold">
            {hoveredDate.dateStr}
          </div>
          <div style={{ color: 'var(--text-secondary)' }} className="text-[10.5px] font-num mt-0.5">
            {hoveredDate.completed} of {hoveredDate.total} habits (
            <span style={{ color: 'var(--accent-primary)' }} className="font-bold">
              {Math.round(hoveredDate.rate * 100)}%
            </span>)
          </div>
        </div>
      )}
    </Card>
  );
};
