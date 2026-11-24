import { describe, it, expect } from 'vitest';
import {
  normalizeTimeTo24h,
  formatTimeTo12h,
  formatTimeRange12h,
  parseTimeRange,
  categorizeActivity,
  parseTimetableMarkdown,
  calculateBlockDurationMinutes,
} from '../src/lib/timetableParser';

const sampleMarkdownFixture = `# Daily Schedule

## Monday to Saturday
| Time | Activity |
|---|---|
| 6:00 – 6:30 AM | Morning routine |
| 7:45 – 9:45 AM | CS: learn new concepts |
| 11:45 AM – 12:45 PM | English: grammar and vocabulary |
| 10:00 PM – 6:00 AM | Sleep (8 hours) |

## Sunday
| Time | Activity |
|---|---|
| 8:00 – 10:00 AM | Weekly test |
| 10:00 PM – 6:00 AM | Sleep (8 hours) |
`;

describe('Timetable Parser Engine', () => {
  it('formats 24-hour time to 12-hour AM/PM format', () => {
    expect(formatTimeTo12h('06:00')).toBe('6:00 AM');
    expect(formatTimeTo12h('06:30')).toBe('6:30 AM');
    expect(formatTimeTo12h('11:45')).toBe('11:45 AM');
    expect(formatTimeTo12h('12:00')).toBe('12:00 PM');
    expect(formatTimeTo12h('12:45')).toBe('12:45 PM');
    expect(formatTimeTo12h('13:45')).toBe('1:45 PM');
    expect(formatTimeTo12h('17:15')).toBe('5:15 PM');
    expect(formatTimeTo12h('22:00')).toBe('10:00 PM');
    expect(formatTimeTo12h('00:00')).toBe('12:00 AM');
  });

  it('formats time ranges in clean 12-hour format', () => {
    expect(formatTimeRange12h('06:00', '06:30')).toBe('6:00 – 6:30 AM');
    expect(formatTimeRange12h('07:45', '09:45')).toBe('7:45 – 9:45 AM');
    expect(formatTimeRange12h('11:45', '12:45')).toBe('11:45 AM – 12:45 PM');
    expect(formatTimeRange12h('17:15', '18:15')).toBe('5:15 – 6:15 PM');
    expect(formatTimeRange12h('22:00', '06:00')).toBe('10:00 PM – 6:00 AM');
  });

  it('normalizes 12-hour AM/PM time strings to 24-hour HH:mm', () => {
    expect(normalizeTimeTo24h('6:00 AM')).toBe('06:00');
    expect(normalizeTimeTo24h('11:45 AM')).toBe('11:45');
    expect(normalizeTimeTo24h('12:45 PM')).toBe('12:45');
    expect(normalizeTimeTo24h('1:45 PM')).toBe('13:45');
    expect(normalizeTimeTo24h('10:00 PM')).toBe('22:00');
    expect(normalizeTimeTo24h('12:00 AM')).toBe('00:00');
  });

  it('correctly parses time ranges with different separators', () => {
    const range1 = parseTimeRange('6:00 – 6:30 AM');
    expect(range1).toEqual({ startTime: '06:00', endTime: '06:30' });

    const range2 = parseTimeRange('11:45 AM – 12:45 PM');
    expect(range2).toEqual({ startTime: '11:45', endTime: '12:45' });

    const range3 = parseTimeRange('10:00 PM – 6:00 AM');
    expect(range3).toEqual({ startTime: '22:00', endTime: '06:00' });

    const range4 = parseTimeRange('7:45 – 9:45 AM');
    expect(range4).toEqual({ startTime: '07:45', endTime: '09:45' });
  });

  it('computes overnight durations accurately', () => {
    // 10:00 PM to 6:00 AM = 8 hours (480 minutes)
    expect(calculateBlockDurationMinutes('22:00', '06:00')).toBe(480);
    // 7:45 AM to 9:45 AM = 2 hours (120 minutes)
    expect(calculateBlockDurationMinutes('07:45', '09:45')).toBe(120);
  });

  it('accurately categorizes activities based on title and keywords', () => {
    expect(categorizeActivity('CS: learn new concepts').category).toBe('cs');
    expect(categorizeActivity('CS: hands-on coding practice').category).toBe('cs');
    expect(categorizeActivity('English: grammar and vocabulary').category).toBe('english');
    expect(categorizeActivity('English: reading and listening').category).toBe('english');
    expect(categorizeActivity('Sleep (8 hours)').category).toBe('sleep');
    expect(categorizeActivity('Exercise, walk or yoga').category).toBe('health');
    expect(categorizeActivity('Lunch and rest').category).toBe('meal');
    expect(categorizeActivity('Break').category).toBe('break');
    expect(categorizeActivity('Weekly test').category).toBe('review');
  });

  it('parses markdown schedule into structured schedules and blocks', () => {
    const result = parseTimetableMarkdown(sampleMarkdownFixture);
    expect(result.schedules.length).toBe(2);

    const monSat = result.schedules[0];
    expect(monSat.title).toContain('Monday to Saturday');
    expect(monSat.daysOfWeek).toEqual([1, 2, 3, 4, 5, 6]);
    expect(monSat.blocks.length).toBe(4);

    // Verify first block
    expect(monSat.blocks[0].startTime).toBe('06:00');
    expect(monSat.blocks[0].endTime).toBe('06:30');
    expect(monSat.blocks[0].title).toBe('Morning routine');

    // Verify CS block
    const csBlock = monSat.blocks.find((b) => b.title.includes('CS: learn new concepts'));
    expect(csBlock).toBeDefined();
    expect(csBlock?.category).toBe('cs');
    expect(csBlock?.startTime).toBe('07:45');
    expect(csBlock?.endTime).toBe('09:45');

    // Verify Sunday schedule
    const sunday = result.schedules[1];
    expect(sunday.title).toContain('Sunday');
    expect(sunday.daysOfWeek).toEqual([0]);
    expect(sunday.blocks.length).toBe(2);
  });
});
