import React, { useMemo } from 'react';
import { Award, Share2, Zap, CheckCircle2, Flame, Heart } from 'lucide-react';
import { Card } from '../ui/Card';
import { useHabitStore } from '../../store/useHabitStore';
import { computeStreakStats } from '../../lib/statsUtils';
import { computeMasteryInfo } from '../../lib/masteryUtils';

export const MasteryCard: React.FC = () => {
  const habits = useHabitStore((s) => s.habits || []);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList || []);
  const focusSessions = useHabitStore((s) => s.focusSessions || []);
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs || {});
  const currentDate = useHabitStore((s) => s.currentDate || new Date());
  const streakThreshold = useHabitStore((s) => s.settings?.streak_threshold ?? 50);
  const setShareCardOpen = useHabitStore((s) => s.setShareCardOpen);

  const streakStats = useMemo(
    () => computeStreakStats(habits, allCheckinsList, streakThreshold, currentDate),
    [habits, allCheckinsList, streakThreshold, currentDate]
  );

  const mastery = useMemo(
    () =>
      computeMasteryInfo({
        allCheckinsList,
        focusSessions,
        bestStreak: streakStats.longestStreak,
        wellnessLogs,
      }),
    [allCheckinsList, focusSessions, streakStats.longestStreak, wellnessLogs]
  );

  const xpIntoLevel = mastery.xp - mastery.currentLevelXp;
  const xpNeededForNext = Math.max(1, mastery.nextLevelXp - mastery.currentLevelXp);

  return (
    <Card className="!p-5 sm:!p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0"
            style={{
              backgroundColor: `${mastery.rankColor}18`,
              borderColor: `${mastery.rankColor}45`,
              color: mastery.rankColor,
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Level {mastery.level} · {mastery.rank}
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-bold font-num"
                style={{
                  backgroundColor: `${mastery.rankColor}20`,
                  color: mastery.rankColor,
                }}
              >
                {mastery.xp.toLocaleString()} XP
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {xpNeededForNext - xpIntoLevel} XP to Level {mastery.level + 1}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShareCardOpen(true)}
          style={{ backgroundColor: 'var(--accent-primary)' }}
          className="px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <Share2 size={14} />
          <span>Export Studio Card</span>
        </button>
      </div>

      {/* XP Progress Bar */}
      <div className="mt-4">
        <div
          className="w-full h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface-elevated)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${mastery.progressPct}%`,
              backgroundColor: mastery.rankColor,
            }}
          />
        </div>
      </div>

      {/* XP Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
        <div
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
          className="p-2.5 rounded-xl border flex items-center gap-2"
        >
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>Check-ins</div>
            <div className="text-xs font-bold font-num" style={{ color: 'var(--text-primary)' }}>
              +{mastery.breakdown.checkinsXp} XP
            </div>
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
          className="p-2.5 rounded-xl border flex items-center gap-2"
        >
          <Zap size={14} className="text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>Deep Focus</div>
            <div className="text-xs font-bold font-num" style={{ color: 'var(--text-primary)' }}>
              +{mastery.breakdown.focusXp} XP
            </div>
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
          className="p-2.5 rounded-xl border flex items-center gap-2"
        >
          <Flame size={14} className="text-amber-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>Best Streak</div>
            <div className="text-xs font-bold font-num" style={{ color: 'var(--text-primary)' }}>
              +{mastery.breakdown.streakXp} XP
            </div>
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
          className="p-2.5 rounded-xl border flex items-center gap-2"
        >
          <Heart size={14} className="text-pink-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>Wellness Logs</div>
            <div className="text-xs font-bold font-num" style={{ color: 'var(--text-primary)' }}>
              +{mastery.breakdown.wellnessXp} XP
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
