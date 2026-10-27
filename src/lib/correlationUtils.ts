import type {
  Habit,
  Checkin,
  WellnessLog,
  SmartInsightsReport,
  HabitCorrelation,
  WellnessCorrelation,
  DangerZoneAlert,
} from './types';
import { isHabitScheduledOnDay } from './statsUtils';
import { formatLocalDate } from './dateUtils';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * 100% Offline Local AI & Correlation Engine.
 * Analyzes cross-habit dependencies, energy/mood impact, and day-of-week danger zones.
 */
export function computeSmartInsights(
  habits: Habit[],
  checkinsList: Checkin[],
  wellnessLogs: Record<string, WellnessLog> = {}
): SmartInsightsReport {
  const activeHabits = habits.filter((h) => !h.archived);

  // Group check-ins by date -> Set of completed habit IDs
  const checkinMapByDate = new Map<string, Set<string>>();
  const allDatesSet = new Set<string>();

  for (const c of checkinsList) {
    if (!c.date) continue;
    allDatesSet.add(c.date);
    if (!checkinMapByDate.has(c.date)) {
      checkinMapByDate.set(c.date, new Set());
    }
    if (c.completed) {
      checkinMapByDate.get(c.date)!.add(c.habit_id);
    }
  }

  // Include wellness log dates as well
  for (const date of Object.keys(wellnessLogs)) {
    allDatesSet.add(date);
    if (!checkinMapByDate.has(date)) {
      checkinMapByDate.set(date, new Set());
    }
  }

  const sortedDates = Array.from(allDatesSet).sort();

  // ───────────────────────────────────────────────
  // 1. Cross-Habit Synergy & Correlation Engine
  // ───────────────────────────────────────────────
  const correlations: HabitCorrelation[] = [];
  const habitBoostAverages = new Map<string, { totalLift: number; count: number }>();

  if (activeHabits.length >= 2 && sortedDates.length >= 3) {
    for (let i = 0; i < activeHabits.length; i++) {
      const habitA = activeHabits[i];

      for (let j = 0; j < activeHabits.length; j++) {
        if (i === j) continue;
        const habitB = activeHabits[j];

        let datesWithA = 0;
        let datesWithoutA = 0;
        let bothDone = 0;
        let bDoneWithoutA = 0;

        for (const dateStr of sortedDates) {
          const completedSet = checkinMapByDate.get(dateStr) || new Set();
          const [y, m, d] = dateStr.split('-').map(Number);
          const wday = new Date(y, m - 1, d).getDay();

          // Only consider dates where B is scheduled
          if (!isHabitScheduledOnDay(habitB, wday)) continue;

          const isADone = completedSet.has(habitA.id);
          const isBDone = completedSet.has(habitB.id);

          if (isADone) {
            datesWithA++;
            if (isBDone) bothDone++;
          } else {
            datesWithoutA++;
            if (isBDone) bDoneWithoutA++;
          }
        }

        // Require at least 2 instances of A to form a reliable correlation
        if (datesWithA >= 2 && datesWithoutA >= 1) {
          const probWith = bothDone / datesWithA;
          const probWithout = bDoneWithoutA / datesWithoutA;

          if (probWith > probWithout && probWith > 0.4) {
            const rawLift = probWithout > 0 ? ((probWith - probWithout) / probWithout) * 100 : Math.round(probWith * 100);
            const lift = Math.min(250, Math.round(rawLift));

            if (lift >= 15) {
              let text = '';
              if (lift >= 50) {
                text = `Super Combo: Doing "${habitA.name}" boosts "${habitB.name}" completion by +${lift}%!`;
              } else {
                text = `Strong Synergy: You are +${lift}% more consistent with "${habitB.name}" on days you do "${habitA.name}".`;
              }

              correlations.push({
                source_habit_id: habitA.id,
                source_habit_name: habitA.name,
                source_habit_color: habitA.color,
                target_habit_id: habitB.id,
                target_habit_name: habitB.name,
                target_habit_color: habitB.color,
                probability_with: Math.round(probWith * 100) / 100,
                probability_without: Math.round(probWithout * 100) / 100,
                lift_percentage: lift,
                sample_size: datesWithA + datesWithoutA,
                insight_text: text,
              });

              const prev = habitBoostAverages.get(habitA.id) || { totalLift: 0, count: 0 };
              habitBoostAverages.set(habitA.id, { totalLift: prev.totalLift + lift, count: prev.count + 1 });
            }
          }
        }
      }
    }
  }

  // Sort correlations by highest lift
  correlations.sort((a, b) => b.lift_percentage - a.lift_percentage);

  // Determine Keystone Habit
  let goldenHabit: SmartInsightsReport['golden_habit'] = null;
  let bestAvgLift = 0;

  for (const [habitId, stats] of habitBoostAverages.entries()) {
    const avg = stats.totalLift / stats.count;
    if (avg > bestAvgLift) {
      bestAvgLift = avg;
      const h = activeHabits.find((hab) => hab.id === habitId);
      if (h) {
        goldenHabit = {
          habit: h,
          boost_percentage: Math.round(avg),
          synergy_count: stats.count,
        };
      }
    }
  }

  // ───────────────────────────────────────────────
  // 2. Wellness (Mood & Energy) Impact Engine
  // ───────────────────────────────────────────────
  const wellnessCorrelations: WellnessCorrelation[] = [];
  const wellnessEntries = Object.entries(wellnessLogs);

  if (wellnessEntries.length >= 2) {
    for (const habit of activeHabits) {
      let energySumWith = 0;
      let energyCountWith = 0;
      let energySumWithout = 0;
      let energyCountWithout = 0;

      let moodSumWith = 0;
      let moodCountWith = 0;
      let moodSumWithout = 0;
      let moodCountWithout = 0;

      for (const [dateStr, log] of wellnessEntries) {
        const completedSet = checkinMapByDate.get(dateStr) || new Set();
        const isDone = completedSet.has(habit.id);

        if (log.energy) {
          if (isDone) {
            energySumWith += log.energy;
            energyCountWith++;
          } else {
            energySumWithout += log.energy;
            energyCountWithout++;
          }
        }

        if (log.mood) {
          if (isDone) {
            moodSumWith += log.mood;
            moodCountWith++;
          } else {
            moodSumWithout += log.mood;
            moodCountWithout++;
          }
        }
      }

      // Energy check
      if (energyCountWith >= 2 && energyCountWithout >= 1) {
        const avgWith = energySumWith / energyCountWith;
        const avgWithout = energySumWithout / energyCountWithout;
        const diff = Number((avgWith - avgWithout).toFixed(1));

        if (diff >= 0.4) {
          wellnessCorrelations.push({
            habit_id: habit.id,
            habit_name: habit.name,
            habit_color: habit.color,
            metric: 'energy',
            average_with: Number(avgWith.toFixed(1)),
            average_without: Number(avgWithout.toFixed(1)),
            difference: diff,
            insight_text: `Energy Catalyst: Your energy averages ${avgWith.toFixed(1)}/5 (+${diff} pts) when you complete "${habit.name}".`,
          });
        }
      }

      // Mood check
      if (moodCountWith >= 2 && moodCountWithout >= 1) {
        const avgWith = moodSumWith / moodCountWith;
        const avgWithout = moodSumWithout / moodCountWithout;
        const diff = Number((avgWith - avgWithout).toFixed(1));

        if (diff >= 0.4) {
          wellnessCorrelations.push({
            habit_id: habit.id,
            habit_name: habit.name,
            habit_color: habit.color,
            metric: 'mood',
            average_with: Number(avgWith.toFixed(1)),
            average_without: Number(avgWithout.toFixed(1)),
            difference: diff,
            insight_text: `Mood Booster: Your mood is +${diff} points higher on days you do "${habit.name}".`,
          });
        }
      }
    }
  }

  // ───────────────────────────────────────────────
  // 3. Day-of-Week Danger Zone Detection
  // ───────────────────────────────────────────────
  const dangerZones: DangerZoneAlert[] = [];

  if (sortedDates.length >= 7) {
    for (const habit of activeHabits) {
      // Per weekday misses
      const weekdayStats = Array.from({ length: 7 }, () => ({ scheduled: 0, completed: 0 }));

      for (const dateStr of sortedDates) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const wday = new Date(y, m - 1, d).getDay();

        if (isHabitScheduledOnDay(habit, wday)) {
          weekdayStats[wday].scheduled++;
          const completedSet = checkinMapByDate.get(dateStr) || new Set();
          if (completedSet.has(habit.id)) {
            weekdayStats[wday].completed++;
          }
        }
      }

      for (let w = 0; w < 7; w++) {
        const stat = weekdayStats[w];
        if (stat.scheduled >= 2) {
          const missCount = stat.scheduled - stat.completed;
          const failureRate = Math.round((missCount / stat.scheduled) * 100);

          if (failureRate >= 50 && missCount >= 2) {
            const wName = WEEKDAY_NAMES[w];
            dangerZones.push({
              habit_id: habit.id,
              habit_name: habit.name,
              habit_color: habit.color,
              weekday: w,
              weekday_name: wName,
              failure_rate: failureRate,
              miss_count: missCount,
              sample_weeks: stat.scheduled,
              suggestion: `${wName} Slump: You missed "${habit.name}" on ${missCount} of ${stat.scheduled} ${wName}s (${failureRate}% miss rate). Try scheduling a 2-minute micro version on ${wName}s.`,
            });
          }
        }
      }
    }
  }

  // Sort danger zones by highest failure rate
  dangerZones.sort((a, b) => b.failure_rate - a.failure_rate);

  return {
    correlations: correlations.slice(0, 8),
    wellness_correlations: wellnessCorrelations.slice(0, 6),
    danger_zones: dangerZones.slice(0, 6),
    golden_habit: goldenHabit,
  };
}
