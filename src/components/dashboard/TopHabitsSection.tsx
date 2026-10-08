import React from 'react';
import { Card } from '../ui/Card';
import { MiniRing } from '../ui/ActivityRing';
import { computeHabitsMonthlyProgress } from '../../lib/statsUtils';
import { useHabitStore } from '../../store/useHabitStore';
import { Trophy, ArrowUpRight, Flame, Sparkles } from 'lucide-react';
import { HabitIconView } from '../../lib/habitIcons';

export const TopHabitsSection: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const currentDate = useHabitStore((s) => s.currentDate);
  const showEmoji = useHabitStore((s) => s.settings.show_emoji);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);

  const progressList = computeHabitsMonthlyProgress(
    habits,
    checkins,
    selectedYear,
    selectedMonth,
    currentDate
  );

  if (progressList.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      {/* Section Header with category tabs (matching Doodle Desk's Templates header) */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center">
            <Trophy size={13} />
          </div>
          <h2
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            className="text-[17px] font-bold"
          >
            Top Habits Ranked
          </h2>
        </div>

        <span
          style={{ color: 'var(--text-dim)' }}
          className="text-[10px] font-bold uppercase tracking-wider"
        >
          Monthly Performance
        </span>
      </div>

      {/* Grid of Template Cards (matching Doodle Desk Image 3 card list) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {progressList.slice(0, 6).map((item, index) => {
          const rank = index + 1;
          const pct = Math.round(item.rate * 100);

          return (
            <div
              key={item.habit.id}
              onClick={() => openHabitModal(item.habit)}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-3.5 rounded-xl border flex flex-col justify-between hover:border-[var(--border-medium)] transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Squircle Icon container */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    style={{
                      backgroundColor: `${item.habit.color}18`,
                      borderColor: `${item.habit.color}35`,
                      color: item.habit.color,
                    }}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
                  >
                    <HabitIconView iconId={item.habit.emoji} color={item.habit.color} size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                        RANK #{rank}
                      </span>
                      {pct >= 80 && (
                        <span className="studio-badge-active">
                          EXCELLENT
                        </span>
                      )}
                    </div>

                    <h3
                      style={{ color: 'var(--text-primary)' }}
                      className="text-sm font-semibold truncate group-hover:text-[var(--accent-primary)] transition-colors mt-0.5"
                    >
                      {item.habit.name}
                    </h3>

                    <p
                      style={{ color: 'var(--text-secondary)' }}
                      className="text-xs font-medium font-num mt-0.5"
                    >
                      {item.completedDays} of {item.goal} days completed
                    </p>
                  </div>
                </div>

                {/* Right: Tactile Action Button */}
                <button
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 hover:border-[var(--border-medium)] transition-all flex-shrink-0"
                >
                  <span>Edit</span>
                  <ArrowUpRight size={12} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Bottom progress bar with crisp colors */}
              <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <div className="flex-1 mr-3 h-1.5 rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: item.habit.color,
                    }}
                  />
                </div>

                <span
                  style={{ color: item.habit.color }}
                  className="font-num font-bold text-xs"
                >
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
