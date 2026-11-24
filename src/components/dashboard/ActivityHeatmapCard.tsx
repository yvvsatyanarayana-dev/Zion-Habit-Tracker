import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay } from '../../lib/statsUtils';
import { subDays, format, isSameDay } from 'date-fns';
import {
  Flame,
  Calendar,
  Activity,
  Zap,
  Award,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { sound } from '../../lib/audio';

interface HeatmapDay {
  dateStr: string;
  date: Date;
  completed: number;
  total: number;
  rate: number;
  isToday: boolean;
  isFuture: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All Habits', icon: '✦', color: 'var(--accent-primary)' },
  { id: 'health', label: 'Health', icon: '🏃', color: '#10b981' },
  { id: 'mind', label: 'Mind', icon: '🧠', color: '#6366f1' },
  { id: 'work', label: 'Work', icon: '⚡', color: '#f59e0b' },
  { id: 'routine', label: 'Routine', icon: '🔄', color: '#38bdf8' },
];

export const ActivityHeatmapCard: React.FC = React.memo(() => {
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const currentDate = useHabitStore((s) => s.currentDate);
  const selectDate = useHabitStore((s) => s.selectDate);
  const jumpToToday = useHabitStore((s) => s.jumpToToday);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredDay, setHoveredDay] = useState<{
    day: HeatmapDay;
    x: number;
    y: number;
  } | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to today (right side) on mobile & desktop mount so latest week is immediately visible
  useEffect(() => {
    const el = gridContainerRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
      const t = setTimeout(() => {
        if (el) el.scrollLeft = el.scrollWidth;
      }, 100);
      return () => clearTimeout(t);
    }
  }, []);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  const filteredHabits = useMemo(() => {
    if (selectedCategory === 'all') return activeHabits;
    return activeHabits.filter((h) => (h.category || 'routine') === selectedCategory);
  }, [activeHabits, selectedCategory]);

  const checkinsByDate = useMemo(() => {
    const map = new Map<string, number>();
    const targetHabitIds = new Set(filteredHabits.map((h) => h.id));

    for (const c of allCheckinsList) {
      if (c.completed && targetHabitIds.has(c.habit_id)) {
        map.set(c.date, (map.get(c.date) || 0) + 1);
      }
    }
    return map;
  }, [allCheckinsList, filteredHabits]);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatLocalDate(today), [today]);

  // Compute 53 columns representing the last 364 days + days to complete current week
  const { columns, columnMonths, totalCompletions, activeDaysCount, maxStreak, currentStreak } = useMemo(() => {
    const daysList: HeatmapDay[] = [];
    let completionsCount = 0;
    let daysWithActivity = 0;
    let streakCounter = 0;
    let longestStreak = 0;
    let activeCurrentStreak = 0;
    let streakStillActive = true;

    // Align grid so row 0 is Monday and row 6 is Sunday
    const currentWday = (today.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const totalSlots = 52 * 7 + currentWday + 1;

    // Precompute scheduled habit count per weekday (0-6) to turn 371 iterations into O(1) lookups
    const scheduledCountsByWeekday = [0, 1, 2, 3, 4, 5, 6].map(
      (wday) => filteredHabits.filter((h) => isHabitScheduledOnDay(h, wday)).length
    );

    for (let i = totalSlots - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const dStr = formatLocalDate(d);
      const wday = d.getDay();
      const scheduled = scheduledCountsByWeekday[wday];
      const completed = checkinsByDate.get(dStr) || 0;
      const rate = scheduled > 0 ? Math.min(1, completed / scheduled) : completed > 0 ? 1 : 0;
      const isFut = dStr > todayStr;
      const isTod = dStr === todayStr;

      if (!isFut) {
        completionsCount += completed;
        if (completed > 0) {
          daysWithActivity++;
          streakCounter++;
          if (streakCounter > longestStreak) longestStreak = streakCounter;
        } else {
          streakCounter = 0;
        }
      }

      daysList.push({
        dateStr: dStr,
        date: d,
        completed,
        total: scheduled,
        rate,
        isToday: isTod,
        isFuture: isFut,
      });
    }

    // Calculate current active streak backwards from today
    for (let i = daysList.length - 1; i >= 0; i--) {
      const day = daysList[i];
      if (day.isFuture) continue;
      if (day.completed > 0) {
        activeCurrentStreak++;
      } else if (day.isToday) {
        // Today might not be completed yet, continue checking yesterday
        continue;
      } else {
        break;
      }
    }

    // Slice into columns of 7 days (Monday to Sunday)
    const cols: HeatmapDay[][] = [];
    for (let c = 0; c < daysList.length; c += 7) {
      cols.push(daysList.slice(c, c + 7));
    }

    // Generate month label for each column (GitHub-style clean spacing)
    const months: (string | null)[] = [];
    let lastMonth = -1;
    let lastMonthColIdx = -99;

    cols.forEach((col, idx) => {
      // Find if day 1 of a month falls in this week, or use first day
      const firstOfMonthDay = col.find((d) => d.date.getDate() === 1);
      const repDay = firstOfMonthDay || col[0];
      if (repDay) {
        const m = repDay.date.getMonth();
        if (m !== lastMonth && idx - lastMonthColIdx >= 3 && idx <= cols.length - 2) {
          months.push(format(repDay.date, 'MMM'));
          lastMonth = m;
          lastMonthColIdx = idx;
        } else {
          months.push(null);
        }
      } else {
        months.push(null);
      }
    });

    return {
      columns: cols,
      columnMonths: months,
      totalCompletions: completionsCount,
      activeDaysCount: daysWithActivity,
      maxStreak: longestStreak,
      currentStreak: activeCurrentStreak,
    };
  }, [today, todayStr, filteredHabits, checkinsByDate]);

  const consistencyRate = useMemo(() => {
    return Math.round((activeDaysCount / 365) * 100);
  }, [activeDaysCount]);

  const getHeatStyles = (day: HeatmapDay, isSelected: boolean) => {
    if (day.isFuture) {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'rgba(255, 255, 255, 0.03)',
      };
    }
    if (day.completed === 0) {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.035)',
        borderColor: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.055)',
        boxShadow: isSelected ? '0 0 0 1.5px var(--accent-primary)' : undefined,
      };
    }
    if (day.rate <= 0.25) {
      return {
        backgroundColor: 'rgba(16, 185, 129, 0.28)',
        borderColor: isSelected ? 'var(--accent-primary)' : 'rgba(16, 185, 129, 0.4)',
        boxShadow: isSelected ? '0 0 0 1.5px var(--accent-primary)' : undefined,
      };
    }
    if (day.rate <= 0.5) {
      return {
        backgroundColor: 'rgba(16, 185, 129, 0.55)',
        borderColor: isSelected ? 'var(--accent-primary)' : 'rgba(16, 185, 129, 0.7)',
        boxShadow: isSelected ? '0 0 0 1.5px var(--accent-primary)' : undefined,
      };
    }
    if (day.rate <= 0.75) {
      return {
        backgroundColor: 'rgba(16, 185, 129, 0.82)',
        borderColor: isSelected ? 'var(--accent-primary)' : '#10b981',
        boxShadow: isSelected ? '0 0 0 1.5px var(--accent-primary)' : '0 0 6px rgba(16, 185, 129, 0.3)',
      };
    }
    return {
      backgroundColor: '#10b981',
      borderColor: isSelected ? '#ffffff' : '#34d399',
      boxShadow: isSelected
        ? '0 0 0 2px #ffffff, 0 0 12px rgba(16, 185, 129, 0.8)'
        : '0 0 8px rgba(16, 185, 129, 0.55)',
    };
  };

  const handleCellClick = (day: HeatmapDay) => {
    if (day.isFuture) return;
    sound.playClick();
    selectDate(day.date);
    const target = document.getElementById('today-focus-card');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <Card className="w-full !p-5 relative overflow-hidden bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)] shadow-xl">
      {/* Subtle Ambient Radial Glow */}
      <div
        className="absolute top-0 right-1/4 w-96 h-32 rounded-full pointer-events-none opacity-20 blur-3xl -z-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.35), transparent 70%)',
        }}
      />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                borderColor: 'rgba(16, 185, 129, 0.28)',
                color: '#10b981',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.15)',
              }}
              className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0"
            >
              <Activity size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
                  className="text-lg font-black tracking-tight"
                >
                  365-Day Activity Heatmap
                </h2>
                <span className="text-[9.5px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 tracking-wider uppercase">
                  DISCIPLINE MATRIX
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium mt-0.5">
                Annual habit execution density across 52 weeks. Hover for details or click any day to jump.
              </p>
            </div>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  sound.playClick();
                  setSelectedCategory(cat.id);
                }}
                style={{
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  boxShadow: isSelected ? '0 0 12px var(--accent-glow)' : undefined,
                }}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer hover:border-[var(--border-medium)] flex items-center gap-1.5 shrink-0"
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cybernetic Bento Stat Cards */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
          className="p-3.5 rounded-2xl border flex items-center gap-3 transition-all hover:border-[var(--border-medium)]"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0 shadow-inner">
            <Flame size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Year Check-ins
            </div>
            <div className="text-xl font-black font-mono text-[var(--text-primary)] mt-0.5">
              {totalCompletions.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
          className="p-3.5 rounded-2xl border flex items-center gap-3 transition-all hover:border-[var(--border-medium)]"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center shrink-0 shadow-inner">
            <Zap size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Active Days
            </div>
            <div className="text-xl font-black font-mono text-[var(--text-primary)] mt-0.5">
              {activeDaysCount} <span className="text-xs font-normal text-[var(--text-muted)]">/ 365</span>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
          className="p-3.5 rounded-2xl border flex items-center gap-3 transition-all hover:border-[var(--border-medium)]"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0 shadow-inner">
            <Award size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Max Streak
            </div>
            <div className="text-xl font-black font-mono text-amber-400 mt-0.5">
              {maxStreak} <span className="text-xs font-normal text-amber-400/70">Days</span>
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
          className="p-3.5 rounded-2xl border flex items-center gap-3 transition-all hover:border-[var(--border-medium)]"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 flex items-center justify-center shrink-0 shadow-inner">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Consistency Rate
            </div>
            <div className="text-xl font-black font-mono text-cyan-400 mt-0.5">
              {consistencyRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Matrix Frame: Full-Width Responsive Container */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
        className="p-4 rounded-2xl border relative"
      >
        <div
          ref={gridContainerRef}
          className="overflow-x-auto md:overflow-x-hidden custom-scrollbar pb-1.5 pt-0.5 min-w-0"
        >
          <div className="w-full min-w-[540px] md:min-w-0">
            {/* Top Month Labels - Mathematically locked 1:1 to Column Matrix */}
            <div className="flex gap-2 items-center w-full mb-1.5 select-none min-w-0">
              <div className="w-6 shrink-0" /> {/* Exact spacer matching day labels column */}
              <div className="flex flex-1 gap-[2.5px] w-full min-w-0">
                {columns.map((_, colIdx) => {
                  const label = columnMonths[colIdx];
                  return (
                    <div
                      key={colIdx}
                      className="flex-1 min-w-0 text-[10px] font-mono font-bold text-[var(--text-muted)]"
                    >
                      {label ? (
                        <span className="text-[var(--text-secondary)] whitespace-nowrap block">
                          {label}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid Body: Day Labels + Dynamic Column Matrix */}
            <div className="flex gap-2 items-start w-full min-w-0">
              {/* Day of Week Labels */}
              <div className="flex flex-col justify-between h-[112px] text-[10px] font-mono font-semibold text-[var(--text-muted)] w-6 select-none shrink-0 py-0.5">
                <span className="leading-none">Mon</span>
                <span className="leading-none">Wed</span>
                <span className="leading-none">Fri</span>
              </div>

              {/* Responsive 53-Column Matrix */}
              <div className="flex flex-1 gap-[2.5px] w-full min-w-0">
                {columns.map((col, colIdx) => (
                  <div key={colIdx} className="flex-1 min-w-[7px] flex flex-col gap-[2.5px]">
                    {col.map((day, rowIdx) => {
                      const isSelected = isSameDay(day.date, currentDate);
                      const styles = getHeatStyles(day, isSelected);

                      return (
                        <div
                          key={rowIdx}
                          onClick={() => handleCellClick(day)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredDay({
                              day,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => setHoveredDay(null)}
                          style={{
                            ...styles,
                            aspectRatio: '1 / 1',
                          }}
                          className={`w-full rounded-[3.5px] border transition-all duration-150 cursor-pointer ${
                            day.isFuture
                              ? 'opacity-25 cursor-default'
                              : 'hover:brightness-135 ring-inset hover:ring-1 hover:ring-white/90 hover:z-20'
                          } ${
                            day.isToday
                              ? 'ring-1.5 ring-inset ring-sky-400'
                              : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Controls & Heatmap Legend */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 mt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              jumpToToday();
              if (gridContainerRef.current) {
                gridContainerRef.current.scrollTo({
                  left: gridContainerRef.current.scrollWidth,
                  behavior: 'smooth',
                });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
          >
            <RotateCcw size={12} className="text-[var(--accent-primary)]" />
            <span>Jump to Today</span>
          </button>
          <span className="text-[11px] text-[var(--text-muted)] hidden md:inline">
            Click any cell to jump to that day's protocol
          </span>
        </div>

        {/* High-Fidelity Intensity Legend */}
        <div className="flex items-center gap-2 text-[10.5px] font-mono">
          <span className="text-[var(--text-muted)]">Less</span>
          <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-subtle)]">
            <span
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.035)' }}
              className="w-3 h-3 rounded-[2.5px] border border-white/5"
              title="0% Completed"
            />
            <span
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.28)' }}
              className="w-3 h-3 rounded-[2.5px]"
              title="1 - 25% Completed"
            />
            <span
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.55)' }}
              className="w-3 h-3 rounded-[2.5px]"
              title="26 - 50% Completed"
            />
            <span
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.82)' }}
              className="w-3 h-3 rounded-[2.5px]"
              title="51 - 75% Completed"
            />
            <span
              style={{
                backgroundColor: '#10b981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
              }}
              className="w-3 h-3 rounded-[2.5px]"
              title="76 - 100% Completed"
            />
          </div>
          <span className="text-[var(--text-muted)]">More</span>
        </div>
      </div>

      {/* Floating Hover Tooltip rendered via portal to prevent containing block overflow issues */}
      {hoveredDay && !hoveredDay.day.isFuture && typeof document !== 'undefined' && (() => {
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const isNearRight = hoveredDay.x > screenW - 190;
        const isNearLeft = hoveredDay.x < 190;
        const tooltipLeft = isNearRight
          ? Math.min(screenW - 16, hoveredDay.x)
          : isNearLeft
          ? Math.max(16, hoveredDay.x)
          : hoveredDay.x;
        const tooltipTransform = isNearRight
          ? 'translate(-100%, -100%)'
          : isNearLeft
          ? 'translate(0, -100%)'
          : 'translate(-50%, -100%)';

        return createPortal(
          <div
            style={{
              position: 'fixed',
              left: `${tooltipLeft}px`,
              top: `${Math.max(10, hoveredDay.y - 10)}px`,
              transform: tooltipTransform,
              maxWidth: 'calc(100vw - 32px)',
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-medium)',
              boxShadow:
                '0 16px 36px -4px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              zIndex: 99999,
              pointerEvents: 'none',
            }}
            className="px-3.5 py-2.5 rounded-2xl border text-xs whitespace-nowrap backdrop-blur-xl animate-fade-in"
          >
            <div className="font-bold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
              <span>{format(hoveredDay.day.date, 'EEEE, MMMM d, yyyy')}</span>
              {hoveredDay.day.isToday && (
                <span className="text-[9px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                  TODAY
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[11.5px]">
              <span className="font-mono text-emerald-400 font-bold">
                {hoveredDay.day.completed} of {hoveredDay.day.total || 0} completed
              </span>
              <span className="text-[var(--text-muted)]">•</span>
              <span className="font-mono text-[var(--text-secondary)] font-semibold">
                {Math.round(hoveredDay.day.rate * 100)}% pace
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1">
              Click to inspect protocol
            </div>
          </div>,
          document.body
        );
      })()}
    </Card>
  );
});

ActivityHeatmapCard.displayName = 'ActivityHeatmapCard';
