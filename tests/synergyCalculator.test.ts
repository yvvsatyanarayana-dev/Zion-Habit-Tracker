import { describe, it, expect } from 'vitest';
import { calculateHabitSynergies } from '../src/lib/synergyCalculator';
import type { Habit, Checkin, HabitStack } from '../src/lib/types';

describe('calculateHabitSynergies', () => {
  const habits: Habit[] = [
    {
      id: 'h1',
      name: 'Morning Workout',
      emoji: '💪',
      color: '#10b981',
      monthly_goal: 20,
      schedule_days: [1, 2, 3, 4, 5],
      sort_order: 1,
      archived: false,
      created_at: '2026-01-01',
      type: 'boolean',
      target_value: 1,
      unit: '',
      category: 'fitness',
    },
    {
      id: 'h2',
      name: 'Cold Shower',
      emoji: '💧',
      color: '#06b6d4',
      monthly_goal: 20,
      schedule_days: [1, 2, 3, 4, 5],
      sort_order: 2,
      archived: false,
      created_at: '2026-01-01',
      type: 'boolean',
      target_value: 1,
      unit: '',
      category: 'health',
    },
    {
      id: 'h3',
      name: 'Deep Work',
      emoji: '💻',
      color: '#6366f1',
      monthly_goal: 20,
      schedule_days: [1, 2, 3, 4, 5],
      sort_order: 3,
      archived: false,
      created_at: '2026-01-01',
      type: 'boolean',
      target_value: 1,
      unit: '',
      category: 'work',
    },
  ];

  it('correctly calculates synergy lift when habit A boosts habit B', () => {
    // 10 tracked days:
    // h1 completed on 5 days (d1, d2, d3, d4, d5)
    // h2 completed on 6 days total (d1, d2, d3, d4, d6, d7)
    // Co-occurrence of h1 and h2 = 4 days (d1, d2, d3, d4)
    // Baseline rate for h2 = 6 / 10 = 60%
    // Synergy rate P(h2|h1) = 4 / 5 = 80%
    // Lift = 80 - 60 = +20%
    const checkins: Checkin[] = [
      { id: '1', habit_id: 'h1', date: '2026-11-01', completed: true, note: '', updated_at: '' },
      { id: '2', habit_id: 'h1', date: '2026-11-02', completed: true, note: '', updated_at: '' },
      { id: '3', habit_id: 'h1', date: '2026-11-03', completed: true, note: '', updated_at: '' },
      { id: '4', habit_id: 'h1', date: '2026-11-04', completed: true, note: '', updated_at: '' },
      { id: '5', habit_id: 'h1', date: '2026-11-05', completed: true, note: '', updated_at: '' },

      { id: '6', habit_id: 'h2', date: '2026-11-01', completed: true, note: '', updated_at: '' },
      { id: '7', habit_id: 'h2', date: '2026-11-02', completed: true, note: '', updated_at: '' },
      { id: '8', habit_id: 'h2', date: '2026-11-03', completed: true, note: '', updated_at: '' },
      { id: '9', habit_id: 'h2', date: '2026-11-04', completed: true, note: '', updated_at: '' },
      { id: '10', habit_id: 'h2', date: '2026-11-06', completed: true, note: '', updated_at: '' },
      { id: '11', habit_id: 'h2', date: '2026-11-07', completed: true, note: '', updated_at: '' },

      // additional dates for total tracked days
      { id: '12', habit_id: 'h3', date: '2026-11-08', completed: true, note: '', updated_at: '' },
      { id: '13', habit_id: 'h3', date: '2026-11-09', completed: true, note: '', updated_at: '' },
      { id: '14', habit_id: 'h3', date: '2026-11-10', completed: true, note: '', updated_at: '' },
    ];

    const synergies = calculateHabitSynergies(habits, checkins);
    const h1ToH2 = synergies.find((s) => s.parentHabit.id === 'h1' && s.childHabit.id === 'h2');

    expect(h1ToH2).toBeDefined();
    expect(h1ToH2?.coOccurrenceCount).toBe(4);
    expect(h1ToH2?.totalParentCompletions).toBe(5);
    expect(h1ToH2?.synergyRate).toBe(80);
    expect(h1ToH2?.baselineChildRate).toBe(60); // 6 / 10 unique dates
    expect(h1ToH2?.synergyLiftPct).toBeGreaterThan(0);
  });

  it('marks isDefinedStack as true when stack exists', () => {
    const stacks: HabitStack[] = [
      {
        id: 'stack-1',
        parent_habit_id: 'h1',
        child_habit_id: 'h2',
        cue_trigger: 'immediate',
        synergy_score: 1.5,
      },
    ];

    const synergies = calculateHabitSynergies(habits, [], stacks);
    const matched = synergies.find((s) => s.parentHabit.id === 'h1' && s.childHabit.id === 'h2');

    expect(matched?.isDefinedStack).toBe(true);
    expect(matched?.stackId).toBe('stack-1');
  });
});
