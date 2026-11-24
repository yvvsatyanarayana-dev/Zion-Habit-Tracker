import React from 'react';
import { Card } from '../ui/Card';
import { generateMonthDays } from '../../lib/dateUtils';
import { isHabitScheduledOnDay } from '../../lib/statsUtils';
import { useHabitStore } from '../../store/useHabitStore';
import { format } from 'date-fns';

export const WeeksCardSection: React.FC = React.memo(() => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const weekStartDay = useHabitStore((s) => s.settings.week_start_day);
  const currentDate = useHabitStore((s) => s.currentDate);

  const { weeks } = React.useMemo(
    () =>
      generateMonthDays(
        selectedYear,
        selectedMonth,
        weekStartDay,
        currentDate
      ),
    [selectedYear, selectedMonth, weekStartDay, currentDate]
  );

  const activeHabits = React.useMemo(() => habits.filter((h) => !h.archived), [habits]);

  // Precompute scheduled habits by weekday (0-6) once to eliminate repetitive filtering in inner loops
  const scheduledByWeekday = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, wday) =>
      activeHabits.filter((h) => isHabitScheduledOnDay(h, wday))
    );
  }, [activeHabits]);

  // Precompute weekly progress, day bars and formatted date ranges once to eliminate JSX recomputations
  const processedWeeks = React.useMemo(() => {
    return weeks.map((week) => {
      let weekDone = 0;
      let weekTotal = 0;

      const dayBars = week.days.map((day) => {
        const scheduled = scheduledByWeekday[day.weekday];
        let done = 0;
        for (const h of scheduled) {
          if (checkins[`${h.id}_${day.dateStr}`]?.completed) {
            done++;
          }
        }
        if (!day.isFuture) {
          weekDone += done;
          weekTotal += scheduled.length;
        }
        const rate = scheduled.length > 0 ? done / scheduled.length : 0;
        return {
          ...day,
          rate,
          done,
          total: scheduled.length,
        };
      });

      const weekRate = weekTotal > 0 ? weekDone / weekTotal : 0;
      const weekPct = Math.round(weekRate * 100);

      const startD = new Date(week.startDateStr);
      const endD = new Date(week.endDateStr);
      const dateRangeStr = `${format(startD, 'MMM d')} - ${format(endD, 'MMM d')}`;

      return {
        ...week,
        weekDone,
        weekTotal,
        weekRate,
        weekPct,
        dateRangeStr,
        dayBars,
      };
    });
  }, [weeks, scheduledByWeekday, checkins]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
          className="text-[19px] font-bold"
        >
          Weekly Breakdowns
        </h2>
        <span
          style={{ color: 'var(--text-muted)' }}
          className="text-[12px] font-semibold uppercase tracking-wider"
        >
          {weeks.length} Weeks
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3.5 min-w-0 w-full">
        {processedWeeks.map((week) => {
          return (
            <Card key={week.label} className="!p-4 min-w-0 w-full flex flex-col justify-between">
              <div>
                {/* Accent Week Label */}
                <div className="flex items-center justify-between">
                  <span
                    style={{ color: '#10b981' }}
                    className="text-[11px] font-bold uppercase tracking-wider"
                  >
                    {week.label}
                  </span>
                  <span
                    style={{ color: 'var(--text-muted)' }}
                    className="text-[11px] font-medium font-num"
                  >
                    {week.dateRangeStr}
                  </span>
                </div>

                {/* Big Percent & Summary */}
                <div className="mt-2 flex items-baseline justify-between">
                  <span
                    style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
                    className="text-[26px] font-black font-num leading-tight"
                  >
                    {week.weekPct}%
                  </span>
                  <span
                    style={{ color: 'var(--text-secondary)' }}
                    className="text-[12px] font-medium font-num"
                  >
                    {week.weekDone} of {week.weekTotal}
                  </span>
                </div>
              </div>

              {/* 7 mini rounded bars */}
              <div
                style={{ borderColor: 'var(--border-subtle)' }}
                className="mt-4 pt-2 border-t flex items-end justify-between gap-1 h-12"
              >
                {week.dayBars.map((d) => {
                  const barHeight = Math.max(d.isFuture ? 0 : 4, Math.round(d.rate * 36));

                  return (
                    <div
                      key={d.dateStr}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                      title={`${d.weekdayLabel}: ${d.done}/${d.total} (${Math.round(d.rate * 100)}%)`}
                    >
                      {d.isFuture ? (
                        <div
                          style={{ backgroundColor: 'var(--border-medium)' }}
                          className="w-1.5 h-1.5 rounded-full mb-1 opacity-60"
                        />
                      ) : (
                        <div
                          style={{
                            height: `${barHeight}px`,
                            backgroundColor: '#10b981',
                            opacity: d.isToday ? 1 : 0.65,
                          }}
                          className="w-full max-w-[8px] rounded-full transition-all"
                        />
                      )}
                      <span
                        style={{ color: 'var(--text-muted)' }}
                        className="text-[9px] font-semibold mt-1 font-num"
                      >
                        {d.weekdayLabel.slice(0, 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
});
WeeksCardSection.displayName = 'WeeksCardSection';
