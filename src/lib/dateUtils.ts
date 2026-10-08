import {
  getDaysInMonth,
  startOfMonth,
  getDay,
  format,
  parseISO,
  isToday,
  isFuture,
  isPast,
  isSameDay,
  addDays,
  subDays,
} from 'date-fns';
import type { WeekStartDay } from './types';

/**
 * Format date in local timezone to YYYY-MM-DD (avoiding UTC shift bugs)
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD string into a local Date object
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get weekday offset index (0 to 6) based on weekStartDay:
 * JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
 */
export function getWeekdayOffset(dayOfWeek: number, weekStartDay: WeekStartDay): number {
  if (weekStartDay === 'sun') {
    return dayOfWeek; // 0..6
  }
  if (weekStartDay === 'mon') {
    return (dayOfWeek + 6) % 7; // Mon=0, ..., Sun=6
  }
  if (weekStartDay === 'thu') {
    return (dayOfWeek + 3) % 7; // Thu=0, ..., Wed=6
  }
  return (dayOfWeek + 6) % 7;
}

export function getWeekdayLabels(weekStartDay: WeekStartDay): string[] {
  if (weekStartDay === 'sun') {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }
  if (weekStartDay === 'thu') {
    return ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
  }
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
}

export interface MonthDayInfo {
  dateStr: string; // YYYY-MM-DD
  dayOfMonth: number;
  weekday: number; // 0=Sun .. 6=Sat
  weekdayLabel: string; // e.g. "Wed"
  weekNumber: number; // 1..6
  isToday: boolean;
  isFuture: boolean;
  isPast: boolean;
  isFirstDayOfWeek: boolean;
}

export interface WeekGroup {
  weekNumber: number; // 1..6
  label: string; // "WEEK 1"
  days: MonthDayInfo[];
  startDateStr: string;
  endDateStr: string;
}

/**
 * Generates all calendar days for a given month and year, split into Week 1..Week 5/6
 */
export function generateMonthDays(
  year: number,
  month: number, // 0 = Jan, 11 = Dec
  weekStartDay: WeekStartDay = 'mon',
  referenceToday: Date = new Date()
): { days: MonthDayInfo[]; weeks: WeekGroup[] } {
  const totalDays = getDaysInMonth(new Date(year, month, 1));
  const days: MonthDayInfo[] = [];

  let currentWeekNumber = 1;
  const todayStr = formatLocalDate(referenceToday);

  for (let d = 1; d <= totalDays; d++) {
    const curDate = new Date(year, month, d);
    const dateStr = formatLocalDate(curDate);
    const weekday = curDate.getDay(); // 0..6
    const offset = getWeekdayOffset(weekday, weekStartDay);

    // If it's the start of a new week (offset === 0) and not the very first day of the month
    if (d > 1 && offset === 0) {
      currentWeekNumber++;
    }

    const isCurrentDay = dateStr === todayStr;
    const isDayFuture = dateStr > todayStr;
    const isDayPast = dateStr < todayStr;

    days.push({
      dateStr,
      dayOfMonth: d,
      weekday,
      weekdayLabel: format(curDate, 'EEE'),
      weekNumber: currentWeekNumber,
      isToday: isCurrentDay,
      isFuture: isDayFuture,
      isPast: isDayPast,
      isFirstDayOfWeek: offset === 0 || d === 1,
    });
  }

  // Group into weeks
  const weeksMap = new Map<number, MonthDayInfo[]>();
  for (const day of days) {
    if (!weeksMap.has(day.weekNumber)) {
      weeksMap.set(day.weekNumber, []);
    }
    weeksMap.get(day.weekNumber)!.push(day);
  }

  const weeks: WeekGroup[] = [];
  weeksMap.forEach((weekDays, weekNum) => {
    weeks.push({
      weekNumber: weekNum,
      label: `WEEK ${weekNum}`,
      days: weekDays,
      startDateStr: weekDays[0].dateStr,
      endDateStr: weekDays[weekDays.length - 1].dateStr,
    });
  });

  return { days, weeks };
}

/**
 * Formats live titlebar time string
 * Example: "Wed 7 Oct 2026  11:08:42 AM" or 24h "Wed 7 Oct 2026  11:08:42"
 */
export function formatLiveClock(date: Date, format24h: boolean = false): string {
  const datePart = format(date, 'EEE d MMM yyyy');
  const timePart = format24h ? format(date, 'HH:mm:ss') : format(date, 'hh:mm:ss a');
  return `${datePart}   ${timePart}`;
}
