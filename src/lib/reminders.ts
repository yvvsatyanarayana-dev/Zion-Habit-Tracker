import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const DAILY_REMINDER_NOTIFICATION_ID = 41001;
export const DAILY_REMINDER_ACTION_TYPE = 'zion-daily-reminder';
export const DAILY_REMINDER_STOP_ACTION = 'stop';

const DAILY_REMINDER_CHANNEL_ID = 'zion-daily-reminders';

export function isAndroidApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function getReminderTimeParts(reminderTime: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderTime);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

async function prepareAndroidNotifications(): Promise<boolean> {
  const permissions = await LocalNotifications.checkPermissions();
  if (permissions.display === 'granted') return true;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

async function registerReminderActions(): Promise<void> {
  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: DAILY_REMINDER_ACTION_TYPE,
        actions: [{ id: DAILY_REMINDER_STOP_ACTION, title: 'Stop' }],
      },
    ],
  });
}

export async function syncAndroidDailyReminder(reminderTime: string): Promise<string | null> {
  if (!isAndroidApp()) return null;

  await LocalNotifications.cancel({
    notifications: [{ id: DAILY_REMINDER_NOTIFICATION_ID }],
  });
  await LocalNotifications.removeDeliveredNotificationsById({
    ids: [DAILY_REMINDER_NOTIFICATION_ID],
  });

  if (!reminderTime) return null;

  const time = getReminderTimeParts(reminderTime);
  if (!time) {
    throw new Error('Choose a valid time for the daily reminder.');
  }

  if (!(await prepareAndroidNotifications())) {
    return 'Allow notifications for Zion in Android settings to receive daily reminders.';
  }

  await registerReminderActions();
  await LocalNotifications.createChannel({
    id: DAILY_REMINDER_CHANNEL_ID,
    name: 'Daily reminders',
    description: 'A daily reminder to check in on your habits.',
    importance: 4,
  });

  const result = await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_NOTIFICATION_ID,
        title: 'Zion Habit Tracker',
        body: "Time to check in on today's habits. Keep your consistency going!",
        actionTypeId: DAILY_REMINDER_ACTION_TYPE,
        channelId: DAILY_REMINDER_CHANNEL_ID,
        schedule: {
          on: time,
        },
      },
    ],
  });

  return result.warning
    ? 'Reminder saved, but Android may deliver it a little later when exact alarms are unavailable.'
    : null;
}

export async function showAndroidTestReminder(): Promise<string | null> {
  if (!isAndroidApp()) {
    return 'Android notifications are only available in the installed Android app.';
  }

  if (!(await prepareAndroidNotifications())) {
    return 'Allow notifications for Zion in Android settings to test reminders.';
  }

  await registerReminderActions();
  await LocalNotifications.createChannel({
    id: DAILY_REMINDER_CHANNEL_ID,
    name: 'Daily reminders',
    description: 'A daily reminder to check in on your habits.',
    importance: 4,
  });
  const result = await LocalNotifications.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_NOTIFICATION_ID + 1,
        title: 'Zion Habit Tracker',
        body: "Time to check in on today's habits. Keep your consistency going!",
        actionTypeId: DAILY_REMINDER_ACTION_TYPE,
        channelId: DAILY_REMINDER_CHANNEL_ID,
        schedule: { at: new Date(Date.now() + 2_000) },
      },
    ],
  });
  return result.warning
    ? 'Test reminder scheduled, but Android may display it a little later.'
    : null;
}

export async function dismissAndroidReminder(notificationId: number): Promise<void> {
  if (!isAndroidApp()) return;
  await LocalNotifications.removeDeliveredNotificationsById({ ids: [notificationId] });
}
