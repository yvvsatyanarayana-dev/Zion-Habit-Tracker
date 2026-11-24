import type { Habit, Checkin, HabitStack } from './types';

export interface HabitPairSynergy {
  parentHabit: Habit;
  childHabit: Habit;
  baselineChildRate: number; // 0 to 100%
  synergyRate: number; // 0 to 100% (P(B|A))
  synergyLiftPct: number; // Percentage point lift (e.g. +35%)
  coOccurrenceCount: number;
  totalParentCompletions: number;
  recommendedTrigger: 'immediate' | '15m_after' | 'evening';
  isDefinedStack: boolean;
  stackId?: string;
}

/**
 * Calculates empirical synergy rates and momentum lift between all active habits.
 * Computes:
 * - P(B|A): Probability of completing habit B given habit A was completed on that date.
 * - P(B): Baseline overall completion rate of habit B.
 * - Lift: P(B|A) - P(B).
 */
export function calculateHabitSynergies(
  habits: Habit[],
  allCheckins: Checkin[],
  stacks: HabitStack[] = []
): HabitPairSynergy[] {
  const activeHabits = habits.filter((h) => !h.archived);
  if (activeHabits.length < 2) return [];

  // Map completed dates per habit
  const completedDatesByHabit: Record<string, Set<string>> = {};
  const allUniqueDates = new Set<string>();

  for (const c of allCheckins) {
    if (c.completed) {
      if (!completedDatesByHabit[c.habit_id]) {
        completedDatesByHabit[c.habit_id] = new Set();
      }
      completedDatesByHabit[c.habit_id].add(c.date);
    }
    allUniqueDates.add(c.date);
  }

  const totalTrackedDays = Math.max(1, allUniqueDates.size);
  const stacksMap = new Map<string, HabitStack>();
  for (const s of stacks) {
    stacksMap.set(`${s.parent_habit_id}->${s.child_habit_id}`, s);
  }

  const results: HabitPairSynergy[] = [];

  for (let i = 0; i < activeHabits.length; i++) {
    const parent = activeHabits[i];
    const parentDates = completedDatesByHabit[parent.id] || new Set();
    const parentTotal = parentDates.size;

    for (let j = 0; j < activeHabits.length; j++) {
      if (i === j) continue;
      const child = activeHabits[j];
      const childDates = completedDatesByHabit[child.id] || new Set();

      const baselineChildRate = Math.round((childDates.size / totalTrackedDays) * 100);

      let coOccurrence = 0;
      for (const d of parentDates) {
        if (childDates.has(d)) {
          coOccurrence++;
        }
      }

      const synergyRate = parentTotal > 0 ? Math.round((coOccurrence / parentTotal) * 100) : baselineChildRate;
      const synergyLiftPct = synergyRate - baselineChildRate;

      const stackKey = `${parent.id}->${child.id}`;
      const existingStack = stacksMap.get(stackKey);

      // Smart cue recommendation based on category / names
      let recommendedTrigger: 'immediate' | '15m_after' | 'evening' = 'immediate';
      if (child.name.toLowerCase().includes('sleep') || child.name.toLowerCase().includes('journal') || child.name.toLowerCase().includes('night')) {
        recommendedTrigger = 'evening';
      } else if (child.name.toLowerCase().includes('meditat') || child.name.toLowerCase().includes('stretch')) {
        recommendedTrigger = '15m_after';
      }

      results.push({
        parentHabit: parent,
        childHabit: child,
        baselineChildRate,
        synergyRate,
        synergyLiftPct,
        coOccurrenceCount: coOccurrence,
        totalParentCompletions: parentTotal,
        recommendedTrigger: existingStack ? existingStack.cue_trigger : recommendedTrigger,
        isDefinedStack: !!existingStack,
        stackId: existingStack?.id,
      });
    }
  }

  // Sort by highest synergy lift and defined stacks first
  return results.sort((a, b) => {
    if (a.isDefinedStack && !b.isDefinedStack) return -1;
    if (!a.isDefinedStack && b.isDefinedStack) return 1;
    return b.synergyLiftPct - a.synergyLiftPct;
  });
}
