import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, nativeTheme, screen, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, getSettings } from './db';
import { registerIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;
let timerWidgetWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let reminderInterval: NodeJS.Timeout | null = null;
let desktopTimerInterval: NodeJS.Timeout | null = null;
let isQuitting = false;

interface DesktopTimerPayload {
  habitId: string;
  habitName: string;
  habitColor: string;
  targetSeconds: number;
  accumulatedSeconds: number;
  startedAtMs: number | null;
  mode: 'countdown' | 'stopwatch';
  soundscape: string;
  notifiedTargetReached: boolean;
}

let activeTimerState: DesktopTimerPayload | null = null;

function getTimerStatePath(): string {
  return path.join(app.getPath('userData'), 'active-timer.json');
}

function loadPersistedTimerState(): DesktopTimerPayload | null {
  try {
    const p = getTimerStatePath();
    if (fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (parsed && parsed.habitId) return parsed;
    }
  } catch {}
  return null;
}

function savePersistedTimerState(timer: DesktopTimerPayload | null): void {
  try {
    const p = getTimerStatePath();
    if (timer) {
      fs.writeFileSync(p, JSON.stringify(timer), 'utf-8');
    } else if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  } catch {}
}

function formatHmsDesktop(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function createTimerWidgetWindow(): void {
  if (timerWidgetWindow && !timerWidgetWindow.isDestroyed()) {
    timerWidgetWindow.show();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height, x, y } = primaryDisplay.workArea;
  const widgetWidth = 330;
  const widgetHeight = 108;

  timerWidgetWindow = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: x + width - widgetWidth - 20,
    y: y + height - widgetHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: true,
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  timerWidgetWindow.setAlwaysOnTop(true, 'floating');

  if (isDev) {
    timerWidgetWindow.loadURL('http://localhost:5173/?widget=timer');
  } else {
    timerWidgetWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { widget: 'timer' },
    });
  }

  timerWidgetWindow.on('closed', () => {
    timerWidgetWindow = null;
  });
}

function destroyTimerWidgetWindow(): void {
  if (timerWidgetWindow && !timerWidgetWindow.isDestroyed()) {
    timerWidgetWindow.close();
  }
  timerWidgetWindow = null;
}

const isDev = process.env.NODE_ENV === 'development';

function getAppIconPath(): string {
  const candidates = [
    path.join(__dirname, '../assets/icon.png'),
    path.join(app.getAppPath(), 'assets/icon.png'),
    path.join(process.resourcesPath, 'assets/icon.png'),
    path.join(__dirname, '../assets/icon.ico'),
    path.join(app.getAppPath(), 'assets/icon.ico'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function getTrayIconPath(): string {
  const candidates = [
    path.join(__dirname, '../assets/icon-32.png'),
    path.join(app.getAppPath(), 'assets/icon-32.png'),
    path.join(process.resourcesPath, 'assets/icon-32.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return getAppIconPath();
}

function syncNativeTheme(): void {
  try {
    const settings = getSettings();
    let theme = settings['theme'];
    try {
      theme = JSON.parse(theme);
    } catch {}
    nativeTheme.themeSource = theme === 'light' ? 'light' : 'dark';
  } catch {
    nativeTheme.themeSource = 'dark';
  }
}

function createTray(): void {
  if (tray || !mainWindow) return;

  try {
    const trayIconPath = getTrayIconPath();
    const icon = nativeImage.createFromPath(trayIconPath);

    tray = new Tray(icon);
    tray.setToolTip('Zion Studio');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Zion',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    tray.on('double-click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error('Failed to initialize system tray:', err);
  }
}

function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    title: 'Zion',
    width: width || 1320,
    height: height || 880,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    backgroundColor: '#09090b',
    titleBarStyle: 'hidden',
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  registerIpcHandlers(mainWindow, (key: string, value: any) => {
    if (key === 'minimize_to_tray') {
      if (value) {
        createTray();
      } else {
        destroyTray();
      }
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.on('show', () => {
    destroyTimerWidgetWindow();
  });

  // Handle minimize to tray or floating desktop widget when closed
  mainWindow.on('close', (event) => {
    const settings = getSettings();
    let minimizeToTray = false;
    try {
      const val = settings['minimize_to_tray'];
      minimizeToTray = val ? JSON.parse(val) : false;
    } catch {}

    const hasActiveTimer = Boolean(activeTimerState);

    if ((minimizeToTray || hasActiveTimer) && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      createTray();
      if (hasActiveTimer) {
        createTimerWidgetWindow();
      }
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check if tray and OS theme should already be applied on startup
  try {
    const settings = getSettings();
    const val = settings['minimize_to_tray'];
    if (val && JSON.parse(val)) {
      createTray();
    }
    const savedTheme = settings['theme'];
    if (savedTheme) {
      const parsedTheme = JSON.parse(savedTheme);
      nativeTheme.themeSource = parsedTheme === 'light' ? 'light' : 'dark';
    }
  } catch {}
}

function setupReminderCheck(): void {
  let lastNotifiedDate = '';

  reminderInterval = setInterval(() => {
    try {
      const settings = getSettings();
      let reminderTime = settings['reminder_time'];
      if (!reminderTime) return;

      try {
        reminderTime = JSON.parse(reminderTime);
      } catch {}

      if (!reminderTime || typeof reminderTime !== 'string') return;

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;
      const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (currentTimeStr === reminderTime && lastNotifiedDate !== todayDateStr) {
        lastNotifiedDate = todayDateStr;

        if (Notification.isSupported()) {
          const notification = new Notification({
            title: 'Zion Reminder',
            body: "Time to check off today's habits in Zion! Keep your consistency and streak burning.",
            icon: getAppIconPath(),
            actions: [{ type: 'button', text: 'Stop' }],
          });
          notification.on('action', () => notification.close());
          notification.on('click', () => {
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.show();
              mainWindow.focus();
            }
          });
          notification.show();
        }

        mainWindow?.webContents.send('app:daily-reminder');
      }
    } catch (err) {
      console.error('Error during reminder check:', err);
    }
  }, 30000); // Check every 30 seconds
}

function setupAutoUpdater(): void {
  const { autoUpdater } = require('electron-updater');

  ipcMain.handle('app:checkForUpdates', async () => {
    if (isDev) return { status: 'dev' };
    try {
      await autoUpdater.checkForUpdatesAndNotify();
      return { status: 'checked' };
    } catch (err: any) {
      return { status: 'error', message: err?.message || 'Update check failed' };
    }
  });

  ipcMain.handle('app:installUpdate', () => {
    if (!isDev) {
      isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });

  if (isDev) return;
  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info: any) => {
      console.log('Update available:', info?.version);
      mainWindow?.webContents.send('app:update-available', info);
    });

    autoUpdater.on('update-downloaded', (info: any) => {
      console.log('Update downloaded:', info?.version);
      mainWindow?.webContents.send('app:update-downloaded', info);
      if (Notification.isSupported()) {
        const notif = new Notification({
          title: 'Zion Update Ready',
          body: `Version ${info?.version || ''} has been downloaded. Restart Zion to apply.`,
          icon: getAppIconPath(),
        });
        notif.show();
      }
    });

    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err: any) => {
        console.log('AutoUpdater check error:', err?.message || err);
      });
    }, 6000);
  } catch (err) {
    console.error('Failed to initialize autoUpdater:', err);
  }
}

function setupDesktopTimerService(): void {
  activeTimerState = loadPersistedTimerState();

  ipcMain.handle('timer:get', () => {
    return activeTimerState;
  });

  ipcMain.handle('timer:sync', (_event, timer: DesktopTimerPayload | null) => {
    activeTimerState = timer;
    savePersistedTimerState(timer);

    if (timerWidgetWindow && !timerWidgetWindow.isDestroyed()) {
      timerWidgetWindow.webContents.send('timer:state-updated', timer);
    }

    if (!timer) {
      destroyTimerWidgetWindow();
      if (tray) tray.setToolTip('Zion - Habit Tracker Studio');
    } else if (mainWindow && !mainWindow.isVisible()) {
      createTray();
      createTimerWidgetWindow();
    }
  });

  ipcMain.handle('timer:action', (_event, action: 'pause' | 'resume' | 'finish' | 'discard' | 'open-main') => {
    if (action === 'open-main') {
      destroyTimerWidgetWindow();
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      return;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer:remote-action', action);
    }

    if (action === 'finish' || action === 'discard') {
      destroyTimerWidgetWindow();
    }
  });

  desktopTimerInterval = setInterval(() => {
    if (!activeTimerState) return;
    const elapsed =
      activeTimerState.accumulatedSeconds +
      (activeTimerState.startedAtMs
        ? Math.max(0, Math.floor((Date.now() - activeTimerState.startedAtMs) / 1000))
        : 0);

    const rem = Math.max(0, activeTimerState.targetSeconds - elapsed);
    const displayStr =
      elapsed >= activeTimerState.targetSeconds
        ? formatHmsDesktop(elapsed)
        : formatHmsDesktop(rem);

    if (tray) {
      tray.setToolTip(
        `${activeTimerState.startedAtMs ? '⏱' : '⏸'} ${displayStr} · ${activeTimerState.habitName} — Zion`
      );
    }

    if (
      activeTimerState.mode === 'countdown' &&
      elapsed >= activeTimerState.targetSeconds &&
      !activeTimerState.notifiedTargetReached
    ) {
      activeTimerState = { ...activeTimerState, notifiedTargetReached: true };
      savePersistedTimerState(activeTimerState);
      if (Notification.isSupported()) {
        const notif = new Notification({
          title: `${activeTimerState.habitName} Target Reached!`,
          body: `You completed your ${Math.round(activeTimerState.targetSeconds / 60)}m focus goal.`,
          icon: getAppIconPath(),
        });
        notif.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        });
        notif.show();
      }
    }
  }, 1000);
}

app.on('before-quit', () => {
  isQuitting = true;
  if (desktopTimerInterval) clearInterval(desktopTimerInterval);
  destroyTimerWidgetWindow();
});

app.whenReady().then(() => {
  initDatabase();
  syncNativeTheme();
  createWindow();
  setupReminderCheck();
  setupDesktopTimerService();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (reminderInterval) clearInterval(reminderInterval);
  if (process.platform !== 'darwin' && !tray) {
    app.quit();
  }
});
