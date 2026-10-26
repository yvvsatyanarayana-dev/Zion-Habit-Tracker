import React, { useState } from 'react';
import { Header } from '../components/ui/Header';
import { HabitsGrid } from '../components/habits/HabitsGrid';
import { EmptyHabitsState } from '../components/habits/EmptyHabitsState';
import { CategoryFilterBar } from '../components/ui/CategoryFilterBar';
import { useHabitStore } from '../store/useHabitStore';
import { HabitChainModal } from '../components/ui/HabitChainModal';
import { HabitReplaySlider } from '../components/ui/HabitReplaySlider';
import { WellnessLogEntry } from '../components/ui/WellnessLogEntry';
import { Plus, GitBranch, RotateCcw, Heart, Zap, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { formatLocalDate } from '../lib/dateUtils';

export const DailyHabitsPage: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const activeHabits = habits.filter((h) => !h.archived);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);
  const currentDate = useHabitStore((s) => s.currentDate);
  const habitDependencies = useHabitStore((s) => s.habitDependencies);
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs);

  const [showChains, setShowChains] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [showWellnessModal, setShowWellnessModal] = useState(false);

  const dateStr = formatLocalDate(currentDate);
  const todaysWellness = wellnessLogs[dateStr];
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
    <div className="daily-habits-page w-full max-w-[1700px] mx-auto h-full flex flex-col min-h-0 space-y-2.5 animate-in fade-in duration-200">
      {/* ── TOP HEADER SECTION ── */}
      <div className="flex-shrink-0 flex flex-col gap-2.5">
        <Header title="Daily Habits" />

        {/* ── RESPONSIVE ACTION TOOLBAR ── */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Add Habit Button */}
            <button
              onClick={() => openHabitModal()}
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
              className="h-8 px-3 rounded-[8px] text-xs font-bold flex items-center gap-1.5 transition-all hover:brightness-105 active:scale-95 cursor-pointer touch-manipulation"
              aria-label="Add new habit"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>New Habit</span>
            </button>

            {/* Habit Chains Button */}
            {activeHabits.length > 0 && (
              <button
                onClick={() => setShowChains(true)}
                style={{
                  backgroundColor: hasDependencies ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-surface-elevated)',
                  borderColor: hasDependencies ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-subtle)',
                  color: hasDependencies ? '#a78bfa' : 'var(--text-secondary)',
                }}
                className="h-8 px-2.5 sm:px-3 rounded-[8px] border text-xs font-semibold flex items-center gap-1.5 transition-colors hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] cursor-pointer touch-manipulation"
                aria-label="Manage habit chains"
                title="Habit Dependencies & Chains"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Chains</span>
                {hasDependencies && (
                  <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded-full text-[10px] font-bold">
                    {chainStats.prereqCount + chainStats.antiCount}
                  </span>
                )}
              </button>
            )}

            {/* Habit Replay Button */}
            <button
              onClick={() => setShowReplay(true)}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
              className="h-8 px-2.5 sm:px-3 rounded-[8px] border text-xs font-semibold flex items-center gap-1.5 transition-colors hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] cursor-pointer touch-manipulation"
              aria-label="Habit replay"
              title="Time-Travel Consistency Replay"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Replay</span>
            </button>
          </div>

          {/* Right: Wellness & Mood Check-in Pill */}
          <div className="flex items-center">
            {todaysWellness ? (
              <button
                onClick={() => setShowWellnessModal(true)}
                style={{
                  backgroundColor: 'rgba(236, 72, 153, 0.08)',
                  borderColor: 'rgba(236, 72, 153, 0.25)',
                }}
                className="h-8 px-2.5 sm:px-3 rounded-[8px] border text-xs font-semibold flex items-center gap-1.5 transition-colors hover:border-pink-500/40 cursor-pointer touch-manipulation"
                title="View / Edit Today's Energy & Mood Log"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-[var(--text-primary)] font-medium text-[11.5px]">
                  Energy: {todaysWellness.energy}/5 · Mood: {todaysWellness.mood}/5
                </span>
              </button>
            ) : (
              <button
                onClick={() => setShowWellnessModal(true)}
                className="h-8 px-3 rounded-[8px] border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 text-xs font-semibold flex items-center gap-1.5 hover:border-pink-500/50 transition-all cursor-pointer touch-manipulation"
                title="Log Today's Energy & Mood"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-[var(--text-primary)] font-semibold text-[11.5px]">
                  Log Mood
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        {activeHabits.length > 0 && (
          <div className="flex-shrink-0 pt-0.5">
            <CategoryFilterBar />
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
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
                Tap any day to check in. Swipe horizontally to view all dates.
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

      {/* ── MODALS ── */}
      <HabitChainModal isOpen={showChains} onClose={() => setShowChains(false)} />
      <HabitReplaySlider isOpen={showReplay} onClose={() => setShowReplay(false)} />
      <WellnessLogEntry
        isOpen={showWellnessModal}
        onClose={() => setShowWellnessModal(false)}
        date={currentDate}
      />
    </div>
  );
};
