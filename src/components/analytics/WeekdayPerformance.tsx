import React from 'react';
import { Card } from '../ui/Card';
import { useHabitStore } from '../../store/useHabitStore';
import { isHabitScheduledOnDay } from '../../lib/statsUtils';

export const WeekdayPerformance: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const activeHabits = habits.filter((h) => !h.archived);

  const weekdays = [
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' },
    { id: 0, name: 'Sunday', short: 'Sun' },
  ];

  // Map checkins
  const doneCountByDayOfWeek: number[] = [0, 0, 0, 0, 0, 0, 0];
  const totalCountByDayOfWeek: number[] = [0, 0, 0, 0, 0, 0, 0];

  allCheckinsList.forEach((c) => {
    if (c.completed) {
      const d = new Date(c.date);
      const w = d.getDay();
      doneCountByDayOfWeek[w]++;
    }
  });

  // Calculate rate per weekday
  const stats = weekdays.map((w) => {
    const scheduledHabits = activeHabits.filter((h) => isHabitScheduledOnDay(h, w.id));
    const done = doneCountByDayOfWeek[w.id];
    const totalPotential = Math.max(done, scheduledHabits.length * 4); // sample window
    const rate = totalPotential > 0 ? Math.min(1, done / totalPotential) : 0;
    return {
      ...w,
      done,
      rate,
      pct: Math.round(rate * 100),
    };
  });

  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            className="text-[17px] font-bold"
          >
            Weekday Performance
          </h2>
          <p style={{ color: 'var(--text-secondary)' }} className="text-[12.5px] font-normal">
            Completion rate by day of week
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {stats.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <span
              style={{ color: 'var(--text-muted)' }}
              className="w-10 text-[12px] font-semibold"
            >
              {s.short}
            </span>

            {/* Rounded horizontal bar */}
            <div
              style={{ backgroundColor: 'var(--bg-surface-hover)' }}
              className="flex-1 h-3.5 rounded-full overflow-hidden relative"
            >
              <div
                style={{
                  width: `${Math.max(s.done > 0 ? 6 : 0, s.pct)}%`,
                  backgroundColor: 'var(--accent-primary)',
                }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>

            <span
              style={{ color: 'var(--text-primary)' }}
              className="w-12 text-right font-num text-[12px] font-bold"
            >
              {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
