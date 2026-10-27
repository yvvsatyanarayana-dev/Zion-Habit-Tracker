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
import { Layers, Play } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const activeHabits = habits.filter((h) => !h.archived);
  const setRoutineManagerOpen = useHabitStore((s) => s.setRoutineManagerOpen);

  return (
    <div className="w-full max-w-[1500px] mx-auto pb-12 space-y-4 md:space-y-5 animate-in fade-in duration-200">
      <Header title="Dashboard" />

      {activeHabits.length > 0 && <CategoryFilterBar />}

      {activeHabits.length === 0 ? (
        <EmptyHabitsState />
      ) : (
        <>
          {/* Quick Routine Flow Launcher Bar */}
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border bg-white/[0.02]"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Routine Flows & Habit Stacking</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Launch step-by-step guided focus sessions with countdown timers & audio cues
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => setRoutineManagerOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all active:scale-95"
              >
                <Play size={13} fill="white" />
                <span>Launch Routine Flow</span>
              </button>
            </div>
          </div>

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
