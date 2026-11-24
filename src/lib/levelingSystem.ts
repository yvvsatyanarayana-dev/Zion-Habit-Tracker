import type { TimetableCategory } from './types';

export type SkillBranch = 'engineering' | 'languages' | 'vitality' | 'discipline';

export interface SkillProgress {
  branch: SkillBranch;
  name: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  totalXp: number;
  title: string;
}

export interface UserRpgProfile {
  totalXp: number;
  overallLevel: number;
  overallTitle: string;
  skills: Record<SkillBranch, SkillProgress>;
  recentUnlocks: Array<{
    id: string;
    title: string;
    timestamp: string;
    xpGained: number;
    branch: SkillBranch;
  }>;
}

export const SKILL_METADATA: Record<
  SkillBranch,
  { name: string; description: string; color: string; icon: string }
> = {
  engineering: {
    name: 'Engineering & Logic',
    description: 'Computer Science, coding, algorithms, systems & problem solving',
    color: '#6366f1', // Indigo
    icon: 'code',
  },
  languages: {
    name: 'Language & Mind',
    description: 'English, vocabulary, communication, reading, writing & deep learning',
    color: '#3b82f6', // Blue
    icon: 'book',
  },
  vitality: {
    name: 'Vitality & Health',
    description: 'Physical workouts, recovery, nutrition, hydration & restorative sleep',
    color: '#10b981', // Emerald
    icon: 'dumbbell',
  },
  discipline: {
    name: 'Discipline & Mastery',
    description: 'Daily consistency, routine execution, streak persistence & focus milestones',
    color: '#f59e0b', // Amber
    icon: 'target',
  },
};

/**
 * Calculates XP required for a given level using an RPG exponential curve.
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 250 XP
 * Level 4: 450 XP...
 */
export function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(75 * Math.pow(level - 1, 1.45) + (level - 1) * 25);
}

/**
 * Calculates current level and progression from total accumulated XP.
 */
export function calculateLevelFromXp(totalXp: number): {
  level: number;
  currentLevelBaseXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  let level = 1;
  while (getXpRequiredForLevel(level + 1) <= totalXp) {
    level++;
  }

  const currentLevelBaseXp = getXpRequiredForLevel(level);
  const nextLevelXp = getXpRequiredForLevel(level + 1);
  const span = Math.max(1, nextLevelXp - currentLevelBaseXp);
  const gainedInLevel = totalXp - currentLevelBaseXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((gainedInLevel / span) * 100)));

  return {
    level,
    currentLevelBaseXp,
    nextLevelXp,
    progressPercent,
  };
}

/**
 * Titles awarded based on level.
 */
export function getRankTitle(level: number): string {
  if (level >= 50) return 'Grandmaster';
  if (level >= 35) return 'Master Specialist';
  if (level >= 25) return 'Principal Adept';
  if (level >= 15) return 'Senior Practitioner';
  if (level >= 10) return 'Skilled Practitioner';
  if (level >= 5) return 'Promising Apprentice';
  return 'Initiate';
}

/**
 * Maps timetable/habit categories to skill branches.
 */
export function mapCategoryToBranch(cat: TimetableCategory | string): SkillBranch {
  const c = cat.toLowerCase();
  if (c === 'cs' || c === 'code' || c === 'work' || c === 'programming' || c === 'logic') {
    return 'engineering';
  }
  if (c === 'english' || c === 'language' || c === 'mind' || c === 'book' || c === 'study') {
    return 'languages';
  }
  if (c === 'health' || c === 'sleep' || c === 'meal' || c === 'fitness' || c === 'body') {
    return 'vitality';
  }
  return 'discipline';
}

/**
 * Creates initial clean RPG Profile.
 */
export function createInitialRpgProfile(): UserRpgProfile {
  const branches: SkillBranch[] = ['engineering', 'languages', 'vitality', 'discipline'];
  const skills = {} as Record<SkillBranch, SkillProgress>;

  for (const b of branches) {
    skills[b] = {
      branch: b,
      name: SKILL_METADATA[b].name,
      level: 1,
      currentXp: 0,
      xpToNextLevel: getXpRequiredForLevel(2),
      totalXp: 0,
      title: 'Initiate',
    };
  }

  return {
    totalXp: 0,
    overallLevel: 1,
    overallTitle: 'Initiate',
    skills,
    recentUnlocks: [],
  };
}

/**
 * Awards XP to user RPG profile and calculates promotions.
 */
export function awardXpToProfile(
  profile: UserRpgProfile,
  amount: number,
  branch: SkillBranch,
  sourceTitle: string
): {
  updatedProfile: UserRpgProfile;
  didLevelUpBranch: boolean;
  didLevelUpOverall: boolean;
  newBranchLevel: number;
  newOverallLevel: number;
} {
  const currentSkill = profile.skills[branch] || {
    branch,
    name: SKILL_METADATA[branch]?.name || 'Skill',
    level: 1,
    currentXp: 0,
    xpToNextLevel: getXpRequiredForLevel(2),
    totalXp: 0,
    title: 'Initiate',
  };

  const oldBranchLevel = currentSkill.level;
  const newSkillTotalXp = currentSkill.totalXp + amount;
  const skillCalc = calculateLevelFromXp(newSkillTotalXp);

  const updatedSkill: SkillProgress = {
    ...currentSkill,
    totalXp: newSkillTotalXp,
    level: skillCalc.level,
    currentXp: newSkillTotalXp - skillCalc.currentLevelBaseXp,
    xpToNextLevel: skillCalc.nextLevelXp - skillCalc.currentLevelBaseXp,
    title: getRankTitle(skillCalc.level),
  };

  const oldOverallLevel = profile.overallLevel;
  const newTotalXp = profile.totalXp + amount;
  const overallCalc = calculateLevelFromXp(newTotalXp);

  const unlockEntry = {
    id: `xp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: sourceTitle,
    timestamp: new Date().toISOString(),
    xpGained: amount,
    branch,
  };

  const updatedProfile: UserRpgProfile = {
    ...profile,
    totalXp: newTotalXp,
    overallLevel: overallCalc.level,
    overallTitle: getRankTitle(overallCalc.level),
    skills: {
      ...profile.skills,
      [branch]: updatedSkill,
    },
    recentUnlocks: [unlockEntry, ...(profile.recentUnlocks || []).slice(0, 19)],
  };

  return {
    updatedProfile,
    didLevelUpBranch: skillCalc.level > oldBranchLevel,
    didLevelUpOverall: overallCalc.level > oldOverallLevel,
    newBranchLevel: skillCalc.level,
    newOverallLevel: overallCalc.level,
  };
}
