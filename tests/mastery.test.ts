import { describe, it, expect } from 'vitest';
import { computeMasteryInfo, xpForLevel, getRankForLevel } from '../src/lib/masteryUtils';
import type { Checkin, FocusSession, WellnessLog } from '../src/lib/types';

describe('masteryUtils', () => {
  it('computes level 1 Initiate when user has zero activity', () => {
    const res = computeMasteryInfo({
      allCheckinsList: [],
      focusSessions: [],
      bestStreak: 0,
      wellnessLogs: {},
    });

    expect(res.xp).toBe(0);
    expect(res.level).toBe(1);
    expect(res.rank).toBe('Initiate');
    expect(res.progressPct).toBe(0);
  });

  it('accumulates XP accurately from checkins, focus minutes, streak, and wellness', () => {
    const checkins: Checkin[] = [
      { id: '1', habit_id: 'h1', date: '2026-11-10', completed: true, note: '', updated_at: '' },
      { id: '2', habit_id: 'h1', date: '2026-11-11', completed: false, note: '', updated_at: '' },
      { id: '3', habit_id: 'h2', date: '2026-11-11', completed: true, note: '', updated_at: '' },
    ];
    const focusSessions: FocusSession[] = [
      { id: 'f1', habit_name: 'Reading', duration_minutes: 25, soundscape: 'rain', date: '2026-11-11', completed_at: '' },
    ];
    const wellnessLogs: Record<string, WellnessLog> = {
      '2026-11-11': { id: 'w1', date: '2026-11-11', energy: 4, mood: 5, note: '', created_at: '' },
    };

    const res = computeMasteryInfo({
      allCheckinsList: checkins,
      focusSessions,
      bestStreak: 4,
      wellnessLogs,
    });

    // 2 completed checkins * 15 = 30
    // 25 focus mins * 2 = 50
    // bestStreak 4 * 25 = 100
    // 1 wellness log * 10 = 10
    // Total = 190 XP -> Level 2 requires 125 XP, Level 3 requires 300 XP
    expect(res.xp).toBe(190);
    expect(res.breakdown.checkinsXp).toBe(30);
    expect(res.breakdown.focusXp).toBe(50);
    expect(res.breakdown.streakXp).toBe(100);
    expect(res.breakdown.wellnessXp).toBe(10);
    expect(res.level).toBe(2);
    expect(xpForLevel(2)).toBe(125);
    expect(xpForLevel(3)).toBe(300);
  });

  it('assigns higher ranks at threshold levels', () => {
    expect(getRankForLevel(1).title).toBe('Initiate');
    expect(getRankForLevel(5).title).toBe('Builder');
    expect(getRankForLevel(10).title).toBe('Architect');
    expect(getRankForLevel(20).title).toBe('Master');
    expect(getRankForLevel(35).title).toBe('Grandmaster');
    expect(getRankForLevel(50).title).toBe('Zion Legend');
  });
});
