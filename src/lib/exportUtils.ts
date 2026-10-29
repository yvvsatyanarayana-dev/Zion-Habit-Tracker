import type { Habit, Checkin, AppSettings, HabitDependency, WellnessLog, SkipReasonEntry, UserProfile } from './types';
import { generateMonthDays, formatLocalDate } from './dateUtils';
import { isHabitScheduledOnDay, computeStreakStats, computeHabitsMonthlyProgress } from './statsUtils';

export interface ExportResult {
  success: boolean;
  message: string;
  method?: 'share' | 'download' | 'clipboard' | 'aborted';
}

/**
 * Downloads string content as a file with UTF-8 BOM support for Microsoft Excel compatibility.
 * On Android / mobile environments, seamlessly falls back to the native Web Share API
 * so users can save directly to device Downloads/Files, Google Drive, or messaging apps.
 */
export async function downloadFile(
  content: string,
  fileName: string,
  contentType: string
): Promise<ExportResult> {
  const finalContent = contentType.includes('csv') ? '\uFEFF' + content : content;
  const mimeType = `${contentType};charset=utf-8;`;
  const blob = new Blob([finalContent], { type: mimeType });

  // 1. Android & Mobile Web Share API (native share sheet)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (typeof File !== 'undefined' && typeof navigator.canShare === 'function') {
        const file = new File([blob], fileName, { type: contentType });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `Zion Backup: ${fileName}`,
          });
          return { success: true, message: `Backup shared / saved via Android share sheet.`, method: 'share' };
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: true, message: 'Share sheet dismissed.', method: 'aborted' };
      }
      console.warn('Web Share API file share failed, falling back to download:', err);
    }
  }

  // 2. Standard Browser / Electron Anchor Download
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { success: true, message: `Saved ${fileName} to Downloads.`, method: 'download' };
  } catch (err) {
    // 3. Fallback to Data URI
    try {
      const dataUri = `data:${contentType};charset=utf-8,` + encodeURIComponent(finalContent);
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return { success: true, message: `Saved ${fileName}.`, method: 'download' };
    } catch (dataErr) {
      console.error('All download methods failed:', dataErr);
      return { success: false, message: 'Could not automatically save file on this device.' };
    }
  }
}

/**
 * Helper to safely merge checkin dictionary and list into a consolidated map.
 */
export function getConsolidatedCheckins(
  checkinsDict: Record<string, Checkin> = {},
  checkinsList: Checkin[] = []
): Map<string, Checkin> {
  const map = new Map<string, Checkin>();
  for (const c of checkinsList) {
    if (c?.habit_id && c?.date) {
      map.set(`${c.habit_id}_${c.date}`, c);
    }
  }
  for (const [key, c] of Object.entries(checkinsDict)) {
    if (c?.habit_id && c?.date) {
      map.set(key, c);
    }
  }
  return map;
}

/**
 * Helper to escape CSV values safely according to RFC 4180.
 * Only quotes values that contain commas, double quotes, or newlines.
 * Numbers, clean dates, and plain words are left unquoted for maximum readability.
 */
export function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 1. Comprehensive Daily Activity Ledger CSV.
 * Detailed row-by-row tracking ledger with dates, days, habits, completion status, streaks and goals.
 */
export async function exportCSVHistory(
  habits: Habit[],
  checkinsDict: Record<string, Checkin> = {},
  checkinsList: Checkin[] = [],
  settings?: AppSettings,
  currentDate: Date = new Date()
): Promise<ExportResult> {
  try {
    const checkinsMap = getConsolidatedCheckins(checkinsDict, checkinsList);
    const activeHabits = habits.filter((h) => !h.archived);
    const weekStartDay = settings?.week_start_day ?? 'mon';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const todayStr = formatLocalDate(currentDate);

    // Month calendar days
    const { days: monthDays } = generateMonthDays(year, month, weekStartDay, currentDate);

    // Build Record for monthly stats computation
    const checkinsRecord: Record<string, Checkin> = {};
    for (const [k, v] of checkinsMap.entries()) {
      checkinsRecord[k] = v;
    }

    const habitsToProcess = activeHabits.length > 0 ? activeHabits : habits;
    const monthlyProgress = computeHabitsMonthlyProgress(habitsToProcess, checkinsRecord, year, month, currentDate);
    const progressMap = new Map(monthlyProgress.map((p) => [p.habit.id, p]));

    // Gather all unique dates (month days + any recorded check-in dates)
    const dateSet = new Set<string>(monthDays.map((d) => d.dateStr));
    for (const chk of checkinsMap.values()) {
      if (chk.date) {
        dateSet.add(chk.date);
      }
    }
    const allDates = Array.from(dateSet).sort();

    const headers = [
      'Date',
      'Day of Week',
      'Timeline',
      'Habit Name',
      'Status',
      'Scheduled Today',
      'Monthly Target',
      'Month Completed',
      'Month Progress',
      'Current Streak',
      'Best Streak',
      'Habit Color',
      'Notes',
      'Logged Timestamp',
    ];

    const rows: string[] = [headers.map(escapeCSV).join(',')];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    allDates.forEach((dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const weekday = dateObj.getDay();
      const weekdayName = dayNames[weekday];

      let timeline = 'Past';
      if (dateStr === todayStr) {
        timeline = 'Today';
      } else if (dateStr > todayStr) {
        timeline = 'Upcoming';
      }

      habitsToProcess.forEach((habit) => {
        const isScheduled = isHabitScheduledOnDay(habit, weekday);
        const chk = checkinsMap.get(`${habit.id}_${dateStr}`);
        const isCompleted = Boolean(chk?.completed);

        let status = 'Pending';
        if (dateStr > todayStr) {
          status = isScheduled ? 'Upcoming' : 'Rest Day';
        } else if (isCompleted) {
          status = 'Completed';
        } else if (!isScheduled) {
          status = 'Rest Day';
        } else {
          status = dateStr === todayStr ? 'Pending' : 'Missed';
        }

        const hProgress = progressMap.get(habit.id);
        const currentStreak = hProgress?.currentStreak ?? 0;
        const longestStreak = hProgress?.longestStreak ?? 0;
        const completedThisMonth = hProgress?.completedDays ?? 0;
        const goal = habit.monthly_goal || 30;
        const progressPct = ((completedThisMonth / goal) * 100).toFixed(1) + '%';

        rows.push(
          [
            escapeCSV(dateStr),
            escapeCSV(weekdayName),
            escapeCSV(timeline),
            escapeCSV(habit.name),
            escapeCSV(status),
            escapeCSV(isScheduled ? 'Yes' : 'No'),
            escapeCSV(`${goal} days`),
            escapeCSV(`${completedThisMonth} days`),
            escapeCSV(progressPct),
            escapeCSV(`${currentStreak} days`),
            escapeCSV(`${longestStreak} days`),
            escapeCSV(habit.color),
            escapeCSV(chk?.note || ''),
            escapeCSV(chk?.updated_at || ''),
          ].join(',')
        );
      });
    });

    if (habitsToProcess.length === 0) {
      rows.push(
        [
          escapeCSV(todayStr),
          escapeCSV(dayNames[currentDate.getDay()]),
          escapeCSV('Today'),
          escapeCSV('No Habits Configured'),
          escapeCSV('Pending'),
          escapeCSV('No'),
          escapeCSV('30 days'),
          escapeCSV('0 days'),
          escapeCSV('0.0%'),
          escapeCSV('0 days'),
          escapeCSV('0 days'),
          escapeCSV('#10b981'),
          escapeCSV('Add habits in the dashboard to generate full activity tracking entries.'),
          escapeCSV(new Date().toISOString()),
        ].join(',')
      );
    }

    const csvContent = rows.join('\r\n');
    return await downloadFile(csvContent, `habit-tracker-ledger-${todayStr}.csv`, 'text/csv');
  } catch (err) {
    console.error('Failed to export CSV history:', err);
    return { success: false, message: 'An error occurred while exporting the Activity Ledger CSV.' };
  }
}

/**
 * 2. Daily Habit Matrix Grid CSV (Pivot Table Format).
 * Table with Date, Day of Week, and a dedicated column for each habit.
 * Professional layout with clear past vs upcoming separation and an executive month-to-date summary.
 */
export async function exportCSVMatrix(
  habits: Habit[],
  checkinsDict: Record<string, Checkin> = {},
  checkinsList: Checkin[] = [],
  settings?: AppSettings,
  currentDate: Date = new Date()
): Promise<ExportResult> {
  try {
    const checkinsMap = getConsolidatedCheckins(checkinsDict, checkinsList);
    const activeHabits = habits.filter((h) => !h.archived);
    const weekStartDay = settings?.week_start_day ?? 'mon';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const todayStr = formatLocalDate(currentDate);

    const { days: monthDays } = generateMonthDays(year, month, weekStartDay, currentDate);

    // Build Record for monthly stats computation
    const checkinsRecord: Record<string, Checkin> = {};
    for (const [k, v] of checkinsMap.entries()) {
      checkinsRecord[k] = v;
    }

    const habitsToProcess = activeHabits.length > 0 ? activeHabits : habits;
    const monthlyProgress = computeHabitsMonthlyProgress(habitsToProcess, checkinsRecord, year, month, currentDate);
    const progressMap = new Map(monthlyProgress.map((p) => [p.habit.id, p]));

    // Format clean habit column headers
    const habitHeaders = habitsToProcess.map((h) => {
      const goal = h.monthly_goal > 0 ? h.monthly_goal : 30;
      return `${h.name} (Goal: ${goal}d)`;
    });

    const headers = [
      'Date',
      'Day',
      'Timeline',
      'Completed',
      'Scheduled',
      'Success Rate',
      ...habitHeaders,
    ];

    const rows: string[] = [headers.map(escapeCSV).join(',')];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let mtdTotalCompleted = 0;
    let mtdTotalScheduled = 0;

    monthDays.forEach((day) => {
      const weekdayName = dayNames[day.weekday];
      const isPast = day.dateStr < todayStr;
      const isToday = day.dateStr === todayStr;
      const isFuture = day.dateStr > todayStr;

      let timeline = 'Past';
      if (isToday) timeline = 'Today';
      if (isFuture) timeline = 'Upcoming';

      let dailyCompleted = 0;
      let dailyScheduled = 0;
      const habitStatuses: string[] = [];

      habitsToProcess.forEach((habit) => {
        const isScheduled = isHabitScheduledOnDay(habit, day.weekday);
        if (isScheduled) dailyScheduled++;

        const chk = checkinsMap.get(`${habit.id}_${day.dateStr}`);
        const isCompleted = Boolean(chk?.completed);
        if (isCompleted) dailyCompleted++;

        if (isFuture) {
          habitStatuses.push(isScheduled ? 'Upcoming' : 'Rest Day');
        } else if (isCompleted) {
          habitStatuses.push('Completed');
        } else if (!isScheduled) {
          habitStatuses.push('Rest Day');
        } else if (isToday) {
          habitStatuses.push('Pending');
        } else {
          habitStatuses.push('Missed');
        }
      });

      if (!isFuture) {
        mtdTotalCompleted += dailyCompleted;
        mtdTotalScheduled += dailyScheduled;
      }

      let completedDisplay: string | number = dailyCompleted;
      let scheduledDisplay: string | number = dailyScheduled;
      let successRateDisplay = '0%';

      if (isFuture) {
        completedDisplay = '-';
        scheduledDisplay = dailyScheduled;
        successRateDisplay = '-';
      } else {
        successRateDisplay = dailyScheduled > 0 ? `${Math.round((dailyCompleted / dailyScheduled) * 100)}%` : 'N/A';
      }

      rows.push(
        [
          escapeCSV(day.dateStr),
          escapeCSV(weekdayName),
          escapeCSV(timeline),
          escapeCSV(completedDisplay),
          escapeCSV(scheduledDisplay),
          escapeCSV(successRateDisplay),
          ...habitStatuses.map(escapeCSV),
        ].join(',')
      );
    });

    const overallRate =
      mtdTotalScheduled > 0 ? `${Math.round((mtdTotalCompleted / mtdTotalScheduled) * 100)}%` : '0%';

    const habitSummaryValues = habitsToProcess.map((h) => {
      const p = progressMap.get(h.id);
      const done = p?.completedDays ?? 0;
      const goal = h.monthly_goal || 30;
      const pct = Math.round((done / goal) * 100);
      return `${done} / ${goal} (${pct}%)`;
    });

    rows.push(
      [
        'MONTH TOTAL (MTD)',
        '-',
        'Summary',
        escapeCSV(mtdTotalCompleted),
        escapeCSV(mtdTotalScheduled),
        escapeCSV(overallRate),
        ...habitSummaryValues.map(escapeCSV),
      ].join(',')
    );

    const csvContent = rows.join('\r\n');
    return await downloadFile(csvContent, `habit-tracker-matrix-grid-${todayStr}.csv`, 'text/csv');
  } catch (err) {
    console.error('Failed to export CSV matrix:', err);
    return { success: false, message: 'An error occurred while exporting the Habit Matrix CSV.' };
  }
}

export interface FullBackupPayload {
  app: string;
  version: string;
  exported_at: string;
  metrics: {
    total_habits: number;
    active_habits: number;
    total_recorded_checkins: number;
    current_streak_days: number;
    longest_streak_days: number;
  };
  settings: AppSettings;
  habits: Habit[];
  checkins: Checkin[];
  dependencies?: HabitDependency[];
  wellness_logs?: WellnessLog[];
  skip_reasons?: SkipReasonEntry[];
  users?: UserProfile[];
}

/**
 * Generates the full JSON backup string containing habits, checkins, settings, and extra features.
 */
export function generateFullBackupJSON(
  habits: Habit[],
  checkinsDict: Record<string, Checkin> = {},
  checkinsList: Checkin[] = [],
  settings?: AppSettings,
  currentDate: Date = new Date(),
  extraData?: {
    dependencies?: HabitDependency[];
    wellnessLogs?: Record<string, WellnessLog>;
    skipReasons?: Record<string, SkipReasonEntry>;
    usersList?: UserProfile[];
  }
): string {
  const checkinsMap = getConsolidatedCheckins(checkinsDict, checkinsList);
  const activeHabits = habits.filter((h) => !h.archived);
  const allCheckinsArray = Array.from(checkinsMap.values());
  const streakStats = computeStreakStats(habits, allCheckinsArray, settings?.streak_threshold ?? 50, currentDate);

  const payload: FullBackupPayload = {
    app: 'Zion Habit Tracker Studio',
    version: '1.1.1',
    exported_at: new Date().toISOString(),
    metrics: {
      total_habits: habits.length,
      active_habits: activeHabits.length,
      total_recorded_checkins: allCheckinsArray.filter((c) => c.completed).length,
      current_streak_days: streakStats.currentStreak,
      longest_streak_days: streakStats.longestStreak,
    },
    settings: settings || ({} as AppSettings),
    habits,
    checkins: allCheckinsArray,
    dependencies: extraData?.dependencies || [],
    wellness_logs: extraData?.wellnessLogs ? Object.values(extraData.wellnessLogs) : [],
    skip_reasons: extraData?.skipReasons ? Object.values(extraData.skipReasons) : [],
    users: extraData?.usersList || [],
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * 3. Complete JSON Backup (Production format with metadata & verification headers).
 */
export async function exportJSONBackup(
  habits: Habit[],
  checkinsDict: Record<string, Checkin> = {},
  checkinsList: Checkin[] = [],
  settings?: AppSettings,
  currentDate: Date = new Date(),
  extraData?: {
    dependencies?: HabitDependency[];
    wellnessLogs?: Record<string, WellnessLog>;
    skipReasons?: Record<string, SkipReasonEntry>;
    usersList?: UserProfile[];
  }
): Promise<ExportResult> {
  try {
    const jsonStr = generateFullBackupJSON(habits, checkinsDict, checkinsList, settings, currentDate, extraData);
    const fileDate = formatLocalDate(currentDate);
    return await downloadFile(jsonStr, `zion-backup-${fileDate}.json`, 'application/json');
  } catch (err) {
    console.error('Failed to export JSON backup:', err);
    return { success: false, message: 'An error occurred while exporting the JSON backup.' };
  }
}

/**
 * Copies the complete JSON backup to the clipboard (works 100% on Android and desktop).
 */
export async function copyBackupToClipboard(
  habits: Habit[],
  checkinsDict: Record<string, Checkin> = {},
  checkinsList: Checkin[] = [],
  settings?: AppSettings,
  currentDate: Date = new Date(),
  extraData?: {
    dependencies?: HabitDependency[];
    wellnessLogs?: Record<string, WellnessLog>;
    skipReasons?: Record<string, SkipReasonEntry>;
    usersList?: UserProfile[];
  }
): Promise<ExportResult> {
  try {
    const jsonStr = generateFullBackupJSON(habits, checkinsDict, checkinsList, settings, currentDate, extraData);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(jsonStr);
      return { success: true, message: 'Complete backup JSON copied to clipboard!', method: 'clipboard' };
    } else {
      // Fallback textarea copy
      const textarea = document.createElement('textarea');
      textarea.value = jsonStr;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        return { success: true, message: 'Complete backup JSON copied to clipboard!', method: 'clipboard' };
      }
      return { success: false, message: 'Unable to access device clipboard.' };
    }
  } catch (err) {
    console.error('Failed to copy backup to clipboard:', err);
    return { success: false, message: 'Could not copy backup to clipboard.' };
  }
}

/**
 * 4. Formatted Markdown Summary Activity Report.
 */
export async function exportMarkdownSummary(
  habits: Habit[],
  checkinsDict: Record<string, Checkin> = {},
  checkinsList: Checkin[] = [],
  settings?: AppSettings,
  currentDate: Date = new Date()
): Promise<ExportResult> {
  try {
    const checkinsMap = getConsolidatedCheckins(checkinsDict, checkinsList);
    const activeHabits = habits.filter((h) => !h.archived);
    const allCheckinsArray = Array.from(checkinsMap.values());
    const streakStats = computeStreakStats(habits, allCheckinsArray, settings?.streak_threshold ?? 50, currentDate);

    const todayStr = formatLocalDate(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const checkinsRecord: Record<string, Checkin> = {};
    for (const [k, v] of checkinsMap.entries()) {
      checkinsRecord[k] = v;
    }
    const habitsToProcess = activeHabits.length > 0 ? activeHabits : habits;
    const monthlyProgress = computeHabitsMonthlyProgress(habitsToProcess, checkinsRecord, year, month, currentDate);
    const progressMap = new Map(monthlyProgress.map((p) => [p.habit.id, p]));

    let md = `# Zion Habit Tracker — Executive Activity Report\n\n`;
    md += `> **Report Date**: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}\n`;
    md += `> **System State**: ${activeHabits.length} Active Habits · ${streakStats.currentStreak} Day Burning Streak · ${streakStats.longestStreak} Day Record Streak\n\n`;

    md += `## 1. Executive Summary\n\n`;
    md += `| Metric | Current Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Active Habits** | ${activeHabits.length} |\n`;
    md += `| **Current Active Streak** | **${streakStats.currentStreak} days** |\n`;
    md += `| **All-Time Longest Streak** | **${streakStats.longestStreak} days** |\n`;
    md += `| **Total Check-ins Logged** | ${allCheckinsArray.filter((c) => c.completed).length} |\n`;
    md += `| **Streak Threshold Target** | ${settings?.streak_threshold ?? 50}% of daily habits |\n\n`;

    md += `## 2. Habit Directory & Monthly Progress\n\n`;
    md += `| Habit Name | Monthly Target | Weekly Schedule | Completed This Month | Progress % | Current Streak |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    habitsToProcess.forEach((h) => {
      const p = progressMap.get(h.id);
      const completedThisMonth = p?.completedDays ?? 0;
      const goal = h.monthly_goal || 30;
      const progress = ((completedThisMonth / goal) * 100).toFixed(1) + '%';
      const scheduleDesc = h.schedule_days.length === 7 ? 'Daily (7 days)' : `${h.schedule_days.length} days/week`;
      const currentStreak = p?.currentStreak ?? 0;

      md += `| **${h.name}** | ${goal} days | ${scheduleDesc} | ${completedThisMonth} days | ${progress} | ${currentStreak} days |\n`;
    });

    md += `\n---\n*Report exported automatically from Zion Habit Tracker (Offline SQLite & Local Storage)*\n`;

    return await downloadFile(md, `zion-activity-report-${todayStr}.md`, 'text/markdown');
  } catch (err) {
    console.error('Failed to export Markdown summary:', err);
    return { success: false, message: 'An error occurred while exporting the Markdown report.' };
  }
}
