import type { Habit, Checkin } from './types';

export interface TitanBoss {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  maxHp: number;
  currentHp: number;
  phase: 1 | 2 | 3;
  element: 'dark' | 'fire' | 'void' | 'electric';
  avatarUrl: string;
  rewards: {
    relicName: string;
    relicDescription: string;
    xpBonus: number;
  };
}

export interface CombatLog {
  id: string;
  timestamp: string;
  habitName: string;
  damage: number;
  isCrit: boolean;
  bossCounterDamage: number;
  message: string;
}

export interface TitanArenaState {
  boss: TitanBoss;
  playerHp: number;
  playerMaxHp: number;
  combatLogs: CombatLog[];
  unlockedRelics: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
  }>;
  totalDamageDealt: number;
  bossDefeatedCount: number;
}

export function getTitanStorageKey(userId?: string): string {
  return userId ? `zion_titan_arena_${userId}` : 'zion_titan_arena_default';
}

export const TITAN_ROSTER: Omit<TitanBoss, 'currentHp' | 'phase'>[] = [
  {
    id: 'chronos_void_1',
    name: 'Chronos',
    title: 'The Procrastination Void',
    subtitle: 'An ancient entropy titan that feasts on postponed dreams and broken streaks.',
    maxHp: 5000,
    element: 'void',
    avatarUrl: '🌌',
    rewards: {
      relicName: 'Chrono-Disruption Aegis',
      relicDescription: 'Passive: Boosts focus XP gain by +25% and shields one missed habit per month.',
      xpBonus: 1500,
    },
  },
  {
    id: 'ignis_burnout_2',
    name: 'Ignis',
    title: 'The Burnout Leviathan',
    subtitle: 'A volcanic inferno born from exhaustion, overwork, and depleted biological recovery.',
    maxHp: 7500,
    element: 'fire',
    avatarUrl: '🔥',
    rewards: {
      relicName: 'Cinder of Resilience',
      relicDescription: 'Passive: Boosts daily streak endurance and unlocks Stoic recovery protocols.',
      xpBonus: 2200,
    },
  },
  {
    id: 'oblivion_distraction_3',
    name: 'Oblivion',
    title: 'The Distraction Behemoth',
    subtitle: 'A cybernetic chimera devouring deep focus with infinite feeds and short-form noise.',
    maxHp: 10000,
    element: 'electric',
    avatarUrl: '⚡',
    rewards: {
      relicName: 'Electromagnetic Focus Prism',
      relicDescription: 'Passive: +35% deep work focus session output and immunity to distraction drift.',
      xpBonus: 3000,
    },
  },
  {
    id: 'aetherion_sloth_4',
    name: 'Aetherion',
    title: 'The Sovereign of Sloth',
    subtitle: 'The supreme architect of excuses, delay, and comfortable stagnation.',
    maxHp: 14000,
    element: 'dark',
    avatarUrl: '👑',
    rewards: {
      relicName: 'Crown of Sovereign Discipline',
      relicDescription: 'Passive: Doubled critical strike rate and permanent Apex Discipline status.',
      xpBonus: 5000,
    },
  },
];

export function getTitanForDefeatedCount(defeatedCount: number): TitanBoss {
  const rosterIdx = defeatedCount % TITAN_ROSTER.length;
  const loopCount = Math.floor(defeatedCount / TITAN_ROSTER.length);
  const base = TITAN_ROSTER[rosterIdx];
  const scaledMaxHp = base.maxHp + loopCount * 3000;
  return {
    ...base,
    id: `${base.id}_loop_${loopCount}`,
    maxHp: scaledMaxHp,
    currentHp: scaledMaxHp,
    phase: 1,
  };
}

export function loadTitanArenaState(userId?: string): TitanArenaState {
  const storageKey = getTitanStorageKey(userId);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  const initialBoss = getTitanForDefeatedCount(0);
  return {
    boss: initialBoss,
    playerHp: 1000,
    playerMaxHp: 1000,
    combatLogs: [],
    unlockedRelics: [],
    totalDamageDealt: 0,
    bossDefeatedCount: 0,
  };
}

export function saveTitanArenaState(state: TitanArenaState, userId?: string): void {
  const storageKey = getTitanStorageKey(userId);
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {}
}

export function executeHabitAttack(
  habit: Habit,
  streakDays: number,
  state: TitanArenaState,
  userId?: string
): { newState: TitanArenaState; log: CombatLog } {
  const baseDmg = habit.target_value && habit.target_value > 1 ? 350 : 250;
  const streakBonus = Math.min(2.5, 1 + streakDays * 0.08);

  // 25% base critical strike chance
  const isCrit = Math.random() < 0.28;
  const critMultiplier = isCrit ? 2.0 : 1.0;

  const totalDmg = Math.round(baseDmg * streakBonus * critMultiplier);
  const newBossHp = Math.max(0, state.boss.currentHp - totalDmg);

  // Determine Boss Phase
  let phase: 1 | 2 | 3 = 1;
  const hpRatio = newBossHp / state.boss.maxHp;
  if (hpRatio <= 0.33) phase = 3;
  else if (hpRatio <= 0.66) phase = 2;

  const log: CombatLog = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    habitName: habit.name,
    damage: totalDmg,
    isCrit,
    bossCounterDamage: 0,
    message: isCrit
      ? `💥 CRITICAL STRIKE! [${habit.name}] shattered ${state.boss.name} for ${totalDmg} DMG!`
      : `⚔️ [${habit.name}] strike landed for ${totalDmg} DMG.`,
  };

  let newRelics = [...state.unlockedRelics];
  let newDefeatedCount = state.bossDefeatedCount;

  // Boss Defeated!
  if (newBossHp === 0 && state.boss.currentHp > 0) {
    newDefeatedCount += 1;
    newRelics.push({
      id: Math.random().toString(36).substring(2, 9),
      name: state.boss.rewards.relicName,
      description: state.boss.rewards.relicDescription,
      unlockedAt: new Date().toISOString(),
    });
    log.message = `👑 TITAN DEFEATED! ${state.boss.name} collapsed. You unlocked "${state.boss.rewards.relicName}"!`;
  }

  const newState: TitanArenaState = {
    ...state,
    boss: {
      ...state.boss,
      currentHp: newBossHp,
      phase,
    },
    combatLogs: [log, ...state.combatLogs.slice(0, 19)],
    totalDamageDealt: state.totalDamageDealt + totalDmg,
    bossDefeatedCount: newDefeatedCount,
    unlockedRelics: newRelics,
  };

  saveTitanArenaState(newState, userId);
  return { newState, log };
}

export function resetTitanBoss(userId?: string): TitanArenaState {
  const current = loadTitanArenaState(userId);
  const nextBoss = getTitanForDefeatedCount(current.bossDefeatedCount);
  const newState: TitanArenaState = {
    ...current,
    boss: nextBoss,
  };
  saveTitanArenaState(newState, userId);
  return newState;
}
