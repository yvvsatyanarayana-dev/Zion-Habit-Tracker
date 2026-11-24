import { describe, it, expect } from 'vitest';
import {
  getXpRequiredForLevel,
  calculateLevelFromXp,
  getRankTitle,
  mapCategoryToBranch,
  createInitialRpgProfile,
  awardXpToProfile,
} from '../src/lib/levelingSystem';

describe('RPG Leveling & Skill Tree System', () => {
  it('calculates monotonic XP requirements for progressive levels', () => {
    expect(getXpRequiredForLevel(1)).toBe(0);
    expect(getXpRequiredForLevel(2)).toBeGreaterThan(0);
    expect(getXpRequiredForLevel(3)).toBeGreaterThan(getXpRequiredForLevel(2));
    expect(getXpRequiredForLevel(10)).toBeGreaterThan(getXpRequiredForLevel(5));
  });

  it('calculates correct level and percentage progression', () => {
    const l1 = calculateLevelFromXp(0);
    expect(l1.level).toBe(1);
    expect(l1.progressPercent).toBe(0);

    const l2Xp = getXpRequiredForLevel(2);
    const l2 = calculateLevelFromXp(l2Xp);
    expect(l2.level).toBe(2);
    expect(l2.progressPercent).toBe(0);

    const midL2 = calculateLevelFromXp(l2Xp + Math.round((getXpRequiredForLevel(3) - l2Xp) / 2));
    expect(midL2.level).toBe(2);
    expect(midL2.progressPercent).toBeGreaterThanOrEqual(45);
    expect(midL2.progressPercent).toBeLessThanOrEqual(55);
  });

  it('maps timetable categories to corresponding skill branches', () => {
    expect(mapCategoryToBranch('cs')).toBe('engineering');
    expect(mapCategoryToBranch('english')).toBe('languages');
    expect(mapCategoryToBranch('health')).toBe('vitality');
    expect(mapCategoryToBranch('sleep')).toBe('vitality');
    expect(mapCategoryToBranch('review')).toBe('discipline');
  });

  it('awards XP to profile and triggers level up flag on threshold', () => {
    const profile = createInitialRpgProfile();
    expect(profile.overallLevel).toBe(1);
    expect(profile.totalXp).toBe(0);

    // Award 50 XP
    const res1 = awardXpToProfile(profile, 50, 'engineering', 'Completed coding session');
    expect(res1.updatedProfile.totalXp).toBe(50);
    expect(res1.updatedProfile.skills.engineering.totalXp).toBe(50);
    expect(res1.didLevelUpOverall).toBe(false);

    // Award 200 XP to breach level 2
    const res2 = awardXpToProfile(res1.updatedProfile, 200, 'engineering', 'Finished big project');
    expect(res2.didLevelUpOverall).toBe(true);
    expect(res2.updatedProfile.overallLevel).toBeGreaterThanOrEqual(2);
    expect(res2.updatedProfile.recentUnlocks.length).toBe(2);
  });
});
