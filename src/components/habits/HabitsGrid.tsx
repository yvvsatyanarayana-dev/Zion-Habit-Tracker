import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from '../ui/Card';
import { CircleCheckbox } from '../ui/CircleCheckbox';
import { ProgressPill } from '../ui/ProgressPill';
import { generateMonthDays, MonthDayInfo, formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay, computeHabitsMonthlyProgress } from '../../lib/statsUtils';
import { useHabitStore } from '../../store/useHabitStore';
import {
  GripVertical,
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  Calendar,
  Zap,
  CheckCheck,
  Flame,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { HabitIconView } from '../../lib/habitIcons';
import confetti from 'canvas-confetti';
import type { Habit } from '../../lib/types';

type GridViewMode = 'week' | 'month';
type HabitFilter = 'all' | 'pending' | 'completed';

const QUICK_PRESETS = [
  { name: 'Morning Workout', icon: 'dumbbell', color: '#10b981', goal: 30 },
  { name: 'Read 20 Minutes', icon: 'book', color: '#6366f1', goal: 25 },
  { name: 'Drink 2L Water', icon: 'droplets', color: '#06b6d4', goal: 30 },
  { name: 'Meditate & Breathe', icon: 'sparkles', color: '#8b5cf6', goal: 20 },
  { name: 'Deep Work Focus', icon: 'laptop', color: '#3b82f6', goal: 20 },
];

export const HabitsGrid: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const saveHabit = useHabitStore((s) => s.saveHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const reorderHabits = useHabitStore((s) => s.reorderHabits);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);

  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const weekStartDay = useHabitStore((s) => s.settings.week_start_day);
  const allowFutureEdits = useHabitStore((s) => s.settings.allow_future_edits);
  const density = useHabitStore((s) => s.settings.density);
  const currentDate = useHabitStore((s) => s.currentDate);
  const searchQuery = useHabitStore((s) => s.searchQuery);
  const todayTrigger = useHabitStore((s) => s.todayTrigger);
  const selectedCategory = useHabitStore((s) => s.selectedCategory);
  const openReflectionModal = useHabitStore((s) => s.openReflectionModal);

  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

  const todayStr = useMemo(() => formatLocalDate(currentDate), [currentDate]);
  const todayWday = currentDate.getDay();

  // View Mode: 'week' (spacious 7-day focus, zero scroll) vs 'month' (full calendar matrix)
  const [viewMode, setViewMode] = useState<GridViewMode>('week');
  const [filterMode, setFilterMode] = useState<HabitFilter>('all');

  // Month days & weeks calculation
  const { days: allMonthDays, weeks } = useMemo(
    () => generateMonthDays(selectedYear, selectedMonth, weekStartDay, currentDate),
    [selectedYear, selectedMonth, weekStartDay, currentDate]
  );

  // Active week index (defaults to week containing today)
  const defaultWeekIndex = useMemo(() => {
    const idx = weeks.findIndex((w) => w.days.some((d) => d.isToday));
    return idx >= 0 ? idx : 0;
  }, [weeks]);

  const [activeWeekIndex, setActiveWeekIndex] = useState<number>(defaultWeekIndex);

  useEffect(() => {
    setActiveWeekIndex(defaultWeekIndex);
  }, [defaultWeekIndex]);

  // Handle "Jump to Today" triggers from Sidebar, Header, or keyboard shortcut 'T'
  useEffect(() => {
    if (!todayTrigger) return;

    // 1. In Weekly Focus mode, switch active week to the week containing Today
    const todayWeekIdx = weeks.findIndex((w) => w.days.some((d) => d.isToday));
    if (todayWeekIdx >= 0) {
      setActiveWeekIndex(todayWeekIdx);
    }

    // 2. Smoothly scroll container to center Today's column
    const timer = setTimeout(() => {
      const container = gridContainerRef.current;
      const todayCol = document.getElementById('grid-today-col');

      if (container && todayCol) {
        const stickyWidth = 280;
        const colRect = todayCol.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const currentScrollLeft = container.scrollLeft;
        const colLeftRelative = colRect.left - containerRect.left + currentScrollLeft;

        const visibleWidth = container.clientWidth - stickyWidth;
        const targetScrollLeft = Math.max(
          0,
          colLeftRelative - stickyWidth - visibleWidth / 2 + todayCol.clientWidth / 2
        );

        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }

      // 3. Highlight Today's column header briefly
      const todayColEl = document.getElementById('grid-today-col');
      if (todayColEl) {
        todayColEl.classList.add('studio-focus-highlight');
        setTimeout(() => todayColEl.classList.remove('studio-focus-highlight'), 1200);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [todayTrigger, weeks]);

  // Compute monthly stats and streak for each habit
  const habitStatsMap = useMemo(() => {
    const progressList = computeHabitsMonthlyProgress(
      habits,
      checkins,
      selectedYear,
      selectedMonth,
      currentDate
    );
    const map = new Map<string, typeof progressList[0]>();
    for (const p of progressList) {
      map.set(p.habit.id, p);
    }
    return map;
  }, [habits, checkins, selectedYear, selectedMonth, currentDate]);

  // Active habits filtered by category, search and filter pills
  const activeHabits = useMemo(() => {
    let list = habits.filter((h) => !h.archived);

    if (selectedCategory && selectedCategory !== 'all') {
      list = list.filter((h) => (h.category || 'routine') === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((h) => h.name.toLowerCase().includes(q));
    }

    if (filterMode === 'pending') {
      list = list.filter((h) => {
        const isScheduled = isHabitScheduledOnDay(h, todayWday);
        const isDone = Boolean(checkins[`${h.id}_${todayStr}`]?.completed);
        return isScheduled && !isDone;
      });
    } else if (filterMode === 'completed') {
      list = list.filter((h) => {
        return Boolean(checkins[`${h.id}_${todayStr}`]?.completed);
      });
    }

    return list;
  }, [habits, selectedCategory, searchQuery, filterMode, todayWday, todayStr, checkins]);

  // Days displayed in current view
  const activeDays: MonthDayInfo[] = useMemo(() => {
    if (viewMode === 'week') {
      const currentWeekGroup = weeks[activeWeekIndex] || weeks[0];
      return currentWeekGroup ? currentWeekGroup.days : allMonthDays;
    }
    return allMonthDays;
  }, [viewMode, weeks, activeWeekIndex, allMonthDays]);

  // Active cell coordinates for arrow navigation
  const [activeCell, setActiveCell] = useState<{ habitIdx: number; dayIdx: number } | null>(null);
  const [draggedHabitIdx, setDraggedHabitIdx] = useState<number | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeCell || activeHabits.length === 0 || activeDays.length === 0) return;

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const { habitIdx, dayIdx } = activeCell;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveCell({ habitIdx: Math.max(0, habitIdx - 1), dayIdx });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveCell({ habitIdx: Math.min(activeHabits.length - 1, habitIdx + 1), dayIdx });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveCell({ habitIdx, dayIdx: Math.max(0, dayIdx - 1) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveCell({ habitIdx, dayIdx: Math.min(activeDays.length - 1, dayIdx + 1) });
      } else if (e.key === ' ') {
        e.preventDefault();
        const currentHabit = activeHabits[habitIdx];
        const currentDay = activeDays[dayIdx];
        if (currentHabit && currentDay) {
          if (!currentDay.isFuture || allowFutureEdits) {
            toggleCheckin(currentHabit.id, currentDay.dateStr);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, activeHabits, activeDays, allowFutureEdits, toggleCheckin]);

  // Drag and drop reordering
  const handleDragStart = (idx: number) => setDraggedHabitIdx(idx);
  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedHabitIdx === null || draggedHabitIdx === targetIdx) return;
    const reordered = [...activeHabits];
    const [moved] = reordered.splice(draggedHabitIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setDraggedHabitIdx(targetIdx);
    reorderHabits(reordered.map((h) => h.id));
  };
  const handleDragEnd = () => setDraggedHabitIdx(null);

  const moveHabit = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= activeHabits.length) return;
    const reordered = [...activeHabits];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);
    reorderHabits(reordered.map((h) => h.id));
  };

  // 1-Click "Complete All Scheduled for Today"
  const handleCompleteAllToday = async () => {
    const pendingToday = habits
      .filter((h) => !h.archived)
      .filter((h) => isHabitScheduledOnDay(h, todayWday))
      .filter((h) => !checkins[`${h.id}_${todayStr}`]?.completed);

    if (pendingToday.length === 0) return;

    for (const h of pendingToday) {
      await toggleCheckin(h.id, todayStr);
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'],
      });
    } catch {
      // safe fallback
    }
  };

  // 1-Click add preset habit
  const handleAddPresetHabit = async (preset: typeof QUICK_PRESETS[0]) => {
    await saveHabit({
      name: preset.name,
      emoji: preset.icon,
      color: preset.color,
      monthly_goal: preset.goal,
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
    });
  };

  // Scheduled & completed count for Today
  const totalScheduledToday = useMemo(() => {
    return habits
      .filter((h) => !h.archived)
      .filter((h) => isHabitScheduledOnDay(h, todayWday)).length;
  }, [habits, todayWday]);

  const totalDoneToday = useMemo(() => {
    return habits
      .filter((h) => !h.archived)
      .filter((h) => isHabitScheduledOnDay(h, todayWday))
      .filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length;
  }, [habits, todayWday, todayStr, checkins]);

  const rowPaddingClass = density === 'compact' ? 'py-1' : 'py-1.5';

  return (
    <>
      <Card className="w-full flex-1 min-h-0 flex flex-col overflow-hidden !p-0 border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      {/* ── TOP TOOLBAR: VIEW TOGGLE, WEEK PICKER & QUICK FILTERS ── */}
      <div className="flex-shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] flex flex-wrap items-center justify-between gap-2">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="p-0.5 rounded-[5px] border border-[var(--border-subtle)] inline-flex items-center"
          >
            <button
              type="button"
              onClick={() => setViewMode('week')}
              style={{
                backgroundColor: viewMode === 'week' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'week' ? '#ffffff' : 'var(--text-secondary)',
              }}
              className="h-7 px-3 rounded-[5px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap size={13} strokeWidth={2.4} />
              <span>Weekly Focus</span>
              {viewMode === 'week' && (
                <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono">
                  7-Day
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('month')}
              style={{
                backgroundColor: viewMode === 'month' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'month' ? '#ffffff' : 'var(--text-secondary)',
              }}
              className="h-7 px-3 rounded-[5px] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Calendar size={13} strokeWidth={2.2} />
              <span>Month Matrix</span>
              {viewMode === 'month' && (
                <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono">
                  {allMonthDays.length}d
                </span>
              )}
            </button>
          </div>

          {/* Quick Habit Filters */}
          <div className="hidden md:flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                backgroundColor: filterMode === 'all' ? 'var(--bg-surface-hover)' : 'transparent',
                borderColor: filterMode === 'all' ? 'var(--border-medium)' : 'transparent',
                color: filterMode === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              className="h-7 px-2.5 rounded-[5px] border text-[11.5px] font-medium transition-colors cursor-pointer hover:text-[var(--text-primary)]"
            >
              All ({habits.filter((h) => !h.archived).length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('pending')}
              style={{
                backgroundColor: filterMode === 'pending' ? 'var(--bg-surface-hover)' : 'transparent',
                borderColor: filterMode === 'pending' ? 'var(--border-medium)' : 'transparent',
                color: filterMode === 'pending' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              className="h-7 px-2.5 rounded-[5px] border text-[11.5px] font-medium transition-colors cursor-pointer hover:text-[var(--text-primary)]"
            >
              Pending Today ({Math.max(0, totalScheduledToday - totalDoneToday)})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('completed')}
              style={{
                backgroundColor: filterMode === 'completed' ? 'var(--bg-surface-hover)' : 'transparent',
                borderColor: filterMode === 'completed' ? 'var(--border-medium)' : 'transparent',
                color: filterMode === 'completed' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              className="h-7 px-2.5 rounded-[5px] border text-[11.5px] font-medium transition-colors cursor-pointer hover:text-[var(--text-primary)]"
            >
              Done Today ({totalDoneToday})
            </button>
          </div>
        </div>

        {/* Right: Week Navigator (in Week mode) & Check All Today */}
        <div className="flex items-center gap-2">
          {viewMode === 'week' && weeks.length > 0 && (
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              className="flex items-center p-0.5 rounded-[5px] border border-[var(--border-subtle)] text-xs"
            >
              <button
                type="button"
                onClick={() => setActiveWeekIndex((idx) => Math.max(0, idx - 1))}
                disabled={activeWeekIndex === 0}
                className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 rounded-[4px] cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft size={13} />
              </button>

              <div className="flex items-center gap-1 px-1.5">
                {weeks.map((w, wIdx) => {
                  const isCur = wIdx === activeWeekIndex;
                  const hasToday = w.days.some((d) => d.isToday);
                  return (
                    <button
                      key={w.label}
                      type="button"
                      onClick={() => setActiveWeekIndex(wIdx)}
                      style={{
                        backgroundColor: isCur ? 'var(--bg-surface-elevated)' : 'transparent',
                        borderColor: isCur ? 'var(--border-medium)' : 'transparent',
                        color: isCur
                          ? 'var(--text-primary)'
                          : hasToday
                          ? 'var(--accent-primary)'
                          : 'var(--text-muted)',
                      }}
                      className="h-6 px-2 rounded-[5px] border text-[11px] font-semibold transition-all cursor-pointer hover:text-[var(--text-primary)]"
                    >
                      {w.label}
                      {hasToday && (
                        <span className="ml-1 text-[9px] text-[var(--accent-primary)] font-bold">
                          •
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActiveWeekIndex((idx) => Math.min(weeks.length - 1, idx + 1))}
                disabled={activeWeekIndex === weeks.length - 1}
                className="w-6 h-6 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 rounded-[4px] cursor-pointer"
                title="Next Week"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}

          {totalScheduledToday > 0 && totalDoneToday < totalScheduledToday && (
            <button
              type="button"
              onClick={handleCompleteAllToday}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--status-success)',
              }}
              className="h-7.5 px-3 rounded-[5px] border text-xs font-semibold flex items-center gap-1.5 hover:border-[var(--status-success)]/40 hover:bg-[var(--status-success)]/10 transition-colors cursor-pointer"
              title="Mark all scheduled habits for today as completed"
            >
              <CheckCheck size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">Check All Today</span>
              <span className="sm:hidden">All Today</span>
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN TABLE CONTAINER ── */}
      <div
        ref={gridContainerRef}
        className={`w-full flex-1 min-h-0 relative outline-none overflow-y-auto custom-scrollbar ${
          viewMode === 'month' ? 'overflow-x-auto' : 'overflow-x-hidden'
        }`}
        tabIndex={0}
      >
        <table className={`w-full border-collapse text-left select-none ${viewMode === 'month' ? 'min-w-max' : ''}`}>
          {/* HEADER */}
          <thead className="sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.25)]">
            {/* Header Tier 1: In Month Mode, show Week Group Headers */}
            {viewMode === 'month' && (
              <tr
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-muted)',
                }}
                className="border-b text-[10px] font-bold uppercase tracking-wider"
              >
                {/* Single Solid Sticky Header */}
                <th
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    boxShadow: '4px 0 16px -2px rgba(0, 0, 0, 0.45)',
                  }}
                  className="sticky left-0 z-40 px-3.5 py-2 w-[280px] min-w-[280px] max-w-[280px] border-r border-[var(--border-subtle)]"
                >
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    HABIT OVERVIEW
                  </span>
                </th>

                {/* Spanned Week Headers */}
                {weeks.map((week) => (
                  <th
                    key={week.label}
                    colSpan={week.days.length}
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      color: week.days.some((d) => d.isToday)
                        ? 'var(--accent-primary)'
                        : 'var(--text-secondary)',
                    }}
                    className="px-2 py-1.5 text-center font-bold border-l border-[var(--border-subtle)]"
                  >
                    <span>{week.label}</span>
                    <span className="ml-1 text-[9px] font-normal text-[var(--text-dim)] font-mono">
                      ({week.days[0]?.dayOfMonth}–{week.days[week.days.length - 1]?.dayOfMonth})
                    </span>
                  </th>
                ))}

                <th
                  colSpan={3}
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                  }}
                  className="px-3 py-1.5 text-center border-l border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-muted)]"
                >
                  MONTH STATS
                </th>
                <th
                  style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
                  className="w-[45px] px-2 py-1.5"
                ></th>
              </tr>
            )}

            {/* Header Tier 2: Habit label & Individual Days */}
            <tr
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-elevated)',
                color: 'var(--text-muted)',
              }}
              className="border-b text-[10.5px] font-bold uppercase tracking-wider"
            >
              {/* Single Solid Sticky Header Column (No gap, no bleed) */}
              <th
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  boxShadow: '4px 0 16px -2px rgba(0, 0, 0, 0.45)',
                }}
                className="sticky left-0 z-40 px-3.5 py-1.5 w-[280px] min-w-[280px] max-w-[280px] border-r border-[var(--border-subtle)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">
                    HABIT & TARGET
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-dim)] font-normal">
                    {activeHabits.length} habits
                  </span>
                </div>
              </th>

              {/* Day Headers */}
              {activeDays.map((day) => {
                const isFirstInWeek = day.isFirstDayOfWeek && viewMode === 'month';
                const isToday = day.isToday;

                return (
                  <th
                    key={day.dateStr}
                    id={isToday ? 'grid-today-col' : undefined}
                    style={{
                      minWidth: viewMode === 'week' ? undefined : '38px',
                      backgroundColor: isToday
                        ? 'rgba(124, 58, 237, 0.16)'
                        : 'var(--bg-surface-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                    className={`px-1 py-1.5 text-center transition-colors ${
                      isFirstInWeek ? 'border-l border-[var(--border-medium)]' : ''
                    } ${isToday ? 'border-x border-violet-500/35' : ''}`}
                  >
                    <div className="flex flex-col items-center">
                      <span
                        style={{
                          color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)',
                        }}
                        className="text-[10px] uppercase font-bold tracking-tight"
                      >
                        {day.weekdayLabel}
                      </span>
                      <div
                        style={{
                          backgroundColor: isToday ? 'var(--accent-primary)' : 'transparent',
                          color: isToday ? '#ffffff' : 'var(--text-secondary)',
                          boxShadow: isToday ? '0 0 10px var(--accent-glow)' : undefined,
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-num text-[11px] font-bold mt-0.5 transition-all ${
                          isToday ? 'scale-105' : ''
                        }`}
                      >
                        {day.dayOfMonth}
                      </div>
                      {isToday && (
                        <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--accent-primary)] mt-0.5 font-mono">
                          Today
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}

              {/* Summary Columns */}
              <th
                style={{
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                }}
                className="px-2 py-1.5 text-center w-[50px] border-l border-[var(--border-subtle)] text-[10px]"
              >
                DONE
              </th>
              <th
                style={{
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                }}
                className="px-2 py-1.5 text-center w-[50px] text-[10px]"
              >
                LEFT
              </th>
              <th
                style={{
                  color: 'var(--text-muted)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                }}
                className={`px-3 py-1.5 ${viewMode === 'week' ? 'w-[110px]' : 'min-w-[130px]'} text-left text-[10px]`}
              >
                PROGRESS
              </th>
              <th
                style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
                className="w-[36px] px-1 py-1.5"
              ></th>
            </tr>
          </thead>

          {/* TABLE BODY: HABIT ROWS */}
          <tbody
            style={{ borderColor: 'var(--border-subtle)' }}
            className="divide-y divide-[var(--border-subtle)]"
          >
            {activeHabits.map((habit, hIdx) => {
              const progress = habitStatsMap.get(habit.id);
              const streak = progress?.currentStreak || 0;

              // Full month counts
              let completedInMonth = 0;
              allMonthDays.forEach((d) => {
                if (checkins[`${habit.id}_${d.dateStr}`]?.completed) {
                  completedInMonth++;
                }
              });

              const goal = habit.monthly_goal > 0 ? habit.monthly_goal : allMonthDays.length;
              const leftInMonth = Math.max(0, goal - completedInMonth);
              const rate = goal > 0 ? Math.min(1, completedInMonth / goal) : 0;
              const pct = Math.round(rate * 100);

              return (
                <tr
                  key={habit.id}
                  draggable
                  onDragStart={() => handleDragStart(hIdx)}
                  onDragOver={(e) => handleDragOver(e, hIdx)}
                  onDragEnd={handleDragEnd}
                  className={`group hover:bg-[var(--bg-surface-hover)] transition-colors ${
                    draggedHabitIdx === hIdx ? 'opacity-40' : ''
                  }`}
                >
                  {/* Single Unified Sticky Habit Column (Eliminates the double-sticky seam bug!) */}
                  <td
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      boxShadow: '4px 0 16px -2px rgba(0, 0, 0, 0.45)',
                    }}
                    className={`sticky left-0 z-20 group-hover:bg-[var(--bg-surface-hover)] px-3.5 ${rowPaddingClass} w-[280px] min-w-[280px] max-w-[280px] border-r border-[var(--border-subtle)]`}
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        style={{ color: 'var(--text-muted)' }}
                        className="cursor-grab active:cursor-grabbing hover:text-[var(--text-primary)] p-0.5 flex-shrink-0"
                        title="Drag to reorder"
                      >
                        <GripVertical size={13} />
                      </button>

                      {/* Icon container */}
                      <div
                        style={{
                          backgroundColor: `${habit.color}1c`,
                          borderColor: `${habit.color}45`,
                        }}
                        className="w-7.5 h-7.5 rounded-[5px] border flex items-center justify-center flex-shrink-0 shadow-sm"
                      >
                        <HabitIconView iconId={habit.emoji} color={habit.color} size={15} />
                      </div>

                      {/* Habit Name, Streak, Target & Cadence */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              onClick={() => openHabitModal(habit)}
                              style={{ color: 'var(--text-primary)' }}
                              className="font-bold text-[13px] truncate cursor-pointer hover:underline hover:text-[var(--accent-primary)] transition-colors"
                              title={`Click to edit "${habit.name}"`}
                            >
                              {habit.name}
                            </span>

                            {/* Quick edit & delete icons on hover */}
                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openHabitModal(habit);
                                }}
                                style={{ color: 'var(--text-muted)' }}
                                className="w-5 h-5 rounded-[3px] flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
                                title="Edit habit"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHabitToDelete(habit);
                                }}
                                style={{ color: 'var(--text-muted)' }}
                                className="w-5 h-5 rounded-[3px] flex items-center justify-center hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                title="Delete habit"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          {/* Custom Studio Themed Stepper (No default browser white spinner!) */}
                          <div
                            style={{
                              backgroundColor: 'var(--bg-surface-elevated)',
                              borderColor: 'var(--border-subtle)',
                            }}
                            className="flex items-center rounded-[5px] border p-0.5 flex-shrink-0 select-none group/stepper hover:border-[var(--border-medium)] transition-colors"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveHabit({
                                  id: habit.id,
                                  monthly_goal: Math.max(1, habit.monthly_goal - 1),
                                });
                              }}
                              className="w-4.5 h-4.5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[3px] transition-colors cursor-pointer"
                              title="Decrease target by 1 day"
                            >
                              <Minus size={9} strokeWidth={2.4} />
                            </button>
                            <span className="px-1 text-center font-num text-[11px] font-bold text-[var(--text-primary)] min-w-[22px]">
                              {habit.monthly_goal}d
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveHabit({
                                  id: habit.id,
                                  monthly_goal: Math.min(31, habit.monthly_goal + 1),
                                });
                              }}
                              className="w-4.5 h-4.5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[3px] transition-colors cursor-pointer"
                              title="Increase target by 1 day"
                            >
                              <Plus size={9} strokeWidth={2.4} />
                            </button>
                          </div>
                        </div>

                        {/* Badges Row */}
                        <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                          {streak > 0 ? (
                            <span
                              style={{
                                color: '#f59e0b',
                                backgroundColor: 'rgba(245, 158, 11, 0.14)',
                                borderColor: 'rgba(245, 158, 11, 0.3)',
                              }}
                              className="px-1.5 py-0.2 rounded-[4px] border font-bold flex items-center gap-0.5 font-num"
                              title={`${streak} day current streak!`}
                            >
                              <Flame size={10} className="fill-amber-500 text-amber-500" />
                              <span>{streak}d</span>
                            </span>
                          ) : (
                            <span
                              style={{ color: 'var(--text-dim)' }}
                              className="font-mono text-[9.5px]"
                            >
                              0d streak
                            </span>
                          )}

                          <span style={{ color: 'var(--text-dim)' }}>•</span>

                          <span
                            style={{ color: 'var(--text-muted)' }}
                            className="text-[10px] font-medium"
                          >
                            {!habit.schedule_days || habit.schedule_days.length === 7
                              ? 'Daily'
                              : `${habit.schedule_days.length}d/wk`}
                          </span>

                          <span style={{ color: 'var(--text-dim)' }}>•</span>

                          <span
                            style={{ color: habit.color }}
                            className="text-[10px] font-bold font-num"
                          >
                            {completedInMonth}/{goal} ({pct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Checkbox Cells across Days */}
                  {activeDays.map((day, dIdx) => {
                    const key = `${habit.id}_${day.dateStr}`;
                    const isChecked = Boolean(checkins[key]?.completed);
                    const isScheduled = isHabitScheduledOnDay(habit, day.weekday);
                    const isDisabled = (day.isFuture && !allowFutureEdits) || !isScheduled;
                    const isFirstInWeek = day.isFirstDayOfWeek && viewMode === 'month';
                    const isToday = day.isToday;
                    const isCellFocused =
                      activeCell?.habitIdx === hIdx && activeCell?.dayIdx === dIdx;

                    return (
                      <td
                        key={day.dateStr}
                        onClick={() => setActiveCell({ habitIdx: hIdx, dayIdx: dIdx })}
                        style={{
                          minWidth: viewMode === 'week' ? undefined : '38px',
                          backgroundColor: isToday ? 'rgba(124, 58, 237, 0.05)' : undefined,
                        }}
                        className={`text-center px-1 ${rowPaddingClass} ${
                          isFirstInWeek ? 'border-l border-[var(--border-medium)]' : ''
                        } ${isToday ? 'border-x border-violet-500/25' : ''} ${
                          isCellFocused ? 'ring-1 ring-inset ring-[var(--accent-primary)]' : ''
                        }`}
                      >
                        {isScheduled ? (
                          <div className="flex items-center justify-center">
                            <CircleCheckbox
                              checked={isChecked}
                              color={habit.color}
                              size={viewMode === 'week' ? 24 : 20}
                              disabled={isDisabled}
                              isToday={isToday}
                              onClick={() => toggleCheckin(habit.id, day.dateStr)}
                              ariaLabel={`${habit.name}, ${day.dateStr}`}
                            />
                          </div>
                        ) : (
                          // Off-day (not scheduled for this weekday)
                          <div className="flex items-center justify-center">
                            <span
                              style={{ color: 'var(--text-dim)' }}
                              className="text-xs font-mono select-none"
                              title="Not scheduled on this day"
                            >
                              —
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Overall Month Done */}
                  <td
                    style={{
                      color: 'var(--text-primary)',
                      borderColor: 'var(--border-subtle)',
                    }}
                    className={`px-3 ${rowPaddingClass} text-center font-num font-bold text-[13px] border-l border-[var(--border-subtle)]`}
                  >
                    {completedInMonth}
                  </td>

                  {/* Overall Month Left */}
                  <td
                    style={{ color: 'var(--text-muted)' }}
                    className={`px-3 ${rowPaddingClass} text-center font-num font-medium text-[13px]`}
                  >
                    {leftInMonth}
                  </td>

                  {/* Overall Progress Bar */}
                  <td className={`px-3.5 ${rowPaddingClass} min-w-[130px]`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          style={{ color: habit.color }}
                          className="font-num font-bold text-[11.5px]"
                        >
                          {pct}%
                        </span>
                        <span
                          style={{ color: 'var(--text-muted)' }}
                          className="text-[10px] font-medium font-num"
                        >
                          {completedInMonth}/{goal}
                        </span>
                      </div>
                      <ProgressPill rate={rate} color={habit.color} height={5} />
                    </div>
                  </td>

                  {/* Row Actions */}
                  <td className={`px-2 ${rowPaddingClass} text-right relative`}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => moveHabit(hIdx, 'up')}
                        disabled={hIdx === 0}
                        style={{ color: 'var(--text-muted)' }}
                        className="p-1 hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveHabit(hIdx, 'down')}
                        disabled={hIdx === activeHabits.length - 1}
                        style={{ color: 'var(--text-muted)' }}
                        className="p-1 hover:text-[var(--text-primary)] disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openHabitModal(habit)}
                        style={{ color: 'var(--text-muted)' }}
                        className="p-1 hover:text-[var(--text-primary)] rounded-[4px] cursor-pointer"
                        title="Edit habit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHabitToDelete(habit)}
                        style={{ color: 'var(--text-muted)' }}
                        className="p-1 hover:text-rose-400 hover:bg-rose-500/10 rounded-[4px] cursor-pointer"
                        title="Delete habit"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Empty State when filter yields 0 habits */}
            {activeHabits.length === 0 && (
              <tr>
                <td
                  colSpan={activeDays.length + 5}
                  className="py-10 text-center text-xs text-[var(--text-muted)]"
                >
                  <p className="font-semibold text-sm text-[var(--text-primary)]">
                    {filterMode === 'pending'
                      ? '🎉 All habits completed for today! Awesome work!'
                      : 'No habits found.'}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    {filterMode !== 'all' ? (
                      <button
                        type="button"
                        onClick={() => setFilterMode('all')}
                        className="text-[var(--accent-primary)] hover:underline cursor-pointer"
                      >
                        Switch to &ldquo;All Habits&rdquo;
                      </button>
                    ) : (
                      'Click &ldquo;Add New Habit&rdquo; to create your first routine.'
                    )}
                  </p>
                </td>
              </tr>
            )}
          </tbody>

          {/* ── FOOTER: DAILY COMPLETION PERFORMANCE HEATMAP ── */}
          <tfoot className="sticky bottom-0 z-30 shadow-[0_-1px_3px_rgba(0,0,0,0.25)]">
            <tr
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
              className="border-t text-xs font-semibold text-[var(--text-muted)]"
            >
              <td
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  boxShadow: '4px 0 16px -2px rgba(0, 0, 0, 0.45)',
                }}
                className="sticky left-0 z-40 px-3.5 py-1.5 w-[280px] min-w-[280px] max-w-[280px] border-r border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-amber-400" />
                  <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-primary)]">
                    Daily Completion
                  </span>
                </div>
              </td>

              {/* Day completion aggregates */}
              {activeDays.map((day) => {
                const isFirstInWeek = day.isFirstDayOfWeek && viewMode === 'month';
                const isToday = day.isToday;

                const scheduledHabits = habits
                  .filter((h) => !h.archived)
                  .filter((h) => isHabitScheduledOnDay(h, day.weekday));
                const scheduledCount = scheduledHabits.length;

                let completedCount = 0;
                for (const h of scheduledHabits) {
                  if (checkins[`${h.id}_${day.dateStr}`]?.completed) {
                    completedCount++;
                  }
                }

                const dayRate = scheduledCount > 0 ? completedCount / scheduledCount : 0;
                const isPerfect = scheduledCount > 0 && completedCount === scheduledCount;

                return (
                  <td
                    key={day.dateStr}
                    style={{
                      minWidth: viewMode === 'week' ? undefined : '38px',
                      backgroundColor: isToday ? 'rgba(124, 58, 237, 0.14)' : 'var(--bg-surface-elevated)',
                    }}
                    className={`px-1 py-1.5 text-center ${
                      isFirstInWeek ? 'border-l border-[var(--border-medium)]' : ''
                    } ${isToday ? 'border-x border-violet-500/30' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      {/* For future days, show a clean dash instead of 0/1 */}
                      {day.isFuture ? (
                        <span className="text-[11px] font-mono text-[var(--text-dim)]">—</span>
                      ) : (
                        <>
                          <span
                            style={{
                              color: isPerfect
                                ? 'var(--status-success)'
                                : completedCount > 0
                                ? 'var(--text-primary)'
                                : 'var(--text-dim)',
                            }}
                            className="font-num text-[11px] font-bold"
                          >
                            {completedCount}/{scheduledCount}
                          </span>

                          <div
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                            className="w-5 h-1 rounded-full overflow-hidden"
                          >
                            <div
                              style={{
                                width: `${Math.round(dayRate * 100)}%`,
                                backgroundColor: isPerfect
                                  ? 'var(--status-success)'
                                  : 'var(--accent-primary)',
                              }}
                              className="h-full rounded-full transition-all"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                );
              })}

              <td colSpan={4} style={{ backgroundColor: 'var(--bg-surface-elevated)' }}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── INLINE BOTTOM ACTION BAR: + ADD HABIT & QUICK PRESET CHIPS ── */}
      <div className="flex-shrink-0 px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openHabitModal()}
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              boxShadow: 'var(--btn-primary-shadow)',
            }}
            className="h-7.5 px-3 rounded-[5px] text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>Add New Habit</span>
          </button>

          <span className="text-[11px] text-[var(--text-dim)] hidden sm:inline">
            or instant add:
          </span>
        </div>

        {/* 1-Click Quick Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleAddPresetHabit(preset)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              className="h-6.5 px-2 rounded-[5px] border text-[11px] font-medium hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-colors cursor-pointer flex items-center gap-1"
              title={`⚡ 1-Click add "${preset.name}"`}
            >
              <Plus size={10} style={{ color: preset.color }} />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>

    {/* ── CUSTOM DELETE CONFIRMATION MODAL ── */}
    {habitToDelete && (
      <div
        onClick={() => setHabitToDelete(null)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[8px] animate-in fade-in duration-150"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
          className="w-full max-w-sm rounded-2xl border p-5 space-y-4 animate-in zoom-in-95 duration-150"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Delete Habit
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Are you sure you want to delete &ldquo;{habitToDelete.name}&rdquo;?
              </p>
            </div>
          </div>

          <div className="text-[11.5px] text-[var(--text-muted)] bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-subtle)] leading-relaxed">
            This action is permanent. All check-in history and streaks for this habit will be deleted.
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setHabitToDelete(null)}
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="h-8 px-3.5 rounded-[5px] border text-xs font-semibold hover:border-[var(--border-medium)] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={async () => {
                await deleteHabit(habitToDelete.id);
                setHabitToDelete(null);
              }}
              className="h-8 px-3.5 rounded-[5px] bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trash2 size={13} />
              <span>Delete Habit</span>
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};
