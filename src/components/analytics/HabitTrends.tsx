import React from 'react';
import { Card } from '../ui/Card';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { subDays } from 'date-fns';
import { HabitIconView } from '../../lib/habitIcons';

export const HabitTrends: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const currentDate = useHabitStore((s) => s.currentDate);
  const showEmoji = useHabitStore((s) => s.settings.show_emoji);

  const activeHabits = habits.filter((h) => !h.archived);

  // 14-day trend points per habit
  const daysCount = 14;
  const dateStrings: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    dateStrings.push(formatLocalDate(subDays(currentDate, i)));
  }

  return (
    <Card className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            className="text-[17px] font-bold"
          >
            Habit Trend Lines
          </h2>
          <p style={{ color: 'var(--text-secondary)' }} className="text-[12.5px] font-normal">
            14-day momentum trajectory in habit colors
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeHabits.map((habit) => {
          // Calculate running 3-day smoothed trend points
          const points = dateStrings.map((dStr, idx) => {
            const isDone = Boolean(checkins[`${habit.id}_${dStr}`]?.completed);
            return { x: idx, y: isDone ? 1 : 0 };
          });

          // SVG line coordinate calculation
          const width = 240;
          const height = 48;
          const padding = 6;
          const stepX = (width - padding * 2) / (daysCount - 1);

          const svgPoints = points
            .map((p, i) => {
              const x = padding + i * stepX;
              const y = p.y === 1 ? padding : height - padding;
              return `${x},${y}`;
            })
            .join(' ');

          const totalDone14 = points.filter((p) => p.y === 1).length;
          const pct = Math.round((totalDone14 / daysCount) * 100);

          return (
            <div
              key={habit.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-4 rounded-[14px] border flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <HabitIconView iconId={habit.emoji} color={habit.color} size={15} />
                  <h4
                    style={{ color: 'var(--text-primary)' }}
                    className="text-[14px] font-semibold truncate"
                  >
                    {habit.name}
                  </h4>
                </div>
                <div style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium font-num mt-1">
                  {totalDone14}/{daysCount} days ({pct}%)
                </div>
              </div>

              {/* Sparkline SVG */}
              <div className="w-[120px] h-[36px] flex items-center justify-center flex-shrink-0">
                <svg width="120" height="36" viewBox={`0 0 ${width} ${height}`}>
                  <polyline
                    fill="none"
                    stroke={habit.color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={svgPoints}
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
