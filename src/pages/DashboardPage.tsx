import React from 'react';
import { Header } from '../components/ui/Header';
import { ProgressCard } from '../components/dashboard/ProgressCard';
import { StreakCard } from '../components/dashboard/StreakCard';
import { DailyCompletionCard } from '../components/dashboard/DailyCompletionCard';
import { MonthCalendarCard } from '../components/dashboard/MonthCalendarCard';
import { TodayHabitsCard } from '../components/dashboard/TodayHabitsCard';
import { WeeksCardSection } from '../components/dashboard/WeeksCardSection';
import { TopHabitsSection } from '../components/dashboard/TopHabitsSection';
import { CategoryFilterBar } from '../components/ui/CategoryFilterBar';
import { EmptyHabitsState } from '../components/habits/EmptyHabitsState';
import { useHabitStore } from '../store/useHabitStore';

export const DashboardPage: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const activeHabits = habits.filter((h) => !h.archived);

  return (
    <div className="w-full max-w-[1500px] mx-auto pb-12 space-y-4 md:space-y-5 animate-in fade-in duration-200">
      <Header title="Dashboard" />

      {activeHabits.length > 0 && <CategoryFilterBar />}

      {activeHabits.length === 0 ? (
        <EmptyHabitsState />
      ) : (
        <>
          {/* 2-Column Grid (collapses below 1000px) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            {/* 1. PROGRESS card (left, wide) */}
            <ProgressCard />

            {/* 2. STREAK card (right) */}
            <StreakCard />

            {/* 3. DAILY COMPLETION card (wide) */}
            <DailyCompletionCard />

            {/* 4. MONTH CALENDAR card (right of the chart) */}
            <MonthCalendarCard />
          </div>

          {/* 5. TODAY card: full-width list of habits scheduled today */}
          <TodayHabitsCard />

          {/* 6. WEEKS section: one card per week */}
          <WeeksCardSection />

          {/* 7. TOP HABITS section: tile cards ranked by monthly completion */}
          <TopHabitsSection />
        </>
      )}
    </div>
  );
};
