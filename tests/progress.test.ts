import { describe, it, expect } from 'vitest';
import { computeActivityRings, computeMonthDayStats } from '../src/lib/statsUtils';
import type { Habit, Checkin } from '../src/lib/types';

describe('Activity Rings & Progress Math', () => {
  const dummyDate = new Date(2026, 9, 7); // Wednesday, Oct 7, 2026

  it('handles zero habits case with 0 rates and no division by zero or NaN', () => {
    const rings = computeActivityRings([], {}, 2026, 9, dummyDate);
    expect(rings.today.completed).toBe(0);
    expect(rings.today.total).toBe(0);
    expect(rings.today.rate).toBe(0);
    expect(Number.isNaN(rings.today.rate)).toBe(false);

    expect(rings.week.rate).toBe(0);
    expect(Number.isNaN(rings.week.rate)).toBe(false);

    expect(rings.month.rate).toBe(0);
    expect(Number.isNaN(rings.month.rate)).toBe(false);
  });

  it('computes exact rates for scheduled habits and check-ins', () => {
    const habit1: Habit = {
      id: 'h1',
      name: 'Read',
      emoji: '📚',
      color: '#FA114F',
      monthly_goal: 30,
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      sort_order: 0,
      archived: false,
      created_at: '2026-10-01T00:00:00Z',
    };

    const habit2: Habit = {
      id: 'h2',
      name: 'Meditate',
      emoji: '🧘',
      color: '#00D9FF',
      monthly_goal: 30,
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      sort_order: 1,
      archived: false,
      created_at: '2026-10-01T00:00:00Z',
    };

    // h1 is done today (2026-10-07), h2 is not
    const checkins: Record<string, Checkin> = {
      'h1_2026-10-07': { id: 'c1', habit_id: 'h1', date: '2026-10-07', completed: true, note: '', updated_at: '' },
    };

    const rings = computeActivityRings([habit1, habit2], checkins, 2026, 9, dummyDate);
    expect(rings.today.completed).toBe(1);
    expect(rings.today.total).toBe(2);
    expect(rings.today.rate).toBe(0.5);
  });
});
