import type { Habit, Checkin, WellnessLog, FocusSession, TimetableSchedule } from './types';
import { formatLocalDate } from './dateUtils';

export interface HourlyEnergyPoint {
  hour: number;
  energyScore: number; // 0 - 100
  checkinCount: number;
  focusMinutes: number;
  label: string; // "9 AM"
}

export interface OptimalActionWindow {
  habitId: string;
  habitName: string;
  category: string;
  recommendedWindow: string; // e.g. "09:00 - 11:30"
  reason: string;
  efficiencyScore: number; // 0 - 100
}

export interface BurnoutAssessment {
  riskScore: number; // 0 - 100
  riskLevel: 'optimal' | 'elevated' | 'critical';
  title: string;
  explanation: string;
  recommendations: string[];
  restDaysSuggested: number;
}

export interface HabitSynergyPair {
  habitAId: string;
  habitAName: string;
  habitBId: string;
  habitBName: string;
  upliftPct: number; // e.g. +42%
  isKeystone: boolean;
  jointCompletions: number;
}

export interface CircadianProfile {
  hourlyCurve: HourlyEnergyPoint[];
  peakFocusWindow: string;
  secondaryPeakWindow: string;
  rechargeWindow: string;
  burnout: BurnoutAssessment;
  optimalWindows: OptimalActionWindow[];
  synergies: HabitSynergyPair[];
  keystoneHabit: HabitSynergyPair | null;
}

/**
 * Format 24-hour integer to 12-hour label
 */
function formatHourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h} ${ampm}`;
}

/**
 * Computes a user's Circadian Energy Curve, Burnout Vulnerability, and Optimal Habit Windows
 */
export function computeCircadianProfile(
  habits: Habit[],
  allCheckins: Checkin[],
  wellnessLogs: Record<string, WellnessLog>,
  focusSessions: FocusSession[] = [],
  timetableSchedules: TimetableSchedule[] = []
): CircadianProfile {
  const activeHabits = habits.filter((h) => !h.archived);

  // 1. Initialize 24 hourly buckets
  const hourlyBuckets: { checkins: number; focusMins: number; energySamples: number[] }[] = Array.from(
    { length: 24 },
    () => ({ checkins: 0, focusMins: 0, energySamples: [] })
  );

  // 2. Accumulate check-in hour distribution from updated_at / checkin timestamps
  for (const chk of allCheckins) {
    if (!chk.completed) continue;
    let hour = 12; // default midday fallback
    if (chk.updated_at) {
      try {
        const d = new Date(chk.updated_at);
        if (!isNaN(d.getTime())) {
          hour = d.getHours();
        }
      } catch {}
    }
    if (hour >= 0 && hour < 24) {
      hourlyBuckets[hour].checkins += 1;
    }
  }

  // 3. Accumulate Focus Sessions by hour
  for (const session of focusSessions) {
    let hour = 10;
    if (session.completed_at) {
      try {
        const d = new Date(session.completed_at);
        if (!isNaN(d.getTime())) {
          hour = d.getHours();
        }
      } catch {}
    }
    if (hour >= 0 && hour < 24) {
      hourlyBuckets[hour].focusMins += session.duration_minutes || 0;
    }
  }

  // 4. Incorporate Timetable routine scheduled hours
  for (const sched of timetableSchedules) {
    if (!sched.isActive) continue;
    for (const b of sched.blocks) {
      const [sh] = b.startTime.split(':').map((x) => parseInt(x, 10));
      if (!isNaN(sh) && sh >= 0 && sh < 24) {
        hourlyBuckets[sh].focusMins += 20; // weight scheduled block activity
      }
    }
  }

  // 5. Wellness energy baseline calculation (1 to 5 scale)
  const wellnessEntries = Object.values(wellnessLogs);
  let avgWellnessEnergy = 3.5;
  if (wellnessEntries.length > 0) {
    const sum = wellnessEntries.reduce((acc, curr) => acc + (curr.energy || 3), 0);
    avgWellnessEnergy = sum / wellnessEntries.length;
  }

  // 6. Build the 24-hour normalized curve
  // Standard physiological circadian curve baseline:
  // - Low night (0-5 AM)
  // - Rise (6-8 AM)
  // - High peak (9-12 PM)
  // - Post-lunch dip (1-3 PM)
  // - Secondary peak (4-7 PM)
  // - Decline (8-11 PM)
  const defaultCurveWeights = [
    12, 10, 8, 8, 10, 18, 40, 65, 82, 95, 98, 92, // 0 - 11 AM
    75, 55, 62, 78, 88, 85, 78, 68, 55, 42, 28, 18  // 12 - 23 PM
  ];

  let maxObservedActivity = 1;
  for (let h = 0; h < 24; h++) {
    const combined = hourlyBuckets[h].checkins * 3 + hourlyBuckets[h].focusMins;
    if (combined > maxObservedActivity) maxObservedActivity = combined;
  }

  const hourlyCurve: HourlyEnergyPoint[] = defaultCurveWeights.map((baseWeight, hour) => {
    const userActivity = hourlyBuckets[hour].checkins * 3 + hourlyBuckets[hour].focusMins;
    const userFactor = maxObservedActivity > 0 ? (userActivity / maxObservedActivity) * 40 : 0;
    const energyScore = Math.min(
      100,
      Math.max(10, Math.round(baseWeight * 0.6 + userFactor + (avgWellnessEnergy - 3) * 8))
    );

    return {
      hour,
      energyScore,
      checkinCount: hourlyBuckets[hour].checkins,
      focusMinutes: hourlyBuckets[hour].focusMins,
      label: formatHourLabel(hour),
    };
  });

  // Find Peak cognitive focus window (search between 7 AM and 13 PM for highest 3-hour moving average)
  let bestWindowStart = 9;
  let bestWindowScore = 0;
  for (let h = 7; h <= 12; h++) {
    const score = (hourlyCurve[h].energyScore + hourlyCurve[h + 1].energyScore + hourlyCurve[h + 2].energyScore) / 3;
    if (score > bestWindowScore) {
      bestWindowScore = score;
      bestWindowStart = h;
    }
  }

  // Dynamically compute Recharge Window: lowest energy dip between 12 PM and 16 PM
  let rechargeDipHour = 13;
  let lowestRechargeScore = 1000;
  for (let h = 12; h <= 15; h++) {
    const score = (hourlyCurve[h].energyScore + hourlyCurve[h + 1].energyScore) / 2;
    if (score < lowestRechargeScore) {
      lowestRechargeScore = score;
      rechargeDipHour = h;
    }
  }

  // Dynamically compute Secondary Peak Window: highest afternoon/evening peak between 16 PM and 20 PM
  let secondaryPeakHour = 17;
  let bestSecondaryScore = 0;
  for (let h = 16; h <= 19; h++) {
    const score = (hourlyCurve[h].energyScore + hourlyCurve[h + 1].energyScore) / 2;
    if (score > bestSecondaryScore) {
      bestSecondaryScore = score;
      secondaryPeakHour = h;
    }
  }

  const peakFocusWindow = `${String(bestWindowStart).padStart(2, '0')}:00 – ${String(bestWindowStart + 2).padStart(2, '0')}:30`;
  const secondaryPeakWindow = `${String(secondaryPeakHour).padStart(2, '0')}:00 – ${String(secondaryPeakHour + 2).padStart(2, '0')}:00`;
  const rechargeWindow = `${String(rechargeDipHour).padStart(2, '0')}:30 – ${String(rechargeDipHour + 1).padStart(2, '0')}:30`;

  // 7. Calculate Burnout Risk Index (0 - 100)
  // Factors:
  // a) Wellness energy deficit (average energy < 3 adds up to +35 pts)
  // b) Heavy workload: habits scheduled >= 6 adds +15 pts
  // c) Focus session density in last 7 days
  // d) Low rest days
  let burnoutScore = 20; // nominal baseline

  if (avgWellnessEnergy < 2.5) {
    burnoutScore += 35;
  } else if (avgWellnessEnergy < 3.2) {
    burnoutScore += 20;
  } else if (avgWellnessEnergy > 4.2) {
    burnoutScore -= 10;
  }

  if (activeHabits.length >= 8) {
    burnoutScore += 20;
  } else if (activeHabits.length >= 5) {
    burnoutScore += 10;
  }

  // Recent focus load
  const totalFocusMins = focusSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  if (totalFocusMins > 600) {
    burnoutScore += 15;
  }

  burnoutScore = Math.min(100, Math.max(5, Math.round(burnoutScore)));

  let riskLevel: 'optimal' | 'elevated' | 'critical' = 'optimal';
  let burnoutTitle = 'Optimal Bio-Rhythm';
  let burnoutExplanation = 'Your execution load is well-balanced with restorative wellness scores.';
  let restDaysSuggested = 0;
  const recommendations: string[] = [];

  if (burnoutScore >= 60) {
    riskLevel = 'critical';
    burnoutTitle = 'High Fatigue Warning';
    burnoutExplanation = 'High cognitive and physical volume combined with depressed energy scores signals imminent fatigue drop-off.';
    restDaysSuggested = 1;
    recommendations.push('Deploy a Rest Shield to preserve your streaks without fatigue guilt.');
    recommendations.push('Shift high-friction work habits to your peak focus window.');
    recommendations.push('Schedule a 20-minute restorative soundscape decompression session.');
  } else if (burnoutScore >= 35) {
    riskLevel = 'elevated';
    burnoutTitle = 'Moderate Cognitive Load';
    burnoutExplanation = 'Momentum is strong, but energy levels fluctuate during afternoon intervals.';
    restDaysSuggested = 0;
    recommendations.push('Keep Deep Work confined to 90-minute blocks with strict breathwork breaks.');
    recommendations.push('Avoid scheduling heavy workouts immediately after deep analytical sessions.');
  } else {
    recommendations.push('Execution pacing is sustainable; your habit ecosystem is thriving.');
    recommendations.push('Ideal window for leveling up challenging cognitive skills.');
  }

  // 8. Compute Optimal Habit Action Windows
  const optimalWindows: OptimalActionWindow[] = activeHabits.map((habit) => {
    let windowStr = peakFocusWindow;
    let reason = 'Aligned with peak neural alertness';
    let efficiency = 95;

    if (habit.category === 'health') {
      windowStr = '07:00 – 08:30 (Morning) or 17:00 – 18:30 (Evening)';
      reason = 'Maximizes physical thermogenesis and cardiovascular endurance';
      efficiency = 92;
    } else if (habit.category === 'mind') {
      windowStr = '06:30 – 07:30 or 21:00 – 22:00';
      reason = 'Alpha-wave mental state optimal for reflection and retention';
      efficiency = 94;
    } else if (habit.category === 'routine') {
      windowStr = '08:00 – 09:00';
      reason = 'Anchors morning momentum before primary cognitive work';
      efficiency = 88;
    } else {
      windowStr = peakFocusWindow;
      reason = 'Requires high executive function and deep focus state';
      efficiency = 96;
    }

    return {
      habitId: habit.id,
      habitName: habit.name,
      category: habit.category || 'routine',
      recommendedWindow: windowStr,
      reason,
      efficiencyScore: efficiency,
    };
  });

  // 9. Habit Synergy & Keystone Analysis
  // Map check-ins by date -> Set of completed habit IDs
  const dateCheckinMap = new Map<string, Set<string>>();
  for (const c of allCheckins) {
    if (!c.completed) continue;
    if (!dateCheckinMap.has(c.date)) {
      dateCheckinMap.set(c.date, new Set());
    }
    dateCheckinMap.get(c.date)!.add(c.habit_id);
  }

  const synergies: HabitSynergyPair[] = [];
  const totalDays = Math.max(1, dateCheckinMap.size);

  if (activeHabits.length >= 2 && dateCheckinMap.size >= 2) {
    for (let i = 0; i < activeHabits.length; i++) {
      for (let j = 0; j < activeHabits.length; j++) {
        if (i === j) continue;
        const hA = activeHabits[i];
        const hB = activeHabits[j];

        let countA = 0;
        let countB = 0;
        let countBoth = 0;

        for (const set of dateCheckinMap.values()) {
          const hasA = set.has(hA.id);
          const hasB = set.has(hB.id);
          if (hasA) countA++;
          if (hasB) countB++;
          if (hasA && hasB) countBoth++;
        }

        if (countA >= 2 && countBoth >= 1) {
          const pBGivenA = countBoth / countA;
          const pB = countB / totalDays;
          const uplift = pB > 0 ? Math.round(((pBGivenA - pB) / pB) * 100) : 0;

          if (uplift > 10) {
            synergies.push({
              habitAId: hA.id,
              habitAName: hA.name,
              habitBId: hB.id,
              habitBName: hB.name,
              upliftPct: Math.min(150, uplift),
              isKeystone: countBoth >= 3 && uplift >= 25,
              jointCompletions: countBoth,
            });
          }
        }
      }
    }
  }

  // Sort synergies by uplift
  synergies.sort((a, b) => b.upliftPct - a.upliftPct);
  const keystoneHabit = synergies.find((s) => s.isKeystone) || synergies[0] || null;

  return {
    hourlyCurve,
    peakFocusWindow,
    secondaryPeakWindow,
    rechargeWindow,
    burnout: {
      riskScore: burnoutScore,
      riskLevel,
      title: burnoutTitle,
      explanation: burnoutExplanation,
      recommendations,
      restDaysSuggested,
    },
    optimalWindows,
    synergies: synergies.slice(0, 6),
    keystoneHabit,
  };
}
