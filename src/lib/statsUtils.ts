import type { Habit, Checkin, DayStats, HabitMonthlyProgress, WeekStartDay } from './types';
import { generateMonthDays, formatLocalDate, parseLocalDate, MonthDayInfo, getWeekdayOffset } from './dateUtils';
import { startOfWeek, endOfWeek, subDays, addDays } from 'date-fns';

/**
 * Check if a habit is scheduled on a given weekday (0 = Sun, 1 = Mon, ..., 6 = Sat)
 */
export function isHabitScheduledOnDay(habit: Habit, weekday: number): boolean {
  if (!habit.schedule_days || habit.schedule_days.length === 0) {
    return true; // Default to all days if not specified
  }
  return habit.schedule_days.includes(weekday);
}

/**
 * Compute statistics for each day of a given month
 */
export function computeMonthDayStats(
  habits: Habit[],
  checkins: Record<string, Checkin>, // key: `${habitId}_${date}`
  year: number,
  month: number,
  weekStartDay: WeekStartDay,
  streakThresholdPercent: number,
  today: Date = new Date()
): { days: (MonthDayInfo & DayStats)[]; overallAverageRate: number } {
  const { days } = generateMonthDays(year, month, weekStartDay, today);
  const activeHabits = habits.filter((h) => !h.archived);

  let totalCompleted = 0;
  let totalScheduled = 0;

  const resultDays = days.map((day) => {
    // Scheduled habits for this day
    const scheduledHabits = activeHabits.filter((h) =>
      isHabitScheduledOnDay(h, day.weekday)
    );
    const scheduledCount = scheduledHabits.length;

    // Completed habits for this day
    let completedCount = 0;
    for (const habit of scheduledHabits) {
      const key = `${habit.id}_${day.dateStr}`;
      const chk = checkins[key];
      if (chk && chk.completed) {
        completedCount++;
      }
    }

    const rate = scheduledCount > 0 ? completedCount / scheduledCount : 0;
    const thresholdRate = streakThresholdPercent / 100;
    const isStreakDay = scheduledCount > 0 && rate >= thresholdRate;

    // Accumulate for days up to today (or past days)
    if (!day.isFuture) {
      totalCompleted += completedCount;
      totalScheduled += scheduledCount;
    }

    return {
      ...day,
      date: day.dateStr,
      scheduledCount,
      completedCount,
      rate,
      isStreakDay,
    };
  });

  const overallAverageRate = totalScheduled > 0 ? totalCompleted / totalScheduled : 0;

  return { days: resultDays, overallAverageRate };
}

/**
 * Calculate Activity Rings data:
 * - Outer: Today (habits done / scheduled)
 * - Middle: This week (habits done / scheduled)
 * - Inner: This month (check-ins / monthly goals sum or scheduled)
 */
export function computeActivityRings(
  habits: Habit[],
  checkins: Record<string, Checkin>,
  selectedYear: number,
  selectedMonth: number,
  today: Date = new Date()
): {
  today: { completed: number; total: number; rate: number };
  week: { completed: number; total: number; rate: number };
  month: { completed: number; total: number; rate: number };
} {
  const activeHabits = habits.filter((h) => !h.archived);
  const todayStr = formatLocalDate(today);
  const todayWeekday = today.getDay();

  // 1. TODAY
  const todayScheduled = activeHabits.filter((h) => isHabitScheduledOnDay(h, todayWeekday));
  let todayDone = 0;
  for (const h of todayScheduled) {
    if (checkins[`${h.id}_${todayStr}`]?.completed) {
      todayDone++;
    }
  }
  const todayTotal = todayScheduled.length;
  const todayRate = todayTotal > 0 ? Math.min(1, todayDone / todayTotal) : 0;

  // 2. THIS WEEK (Monday to Sunday)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  let weekDone = 0;
  let weekTotal = 0;
  for (let i = 0; i < 7; i++) {
    const cur = addDays(weekStart, i);
    const dateStr = formatLocalDate(cur);
    const wday = cur.getDay();
    const scheduled = activeHabits.filter((h) => isHabitScheduledOnDay(h, wday));
    weekTotal += scheduled.length;
    for (const h of scheduled) {
      if (checkins[`${h.id}_${dateStr}`]?.completed) {
        weekDone++;
      }
    }
  }
  const weekRate = weekTotal > 0 ? Math.min(1, weekDone / weekTotal) : 0;

  // 3. THIS MONTH
  const { days } = generateMonthDays(selectedYear, selectedMonth, 'mon', today);
  let monthDone = 0;
  let monthGoalSum = 0;

  // Goal sum across active habits
  for (const h of activeHabits) {
    monthGoalSum += h.monthly_goal > 0 ? h.monthly_goal : days.length;
  }

  // Count completions in this selected month
  for (const day of days) {
    for (const h of activeHabits) {
      if (checkins[`${h.id}_${day.dateStr}`]?.completed) {
        monthDone++;
      }
    }
  }

  const monthRate = monthGoalSum > 0 ? Math.min(1, monthDone / monthGoalSum) : 0;

  return {
    today: { completed: todayDone, total: todayTotal, rate: todayRate },
    week: { completed: weekDone, total: weekTotal, rate: weekRate },
    month: { completed: monthDone, total: monthGoalSum, rate: monthRate },
  };
}

/**
 * Compute current streak, longest streak, perfect days, and total check-ins
 */
export function computeStreakStats(
  habits: Habit[],
  allCheckins: Checkin[],
  streakThresholdPercent: number,
  today: Date = new Date()
): {
  currentStreak: number;
  longestStreak: number;
  perfectDaysCount: number;
  totalCheckinsCount: number;
  currentWeekDays: { dateStr: string; weekdayLabel: string; isCompleted: boolean; isToday: boolean }[];
} {
  const activeHabits = habits.filter((h) => !h.archived);
  const totalCheckinsCount = allCheckins.filter((c) => c.completed).length;

  // Build current week 7 days circles
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const buildCurrentWeekDays = (isCompletedFn: (d: Date) => boolean) => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(weekStart, i);
      const dateStr = formatLocalDate(d);
      return {
        dateStr,
        weekdayLabel: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
        isCompleted: isCompletedFn(d),
        isToday: dateStr === formatLocalDate(today),
      };
    });
  };

  if (activeHabits.length === 0 || totalCheckinsCount === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      perfectDaysCount: 0,
      totalCheckinsCount,
      currentWeekDays: buildCurrentWeekDays(() => false),
    };
  }

  // Map completed checkins by date -> Set of completed habit IDs
  const checkinsByDate = new Map<string, Set<string>>();
  for (const chk of allCheckins) {
    if (chk.completed) {
      if (!checkinsByDate.has(chk.date)) {
        checkinsByDate.set(chk.date, new Set());
      }
      checkinsByDate.get(chk.date)!.add(chk.habit_id);
    }
  }

  // Count perfect days (all scheduled habits completed on that day, with at least 1 scheduled habit)
  let perfectDaysCount = 0;
  for (const [dateStr, completedHabitIds] of checkinsByDate.entries()) {
    const d = parseLocalDate(dateStr);
    const wday = d.getDay();
    const scheduled = activeHabits.filter((h) => isHabitScheduledOnDay(h, wday));
    if (scheduled.length > 0 && scheduled.every((h) => completedHabitIds.has(h.id))) {
      perfectDaysCount++;
    }
  }

  // Helper to check if a day qualifies as a streak day
  const isDateStreakDay = (date: Date): boolean => {
    const dateStr = formatLocalDate(date);
    const completedSet = checkinsByDate.get(dateStr);
    const wday = date.getDay();
    const scheduled = activeHabits.filter((h) => isHabitScheduledOnDay(h, wday));

    // If no habits are scheduled for this day:
    if (scheduled.length === 0) {
      // Completed bonus checkin counts
      return Boolean(completedSet && completedSet.size > 0);
    }

    if (!completedSet || completedSet.size === 0) return false;

    let completed = 0;
    for (const h of scheduled) {
      if (completedSet.has(h.id)) completed++;
    }

    // Require completion percentage >= threshold AND at least 1 completion
    const rate = completed / scheduled.length;
    return rate >= streakThresholdPercent / 100 && completed > 0;
  };

  // Helper to check if a day is a rest day (0 scheduled habits)
  const isRestDay = (date: Date): boolean => {
    const wday = date.getDay();
    const scheduled = activeHabits.filter((h) => isHabitScheduledOnDay(h, wday));
    return scheduled.length === 0;
  };

  // Compute Current Streak
  let currentStreak = 0;
  let checkDate = today;

  if (isDateStreakDay(today)) {
    currentStreak++;
    checkDate = subDays(today, 1);
  } else {
    // Today is not yet completed (e.g., day in progress). Check yesterday so streak does not break midway through today.
    const yesterday = subDays(today, 1);
    if (isDateStreakDay(yesterday)) {
      currentStreak++;
      checkDate = subDays(yesterday, 1);
    } else if (isRestDay(today)) {
      // If today is a rest day, check if yesterday was a rest day or completed
      if (isDateStreakDay(subDays(today, 1))) {
        currentStreak++;
        checkDate = subDays(today, 2);
      } else if (isRestDay(subDays(today, 1)) && isDateStreakDay(subDays(today, 2))) {
        currentStreak++;
        checkDate = subDays(today, 3);
      } else {
        currentStreak = 0;
      }
    } else {
      currentStreak = 0;
    }
  }

  // Continue stepping backwards if active streak
  if (currentStreak > 0) {
    let consecutiveRestDays = 0;
    for (let i = 0; i < 365; i++) {
      if (isDateStreakDay(checkDate)) {
        currentStreak++;
        consecutiveRestDays = 0;
        checkDate = subDays(checkDate, 1);
      } else if (isRestDay(checkDate) && consecutiveRestDays < 2) {
        // Skip rest day without breaking streak
        consecutiveRestDays++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
  }

  // Compute Longest Streak (scan past 365 days chronologically)
  let longestStreak = currentStreak;
  let runningStreak = 0;
  let restDaysInRow = 0;

  for (let i = 365; i >= 0; i--) {
    const d = subDays(today, i);
    if (isDateStreakDay(d)) {
      runningStreak++;
      restDaysInRow = 0;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    } else if (isRestDay(d) && runningStreak > 0 && restDaysInRow < 2) {
      // Allow rest day to bridge ongoing streak
      restDaysInRow++;
    } else {
      runningStreak = 0;
      restDaysInRow = 0;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  const currentWeekDays = buildCurrentWeekDays(isDateStreakDay);

  return {
    currentStreak,
    longestStreak,
    perfectDaysCount,
    totalCheckinsCount,
    currentWeekDays,
  };
}

/**
 * Compute progress and ranking for each habit in the selected month
 */
export function computeHabitsMonthlyProgress(
  habits: Habit[],
  checkins: Record<string, Checkin>,
  year: number,
  month: number,
  today: Date = new Date()
): HabitMonthlyProgress[] {
  const { days } = generateMonthDays(year, month, 'mon', today);
  const activeHabits = habits.filter((h) => !h.archived);

  return activeHabits.map((habit) => {
    // How many days was this habit scheduled in this month
    const scheduledDaysInMonth = days.filter((d) =>
      isHabitScheduledOnDay(habit, d.weekday)
    ).length;

    // How many checkins completed in this month
    let completedDays = 0;
    for (const d of days) {
      if (checkins[`${habit.id}_${d.dateStr}`]?.completed) {
        completedDays++;
      }
    }

    const goal = habit.monthly_goal > 0 ? habit.monthly_goal : scheduledDaysInMonth;
    const rate = goal > 0 ? Math.min(1, completedDays / goal) : 0;

    // Real-time Current Streak for this specific habit
    let currentStreak = 0;
    const todayStr = formatLocalDate(today);
    const todayDone = Boolean(checkins[`${habit.id}_${todayStr}`]?.completed);

    let checkDate = today;
    if (todayDone) {
      currentStreak++;
      checkDate = subDays(today, 1);
    } else {
      // If not yet checked today, check yesterday so unfinished today doesn't break yesterday's streak
      const yesterday = subDays(today, 1);
      const yesterdayStr = formatLocalDate(yesterday);
      if (checkins[`${habit.id}_${yesterdayStr}`]?.completed) {
        currentStreak++;
        checkDate = subDays(yesterday, 1);
      } else {
        checkDate = yesterday;
      }
    }

    if (currentStreak > 0) {
      for (let i = 0; i < 365; i++) {
        const dateStr = formatLocalDate(checkDate);
        const wday = checkDate.getDay();
        if (!isHabitScheduledOnDay(habit, wday)) {
          // If not scheduled on this day, don't break streak, skip day
          checkDate = subDays(checkDate, 1);
          continue;
        }
        if (checkins[`${habit.id}_${dateStr}`]?.completed) {
          currentStreak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      }
    }

    // Real-time Longest Streak for this specific habit (scanning past 365 days)
    let longestStreak = currentStreak;
    let habitRunningStreak = 0;
    for (let i = 365; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = formatLocalDate(d);
      const wday = d.getDay();
      if (!isHabitScheduledOnDay(habit, wday)) {
        continue; // Rest day for this habit doesn't break
      }
      if (checkins[`${habit.id}_${dateStr}`]?.completed) {
        habitRunningStreak++;
        if (habitRunningStreak > longestStreak) {
          longestStreak = habitRunningStreak;
        }
      } else {
        habitRunningStreak = 0;
      }
    }

    return {
      habit,
      scheduledDaysInMonth,
      completedDays,
      goal,
      rate,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
    };
  }).sort((a, b) => b.rate - a.rate);
}
