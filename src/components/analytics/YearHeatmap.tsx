import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay } from '../../lib/statsUtils';
import { subDays, format, getDay } from 'date-fns';

export const YearHeatmap: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const currentDate = useHabitStore((s) => s.currentDate);

  const [hoveredCell, setHoveredCell] = useState<{
    dateStr: string;
    completed: number;
    total: number;
    pct: number;
    x: number;
    y: number;
  } | null>(null);

  const activeHabits = habits.filter((h) => !h.archived);

  // Group checkins by date
  const checkinsByDate = new Map<string, number>();
  for (const c of allCheckinsList) {
    if (c.completed) {
      checkinsByDate.set(c.date, (checkinsByDate.get(c.date) || 0) + 1);
    }
  }

  // Generate 52 weeks (364 days) ending today
  const weeksCount = 52;
  const days: {
    dateStr: string;
    date: Date;
    completed: number;
    total: number;
    rate: number;
    isFuture: boolean;
  }[] = [];

  const todayStr = formatLocalDate(currentDate);

  for (let i = weeksCount * 7 - 1; i >= 0; i--) {
    const d = subDays(currentDate, i);
    const dStr = formatLocalDate(d);
    const wday = d.getDay();
    const scheduled = activeHabits.filter((h) => isHabitScheduledOnDay(h, wday)).length;
    const completed = checkinsByDate.get(dStr) || 0;
    const rate = scheduled > 0 ? Math.min(1, completed / scheduled) : 0;

    days.push({
      dateStr: dStr,
      date: d,
      completed,
      total: scheduled,
      rate,
      isFuture: dStr > todayStr,
    });
  }

  // Split into 52 columns of 7 days
  const columns: typeof days[] = [];
  for (let w = 0; w < weeksCount; w++) {
    columns.push(days.slice(w * 7, (w + 1) * 7));
  }

  const getHeatColor = (rate: number, isFuture: boolean) => {
    if (isFuture) return 'transparent';
    if (rate <= 0) return 'var(--bg-surface-subtle)';
    if (rate <= 0.25) return 'rgba(16, 185, 129, 0.25)';
    if (rate <= 0.5) return 'rgba(16, 185, 129, 0.5)';
    if (rate <= 0.75) return 'rgba(16, 185, 129, 0.75)';
    return '#10b981';
  };

  return (
    <Card className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            className="text-[17px] font-bold"
          >
            Annual Activity Heatmap
          </h2>
          <p style={{ color: 'var(--text-secondary)' }} className="text-[12.5px] font-normal">
            365 days of habit consistency
          </p>
        </div>

        <div style={{ color: 'var(--text-muted)' }} className="flex items-center gap-2 text-[11px] font-semibold">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <span style={{ backgroundColor: 'var(--bg-surface-subtle)' }} className="w-3 h-3 rounded-[3px]" />
            <span className="w-3 h-3 rounded-[3px] bg-[rgba(16,185,129,0.25)]" />
            <span className="w-3 h-3 rounded-[3px] bg-[rgba(16,185,129,0.5)]" />
            <span className="w-3 h-3 rounded-[3px] bg-[rgba(16,185,129,0.75)]" />
            <span className="w-3 h-3 rounded-[3px] bg-[#10b981]" />
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-[3px] min-w-max">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-[3px]">
              {col.map((day) => {
                const isToday = day.dateStr === todayStr;
                const bg = getHeatColor(day.rate, day.isFuture);

                return (
                  <div
                    key={day.dateStr}
                    style={{ backgroundColor: bg }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCell({
                        dateStr: day.dateStr,
                        completed: day.completed,
                        total: day.total,
                        pct: Math.round(day.rate * 100),
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`w-[13px] h-[13px] rounded-[3px] transition-transform cursor-pointer hover:scale-125 ${
                      isToday ? 'ring-1.5 ring-[var(--accent-primary)]' : ''
                    } ${day.isFuture ? 'opacity-30' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {hoveredCell && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y - 8}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
          className="z-50 border px-3 py-1.5 rounded-[12px] pointer-events-none whitespace-nowrap text-center animate-in fade-in duration-100"
        >
          <div style={{ color: 'var(--text-primary)' }} className="text-[12px] font-semibold">
            {hoveredCell.dateStr}
          </div>
          <div style={{ color: 'var(--text-secondary)' }} className="text-[11px] font-num mt-0.5">
            {hoveredCell.completed} of {hoveredCell.total} habits (
            <span style={{ color: 'var(--accent-primary)' }} className="font-bold">
              {hoveredCell.pct}%
            </span>)
          </div>
        </div>
      )}
    </Card>
  );
};
