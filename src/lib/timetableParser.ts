import type { TimetableBlock, TimetableCategory, TimetableSchedule } from './types';

export interface ParsedScheduleResult {
  schedules: TimetableSchedule[];
  unparsedLines: string[];
  notes: string[];
}

/**
 * Normalizes 12-hour or 24-hour time strings to standard 'HH:mm' 24-hr format.
 * Examples:
 *   "6:00 AM" -> "06:00"
 *   "12:45 PM" -> "12:45"
 *   "1:45 PM" -> "13:45"
 *   "10:00 PM" -> "22:00"
 *   "07:45" -> "07:45"
 */
export function normalizeTimeTo24h(timeStr: string): string | null {
  const clean = timeStr.trim().toUpperCase();
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const modifier = match12[3];

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours <= 24 && minutes >= 0 && minutes < 60) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Formats a 24-hour 'HH:mm' time string into 12-hour format with AM/PM.
 * Examples:
 *   "06:00" -> "6:00 AM"
 *   "12:45" -> "12:45 PM"
 *   "13:45" -> "1:45 PM"
 *   "22:00" -> "10:00 PM"
 *   "00:00" -> "12:00 AM"
 */
export function formatTimeTo12h(timeStr: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  const parts = clean.split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return timeStr;

  const modifier = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${modifier}`;
}

/**
 * Formats a start and end time into a clean 12-hour range string.
 * Examples:
 *   ("06:00", "06:30") -> "6:00 – 6:30 AM"
 *   ("07:45", "09:45") -> "7:45 – 9:45 AM"
 *   ("11:45", "12:45") -> "11:45 AM – 12:45 PM"
 *   ("22:00", "06:00") -> "10:00 PM – 6:00 AM"
 */
export function formatTimeRange12h(startTime: string, endTime: string): string {
  const start12 = formatTimeTo12h(startTime);
  const end12 = formatTimeTo12h(endTime);
  if (!start12 || !end12) return `${startTime} – ${endTime}`;

  const [sTime, sMod] = start12.split(' ');
  const [eTime, eMod] = end12.split(' ');
  if (sMod === eMod) {
    return `${sTime} – ${eTime} ${eMod}`;
  }
  return `${start12} – ${end12}`;
}

/**
 * Parses time ranges such as:
 *   "6:00 – 6:30 AM"
 *   "11:45 AM – 12:45 PM"
 *   "10:00 PM – 6:00 AM"
 *   "7:45 - 9:45 AM"
 *   "07:45 to 09:45"
 */
export function parseTimeRange(rangeStr: string): { startTime: string; endTime: string } | null {
  const normalized = rangeStr.replace(/[–—]/g, '-').replace(/\bto\b/gi, '-').trim();
  const parts = normalized.split('-');
  if (parts.length !== 2) return null;

  let startRaw = parts[0].trim();
  let endRaw = parts[1].trim();

  // If start time does not specify AM/PM but end time does, inherit AM/PM if logical
  const endAmPmMatch = endRaw.match(/(AM|PM)/i);
  if (endAmPmMatch && !startRaw.match(/(AM|PM)/i)) {
    const endAmPm = endAmPmMatch[1].toUpperCase();
    const startHourMatch = startRaw.match(/^(\d{1,2})/);
    const endHourMatch = endRaw.match(/^(\d{1,2})/);

    if (startHourMatch && endHourMatch) {
      const sH = parseInt(startHourMatch[1], 10);
      const eH = parseInt(endHourMatch[1], 10);

      if (endAmPm === 'PM') {
        // e.g. 11:45 - 12:45 PM -> 11:45 AM
        if (sH === 11 && (eH === 12 || eH <= 1)) {
          startRaw += ' AM';
        } else if (sH <= eH || (sH === 12 && eH < 12)) {
          startRaw += ' PM';
        } else {
          startRaw += ' AM';
        }
      } else {
        startRaw += ' AM';
      }
    } else {
      startRaw += ` ${endAmPm}`;
    }
  }

  const startTime = normalizeTimeTo24h(startRaw);
  const endTime = normalizeTimeTo24h(endRaw);

  if (startTime && endTime) {
    return { startTime, endTime };
  }
  return null;
}

/**
 * Computes duration in minutes between start and end time.
 * Handles overnight wraps (e.g. 22:00 to 06:00 = 8 hours).
 */
export function calculateBlockDurationMinutes(startTime: string, endTime: string): number {
  const [sH, sM] = startTime.split(':').map((x) => parseInt(x, 10));
  const [eH, eM] = endTime.split(':').map((x) => parseInt(x, 10));

  let startTotal = sH * 60 + sM;
  let endTotal = eH * 60 + eM;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60; // Overnight wrap
  }

  return endTotal - startTotal;
}

/**
 * Intelligently classifies activity into category, color, and icon.
 */
export function categorizeActivity(title: string, description: string = ''): {
  category: TimetableCategory;
  color: string;
  emoji: string;
  icon: string;
} {
  const text = `${title} ${description}`.toLowerCase();

  // 1. Computer Science / Programming
  if (
    text.includes('cs') ||
    text.includes('programming') ||
    text.includes('coding') ||
    text.includes('theory') ||
    text.includes('problem solving') ||
    text.includes('project work') ||
    text.includes('algorithm') ||
    text.includes('data structure') ||
    text.includes('dsa') ||
    text.includes('sql') ||
    text.includes('web development') ||
    text.includes('software') ||
    text.includes('python') ||
    text.includes('javascript')
  ) {
    return { category: 'cs', color: '#6366f1', emoji: 'code', icon: 'code' };
  }

  // 2. English / Languages
  if (
    text.includes('english') ||
    text.includes('vocabulary') ||
    text.includes('grammar') ||
    text.includes('speaking') ||
    text.includes('writing') ||
    text.includes('reading') ||
    text.includes('listening') ||
    text.includes('podcast') ||
    text.includes('words daily') ||
    text.includes('articles')
  ) {
    return { category: 'english', color: '#10b981', emoji: 'book', icon: 'book' };
  }

  // 3. Sleep / Wind Down
  if (
    text.includes('sleep') ||
    text.includes('bedtime') ||
    text.includes('nap') ||
    text.includes('wind down')
  ) {
    return { category: 'sleep', color: '#8b5cf6', emoji: 'moon', icon: 'moon' };
  }

  // 4. Health / Exercise / Routine
  if (
    text.includes('exercise') ||
    text.includes('walk') ||
    text.includes('yoga') ||
    text.includes('workout') ||
    text.includes('gym') ||
    text.includes('bath') ||
    text.includes('freshen up') ||
    text.includes('meditat')
  ) {
    return { category: 'health', color: '#f59e0b', emoji: 'dumbbell', icon: 'dumbbell' };
  }

  // 5. Meals / Food
  if (
    text.includes('breakfast') ||
    text.includes('lunch') ||
    text.includes('dinner') ||
    text.includes('snack') ||
    text.includes('tea') ||
    text.includes('meal') ||
    text.includes('eat')
  ) {
    return { category: 'meal', color: '#f43f5e', emoji: 'nutrition', icon: 'nutrition' };
  }

  // 6. Review / Test / Quiz
  if (
    text.includes('revision') ||
    text.includes('review') ||
    text.includes('weekly test') ||
    text.includes('test') ||
    text.includes('quiz') ||
    text.includes('exam')
  ) {
    return { category: 'review', color: '#ec4899', emoji: 'target', icon: 'target' };
  }

  // 7. Break / Relaxation / Leisure
  if (
    text.includes('break') ||
    text.includes('free time') ||
    text.includes('rest') ||
    text.includes('hobby') ||
    text.includes('family') ||
    text.includes('outdoor') ||
    text.includes('fun learning') ||
    text.includes('movie')
  ) {
    return { category: 'break', color: '#06b6d4', emoji: 'coffee', icon: 'coffee' };
  }

  return { category: 'general', color: '#64748b', emoji: 'clock', icon: 'clock' };
}

/**
 * Intelligent Markdown / Text parser for Timetables.
 * Automatically parses table rows (| Time | Activity |), day section headers (## Monday to Saturday),
 * and creates high-fidelity structured timetable schedules and blocks.
 */
export function parseTimetableMarkdown(content: string): ParsedScheduleResult {
  const lines = content.split('\n');
  const schedules: TimetableSchedule[] = [];
  const unparsedLines: string[] = [];
  const notes: string[] = [];

  let currentSchedule: TimetableSchedule | null = null;
  let inTable = false;

  const defaultScheduleId = `sched_${Date.now()}_main`;
  currentSchedule = {
    id: defaultScheduleId,
    title: 'Daily Master Schedule',
    description: 'Imported schedule routine',
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Mon-Sat default
    isActive: true,
    blocks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Detect section headers: ## Monday to Saturday, ## Sunday, etc.
    if (rawLine.startsWith('#')) {
      const headerText = rawLine.replace(/^#+\s*/, '').trim();

      // Check if header indicates days
      let days = [1, 2, 3, 4, 5, 6]; // default Mon-Sat
      if (headerText.toLowerCase().includes('sunday')) {
        days = [0];
      } else if (headerText.toLowerCase().includes('weekend')) {
        days = [0, 6];
      } else if (headerText.toLowerCase().includes('mon') && headerText.toLowerCase().includes('sat')) {
        days = [1, 2, 3, 4, 5, 6];
      } else if (headerText.toLowerCase().includes('daily') || headerText.toLowerCase().includes('everyday')) {
        days = [0, 1, 2, 3, 4, 5, 6];
      }

      // If current schedule already has blocks, push it and start a new section
      if (currentSchedule && currentSchedule.blocks.length > 0) {
        schedules.push(currentSchedule);
        currentSchedule = {
          id: `sched_${Date.now()}_${schedules.length + 1}`,
          title: headerText,
          description: `Custom schedule for ${headerText}`,
          daysOfWeek: days,
          isActive: true,
          blocks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else if (currentSchedule) {
        currentSchedule.title = headerText;
        currentSchedule.daysOfWeek = days;
      }
      inTable = false;
      continue;
    }

    // Markdown Table Row: | Time | Activity |
    if (rawLine.startsWith('|') && rawLine.endsWith('|')) {
      const cells = rawLine
        .split('|')
        .map((c) => c.trim())
        .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

      if (cells.length >= 2) {
        const timeCell = cells[0];
        const activityCell = cells[1];

        // Skip markdown table delimiter row: |---|---| or header | Time | Activity |
        if (timeCell.includes('---') || timeCell.toLowerCase() === 'time') {
          inTable = true;
          continue;
        }

        // Try parsing time range
        const timeRange = parseTimeRange(timeCell);
        if (timeRange && currentSchedule) {
          // Clean title and description
          let title = activityCell.replace(/\*\*/g, '').trim();
          let description = '';

          // If title has parentheses, separate title and description
          // e.g. "Focus Session (coding or project work)"
          const parenMatch = title.match(/^([^(]+)\s*\(([^)]+)\)$/);
          if (parenMatch) {
            title = parenMatch[1].trim();
            description = parenMatch[2].trim();
          }

          const { category, color, emoji, icon } = categorizeActivity(title, description);

          const block: TimetableBlock = {
            id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            scheduleId: currentSchedule.id,
            title,
            description,
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
            category,
            color,
            icon,
            emoji,
            soundAlert: true,
            sortOrder: currentSchedule.blocks.length,
          };

          currentSchedule.blocks.push(block);
          continue;
        }
      }
    }

    // Non-table bullet list line: e.g. "- 7:45 – 9:45 AM: Morning Deep Work"
    const bulletMatch = rawLine.match(/^[-*•]\s*(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1];
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0) {
        const potentialTime = text.substring(0, colonIdx);
        const timeRange = parseTimeRange(potentialTime);
        if (timeRange && currentSchedule) {
          const act = text.substring(colonIdx + 1).trim();
          const { category, color, emoji, icon } = categorizeActivity(act);
          currentSchedule.blocks.push({
            id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            scheduleId: currentSchedule.id,
            title: act,
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
            category,
            color,
            icon,
            emoji,
            soundAlert: true,
            sortOrder: currentSchedule.blocks.length,
          });
          continue;
        }
      }
    }

    // Notes or suggested orders
    if (rawLine.length > 5) {
      notes.push(rawLine);
    } else {
      unparsedLines.push(rawLine);
    }
  }

  if (currentSchedule && currentSchedule.blocks.length > 0) {
    schedules.push(currentSchedule);
  }

  return { schedules, unparsedLines, notes };
}

/**
 * Extracts raw text from an uploaded PDF file using PDF.js.
 */
export async function extractTextFromPdf(file: File | ArrayBuffer): Promise<string> {
  const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file;
  const pdfjsLib = await import('pdfjs-dist');

  // Provide a safe web worker src or worker configuration
  try {
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
    }
  } catch {}

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ');
    fullText += `${pageText}\n`;
  }

  return fullText;
}
