import React from 'react';
import { Header } from '../components/ui/Header';
import { AchievementsView } from '../components/streaks/AchievementsView';
import { StreakLeaderboard } from '../components/streaks/StreakLeaderboard';
import { Card } from '../components/ui/Card';
import { useHabitStore } from '../store/useHabitStore';
import { Flame } from 'lucide-react';

export const StreaksPage: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const activeHabits = habits.filter((h) => !h.archived);

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-16 space-y-6 animate-in fade-in duration-200">
      <Header title="Streaks & Badges" />

      {activeHabits.length === 0 ? (
        <Card className="py-16 text-center">
          <div
            style={{ backgroundColor: 'var(--bg-surface-hover)', color: '#f59e0b' }}
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Flame size={28} />
          </div>
          <h3
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            className="text-[20px] font-bold"
          >
            No habits yet
          </h3>
          <p style={{ color: 'var(--text-secondary)' }} className="text-[13.5px] mt-1 max-w-sm mx-auto">
            Create habits to start building streaks and unlocking achievement medals.
          </p>
        </Card>
      ) : (
        <>
          <AchievementsView />
          <StreakLeaderboard />
        </>
      )}
    </div>
  );
};
