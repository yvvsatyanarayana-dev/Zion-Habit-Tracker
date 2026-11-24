import { ipcMain, BrowserWindow, Notification, app, shell, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';
import * as db from '../db';
import type { HabitRow, CheckinRow, HabitDependencyRow, WellnessLogRow, SkipReasonRow, SkillProgressRow, TriggerRuleRow } from '../db/types';

const safeHandle = (channel: string, handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any) => {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
};

export const broadcastDataChanged = () => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      try {
        win.webContents.send('data:changed');
      } catch {}
    }
  });
};

function getNotificationIconPath(): string | undefined {
  const isWin = process.platform === 'win32';
  const candidates = isWin
    ? [
        path.join(__dirname, '../build/icon.ico'),
        path.join(process.cwd(), 'build/icon.ico'),
        path.join(__dirname, '../assets/icon.ico'),
        path.join(process.cwd(), 'assets/icon.ico'),
        path.join(app.getAppPath(), 'assets/icon.ico'),
        path.join(process.resourcesPath, 'assets/icon.ico'),
        path.join(__dirname, '../assets/icon.png'),
        path.join(app.getAppPath(), 'assets/icon.png'),
        path.join(process.resourcesPath, 'assets/icon.png'),
        path.join(process.cwd(), 'assets/icon.png'),
        path.join(process.cwd(), 'public/favicon.ico'),
      ]
    : [
        path.join(__dirname, '../assets/icon.png'),
        path.join(app.getAppPath(), 'assets/icon.png'),
        path.join(process.resourcesPath, 'assets/icon.png'),
        path.join(process.cwd(), 'assets/icon.png'),
      ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  onSettingChange?: (key: string, value: any) => void
): void {
  // Window controls
  safeHandle('window:minimize', () => {
    mainWindow.minimize();
  });

  safeHandle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  });

  safeHandle('window:close', () => {
    mainWindow.close();
  });

  safeHandle('window:isMaximized', () => {
    return mainWindow.isMaximized();
  });

  // OS Level Handlers
  safeHandle('os:getLaunchOnStartup', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  safeHandle('os:setLaunchOnStartup', (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
    });
    return app.getLoginItemSettings().openAtLogin;
  });

  safeHandle('os:openDataFolder', async () => {
    const userDataPath = app.getPath('userData');
    await shell.openPath(userDataPath);
    return userDataPath;
  });

  safeHandle('os:openExternal', async (_event, url: string) => {
    if (url && (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  safeHandle('os:setProgressBar', (_event, progress: number, options?: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (typeof progress !== 'number' || progress <= 0 || progress >= 1 || isNaN(progress)) {
        mainWindow.setProgressBar(-1);
      } else {
        mainWindow.setProgressBar(progress, options);
      }
    }
  });

  safeHandle('os:getVersion', () => {
    return app.getVersion();
  });

  // Habits
  safeHandle('habits:getAll', (_event, includeArchived?: boolean, userId?: string) => {
    return db.getHabits(includeArchived, userId);
  });

  safeHandle('habits:create', (_event, habit: any) => {
    db.createHabit(habit);
    broadcastDataChanged();
    return db.getHabits(false, habit.user_id);
  });

  safeHandle('habits:update', (_event, habit: any) => {
    db.updateHabit(habit);
    broadcastDataChanged();
    return db.getHabits(false, habit.user_id);
  });

  safeHandle('habits:delete', (_event, id: string, userId?: string) => {
    db.deleteHabit(id);
    broadcastDataChanged();
    return db.getHabits(false, userId);
  });

  safeHandle('habits:reorder', (_event, ids: string[], userId?: string) => {
    db.reorderHabits(ids);
    broadcastDataChanged();
    return db.getHabits(false, userId);
  });

  // Checkins
  safeHandle('checkins:getMonth', (_event, yearMonth: string) => {
    return db.getCheckinsForMonth(yearMonth);
  });

  safeHandle('checkins:getAll', (_event, userId?: string) => {
    return db.getAllCheckins(userId);
  });

  safeHandle('checkins:toggle', (_event, habitId: string, date: string, completed: boolean, note?: string, value?: number, mood?: string) => {
    const res = db.toggleCheckin(habitId, date, completed, note, value, mood);
    broadcastDataChanged();
    return res;
  });

  // Settings
  safeHandle('settings:getAll', () => {
    return db.getSettings();
  });

  safeHandle('settings:save', (_event, key: string, value: string) => {
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
  safeHandle('data:export', () => {
    return db.exportData();
  });

  safeHandle('data:import', (_event, data: { habits: HabitRow[]; checkins: CheckinRow[]; settings?: Record<string, string> }) => {
    db.importData(data);
    return {
      habits: db.getHabits(),
      checkins: db.getAllCheckins(),
      settings: db.getSettings(),
    };
  });

  safeHandle('data:reset', () => {
    db.resetAllData();
    try {
      const shieldCfg = path.join(app.getPath('userData'), 'focus-shield-config.json');
      const shieldStats = path.join(app.getPath('userData'), 'focus-shield-stats.json');
      if (fs.existsSync(shieldCfg)) fs.unlinkSync(shieldCfg);
      if (fs.existsSync(shieldStats)) fs.unlinkSync(shieldStats);
    } catch {}
    broadcastDataChanged();
    return {
      habits: [],
      checkins: [],
      settings: {},
    };
  });

  // Permanently uninstall app and wipe all user data, database, logs, and files
  safeHandle('app:uninstall', async () => {
    try {
      // 1. Close active SQLite database
      db.closeDatabase();

      // 2. Clear browser session data
      try {
        const { session } = await import('electron');
        if (session.defaultSession) {
          await session.defaultSession.clearStorageData();
          await session.defaultSession.clearCache();
        }
      } catch (e) {
        console.warn('Failed to clear session storage during uninstall:', e);
      }

      // 3. Wipe all user data in app.getPath('userData')
      const userDataDir = app.getPath('userData');
      if (fs.existsSync(userDataDir)) {
        try {
          fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch (err) {
          console.warn('Could not remove entire userDataDir directly, wiping files individually:', err);
          try {
            const files = fs.readdirSync(userDataDir);
            for (const f of files) {
              const full = path.join(userDataDir, f);
              try {
                fs.rmSync(full, { recursive: true, force: true });
              } catch {}
            }
          } catch {}
        }
      }

      // 4. Wipe logs directory
      try {
        const logsDir = app.getPath('logs');
        if (fs.existsSync(logsDir)) {
          fs.rmSync(logsDir, { recursive: true, force: true });
        }
      } catch {}

      // 5. Look for the official Windows uninstaller executable
      const exeDir = path.dirname(app.getPath('exe'));
      const uninstallerCandidates = [
        path.join(exeDir, 'Uninstall Zion.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'zion', 'Uninstall Zion.exe'),
        path.join(app.getAppPath(), '..', '..', 'Uninstall Zion.exe'),
      ];

      let uninstallerPath: string | null = null;
      for (const p of uninstallerCandidates) {
        if (fs.existsSync(p)) {
          uninstallerPath = p;
          break;
        }
      }

      if (uninstallerPath) {
        // Spawn the uninstaller detached so it continues cleanly after Zion terminates
        const child_process = await import('child_process');
        child_process.spawn(uninstallerPath, [], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      }

      // 6. Permanently exit the application
      setTimeout(() => {
        app.exit(0);
      }, 350);

      return true;
    } catch (err) {
      console.error('Uninstall execution error:', err);
      setTimeout(() => {
        app.exit(0);
      }, 500);
      return false;
    }
  });

  // Notification (OS level with app icon and window focus on click)
  safeHandle(
    'app:notify',
    (
      _event,
      title: string,
      body: string,
      options?: { silent?: boolean; urgency?: 'normal' | 'critical' | 'low'; sound?: boolean }
    ) => {
      if (!Notification.isSupported()) {
        return false;
      }
      try {
        const iconPath = getNotificationIconPath();
        const notificationOptions: Electron.NotificationConstructorOptions = {
          title: title || 'Zion Habit Tracker',
          body: body || '',
          silent: options?.silent ?? false,
          urgency: options?.urgency ?? 'normal',
        };
        if (iconPath) {
          notificationOptions.icon = iconPath;
        }

        const n = new Notification(notificationOptions);

        n.on('click', () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            if (!mainWindow.isVisible()) {
              mainWindow.show();
            }
            mainWindow.setAlwaysOnTop(true);
            mainWindow.focus();
            mainWindow.setAlwaysOnTop(false);
            mainWindow.flashFrame(true);
          }
        });

        n.show();
        return true;
      } catch (err) {
        console.error('[Notification] Failed to dispatch OS notification:', err);
        return false;
      }
    }
  );

  // Habit Dependencies
  safeHandle('dependencies:getAll', (_event, habitId?: string) => {
    return db.getHabitDependencies(habitId);
  });

  safeHandle('dependencies:getDependents', (_event, dependsOnId: string) => {
    return db.getHabitDependents(dependsOnId);
  });

  safeHandle('dependencies:create', (_event, dep: { habit_id: string; depends_on_id: string; type: 'prerequisite' | 'anti' }) => {
    db.createHabitDependency(dep);
    return db.getHabitDependencies(dep.habit_id);
  });

  safeHandle('dependencies:delete', (_event, habitId: string, dependsOnId: string) => {
    db.deleteHabitDependency(habitId, dependsOnId);
    return db.getHabitDependencies(habitId);
  });

  safeHandle('dependencies:deleteAll', (_event, habitId: string) => {
    db.deleteAllHabitDependencies(habitId);
    return db.getHabitDependencies(habitId);
  });

  // Wellness Logs
  safeHandle('wellness:get', (_event, date: string) => {
    return db.getWellnessLog(date);
  });

  safeHandle('wellness:getMonth', (_event, yearMonth: string) => {
    return db.getWellnessLogsForMonth(yearMonth);
  });

  safeHandle('wellness:getAll', () => {
    return db.getAllWellnessLogs();
  });

  safeHandle('wellness:upsert', (_event, log: { id: string; date: string; energy: number; mood: number; note?: string }) => {
    db.upsertWellnessLog(log);
    return db.getWellnessLog(log.date);
  });

  safeHandle('wellness:delete', (_event, date: string) => {
    db.deleteWellnessLog(date);
    return db.getAllWellnessLogs();
  });

  // Skip Reasons
  safeHandle('skipReasons:get', (_event, habitId: string, date: string) => {
    return db.getSkipReason(habitId, date);
  });

  safeHandle('skipReasons:getForHabit', (_event, habitId: string) => {
    return db.getSkipReasonsForHabit(habitId);
  });

  safeHandle('skipReasons:getForDate', (_event, date: string) => {
    return db.getSkipReasonsForDate(date);
  });

  safeHandle('skipReasons:upsert', (_event, reason: { id: string; habit_id: string; date: string; reason: 'forgot' | 'busy' | 'sick' | 'resistance' | 'other'; note?: string }) => {
    db.upsertSkipReason(reason);
    return db.getSkipReason(reason.habit_id, reason.date);
  });

  safeHandle('skipReasons:delete', (_event, id: string) => {
    db.deleteSkipReason(id);
    return true;
  });

  // Skill Progress
  safeHandle('skills:getAll', (_event, userId: string) => {
    return db.getSkillProgress(userId);
  });

  safeHandle('skills:get', (_event, userId: string, skillId: string) => {
    return db.getSkillLevel(userId, skillId);
  });

  safeHandle('skills:upsert', (_event, progress: { user_id: string; skill_id: string; level: number; unlocked_at?: string | null }) => {
    db.upsertSkillProgress(progress);
    return db.getSkillLevel(progress.user_id, progress.skill_id);
  });

  // Trigger Rules
  safeHandle('triggers:getAll', (_event, habitId?: string) => {
    return db.getTriggerRules(habitId);
  });

  safeHandle('triggers:create', (_event, rule: { id: string; habit_id: string; type: string; config: string; enabled?: number }) => {
    db.createTriggerRule(rule);
    return db.getTriggerRules(rule.habit_id);
  });

  safeHandle('triggers:update', (_event, id: string, updates: { type?: string; config?: string; enabled?: number }) => {
    db.updateTriggerRule(id, updates);
    return db.getTriggerRules();
  });

  safeHandle('triggers:delete', (_event, id: string) => {
    db.deleteTriggerRule(id);
    return db.getTriggerRules();
  });

  // Timetable Schedules & Executions
  safeHandle('timetable:getSchedules', () => {
    return db.getTimetableSchedules();
  });

  safeHandle('timetable:saveSchedule', (_event, schedule: any) => {
    db.saveTimetableSchedule(schedule);
    broadcastDataChanged();
    return db.getTimetableSchedules();
  });

  safeHandle('timetable:deleteSchedule', (_event, id: string) => {
    db.deleteTimetableSchedule(id);
    broadcastDataChanged();
    return db.getTimetableSchedules();
  });

  safeHandle('timetable:getExecutions', (_event, date: string) => {
    return db.getTimetableExecutions(date);
  });

  safeHandle('timetable:toggleExecution', (_event, date: string, blockId: string, completed: boolean) => {
    db.toggleTimetableExecution(date, blockId, completed);
    broadcastDataChanged();
    return db.getTimetableExecutions(date);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Identity Proofs (Photo & Audio Journals)
  // ─────────────────────────────────────────────────────────────────────────
  safeHandle('proofs:get', (_event, habitId?: string) => {
    return db.getHabitProofs(habitId);
  });

  safeHandle('proofs:add', (_event, proof: any) => {
    db.addHabitProof(proof);
    broadcastDataChanged();
    return db.getHabitProofs(proof.habit_id);
  });

  safeHandle('proofs:delete', (_event, id: string, habitId?: string) => {
    db.deleteHabitProof(id);
    broadcastDataChanged();
    return db.getHabitProofs(habitId);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Habit Stacking & Synergy Graph
  // ─────────────────────────────────────────────────────────────────────────
  safeHandle('stacks:get', () => {
    return db.getHabitStacks();
  });

  safeHandle('stacks:save', (_event, stack: any) => {
    db.saveHabitStack(stack);
    return db.getHabitStacks();
  });

  safeHandle('stacks:delete', (_event, id: string) => {
    db.deleteHabitStack(id);
    return db.getHabitStacks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // P2P Duels & Accountability Contracts
  // ─────────────────────────────────────────────────────────────────────────
  safeHandle('duels:get', () => {
    return db.getP2PDuels();
  });

  safeHandle('duels:save', (_event, duel: any) => {
    db.saveP2PDuel(duel);
    return db.getP2PDuels();
  });

  safeHandle('duels:delete', (_event, id: string) => {
    db.deleteP2PDuel(id);
    return db.getP2PDuels();
  });
}
