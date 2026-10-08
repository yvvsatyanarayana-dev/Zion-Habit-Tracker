import { ipcMain, BrowserWindow, Notification, app, shell, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';
import * as db from '../db';
import type { HabitRow, CheckinRow } from '../db/types';

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  onSettingChange?: (key: string, value: any) => void
): void {
  // Window controls
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow.isMaximized();
  });

  // OS Level Handlers
  ipcMain.handle('os:getLaunchOnStartup', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('os:setLaunchOnStartup', (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
    });
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('os:openDataFolder', async () => {
    const userDataPath = app.getPath('userData');
    await shell.openPath(userDataPath);
    return userDataPath;
  });

  ipcMain.handle('os:setProgressBar', (_event, progress: number) => {
    if (mainWindow) {
      mainWindow.setProgressBar(progress);
    }
  });

  // Habits
  ipcMain.handle('habits:getAll', (_event, includeArchived?: boolean) => {
    return db.getHabits(includeArchived);
  });

  ipcMain.handle('habits:create', (_event, habit: any) => {
    db.createHabit(habit);
    return db.getHabits();
  });

  ipcMain.handle('habits:update', (_event, habit: any) => {
    db.updateHabit(habit);
    return db.getHabits();
  });

  ipcMain.handle('habits:delete', (_event, id: string) => {
    db.deleteHabit(id);
    return db.getHabits();
  });

  ipcMain.handle('habits:reorder', (_event, ids: string[]) => {
    db.reorderHabits(ids);
    return db.getHabits();
  });

  // Checkins
  ipcMain.handle('checkins:getMonth', (_event, yearMonth: string) => {
    return db.getCheckinsForMonth(yearMonth);
  });

  ipcMain.handle('checkins:getAll', () => {
    return db.getAllCheckins();
  });

  ipcMain.handle('checkins:toggle', (_event, habitId: string, date: string, completed: boolean, note?: string, value?: number, mood?: string) => {
    return db.toggleCheckin(habitId, date, completed, note, value, mood);
  });

  // Settings
  ipcMain.handle('settings:getAll', () => {
    return db.getSettings();
  });

  ipcMain.handle('settings:save', (_event, key: string, value: string) => {
    db.saveSetting(key, value);

    // Apply OS-level side effects
    let parsedVal: any = value;
    try {
      parsedVal = JSON.parse(value);
    } catch {}

    if (key === 'launch_on_startup') {
      try {
        app.setLoginItemSettings({
          openAtLogin: Boolean(parsedVal),
          path: process.execPath,
        });
      } catch (err) {
        console.error('Failed to set login item settings:', err);
      }
    }

    if (key === 'theme') {
      nativeTheme.themeSource = parsedVal === 'light' ? 'light' : 'dark';
    }

    if (onSettingChange) {
      onSettingChange(key, parsedVal);
    }

    return db.getSettings();
  });

  // Export & Import
  ipcMain.handle('data:export', () => {
    return db.exportData();
  });

  ipcMain.handle('data:import', (_event, data: { habits: HabitRow[]; checkins: CheckinRow[]; settings?: Record<string, string> }) => {
    db.importData(data);
    return {
      habits: db.getHabits(),
      checkins: db.getAllCheckins(),
      settings: db.getSettings(),
    };
  });

  ipcMain.handle('data:reset', () => {
    db.resetAllData();
    return {
      habits: [],
      checkins: [],
      settings: {},
    };
  });

  // Notification (OS level with app icon and window focus on click)
  ipcMain.handle('app:notify', (_event, title: string, body: string) => {
    if (Notification.isSupported()) {
      let iconPath = path.join(__dirname, '../assets/icon.png');
      if (!fs.existsSync(iconPath)) {
        iconPath = path.join(app.getAppPath(), 'assets/icon.png');
      }
      const n = new Notification({
        title,
        body,
        icon: iconPath,
      });
      n.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      });
      n.show();
      return true;
    }
    return false;
  });
}
