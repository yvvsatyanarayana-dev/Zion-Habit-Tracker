import { describe, it, expect } from 'vitest';
import { generateMonthDays, formatLocalDate, parseLocalDate, getWeekdayOffset } from '../src/lib/dateUtils';

describe('Calendar Generation & Date Utils', () => {
  it('formats and parses local dates without timezone offset shifts', () => {
    const d = new Date(2026, 9, 7); // Oct 7, 2026
    const str = formatLocalDate(d);
    expect(str).toBe('2026-10-07');

    const parsed = parseLocalDate('2026-10-07');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(7);
  });

  it('generates correct days in leap year (Feb 2024 has 29 days)', () => {
    const { days } = generateMonthDays(2024, 1, 'mon'); // Feb 2024
    expect(days.length).toBe(29);
    expect(days[0].dayOfMonth).toBe(1);
    expect(days[28].dayOfMonth).toBe(29);
  });

  it('generates correct days in non-leap year (Feb 2025 has 28 days)', () => {
    const { days } = generateMonthDays(2025, 1, 'mon'); // Feb 2025
    expect(days.length).toBe(28);
  });

  it('generates 31 days for October and groups into weeks', () => {
    const { days, weeks } = generateMonthDays(2026, 9, 'mon'); // Oct 2026
    expect(days.length).toBe(31);
    expect(weeks.length).toBeGreaterThanOrEqual(5);
    expect(weeks[0].label).toBe('WEEK 1');
    expect(weeks[0].days[0].dayOfMonth).toBe(1);
  });

  it('correctly handles week start day offsets', () => {
    // Sunday = 0
    expect(getWeekdayOffset(0, 'sun')).toBe(0);
    expect(getWeekdayOffset(1, 'sun')).toBe(1);

    // Monday as week start: Mon=0, Sun=6
    expect(getWeekdayOffset(1, 'mon')).toBe(0);
    expect(getWeekdayOffset(0, 'mon')).toBe(6);
  });
});
