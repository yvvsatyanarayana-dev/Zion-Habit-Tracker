import { describe, it, expect } from 'vitest';
import { computeStreakStats, computeActivityRings, computeMonthDayStats } from '../src/lib/statsUtils';
import type { Habit, Checkin } from '../src/lib/types';

describe('Streak Calculations', () => {
  const dummyDate = new Date(2026, 9, 7); // Oct 7, 2026

  it('handles zero habits case with zero streaks and no NaN', () => {
    const stats = computeStreakStats([], [], 50, dummyDate);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.perfectDaysCount).toBe(0);
    expect(stats.totalCheckinsCount).toBe(0);
    expect(stats.currentWeekDays.length).toBe(7);
  });

  it('calculates streaks correctly with consecutive check-ins', () => {
    const habit: Habit = {
      id: 'h1',
      name: 'Exercise',
      emoji: '🏃‍♂️',
      color: '#FA114F',
      monthly_goal: 30,
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      sort_order: 0,
      archived: false,
      created_at: '2026-10-01T00:00:00Z',
    };

    const checkins: Checkin[] = [
      { id: 'c1', habit_id: 'h1', date: '2026-10-07', completed: true, note: '', updated_at: '' },
      { id: 'c2', habit_id: 'h1', date: '2026-10-06', completed: true, note: '', updated_at: '' },
      { id: 'c3', habit_id: 'h1', date: '2026-10-05', completed: true, note: '', updated_at: '' },
    ];

    const stats = computeStreakStats([habit], checkins, 50, dummyDate);
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
    expect(stats.totalCheckinsCount).toBe(3);
    expect(stats.perfectDaysCount).toBe(3);
  });
});
