import React from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay } from '../../lib/statsUtils';
import { Award, X, Sparkles, Trophy, TrendingUp, CheckCircle2, AlertCircle, Smile, Zap, Moon } from 'lucide-react';

export const WeeklyReviewModal: React.FC = () => {
  const weeklyReviewOpen = useHabitStore((s) => s.weeklyReviewOpen);
  const setWeeklyReviewOpen = useHabitStore((s) => s.setWeeklyReviewOpen);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const currentDate = useHabitStore((s) => s.currentDate);
  const weekStartSetting = useHabitStore((s) => s.settings.week_start_day);

  if (!weeklyReviewOpen) return null;

  const activeHabits = habits.filter((h) => !h.archived);

  // Compute current week range
  const weekStartsOn = weekStartSetting === 'sun' ? 0 : 1;
  const start = startOfWeek(currentDate, { weekStartsOn });
  const end = endOfWeek(currentDate, { weekStartsOn });
  const days = eachDayOfInterval({ start, end });

  let totalScheduled = 0;
  let totalCompleted = 0;
  const habitCompletions: Record<string, { habit: typeof activeHabits[0]; completed: number; scheduled: number }> = {};

  activeHabits.forEach((h) => {
    habitCompletions[h.id] = { habit: h, completed: 0, scheduled: 0 };
  });

  const moodsCount = { energized: 0, good: 0, neutral: 0, tired: 0 };
  const weeklyNotes: { habitName: string; date: string; note: string; mood?: string }[] = [];

  days.forEach((day) => {
    const dayStr = formatLocalDate(day);
    const wday = day.getDay();

    activeHabits.forEach((h) => {
      const isSched = isHabitScheduledOnDay(h, wday);
      if (isSched) {
        totalScheduled++;
        habitCompletions[h.id].scheduled++;

        const c = checkins[`${h.id}_${dayStr}`];
        if (c?.completed) {
          totalCompleted++;
          habitCompletions[h.id].completed++;
        }
        if (c?.mood && c.mood in moodsCount) {
          moodsCount[c.mood as keyof typeof moodsCount]++;
        }
        if (c?.note?.trim()) {
          weeklyNotes.push({
            habitName: h.name,
            date: format(day, 'EEE, MMM d'),
            note: c.note.trim(),
            mood: c.mood,
          });
        }
      }
    });
  });

  const completionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  // Grade calculation
  let grade = 'A+';
  let gradeColor = '#10b981'; // Emerald
  let gradeLabel = 'Flawless Execution';

  if (completionRate >= 95) {
    grade = 'A+';
    gradeColor = '#10b981';
    gradeLabel = 'Flawless Consistency';
  } else if (completionRate >= 85) {
    grade = 'A';
    gradeColor = '#6366f1';
    gradeLabel = 'Outstanding Routine';
  } else if (completionRate >= 75) {
    grade = 'B+';
    gradeColor = '#06b6d4';
    gradeLabel = 'Strong Momentum';
  } else if (completionRate >= 65) {
    grade = 'B';
    gradeColor = '#f59e0b';
    gradeLabel = 'Solid Effort';
  } else if (completionRate >= 50) {
    grade = 'C';
    gradeColor = '#fb923c';
    gradeLabel = 'Building Traction';
  } else {
    grade = 'D';
    gradeColor = '#f43f5e';
    gradeLabel = 'Needs Re-calibration';
  }

  // Best & worst habits
  const habitStats = Object.values(habitCompletions).filter((stat) => stat.scheduled > 0);
  habitStats.sort((a, b) => b.completed / b.scheduled - a.completed / a.scheduled);

  const bestHabit = habitStats[0];
  const lowestHabit = habitStats[habitStats.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
        className="relative w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent-primary)]">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Weekly Review & Consistency Grade</h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setWeeklyReviewOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Grade Hero Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
            className="p-5 rounded-xl border relative overflow-hidden flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                Consistency Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[var(--text-primary)] font-num">
                  {completionRate}%
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  ({totalCompleted} of {totalScheduled} check-ins)
                </span>
              </div>
              <p className="text-xs font-semibold" style={{ color: gradeColor }}>
                {gradeLabel}
              </p>
            </div>

            {/* Big Grade Badge */}
            <div
              style={{
                backgroundColor: `${gradeColor}18`,
                borderColor: `${gradeColor}40`,
                color: gradeColor,
              }}
              className="w-18 h-18 rounded-2xl border-2 flex items-center justify-center shadow-inner"
            >
              <span className="text-3xl font-black font-num">{grade}</span>
            </div>
          </div>

          {/* Top Performer & Growth Opportunity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Top Habit */}
            {bestHabit && (
              <div
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="p-3.5 rounded-lg border space-y-1.5"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <Trophy size={14} />
                  <span>Star Performer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{bestHabit.habit.emoji || '⚡'}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {bestHabit.habit.name}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono">
                  {bestHabit.completed}/{bestHabit.scheduled} days (
                  {Math.round((bestHabit.completed / bestHabit.scheduled) * 100)}%)
                </div>
              </div>
            )}

            {/* Growth Habit */}
            {lowestHabit && lowestHabit !== bestHabit && (
              <div
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="p-3.5 rounded-lg border space-y-1.5"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <TrendingUp size={14} />
                  <span>Growth Focus</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{lowestHabit.habit.emoji || '🌱'}</span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {lowestHabit.habit.name}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono">
                  {lowestHabit.completed}/{lowestHabit.scheduled} days (
                  {Math.round((lowestHabit.completed / lowestHabit.scheduled) * 100)}%)
                </div>
              </div>
            )}
          </div>

          {/* Mood Breakdown */}
          <div
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
            }}
            className="p-3.5 rounded-lg border space-y-2"
          >
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>Weekly Mood Pulse</span>
            </span>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                <div className="text-xs font-bold text-amber-400 font-num">{moodsCount.energized}</div>
                <div className="text-[10px] text-[var(--text-muted)]">⚡ Energized</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                <div className="text-xs font-bold text-emerald-400 font-num">{moodsCount.good}</div>
                <div className="text-[10px] text-[var(--text-muted)]">😊 Good</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                <div className="text-xs font-bold text-indigo-400 font-num">{moodsCount.neutral}</div>
                <div className="text-[10px] text-[var(--text-muted)]">😐 Neutral</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                <div className="text-xs font-bold text-slate-400 font-num">{moodsCount.tired}</div>
                <div className="text-[10px] text-[var(--text-muted)]">🥱 Tired</div>
              </div>
            </div>
          </div>

          {/* Weekly Reflection Notes Log */}
          {weeklyNotes.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Reflection Notes This Week ({weeklyNotes.length})
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {weeklyNotes.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-secondary)]">{entry.habitName}</span>
                      <span className="font-mono">{entry.date}</span>
                    </div>
                    <p className="text-[var(--text-primary)] text-xs leading-relaxed">{entry.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-end">
          <button
            onClick={() => setWeeklyReviewOpen(false)}
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
};
