import type { Habit, Checkin, WellnessLog, RoutineStack } from './types';
import { formatLocalDate } from './dateUtils';
import { isHabitScheduledOnDay, computeStreakStats } from './statsUtils';

export interface GhostDebriefResult {
  date: string;
  formattedDate: string;
  totalScheduled: number;
  totalCompleted: number;
  completionRate: number; // 0 - 100
  focusMinutesToday: number;
  tier: 'S+' | 'S' | 'A' | 'B' | 'C';
  tierLabel: string;
  tierColor: string;
  executiveHeadline: string;
  stoicAnalysis: string;
  keystoneHabit?: {
    id: string;
    name: string;
    emoji?: string;
    reason: string;
  };
  criticalBottleneck?: {
    habitName?: string;
    issue: string;
    prescription: string;
  };
  wellnessCorrelation?: {
    energyScore: number;
    moodScore: number;
    insight: string;
  };
  tomorrowsDirectives: string[];
  streakMomentum: string;
}

export function generateGhostDebrief(params: {
  habits: Habit[];
  checkins: Record<string, Checkin>;
  allCheckinsList: Checkin[];
  wellnessLogs: Record<string, WellnessLog>;
  currentDate: Date;
  focusMinutesToday?: number;
  timetableExecutions?: Record<string, boolean>;
  routines?: RoutineStack[];
}): GhostDebriefResult {
  const {
    habits,
    checkins,
    allCheckinsList,
    wellnessLogs,
    currentDate,
    focusMinutesToday = 0,
  } = params;

  const todayStr = formatLocalDate(currentDate);
  const dayOfWeek = currentDate.getDay();
  const activeHabits = habits.filter((h) => !h.archived);

  // Scheduled today
  const scheduledHabits = activeHabits.filter((h) => isHabitScheduledOnDay(h, dayOfWeek));
  const completedHabits = scheduledHabits.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed);
  const missedHabits = scheduledHabits.filter((h) => !checkins[`${h.id}_${todayStr}`]?.completed);

  const totalScheduled = scheduledHabits.length;
  const totalCompleted = completedHabits.length;
  const completionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  // Wellness
  const todayWellness = wellnessLogs[todayStr];
  const energy = todayWellness?.energy ?? 3;
  const mood = todayWellness?.mood ?? 3;

  // Streak Stats
  const streakStats = computeStreakStats(habits, allCheckinsList, 1, currentDate);
  const bestCurrentStreak = streakStats.currentStreak || 0;

  // Determine Executive Tier
  let tier: 'S+' | 'S' | 'A' | 'B' | 'C' = 'B';
  let tierLabel = 'Operational Baseline';
  let tierColor = '#3b82f6';

  if (completionRate === 100 && totalScheduled >= 3 && focusMinutesToday >= 25) {
    tier = 'S+';
    tierLabel = 'Apex Sovereign';
    tierColor = '#ec4899';
  } else if (completionRate >= 85) {
    tier = 'S';
    tierLabel = 'Elite Execution';
    tierColor = '#10b981';
  } else if (completionRate >= 70) {
    tier = 'A';
    tierLabel = 'High Momentum';
    tierColor = '#6366f1';
  } else if (completionRate >= 50) {
    tier = 'B';
    tierLabel = 'Operational Baseline';
    tierColor = '#f59e0b';
  } else {
    tier = 'C';
    tierLabel = 'Friction & Entropy';
    tierColor = '#f43f5e';
  }

  // Generate Executive Headline
  let executiveHeadline = '';
  if (tier === 'S+') {
    executiveHeadline = 'Complete Behavioral Dominance. Unbroken Focus.';
  } else if (tier === 'S') {
    executiveHeadline = 'Formidable Discipline. High compounding velocity.';
  } else if (tier === 'A') {
    executiveHeadline = 'Solid Execution. Minor friction left on the table.';
  } else if (tier === 'B') {
    executiveHeadline = 'Partial Engagement. Energy leaks detected in daily routines.';
  } else {
    executiveHeadline = 'Critical Drift Detected. Immediate recalibration required.';
  }

  // Stoic Analysis Prose
  let stoicAnalysis = '';
  if (tier === 'S+' || tier === 'S') {
    if (energy <= 2) {
      stoicAnalysis = `You operated under physical resistance today. With an energy baseline of ${energy}/5, an ordinary mind would have yielded to comfort. Instead, you executed ${totalCompleted} of ${totalScheduled} scheduled commitments (${completionRate}%) and logged ${focusMinutesToday}m of deep focus. This demonstrates true internal sovereignty: action dictated by standard, not fleeting mood.`;
    } else {
      stoicAnalysis = `Today was a masterclass in behavioral compounding. You logged ${totalCompleted}/${totalScheduled} scheduled habits (${completionRate}%) alongside ${focusMinutesToday} minutes of deep focus. The primary danger of days like today is subtle arrogance—the belief that tomorrow will be effortless. Rest deliberate, maintain structural humility, and prepare for tomorrow's friction.`;
    }
  } else if (tier === 'A') {
    stoicAnalysis = `Your momentum is real, but incomplete execution (${completionRate}%) indicates small compromises in your defense perimeter. You finished ${totalCompleted} habits, yet allowed ${missedHabits.length} task${missedHabits.length > 1 ? 's' : ''} to lapse. Identify whether the friction was logistical (poor scheduling) or psychological (hesitation). Eliminate the gap before entropy widens it.`;
  } else if (tier === 'B') {
    stoicAnalysis = `Execution rate registered at ${completionRate}%. Half-measures deliver fractional returns. You maintained baseline routines, but the core levers that drive true transformation were deferred. Marcus Aurelius reminds us: "Waste no more time arguing what a good man should be. Be one." Tomorrow requires ruthless elimination of non-essential noise.`;
  } else {
    stoicAnalysis = `Today was claimed by distraction or inertia—only ${totalCompleted} of ${totalScheduled} habits logged (${completionRate}%). Do not indulge in guilt, which is merely procrastination disguised as remorse. Conduct an immediate post-mortem: what process or environment breach caused the first domino to fall? Strip tomorrow's schedule down to the essential 3 non-negotiables.`;
  }

  // Keystone Habit Identification
  let keystoneHabit: GhostDebriefResult['keystoneHabit'] | undefined;
  if (completedHabits.length > 0) {
    const candidate = completedHabits[0];
    keystoneHabit = {
      id: candidate.id,
      name: candidate.name,
      emoji: candidate.emoji,
      reason: `Key execution anchor of today's ${bestCurrentStreak}-day active momentum cycle. When you execute "${candidate.name}", your systemic follow-through on surrounding routines increases dramatically.`,
    };
  }

  // Critical Bottleneck Identification
  let criticalBottleneck: GhostDebriefResult['criticalBottleneck'] | undefined;
  if (missedHabits.length > 0) {
    const primaryMissed = missedHabits[0];
    criticalBottleneck = {
      habitName: primaryMissed.name,
      issue: `Missed "${primaryMissed.name}". Scheduled for today but neglected as daily friction accumulated.`,
      prescription: `Pre-commit execution: Slot "${primaryMissed.name}" into your morning priming block or tie it to your primary coffee ritual to remove cognitive friction.`,
    };
  } else if (focusMinutesToday < 30) {
    criticalBottleneck = {
      issue: `Deep focus volume was low (${focusMinutesToday}m logged).`,
      prescription: `Schedule an uninterrupted 45-minute Deep Work sprint before noon with Focus Shield enabled.`,
    };
  }

  // Wellness Correlation
  let wellnessCorrelation: GhostDebriefResult['wellnessCorrelation'] | undefined;
  if (todayWellness) {
    let insight = '';
    if (energy >= 4 && completionRate >= 80) {
      insight = 'High physiological vitality aligned directly with peak executive output.';
    } else if (energy <= 2 && completionRate >= 70) {
      insight = 'Exceptional grit detected: High performance achieved despite depleted energy reserves.';
    } else if (energy >= 4 && completionRate < 60) {
      insight = 'Vitality misallocated: High physical energy was dissipated into secondary tasks or distractions rather than scheduled core habits.';
    } else {
      insight = `Energy (${energy}/5) and Mood (${mood}/5) supported baseline execution. Prioritize sleep to unlock top-tier cognition.`;
    }
    wellnessCorrelation = {
      energyScore: energy,
      moodScore: mood,
      insight,
    };
  }

  // Tomorrow's Strategic Imperatives
  const tomorrowsDirectives: string[] = [];
  if (missedHabits.length > 0) {
    tomorrowsDirectives.push(`Reclaim "${missedHabits[0].name}": Execute this first thing tomorrow before checking messages.`);
  } else {
    tomorrowsDirectives.push('Defend the clean slate: Complete the morning routine sequence without skipping a beat.');
  }

  if (focusMinutesToday < 45) {
    tomorrowsDirectives.push('Target 60 minutes of uninterrupted Focus Studio deep work with system distraction blocking active.');
  } else {
    tomorrowsDirectives.push(`Sustain deep focus intensity: Match or exceed today's ${focusMinutesToday}m focus benchmark.`);
  }

  if (energy <= 2) {
    tomorrowsDirectives.push('Recovery protocol: Incur zero sleep debt tonight. Wind down devices 30 minutes before bed.');
  } else {
    tomorrowsDirectives.push('Compound velocity: Aim for 100% check-in rate by 6:00 PM.');
  }

  const streakMomentum = bestCurrentStreak > 0
    ? `Top active streak stands at ${bestCurrentStreak} consecutive days.`
    : 'New momentum cycle starting today.';

  return {
    date: todayStr,
    formattedDate: currentDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    totalScheduled,
    totalCompleted,
    completionRate,
    focusMinutesToday,
    tier,
    tierLabel,
    tierColor,
    executiveHeadline,
    stoicAnalysis,
    keystoneHabit,
    criticalBottleneck,
    wellnessCorrelation,
    tomorrowsDirectives,
    streakMomentum,
  };
}

export function formatGhostDebriefMarkdown(debrief: GhostDebriefResult): string {
  return `# 🛡️ THE GHOST PROTOCOL — Executive Debrief
**Date:** ${debrief.formattedDate}
**Performance Tier:** ${debrief.tier} (${debrief.tierLabel})
**Execution Rate:** ${debrief.totalCompleted}/${debrief.totalScheduled} (${debrief.completionRate}%) | **Deep Work:** ${debrief.focusMinutesToday}m

---

### 🏛️ Executive Verdict & Stoic Appraisal
> **"${debrief.executiveHeadline}"**

${debrief.stoicAnalysis}

${debrief.keystoneHabit ? `### ⚡ Keystone Habit Multiplier\n- **${debrief.keystoneHabit.name}**: ${debrief.keystoneHabit.reason}` : ''}

${debrief.criticalBottleneck ? `### ⚠️ Friction Bottleneck\n- **Issue:** ${debrief.criticalBottleneck.issue}\n- **Prescription:** ${debrief.criticalBottleneck.prescription}` : ''}

${debrief.wellnessCorrelation ? `### 🧬 Biological State\n- **Energy:** ${debrief.wellnessCorrelation.energyScore}/5 | **Mood:** ${debrief.wellnessCorrelation.moodScore}/5\n- *${debrief.wellnessCorrelation.insight}*` : ''}

---

### 🎯 Tomorrow's Strategic Directives
${debrief.tomorrowsDirectives.map((d, i) => `${i + 1}. ${d}`).join('\n')}

---
*Generated offline by Zion Habit Tracker • Privacy-first zero cloud telemetry*
`;
}
