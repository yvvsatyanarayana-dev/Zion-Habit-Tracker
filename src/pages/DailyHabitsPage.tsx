import React, { useState } from 'react';
import { Header } from '../components/ui/Header';
import { HabitsGrid } from '../components/habits/HabitsGrid';
import { EmptyHabitsState } from '../components/habits/EmptyHabitsState';
import { CategoryFilterBar } from '../components/ui/CategoryFilterBar';
import { useHabitStore } from '../store/useHabitStore';
import { HabitChainModal } from '../components/ui/HabitChainModal';
import { HabitReplaySlider } from '../components/ui/HabitReplaySlider';
import { QuickWellnessEntry } from '../components/ui/WellnessLogEntry';
import { Plus, GitBranch, RotateCcw, Heart, Zap, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

export const DailyHabitsPage: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const activeHabits = habits.filter((h) => !h.archived);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);
  const currentDate = useHabitStore((s) => s.currentDate);
  const habitDependencies = useHabitStore((s) => s.habitDependencies);
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs);

  const [showChains, setShowChains] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [showWellnessExpanded, setShowWellnessExpanded] = useState(false);

  const dateStr = currentDate.toISOString().split('T')[0];
  const hasWellnessLog = !!wellnessLogs[dateStr];
  const hasDependencies = habitDependencies.length > 0;

  const chainStats = (() => {
    let prereqCount = 0;
    let antiCount = 0;
    for (const dep of habitDependencies) {
      if (dep.type === 'prerequisite') prereqCount++;
      else antiCount++;
    }
    return { prereqCount, antiCount };
  })();

  return (
    <div className="daily-habits-page w-full max-w-[1700px] mx-auto h-full flex flex-col min-h-0 space-y-2 animate-in fade-in duration-200">
      {/* Header with toolbar */}
      <div className="flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <Header title="Daily Habits" />

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Add Habit Button */}
            <button
              onClick={() => openHabitModal()}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              aria-label="Add new habit"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Habit</span>
            </button>

            {/* Habit Chains Button */}
            {activeHabits.length > 0 && (
              <button
                onClick={() => setShowChains(true)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  hasDependencies
                    ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20'
                    : 'bg-muted/50 border border-border/50 hover:bg-muted'
                )}
                aria-label="Manage habit chains"
              >
                <GitBranch className="w-4 h-4" />
                <span className="hidden sm:inline">Chains</span>
                {hasDependencies && (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                    {chainStats.prereqCount + chainStats.antiCount}
                  </span>
                )}
              </button>
            )}

            {/* Habit Replay Button */}
            <button
              onClick={() => setShowReplay(true)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                'bg-muted/50 border border-border/50 hover:bg-muted'
              )}
              aria-label="Habit replay - time travel"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Replay</span>
            </button>

            {/* Wellness Quick Entry */}
            {!hasWellnessLog && (
              <QuickWellnessEntry
                date={currentDate}
                compact
                onOpenChange={setShowWellnessExpanded}
              />
            )}
            {hasWellnessLog && (
              <button
                onClick={() => setShowWellnessExpanded(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl text-sm font-medium hover:border-pink-500/30 transition-colors"
                aria-label="View wellness log"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="hidden sm:inline">Wellness Logged</span>
              </button>
            )}
          </div>
        </div>

        {activeHabits.length > 0 && (
          <div className="flex-shrink-0">
            <CategoryFilterBar />
          </div>
        )}
      </div>

      {/* Main Content */}
      {activeHabits.length === 0 ? (
        <EmptyHabitsState />
      ) : (
        <div className="daily-habits-content flex-1 min-h-0 flex flex-col space-y-1.5">
          <div className="habits-grid-help flex-shrink-0 flex items-center justify-between px-1">
            <p style={{ color: 'var(--text-secondary)' }} className="text-[12px]">
              <span className="habits-grid-help-desktop">
                Track your daily checkboxes by week. Use arrow keys + Space to toggle, or click any circle.
              </span>
              <span className="habits-grid-help-mobile">
                Tap a day to check in. Swipe to see more dates.
              </span>
            </p>
            <div style={{ color: 'var(--text-muted)' }} className="text-[11px] font-semibold flex items-center gap-1.5">
              <span style={{ backgroundColor: 'var(--accent-primary)' }} className="w-2 h-2 rounded-full" />
              <span>Today highlighted</span>
            </div>
          </div>

          <HabitsGrid />
        </div>
      )}

      {/* Modals */}
      <HabitChainModal isOpen={showChains} onClose={() => setShowChains(false)} />
      <HabitReplaySlider isOpen={showReplay} onClose={() => setShowReplay(false)} />

      {/* Wellness Log Full Modal */}
      {showWellnessExpanded && (
        <QuickWellnessEntry
          date={currentDate}
          compact={false}
          onOpenChange={setShowWellnessExpanded}
        />
      )}
    </div>
  );
};