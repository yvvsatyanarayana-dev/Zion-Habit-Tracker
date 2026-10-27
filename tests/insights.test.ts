import { describe, it, expect } from 'vitest';
import { computeSmartInsights } from '../src/lib/correlationUtils';
import type { Habit, Checkin, WellnessLog } from '../src/lib/types';

describe('Smart Correlation Engine & Insights', () => {
  const habitA: Habit = {
    id: 'habit-meditation',
    name: 'Morning Meditation',
    emoji: '🧘',
    color: '#3b82f6',
    monthly_goal: 30,
    schedule_days: [0, 1, 2, 3, 4, 5, 6],
    sort_order: 0,
    archived: false,
    created_at: '2026-10-01T00:00:00Z',
  };

  const habitB: Habit = {
    id: 'habit-reading',
    name: 'Deep Reading',
    emoji: '📖',
    color: '#10b981',
    monthly_goal: 30,
    schedule_days: [0, 1, 2, 3, 4, 5, 6],
    sort_order: 1,
    archived: false,
    created_at: '2026-10-01T00:00:00Z',
  };

  it('handles empty data gracefully without crashing or NaN', () => {
    const report = computeSmartInsights([], [], {});
    expect(report.correlations).toEqual([]);
    expect(report.wellness_correlations).toEqual([]);
    expect(report.danger_zones).toEqual([]);
    expect(report.golden_habit).toBeNull();
  });

  it('detects habit synergies when habits are frequently completed together', () => {
    const habits = [habitA, habitB];
    const checkins: Checkin[] = [];

    // Across 10 days:
    // On 8 days, both Meditation and Reading are done
    // On 2 days, neither is done
    for (let i = 1; i <= 8; i++) {
      const date = `2026-10-0${i}`;
      checkins.push({ id: `c-a-${i}`, habit_id: 'habit-meditation', date, completed: true, note: '', updated_at: '' });
      checkins.push({ id: `c-b-${i}`, habit_id: 'habit-reading', date, completed: true, note: '', updated_at: '' });
    }
    for (let i = 9; i <= 10; i++) {
      const date = `2026-10-${i < 10 ? '0' + i : i}`;
      checkins.push({ id: `c-a-${i}`, habit_id: 'habit-meditation', date, completed: false, note: '', updated_at: '' });
      checkins.push({ id: `c-b-${i}`, habit_id: 'habit-reading', date, completed: false, note: '', updated_at: '' });
    }

    const report = computeSmartInsights(habits, checkins, {});
    expect(report.correlations.length).toBeGreaterThan(0);
    const synergy = report.correlations[0];
    expect(synergy.probability_with).toBe(1.0);
    expect(synergy.lift_percentage).toBeGreaterThan(0);
  });

  it('correlates habit completion with higher energy/mood ratings', () => {
    const habits = [habitA];
    const checkins: Checkin[] = [];
    const wellness: Record<string, WellnessLog> = {};

    // 5 days with Meditation: high energy (5/5)
    for (let i = 1; i <= 5; i++) {
      const date = `2026-10-0${i}`;
      checkins.push({ id: `c-${i}`, habit_id: 'habit-meditation', date, completed: true, note: '', updated_at: '' });
      wellness[date] = { id: `w-${i}`, date, energy: 5, mood: 5, note: '', created_at: '' };
    }

    // 5 days without Meditation: lower energy (2/5)
    for (let i = 6; i <= 10; i++) {
      const date = `2026-10-${i < 10 ? '0' + i : i}`;
      wellness[date] = { id: `w-${i}`, date, energy: 2, mood: 2, note: '', created_at: '' };
    }

    const report = computeSmartInsights(habits, checkins, wellness);
    expect(report.wellness_correlations.length).toBeGreaterThan(0);
    const energyCorr = report.wellness_correlations.find((w) => w.metric === 'energy');
    expect(energyCorr).toBeDefined();
    expect(energyCorr?.average_with).toBe(5);
    expect(energyCorr?.average_without).toBe(2);
    expect(energyCorr?.difference).toBe(3);
  });
});
