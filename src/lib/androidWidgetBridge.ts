import { registerPlugin } from '@capacitor/core';
import { isAndroidApp } from './reminders';
import type { Habit } from './types';
import { formatLocalDate } from './dateUtils';

export interface AndroidWidgetHabit {
  id: string;
  name: string;
  completed: boolean;
  color?: string;
  emoji?: string;
}

export interface ZionWidgetPluginInterface {
  syncWidgetData(options: {
    habits: AndroidWidgetHabit[];
    streak: number;
    completionPct: number;
    activeTimer?: { habitName: string; clock: string; isRunning: boolean } | null;
    currentDateStr: string;
  }): Promise<{ success: boolean }>;

  getPendingToggles(): Promise<{ pendingToggles: string[] }>;

  pinWidget(options: { widgetType: 'habits' | 'timer' }): Promise<{ supported: boolean; pinned?: boolean }>;
}

export const ZionWidget = registerPlugin<ZionWidgetPluginInterface>('ZionWidget');

/**
 * Synchronizes Zion habits, streaks, and focus timer status to native Android Home Screen widgets.
 */
export async function syncAndroidWidget(params: {
  habits: Habit[];
  checkins: Record<string, { completed?: boolean }>;
  streak: number;
  currentDate: Date;
  activeTimer?: { habitName: string; remainingSeconds: number; isRunning: boolean } | null;
}): Promise<boolean> {
  if (!isAndroidApp()) return false;

  try {
    const todayStr = formatLocalDate(params.currentDate);
    const todayWday = params.currentDate.getDay();

    const activeHabits = params.habits.filter((h) => !h.archived);
    const scheduled = activeHabits.filter((h) => {
      if (!h.schedule_days || h.schedule_days.length === 0) return true;
      return h.schedule_days.includes(todayWday);
    });

    const targetPool = scheduled.length > 0 ? scheduled : activeHabits;
    const habitsForWidget: AndroidWidgetHabit[] = targetPool.slice(0, 6).map((h) => ({
      id: h.id,
      name: h.name,
      completed: Boolean(params.checkins[`${h.id}_${todayStr}`]?.completed),
      color: h.color,
      emoji: h.emoji,
    }));

    const doneCount = habitsForWidget.filter((h) => h.completed).length;
    const totalCount = habitsForWidget.length;
    const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    let activeTimerObj: { habitName: string; clock: string; isRunning: boolean } | null = null;
    if (params.activeTimer) {
      const mins = Math.floor(params.activeTimer.remainingSeconds / 60);
      const secs = params.activeTimer.remainingSeconds % 60;
      const clockStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      activeTimerObj = {
        habitName: params.activeTimer.habitName,
        clock: clockStr,
        isRunning: params.activeTimer.isRunning,
      };
    }

    const res = await ZionWidget.syncWidgetData({
      habits: habitsForWidget,
      streak: params.streak,
      completionPct,
      activeTimer: activeTimerObj,
      currentDateStr: todayStr,
    });

    return Boolean(res?.success);
  } catch (err) {
    console.warn('[AndroidWidget] Failed to sync widget data:', err);
    return false;
  }
}

/**
 * Checks for any habit items that were checked directly on the Android home screen widget.
 */
export async function syncPendingWidgetToggles(
  onToggle: (habitId: string, dateStr: string) => Promise<void>,
  currentDate: Date
): Promise<number> {
  if (!isAndroidApp()) return 0;

  try {
    const res = await ZionWidget.getPendingToggles();
    const toggles = res?.pendingToggles || [];
    if (toggles.length > 0) {
      const todayStr = formatLocalDate(currentDate);
      for (const hId of toggles) {
        await onToggle(hId, todayStr);
      }
      return toggles.length;
    }
  } catch (err) {
    console.warn('[AndroidWidget] Failed to process pending widget toggles:', err);
  }
  return 0;
}

/**
 * Prompts the Android OS home screen to pin the Zion widget with 1-tap.
 */
export async function pinAndroidWidget(widgetType: 'habits' | 'timer' = 'habits'): Promise<{ supported: boolean; pinned?: boolean }> {
  if (!isAndroidApp()) {
    return { supported: false, pinned: false };
  }

  try {
    return await ZionWidget.pinWidget({ widgetType });
  } catch (err) {
    console.warn('[AndroidWidget] Failed to request pin widget:', err);
    return { supported: false, pinned: false };
  }
}
