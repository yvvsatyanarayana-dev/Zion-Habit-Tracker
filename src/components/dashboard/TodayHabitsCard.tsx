import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { CircleCheckbox } from '../ui/CircleCheckbox';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay } from '../../lib/statsUtils';
import {
  Plus,
  Check,
  Play,
  Timer,
  Zap,
  Smile,
  Meh,
  Frown,
  NotebookPen,
  Camera,
  Share2,
  GripVertical,
  Layers,
  ListFilter,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { HabitIconView } from '../../lib/habitIcons';
import { sound } from '../../lib/audio';
import { Habit } from '../../lib/types';

const renderMoodIcon = (mood?: string, size = 12) => {
  switch (mood) {
    case 'energized':
      return <Zap size={size} className="text-amber-400" />;
    case 'good':
      return <Smile size={size} className="text-emerald-400" />;
    case 'neutral':
      return <Meh size={size} className="text-blue-400" />;
    case 'tired':
      return <Frown size={size} className="text-rose-400" />;
    default:
      return null;
  }
};

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  health: { label: 'Health & Fitness', icon: '🏃', color: '#10b981' },
  mind: { label: 'Mind & Focus', icon: '🧠', color: '#6366f1' },
  work: { label: 'Work & Productivity', icon: '⚡', color: '#f59e0b' },
  routine: { label: 'Daily Routines', icon: '🔄', color: '#38bdf8' },
};

export const TodayHabitsCard: React.FC = React.memo(() => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const currentDate = useHabitStore((s) => s.currentDate);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);
  const searchQuery = useHabitStore((s) => s.searchQuery);
  const setSearchQuery = useHabitStore((s) => s.setSearchQuery);
  const todayTrigger = useHabitStore((s) => s.todayTrigger);
  const reorderHabits = useHabitStore((s) => s.reorderHabits);

  const selectedCategory = useHabitStore((s) => s.selectedCategory);
  const openReflectionModal = useHabitStore((s) => s.openReflectionModal);
  const setTimeCapsuleModalOpen = useHabitStore((s) => s.setTimeCapsuleModalOpen);
  const setSynergyGraphModalOpen = useHabitStore((s) => s.setSynergyGraphModalOpen);
  const updateNumericValue = useHabitStore((s) => s.updateNumericValue);
  const activeHabitTimer = useHabitStore((s) => s.activeHabitTimer);
  const startHabitTimer = useHabitStore((s) => s.startHabitTimer);
  const setFocusStudioOpen = useHabitStore((s) => s.setFocusStudioOpen);

  // Group by Category view mode toggle
  const [isGroupedView, setIsGroupedView] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Drag and drop state
  const [draggedHabitId, setDraggedHabitId] = useState<string | null>(null);
  const [dragOverHabitId, setDragOverHabitId] = useState<string | null>(null);

  useEffect(() => {
    if (!todayTrigger) return;
    const el = document.getElementById('today-focus-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('studio-focus-highlight');
      setTimeout(() => el.classList.remove('studio-focus-highlight'), 1200);
    }
  }, [todayTrigger]);

  const todayStr = useMemo(() => formatLocalDate(currentDate), [currentDate]);
  const todayWeekday = currentDate.getDay();

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const scheduledToday = useMemo(
    () => activeHabits.filter((h) => isHabitScheduledOnDay(h, todayWeekday)),
    [activeHabits, todayWeekday]
  );

  const categoryFiltered = useMemo(
    () =>
      selectedCategory === 'all'
        ? scheduledToday
        : scheduledToday.filter((h) => (h.category || 'routine') === selectedCategory),
    [selectedCategory, scheduledToday]
  );

  const displayedHabits = useMemo(
    () =>
      categoryFiltered.filter((h) =>
        searchQuery ? h.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
      ),
    [categoryFiltered, searchQuery]
  );

  // Group habits by category
  const groupedHabits = useMemo(() => {
    const groups: Record<string, Habit[]> = {};
    for (const habit of displayedHabits) {
      const cat = habit.category || 'routine';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(habit);
    }
    return groups;
  }, [displayedHabits]);

  // Precompute monthly completions per habit once to eliminate repetitive inner day loops
  const doneThisMonthByHabit = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const map: Record<string, number> = {};
    const prefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-`;
    for (const habit of displayedHabits) {
      let count = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${prefix}${String(d).padStart(2, '0')}`;
        if (checkins[`${habit.id}_${dStr}`]?.completed) {
          count++;
        }
      }
      map[habit.id] = count;
    }
    return map;
  }, [displayedHabits, checkins, selectedYear, selectedMonth]);

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, habitId: string) => {
    e.dataTransfer.setData('text/plain', habitId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedHabitId(habitId);
  };

  const handleDragOver = (e: React.DragEvent, targetHabitId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverHabitId !== targetHabitId) {
      setDragOverHabitId(targetHabitId);
    }
  };

  const handleDragLeave = () => {
    setDragOverHabitId(null);
  };

  const handleDrop = (e: React.DragEvent, targetHabitId: string) => {
    e.preventDefault();
    const sourceHabitId = e.dataTransfer.getData('text/plain') || draggedHabitId;
    setDraggedHabitId(null);
    setDragOverHabitId(null);

    if (!sourceHabitId || sourceHabitId === targetHabitId) return;

    sound.playClick();

    // Reorder globally across all habits
    const currentHabitIds = habits.map((h) => h.id);
    const sourceIdx = currentHabitIds.indexOf(sourceHabitId);
    const targetIdx = currentHabitIds.indexOf(targetHabitId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const reordered = [...currentHabitIds];
      const [moved] = reordered.splice(sourceIdx, 1);
      reordered.splice(targetIdx, 0, moved);
      void reorderHabits(reordered);
    }
  };

  const handleDragEnd = () => {
    setDraggedHabitId(null);
    setDragOverHabitId(null);
  };

  const toggleCategoryCollapse = (cat: string) => {
    sound.playClick();
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Render an individual habit row
  const renderHabitRow = (habit: Habit) => {
    const checkin = checkins[`${habit.id}_${todayStr}`];
    const isChecked = Boolean(checkin?.completed);
    const isNumeric = habit.type === 'numeric';
    const targetVal = habit.target_value ?? 1;
    const currentVal = checkin?.value ?? (isChecked ? targetVal : 0);
    const stepAmount = targetVal > 20 ? (targetVal >= 1000 ? 250 : 5) : 1;

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const doneThisMonth = doneThisMonthByHabit[habit.id] || 0;

    const goal = habit.monthly_goal > 0 ? habit.monthly_goal : daysInMonth;
    const monthRate = Math.min(1, doneThisMonth / goal);
    const monthPct = Math.round(monthRate * 100);

    const isDragging = draggedHabitId === habit.id;
    const isDragTarget = dragOverHabitId === habit.id;

    return (
      <div
        key={habit.id}
        draggable
        onDragStart={(e) => handleDragStart(e, habit.id)}
        onDragOver={(e) => handleDragOver(e, habit.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, habit.id)}
        onDragEnd={handleDragEnd}
        style={{
          backgroundColor: isDragging
            ? 'rgba(99, 102, 241, 0.12)'
            : 'var(--bg-surface-card)',
          borderColor: isDragTarget
            ? 'var(--accent-primary)'
            : isDragging
            ? 'rgba(99, 102, 241, 0.4)'
            : 'var(--border-subtle)',
          boxShadow: isDragTarget ? '0 0 12px var(--accent-glow)' : undefined,
          opacity: isDragging ? 0.6 : 1,
        }}
        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 group transition-all hover:border-[var(--border-medium)] select-none ${
          isChecked ? 'opacity-90' : ''
        }`}
      >
        {/* Left: Drag Grip Handle, Checkbox, Details */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 -ml-1 shrink-0 opacity-40 group-hover:opacity-100"
            title="Drag to reorder habit priority"
          >
            <GripVertical size={16} />
          </div>

          <CircleCheckbox
            checked={isChecked}
            color={habit.color}
            size={28}
            isToday={true}
            onClick={() => toggleCheckin(habit.id, todayStr)}
            ariaLabel={`${habit.name}, Today`}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                {habit.category || 'ROUTINE'}
              </span>
              {isChecked && <span className="studio-badge-active">DONE TODAY</span>}
              {checkin?.mood && (
                <span className="inline-flex items-center" title={`Mood: ${checkin.mood}`}>
                  {renderMoodIcon(checkin.mood, 11)}
                </span>
              )}
              {checkin?.note && (
                <span
                  className="text-[10px] text-[var(--accent-primary)] font-semibold truncate max-w-[140px]"
                  title={checkin.note}
                >
                  "{checkin.note}"
                </span>
              )}
            </div>

            <div
              onClick={() => openHabitModal(habit)}
              style={{ color: 'var(--text-primary)' }}
              className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer hover:text-[var(--accent-primary)] transition-colors mt-0.5 truncate"
            >
              <HabitIconView iconId={habit.emoji} color={habit.color} size={15} />
              <span className={isChecked ? 'line-through text-[var(--text-secondary)]' : ''}>
                {habit.name}
              </span>
              {isNumeric && (
                <span className="text-xs font-normal text-[var(--text-muted)] font-mono ml-1">
                  ({currentVal} / {targetVal} {habit.unit})
                </span>
              )}
            </div>

            <div
              style={{ color: 'var(--text-secondary)' }}
              className="text-[11.5px] font-medium font-num mt-0.5 flex items-center gap-2"
            >
              <span>{doneThisMonth} of {goal} days completed</span>
              <span style={{ color: 'var(--text-dim)' }}>•</span>
              <span style={{ color: habit.color }} className="font-bold">
                {monthPct}% month pace
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions, Numeric Steppers & Reflection Note */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-1.5 sm:mt-0 flex-shrink-0">
          {/* Numeric Stepper if numeric habit */}
          {isNumeric && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <button
                onClick={() => updateNumericValue(habit.id, todayStr, -stepAmount, true)}
                className="w-8 h-8 rounded-[6px] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer touch-manipulation"
                title={`Decrease by ${stepAmount} ${habit.unit}`}
              >
                -
              </button>
              <span className="px-2 text-xs font-mono font-bold text-[var(--text-primary)] min-w-[50px] text-center">
                {currentVal} {habit.unit}
              </span>
              <button
                onClick={() => updateNumericValue(habit.id, todayStr, stepAmount, true)}
                className="w-8 h-8 rounded-[6px] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer touch-manipulation"
                title={`Increase by ${stepAmount} ${habit.unit}`}
              >
                +
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            {/* Start / View Real-Time Habit Timer */}
            {(() => {
              const isTimerActive = activeHabitTimer?.habitId === habit.id;
              const goalMins = habit.daily_focus_minutes;
              const goalLabel = goalMins
                ? goalMins >= 60
                  ? `${+(goalMins / 60).toFixed(1)}h`
                  : `${goalMins}m`
                : 'Timer';
              return (
                <button
                  type="button"
                  onClick={() => (isTimerActive ? setFocusStudioOpen(true) : startHabitTimer(habit))}
                  style={{
                    backgroundColor: isTimerActive ? `${habit.color}20` : 'var(--bg-surface-elevated)',
                    borderColor: isTimerActive ? habit.color : 'var(--border-subtle)',
                    color: isTimerActive ? habit.color : 'var(--text-secondary)',
                  }}
                  className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-colors cursor-pointer touch-manipulation ${
                    isTimerActive ? 'animate-pulse' : ''
                  }`}
                  title={isTimerActive ? 'Open running Focus Studio' : `Start real-time timer for "${habit.name}"`}
                >
                  {isTimerActive ? <Timer size={12} /> : <Play size={11} fill="currentColor" />}
                  <span className="text-[11px]">{isTimerActive ? 'LIVE' : goalLabel}</span>
                </button>
              );
            })()}

            {/* Reflection Note Button */}
            <button
              onClick={() => openReflectionModal(habit.id, todayStr)}
              style={{
                backgroundColor: checkin?.note || checkin?.mood ? 'var(--bg-surface-elevated)' : 'transparent',
                borderColor: checkin?.note || checkin?.mood ? 'var(--accent-primary)' : 'var(--border-subtle)',
                color: checkin?.note || checkin?.mood ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              className="h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:border-[var(--border-medium)] hover:text-[var(--text-primary)] transition-colors cursor-pointer touch-manipulation"
              title="Add daily reflection note & mood"
            >
              {checkin?.mood ? (
                renderMoodIcon(checkin.mood, 12)
              ) : (
                <NotebookPen size={12} className="text-[var(--text-muted)]" />
              )}
              <span className="text-[11px]">
                {checkin?.note ? 'Note' : 'Reflect'}
              </span>
            </button>

            {/* Standard Check-in toggle */}
            <button
              onClick={() => toggleCheckin(habit.id, todayStr)}
              style={{
                backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface-subtle)',
                borderColor: isChecked ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-subtle)',
                color: isChecked ? '#10b981' : 'var(--text-primary)',
              }}
              className="h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:border-[var(--border-medium)] transition-all cursor-pointer active:scale-95 touch-manipulation"
              title={isChecked ? 'Mark as incomplete' : 'Mark complete for today'}
            >
              <Check size={12} strokeWidth={isChecked ? 3 : 2} />
              <span>{isChecked ? 'Completed' : 'Check In'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card id="today-focus-card" className="w-full !p-5 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
              className="text-[17px] font-bold"
            >
              Today’s Focus & Routine
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              DRAG & DROP REORDER
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium mt-0.5">
            {searchQuery
              ? `Filtered by "${searchQuery}" · Drag handles to set custom sequence`
              : selectedCategory !== 'all'
              ? `Filtered by category · ${displayedHabits.length} habits scheduled`
              : 'Habits scheduled for today · Drag handles to sequence your protocol'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-colors cursor-pointer"
            >
              Clear filter
            </button>
          )}

          {/* Group by Category Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              setIsGroupedView(!isGroupedView);
            }}
            style={{
              backgroundColor: isGroupedView ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
              borderColor: isGroupedView ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: isGroupedView ? '#ffffff' : 'var(--text-secondary)',
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border hover:border-[var(--border-medium)] cursor-pointer"
            title="Toggle Grouped by Category View"
          >
            <Layers size={13} />
            <span>{isGroupedView ? 'Grouped' : 'Group by Category'}</span>
          </button>

          <button
            onClick={() => setTimeCapsuleModalOpen(true)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border hover:border-[var(--border-medium)] hover:text-[var(--text-primary)] cursor-pointer"
            title="Open Identity Time Capsule & Photo Proofs"
          >
            <Camera size={12} className="text-amber-400" />
            <span className="hidden sm:inline">Time Capsule</span>
          </button>

          <button
            onClick={() => setSynergyGraphModalOpen(true)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border hover:border-[var(--border-medium)] hover:text-[var(--text-primary)] cursor-pointer"
            title="Open Habit Stacking & Synergy Graph"
          >
            <Share2 size={12} className="text-indigo-400" />
            <span className="hidden sm:inline">Synergy</span>
          </button>

          <button
            onClick={() => openHabitModal()}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface-subtle)] cursor-pointer"
          >
            <Plus size={13} className="text-[var(--accent-primary)]" />
            <span>Add Habit</span>
          </button>
        </div>
      </div>

      {displayedHabits.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--bg-surface-card)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          className="py-8 px-4 text-center text-xs rounded-xl border border-dashed"
        >
          {searchQuery
            ? `No habits matching "${searchQuery}" scheduled today.`
            : selectedCategory !== 'all'
            ? 'No habits scheduled today in this category.'
            : activeHabits.length === 0
            ? 'No habits created yet. Tap "+ Add Habit" to begin your routine!'
            : 'No habits scheduled for today. Enjoy your rest or add a habit!'}
        </div>
      ) : isGroupedView ? (
        /* Categorized Group Bento Sections */
        <div className="space-y-4">
          {Object.entries(groupedHabits).map(([catKey, catHabits]) => {
            const meta = CATEGORY_META[catKey] || {
              label: catKey.toUpperCase(),
              icon: '📌',
              color: 'var(--accent-primary)',
            };
            const isCollapsed = Boolean(collapsedCategories[catKey]);
            const doneCount = catHabits.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length;
            const catPct = Math.round((doneCount / catHabits.length) * 100);

            return (
              <div
                key={catKey}
                style={{
                  backgroundColor: 'var(--bg-surface-card)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="rounded-2xl border p-3.5 space-y-2.5 transition-all"
              >
                {/* Category Accordion Header */}
                <div
                  onClick={() => toggleCategoryCollapse(catKey)}
                  className="flex items-center justify-between cursor-pointer select-none py-0.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meta.icon}</span>
                    <span style={{ color: 'var(--text-primary)' }} className="text-xs font-bold">
                      {meta.label}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      ({catHabits.length} habits)
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Completion rate badge */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold">
                      <span style={{ color: catPct === 100 ? '#10b981' : 'var(--text-secondary)' }}>
                        {doneCount}/{catHabits.length} done
                      </span>
                      <div className="w-12 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          style={{
                            width: `${catPct}%`,
                            backgroundColor: catPct === 100 ? '#10b981' : meta.color,
                          }}
                          className="h-full rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                    >
                      {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Category Habits List */}
                {!isCollapsed && (
                  <div className="space-y-2 pt-1 animate-fade-in">
                    {catHabits.map((h) => renderHabitRow(h))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat Ordered List */
        <div className="space-y-2.5">
          {displayedHabits.map((habit) => renderHabitRow(habit))}
        </div>
      )}
    </Card>
  );
});

TodayHabitsCard.displayName = 'TodayHabitsCard';
