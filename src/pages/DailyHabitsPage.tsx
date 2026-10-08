import React from 'react';
import { Header } from '../components/ui/Header';
import { HabitsGrid } from '../components/habits/HabitsGrid';
import { EmptyHabitsState } from '../components/habits/EmptyHabitsState';
import { CategoryFilterBar } from '../components/ui/CategoryFilterBar';
import { useHabitStore } from '../store/useHabitStore';
import { Plus } from 'lucide-react';

export const DailyHabitsPage: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const activeHabits = habits.filter((h) => !h.archived);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);

  return (
    <div className="w-full max-w-[1700px] mx-auto h-full flex flex-col min-h-0 space-y-2 animate-in fade-in duration-200">
      <div className="flex-shrink-0 flex items-start justify-between">
        <Header title="Daily Habits" />
      </div>

      {activeHabits.length > 0 && (
        <div className="flex-shrink-0">
          <CategoryFilterBar />
        </div>
      )}

      {activeHabits.length === 0 ? (
        <EmptyHabitsState />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
          <div className="flex-shrink-0 flex items-center justify-between px-1">
            <p style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
              Track your daily checkboxes by week. Use arrow keys + Space to toggle, or click any circle.
            </p>
            <div style={{ color: 'var(--text-muted)' }} className="text-[11px] font-semibold flex items-center gap-1.5">
              <span style={{ backgroundColor: 'var(--accent-primary)' }} className="w-2 h-2 rounded-full" />
              <span>Today highlighted</span>
            </div>
          </div>

          <HabitsGrid />
        </div>
      )}
    </div>
  );
};
