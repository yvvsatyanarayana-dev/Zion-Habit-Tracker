import { describe, it, expect } from 'vitest';
import {
  parseTimeToMinutes,
  formatMinutesToHhMm,
  cascadeShiftBlocks,
  snapBlockToNow,
} from '../src/lib/scheduleCascade';
import type { TimetableBlock } from '../src/lib/types';

describe('Smart Schedule Shift & Adaptive Routine', () => {
  it('converts HH:mm to minutes and back accurately', () => {
    expect(parseTimeToMinutes('06:30')).toBe(390);
    expect(formatMinutesToHhMm(390)).toBe('06:30');
    expect(formatMinutesToHhMm(1440 + 60)).toBe('01:00'); // Overnight wrap
  });

  const sampleBlocks: TimetableBlock[] = [
    {
      id: 'b1',
      scheduleId: 's1',
      title: 'Morning Yoga',
      startTime: '06:30',
      endTime: '07:00',
      category: 'health',
      color: '#10b981',
      soundAlert: true,
      sortOrder: 0,
    },
    {
      id: 'b2',
      scheduleId: 's1',
      title: 'CS Coding',
      startTime: '07:45',
      endTime: '09:45',
      category: 'cs',
      color: '#6366f1',
      soundAlert: true,
      sortOrder: 1,
    },
    {
      id: 'b3',
      scheduleId: 's1',
      title: 'English Vocabulary',
      startTime: '10:00',
      endTime: '11:00',
      category: 'english',
      color: '#3b82f6',
      soundAlert: true,
      sortOrder: 2,
    },
    {
      id: 'b4',
      scheduleId: 's1',
      title: 'Sleep',
      startTime: '22:00',
      endTime: '06:00',
      category: 'sleep',
      color: '#8b5cf6',
      soundAlert: true,
      sortOrder: 3,
    },
  ];

  it('cascades +15 minutes forward to subsequent blocks preserving duration', () => {
    const shifted = cascadeShiftBlocks(sampleBlocks, 'b2', 15);
    // b1 unchanged
    expect(shifted[0].startTime).toBe('06:30');
    expect(shifted[0].endTime).toBe('07:00');

    // b2 shifted by 15 mins
    expect(shifted[1].startTime).toBe('08:00');
    expect(shifted[1].endTime).toBe('10:00');

    // b3 shifted accordingly
    expect(shifted[2].startTime).toBe('10:15');
    expect(shifted[2].endTime).toBe('11:15');
  });

  it('snaps active block to real-time clock now', () => {
    const snapped = snapBlockToNow(sampleBlocks, 'b2', '08:15');
    expect(snapped[1].startTime).toBe('08:15');
    expect(snapped[1].endTime).toBe('10:15'); // 2 hours duration preserved
  });
});
