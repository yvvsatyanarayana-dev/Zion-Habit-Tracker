import type { Checkin, FocusSession, MasteryInfo, WellnessLog } from './types';

export interface MasteryRankTier {
  minLevel: number;
  title: string;
  color: string;
}

export const MASTERY_RANKS: MasteryRankTier[] = [
  { minLevel: 50, title: 'Zion Legend', color: '#f59e0b' },
  { minLevel: 35, title: 'Grandmaster', color: '#ec4899' },
  { minLevel: 20, title: 'Master', color: '#8b5cf6' },
  { minLevel: 10, title: 'Architect', color: '#6366f1' },
  { minLevel: 5, title: 'Builder', color: '#10b981' },
  { minLevel: 1, title: 'Initiate', color: '#3b82f6' },
];

/**
 * XP required to reach a given level (quadratic curve for rewarding early levels & meaningful high ranks).
 * Level 1 starts at 0 XP; Level 2 requires 150 XP; Level 3 requires 350 XP, etc.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return 100 * n + 25 * n * n;
}

export function getRankForLevel(level: number): MasteryRankTier {
  for (const tier of MASTERY_RANKS) {
    if (level >= tier.minLevel) return tier;
  }
  return MASTERY_RANKS[MASTERY_RANKS.length - 1];
}

export function computeMasteryInfo(params: {
  allCheckinsList: Checkin[];
  focusSessions: FocusSession[];
  bestStreak: number;
  wellnessLogs: Record<string, WellnessLog>;
}): MasteryInfo {
  const { allCheckinsList, focusSessions, bestStreak, wellnessLogs } = params;

  const completedCheckins = (allCheckinsList || []).filter((c) => c.completed).length;
  const totalFocusMins = (focusSessions || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const wellnessCount = Object.keys(wellnessLogs || {}).length;

  const checkinsXp = completedCheckins * 15;
  const focusXp = totalFocusMins * 2;
  const streakXp = Math.max(0, bestStreak || 0) * 25;
  const wellnessXp = wellnessCount * 10;

  const xp = checkinsXp + focusXp + streakXp + wellnessXp;

  let level = 1;
  while (xp >= xpForLevel(level + 1) && level < 999) {
    level++;
  }

  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const progressPct = Math.min(100, Math.max(0, Math.round(((xp - currentLevelXp) / span) * 100)));

  const rankTier = getRankForLevel(level);

  return {
    xp,
    level,
    rank: rankTier.title,
    rankColor: rankTier.color,
    currentLevelXp,
    nextLevelXp,
    progressPct,
    breakdown: {
      checkinsXp,
      focusXp,
      streakXp,
      wellnessXp,
    },
  };
}
