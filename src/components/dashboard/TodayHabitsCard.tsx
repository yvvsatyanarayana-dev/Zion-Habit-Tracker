import React from 'react';
import { Card } from '../ui/Card';
import { CircleCheckbox } from '../ui/CircleCheckbox';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay } from '../../lib/statsUtils';
import { Plus, Check, Clock, Calendar } from 'lucide-react';
import { HabitIconView } from '../../lib/habitIcons';

export const TodayHabitsCard: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const currentDate = useHabitStore((s) => s.currentDate);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);
  const showEmojiSetting = useHabitStore((s) => s.settings.show_emoji);
  const searchQuery = useHabitStore((s) => s.searchQuery);
  const setSearchQuery = useHabitStore((s) => s.setSearchQuery);
  const todayTrigger = useHabitStore((s) => s.todayTrigger);

  const selectedCategory = useHabitStore((s) => s.selectedCategory);
  const openReflectionModal = useHabitStore((s) => s.openReflectionModal);
  const updateNumericValue = useHabitStore((s) => s.updateNumericValue);

  React.useEffect(() => {
    if (!todayTrigger) return;
    const el = document.getElementById('today-focus-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('studio-focus-highlight');
      setTimeout(() => el.classList.remove('studio-focus-highlight'), 1200);
    }
  }, [todayTrigger]);

  const todayStr = formatLocalDate(currentDate);
  const todayWeekday = currentDate.getDay();

  const activeHabits = habits.filter((h) => !h.archived);
  const scheduledToday = activeHabits.filter((h) =>
    isHabitScheduledOnDay(h, todayWeekday)
  );

  const categoryFiltered =
    selectedCategory === 'all'
      ? scheduledToday
      : scheduledToday.filter((h) => (h.category || 'routine') === selectedCategory);

  const displayedHabits = categoryFiltered.filter((h) =>
    searchQuery ? h.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <Card id="today-focus-card" className="w-full !p-5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            className="text-[17px] font-bold"
          >
            Today’s Focus
          </h2>
          <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium mt-0.5">
            {searchQuery
              ? `Filtered by "${searchQuery}" · Tap to check in`
              : selectedCategory !== 'all'
              ? `Filtered by category · ${displayedHabits.length} habits scheduled`
              : 'Habits scheduled for today · Tap to check in'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-colors cursor-pointer"
            >
              Clear filter
            </button>
          )}
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
      ) : (
        <div className="space-y-2.5">
          {displayedHabits.map((habit) => {
            const checkin = checkins[`${habit.id}_${todayStr}`];
            const isChecked = Boolean(checkin?.completed);
            const isNumeric = habit.type === 'numeric';
            const targetVal = habit.target_value ?? 1;
            const currentVal = checkin?.value ?? (isChecked ? targetVal : 0);
            const stepAmount = targetVal > 20 ? (targetVal >= 1000 ? 250 : 5) : 1;

            let doneThisMonth = 0;
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
              const dStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              if (checkins[`${habit.id}_${dStr}`]?.completed) {
                doneThisMonth++;
              }
            }

            const goal = habit.monthly_goal > 0 ? habit.monthly_goal : daysInMonth;
            const monthRate = Math.min(1, doneThisMonth / goal);
            const monthPct = Math.round(monthRate * 100);

            // Mood emoji helper
            const moodMap: Record<string, string> = {
              energized: '⚡',
              good: '😊',
              neutral: '😐',
              tired: '🥱',
            };
            const moodEmoji = checkin?.mood ? moodMap[checkin.mood] : null;

            return (
              <div
                key={habit.id}
                style={{
                  backgroundColor: 'var(--bg-surface-card)',
                  borderColor: isChecked ? 'var(--border-subtle)' : 'var(--border-subtle)',
                }}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 group transition-all hover:border-[var(--border-medium)] ${
                  isChecked ? 'opacity-90' : ''
                }`}
              >
                {/* Left: Checkbox / Stepper, Icon squircle, details */}
                <div className="flex items-center gap-3 min-w-0">
                  <CircleCheckbox
                    checked={isChecked}
                    color={habit.color}
                    size={28}
                    onClick={() => toggleCheckin(habit.id, todayStr)}
                    ariaLabel={`${habit.name}, Today`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                        {habit.category || 'ROUTINE'}
                      </span>
                      {isChecked && (
                        <span className="studio-badge-active">
                          DONE TODAY
                        </span>
                      )}
                      {moodEmoji && (
                        <span className="text-xs" title={`Mood: ${checkin?.mood}`}>
                          {moodEmoji}
                        </span>
                      )}
                      {checkin?.note && (
                        <span className="text-[10px] text-[var(--accent-primary)] font-semibold truncate max-w-[140px]" title={checkin.note}>
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
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {/* Numeric Stepper if numeric habit */}
                  {isNumeric && (
                    <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                      <button
                        onClick={() => updateNumericValue(habit.id, todayStr, -stepAmount, true)}
                        className="w-7 h-7 rounded-[5px] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
                        title={`Decrease by ${stepAmount} ${habit.unit}`}
                      >
                        -
                      </button>
                      <span className="px-1.5 text-xs font-mono font-bold text-[var(--text-primary)] min-w-[50px] text-center">
                        {currentVal} {habit.unit}
                      </span>
                      <button
                        onClick={() => updateNumericValue(habit.id, todayStr, stepAmount, true)}
                        className="w-7 h-7 rounded-[5px] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
                        title={`Increase by ${stepAmount} ${habit.unit}`}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Reflection Note Button */}
                  <button
                    onClick={() => openReflectionModal(habit.id, todayStr)}
                    style={{
                      backgroundColor: checkin?.note || checkin?.mood ? 'var(--bg-surface-elevated)' : 'transparent',
                      borderColor: checkin?.note || checkin?.mood ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: checkin?.note || checkin?.mood ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    className="h-8 px-2 rounded-lg border text-xs font-medium flex items-center gap-1 hover:border-[var(--border-medium)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    title="Add daily reflection note & mood"
                  >
                    <span>{moodEmoji || '📝'}</span>
                    <span className="hidden md:inline text-[11px]">
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
                    className="h-8 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:border-[var(--border-medium)] transition-all cursor-pointer active:scale-95"
                    title={isChecked ? 'Mark as incomplete' : 'Mark complete for today'}
                  >
                    <Check size={12} strokeWidth={isChecked ? 3 : 2} />
                    <span>{isChecked ? 'Completed' : 'Check In'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
