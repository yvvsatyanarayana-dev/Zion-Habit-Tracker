import React, { useState } from 'react';
import { Card } from '../ui/Card';
import {
  Award,
  Lock,
  Flame,
  Star,
  CheckCircle2,
  Zap,
  TrendingUp,
  Trophy,
  Shield,
  Crown,
  Sparkles,
  Target,
} from 'lucide-react';
import { computeStreakStats } from '../../lib/statsUtils';
import { useHabitStore } from '../../store/useHabitStore';

type BadgeTier = 'Starter' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Legend';

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  getProgress: (stats: {
    currentStreak: number;
    longestStreak: number;
    perfectDaysCount: number;
    totalCheckinsCount: number;
  }) => { current: number; target: number; unit: string };
  isUnlocked: (stats: {
    currentStreak: number;
    longestStreak: number;
    perfectDaysCount: number;
    totalCheckinsCount: number;
  }) => boolean;
}

const BADGES: BadgeDefinition[] = [
  {
    id: 'first_checkin',
    name: 'First Spark',
    description: 'Completed your very first habit check-in',
    tier: 'Starter',
    color: '#10b981',
    icon: Sparkles,
    getProgress: (s) => ({ current: Math.min(s.totalCheckinsCount, 1), target: 1, unit: 'check-in' }),
    isUnlocked: (s) => s.totalCheckinsCount >= 1,
  },
  {
    id: 'streak_3',
    name: '3-Day Momentum',
    description: 'Built momentum with 3 consecutive streak days',
    tier: 'Starter',
    color: '#06b6d4',
    icon: Zap,
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 3), target: 3, unit: 'days' }),
    isUnlocked: (s) => s.longestStreak >= 3,
  },
  {
    id: 'perfect_day_1',
    name: 'Flawless Day',
    description: 'Completed 100% of all scheduled habits in a single day',
    tier: 'Bronze',
    color: '#3b82f6',
    icon: CheckCircle2,
    getProgress: (s) => ({ current: Math.min(s.perfectDaysCount, 1), target: 1, unit: 'day' }),
    isUnlocked: (s) => s.perfectDaysCount >= 1,
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Maintained 7 consecutive streak days across your habits',
    tier: 'Bronze',
    color: '#f59e0b',
    icon: Flame,
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 7), target: 7, unit: 'days' }),
    isUnlocked: (s) => s.longestStreak >= 7,
  },
  {
    id: 'checkins_10',
    name: 'Habit Builder',
    description: 'Logged 10 total verified habit completions',
    tier: 'Bronze',
    color: '#8b5cf6',
    icon: Target,
    getProgress: (s) => ({ current: Math.min(s.totalCheckinsCount, 10), target: 10, unit: 'check-ins' }),
    isUnlocked: (s) => s.totalCheckinsCount >= 10,
  },
  {
    id: 'streak_14',
    name: 'Fortnight Focus',
    description: 'Two continuous weeks (14 days) of streak consistency',
    tier: 'Silver',
    color: '#ec4899',
    icon: TrendingUp,
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 14), target: 14, unit: 'days' }),
    isUnlocked: (s) => s.longestStreak >= 14,
  },
  {
    id: 'checkins_25',
    name: 'Silver Milestone',
    description: 'Accumulated 25 total habit check-ins in your ledger',
    tier: 'Silver',
    color: '#94a3b8',
    icon: Trophy,
    getProgress: (s) => ({ current: Math.min(s.totalCheckinsCount, 25), target: 25, unit: 'check-ins' }),
    isUnlocked: (s) => s.totalCheckinsCount >= 25,
  },
  {
    id: 'streak_30',
    name: '30-Day Momentum',
    description: 'Reached a full unbroken calendar month of consistency',
    tier: 'Gold',
    color: '#f43f5e',
    icon: Zap,
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 30), target: 30, unit: 'days' }),
    isUnlocked: (s) => s.longestStreak >= 30,
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: '7 total perfect days completed with all scheduled habits',
    tier: 'Gold',
    color: '#eab308',
    icon: Award,
    getProgress: (s) => ({ current: Math.min(s.perfectDaysCount, 7), target: 7, unit: 'perfect days' }),
    isUnlocked: (s) => s.perfectDaysCount >= 7,
  },
  {
    id: 'checkins_100',
    name: 'Century Club',
    description: 'Logged an astounding 100 verified habit check-ins',
    tier: 'Diamond',
    color: '#14b8a6',
    icon: Shield,
    getProgress: (s) => ({ current: Math.min(s.totalCheckinsCount, 100), target: 100, unit: 'check-ins' }),
    isUnlocked: (s) => s.totalCheckinsCount >= 100,
  },
  {
    id: 'streak_100',
    name: 'Centurion 100',
    description: 'Achieved an extraordinary 100-day consecutive streak',
    tier: 'Diamond',
    color: '#06b6d4',
    icon: Star,
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 100), target: 100, unit: 'days' }),
    isUnlocked: (s) => s.longestStreak >= 100,
  },
  {
    id: 'streak_365',
    name: '365-Day Legend',
    description: 'One complete year of relentless, elite dedication',
    tier: 'Legend',
    color: '#a855f7',
    icon: Crown,
    getProgress: (s) => ({ current: Math.min(s.longestStreak, 365), target: 365, unit: 'days' }),
    isUnlocked: (s) => s.longestStreak >= 365,
  },
];

export const AchievementsView: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const streakThreshold = useHabitStore((s) => s.settings.streak_threshold);
  const currentDate = useHabitStore((s) => s.currentDate);

  const [filterMode, setFilterMode] = useState<'all' | 'unlocked' | 'in_progress'>('all');

  const stats = computeStreakStats(
    habits,
    allCheckinsList,
    streakThreshold,
    currentDate
  );

  const unlockedCount = BADGES.filter((b) => b.isUnlocked(stats)).length;
  const totalCount = BADGES.length;
  const unlockPercentage = Math.round((unlockedCount / totalCount) * 100);

  const displayedBadges = BADGES.filter((badge) => {
    const isUnlocked = badge.isUnlocked(stats);
    if (filterMode === 'unlocked') return isUnlocked;
    if (filterMode === 'in_progress') return !isUnlocked;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner: Real-time Studio Medals Progress Overview */}
      <Card className="!p-5 border relative overflow-hidden bg-gradient-to-r from-[var(--bg-surface-elevated)] to-[var(--bg-surface)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Trophy size={26} className="fill-amber-400/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">
                  Achievement Medals
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[4px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Real-time
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                Dynamic medals unlock automatically as you log check-ins and extend streaks.
              </p>
            </div>
          </div>

          {/* Unlocked Stats & Progress Bar */}
          <div className="w-full md:w-auto flex flex-col md:items-end gap-1.5 min-w-[220px]">
            <div className="flex items-center justify-between md:justify-end gap-2 text-xs">
              <span className="text-[var(--text-muted)] font-medium">Collection Progress:</span>
              <span className="font-bold font-num text-[var(--text-primary)]">
                {unlockedCount} / {totalCount} ({unlockPercentage}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.max(unlockPercentage, 3)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-4 pt-3.5 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => setFilterMode('all')}
            style={{
              backgroundColor: filterMode === 'all' ? 'var(--bg-surface-hover)' : 'transparent',
              borderColor: filterMode === 'all' ? 'var(--border-medium)' : 'transparent',
              color: filterMode === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
            className="px-3 py-1 rounded-[5px] border text-xs font-semibold transition-all cursor-pointer"
          >
            All Medals ({totalCount})
          </button>
          <button
            onClick={() => setFilterMode('unlocked')}
            style={{
              backgroundColor: filterMode === 'unlocked' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              borderColor: filterMode === 'unlocked' ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
              color: filterMode === 'unlocked' ? '#10b981' : 'var(--text-muted)',
            }}
            className="px-3 py-1 rounded-[5px] border text-xs font-semibold transition-all cursor-pointer"
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            onClick={() => setFilterMode('in_progress')}
            style={{
              backgroundColor: filterMode === 'in_progress' ? 'var(--bg-surface-hover)' : 'transparent',
              borderColor: filterMode === 'in_progress' ? 'var(--border-medium)' : 'transparent',
              color: filterMode === 'in_progress' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
            className="px-3 py-1 rounded-[5px] border text-xs font-semibold transition-all cursor-pointer"
          >
            In Progress ({totalCount - unlockedCount})
          </button>
        </div>
      </Card>

      {/* Grid of Achievement Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {displayedBadges.map((badge) => {
          const unlocked = badge.isUnlocked(stats);
          const progress = badge.getProgress(stats);
          const percent = Math.min(100, Math.round((progress.current / progress.target) * 100));
          const Icon = badge.icon;

          return (
            <Card
              key={badge.id}
              className={`flex flex-col justify-between p-4 transition-all duration-200 border relative ${
                unlocked
                  ? 'border-[var(--border-medium)] hover:border-amber-500/40 hover:shadow-lg'
                  : 'opacity-70 hover:opacity-90'
              }`}
            >
              {/* Header row: Medal Disk + Title & Tier */}
              <div className="flex items-start gap-3.5">
                {/* 3D Round Medal Disk */}
                <div
                  style={{
                    backgroundColor: unlocked ? `${badge.color}20` : 'var(--bg-surface-subtle)',
                    borderColor: unlocked ? badge.color : 'var(--border-subtle)',
                    boxShadow: unlocked ? `0 0 16px ${badge.color}40` : 'none',
                  }}
                  className={`w-13 h-13 rounded-full flex items-center justify-center border-2 flex-shrink-0 relative transition-transform ${
                    unlocked ? 'scale-100 hover:scale-105' : ''
                  }`}
                >
                  {unlocked ? (
                    <Icon size={22} color={badge.color} />
                  ) : (
                    <Lock size={16} className="text-[var(--text-dim)]" />
                  )}
                  {unlocked && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-sm">
                      <CheckCircle2 size={11} strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Badge Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3
                      style={{ color: 'var(--text-primary)' }}
                      className="text-[14px] font-bold truncate tracking-tight"
                    >
                      {badge.name}
                    </h3>
                    <span
                      style={{
                        backgroundColor: unlocked ? `${badge.color}18` : 'var(--bg-surface-subtle)',
                        color: unlocked ? badge.color : 'var(--text-muted)',
                        borderColor: unlocked ? `${badge.color}35` : 'var(--border-subtle)',
                      }}
                      className="text-[9.5px] uppercase font-bold px-1.5 py-0.5 rounded-[4px] border flex-shrink-0"
                    >
                      {badge.tier}
                    </span>
                  </div>
                  <p
                    style={{ color: 'var(--text-secondary)' }}
                    className="text-[11.5px] mt-1 leading-snug line-clamp-2"
                  >
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Progress Section */}
              <div className="mt-3.5 pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-[var(--text-muted)]">
                    {unlocked ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 size={12} /> Unlocked
                      </span>
                    ) : (
                      <span>Progress</span>
                    )}
                  </span>
                  <span className="font-num text-[var(--text-secondary)]">
                    {progress.current} / {progress.target} {progress.unit} ({percent}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] overflow-hidden">
                  <div
                    style={{
                      width: `${percent}%`,
                      backgroundColor: unlocked ? badge.color : 'var(--accent-primary, #6366f1)',
                    }}
                    className="h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
