import type { TimetableBlock } from './types';
import { calculateBlockDurationMinutes } from './timetableParser';

export interface ShiftOptions {
  protectAnchors?: boolean; // Keep sleep or fixed blocks fixed
  keepDurations?: boolean;  // Maintain block duration
}

export function parseTimeToMinutes(hhMm: string): number {
  const [h, m] = hhMm.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export function formatMinutesToHhMm(totalMins: number): string {
  // Normalize to 0-1439 (24 hours)
  let norm = totalMins % 1440;
  if (norm < 0) norm += 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Shifts the given block and all subsequent blocks forward/backward by `shiftMinutes`.
 */
export function cascadeShiftBlocks(
  blocks: TimetableBlock[],
  startBlockId: string,
  shiftMinutes: number,
  options: ShiftOptions = { protectAnchors: true, keepDurations: true }
): TimetableBlock[] {
  if (shiftMinutes === 0 || blocks.length === 0) return blocks;

  const targetIdx = blocks.findIndex((b) => b.id === startBlockId);
  if (targetIdx === -1) return blocks;

  const updated: TimetableBlock[] = blocks.map((b) => ({ ...b }));

  // First block shift
  const target = updated[targetIdx];
  const oldDuration = calculateBlockDurationMinutes(target.startTime, target.endTime);
  const newStartMins = parseTimeToMinutes(target.startTime) + shiftMinutes;
  target.startTime = formatMinutesToHhMm(newStartMins);
  target.endTime = formatMinutesToHhMm(newStartMins + oldDuration);

  // Cascade forward to subsequent blocks
  let previousEndTimeMins = parseTimeToMinutes(target.endTime);

  for (let i = targetIdx + 1; i < updated.length; i++) {
    const cur = updated[i];

    // If anchor protection is enabled and current is sleep, don't move past anchor
    if (options.protectAnchors && cur.category === 'sleep') {
      const curStartMins = parseTimeToMinutes(cur.startTime);
      // If previous block now collides or overshoots sleep anchor, adjust previous block endTime
      if (previousEndTimeMins > curStartMins && curStartMins > 0) {
        updated[i - 1].endTime = cur.startTime;
      }
      break; // Stop cascading past sleep anchor
    }

    const duration = calculateBlockDurationMinutes(cur.startTime, cur.endTime);
    const origGap = Math.max(0, parseTimeToMinutes(cur.startTime) - parseTimeToMinutes(blocks[i - 1].endTime));
    
    // Position current block after previous block + original gap
    const newCurStart = previousEndTimeMins + origGap;
    cur.startTime = formatMinutesToHhMm(newCurStart);
    cur.endTime = formatMinutesToHhMm(newCurStart + duration);

    previousEndTimeMins = parseTimeToMinutes(cur.endTime);
  }

  return updated;
}

/**
 * Snaps the specified block to current real-time clock and cascades forward.
 */
export function snapBlockToNow(
  blocks: TimetableBlock[],
  blockId: string,
  nowHhMm: string,
  options: ShiftOptions = { protectAnchors: true }
): TimetableBlock[] {
  const target = blocks.find((b) => b.id === blockId);
  if (!target) return blocks;

  const currentStartMins = parseTimeToMinutes(target.startTime);
  const nowMins = parseTimeToMinutes(nowHhMm);
  const diffMinutes = nowMins - currentStartMins;

  return cascadeShiftBlocks(blocks, blockId, diffMinutes, options);
}
