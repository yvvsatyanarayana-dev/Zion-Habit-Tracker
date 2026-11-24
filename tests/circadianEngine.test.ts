import { describe, it, expect } from 'vitest';
import { computeCircadianProfile } from '../src/lib/circadianEngine';
import type { Habit, Checkin, WellnessLog } from '../src/lib/types';

describe('circadianEngine', () => {
  const mockHabits: Habit[] = [
    {
      id: 'h1',
      name: 'Deep Work Coding',
      emoji: 'laptop',
      color: '#6366f1',
      monthly_goal: 30,
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      sort_order: 1,
      archived: false,
      created_at: '2026-11-01',
      type: 'boolean',
      target_value: 1,
      unit: '',
      category: 'work',
    },
    {
      id: 'h2',
      name: 'Morning Workout',
      emoji: 'dumbbell',
      color: '#10b981',
      monthly_goal: 20,
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      sort_order: 2,
      archived: false,
      created_at: '2026-11-01',
      type: 'boolean',
      target_value: 1,
      unit: '',
      category: 'health',
    },
  ];

  const mockCheckins: Checkin[] = [
    { id: 'c1', habit_id: 'h1', date: '2026-11-20', completed: true, updated_at: '2026-11-20T09:30:00Z' },
    { id: 'c2', habit_id: 'h2', date: '2026-11-20', completed: true, updated_at: '2026-11-20T07:15:00Z' },
    { id: 'c3', habit_id: 'h1', date: '2026-11-21', completed: true, updated_at: '2026-11-21T10:00:00Z' },
    { id: 'c4', habit_id: 'h2', date: '2026-11-21', completed: true, updated_at: '2026-11-21T07:30:00Z' },
  ];

  const mockWellness: Record<string, WellnessLog> = {
    '2026-11-20': { date: '2026-11-20', energy: 4, mood: 5, note: 'Great focus' },
    '2026-11-21': { date: '2026-11-21', energy: 5, mood: 5, note: 'Peak energy' },
  };

  it('computes 24-hour energy curve with peak focus windows', () => {
    const profile = computeCircadianProfile(mockHabits, mockCheckins, mockWellness, []);
    expect(profile.hourlyCurve).toHaveLength(24);
    expect(profile.peakFocusWindow).toBeDefined();
    expect(profile.optimalWindows).toHaveLength(2);

    const workoutOpt = profile.optimalWindows.find((o) => o.habitId === 'h2');
    expect(workoutOpt).toBeDefined();
    expect(workoutOpt?.category).toBe('health');
  });

  it('evaluates burnout risk as optimal under high energy wellness logs', () => {
    const profile = computeCircadianProfile(mockHabits, mockCheckins, mockWellness, []);
    expect(profile.burnout.riskLevel).toBe('optimal');
    expect(profile.burnout.riskScore).toBeLessThan(40);
  });

  it('elevates burnout risk when wellness energy drops severely', () => {
    const exhaustedWellness: Record<string, WellnessLog> = {
      '2026-11-20': { date: '2026-11-20', energy: 1, mood: 2, note: 'Drained' },
      '2026-11-21': { date: '2026-11-21', energy: 1, mood: 1, note: 'Exhausted' },
    };
    const profile = computeCircadianProfile(mockHabits, mockCheckins, exhaustedWellness, []);
    expect(profile.burnout.riskScore).toBeGreaterThan(45);
  });
});
