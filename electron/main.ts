import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  Notification,
  nativeTheme,
  screen,
  ipcMain,
  globalShortcut,
  powerMonitor,
  shell,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, getSettings } from './db';
import { registerIpcHandlers } from './ipc/handlers';
import { focusShieldManager } from './focusShield';
import { setupAutoUpdater, checkUpdate, getLastStatus, quitAndInstall } from './updater';

// Windows Taskbar & App User Model ID
app.name = 'Zion';
if (process.platform === 'win32') {
  app.setAppUserModelId('com.satyanarayana.zion');
}

// Lightweight footprint, memory capping, and hardware rasterization switches
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,CanvasOopRasterization');

let mainWindow: BrowserWindow | null = null;
let timerWidgetWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let reminderInterval: NodeJS.Timeout | null = null;
let desktopTimerInterval: NodeJS.Timeout | null = null;
let isQuitting = false;

// Single-Instance Lock: Ensures only one instance runs and brings window to front when opened again
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showAndFocusMainWindow();
  });
}

function showAndFocusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.setAlwaysOnTop(true);
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(false);
}

function sendToMainWindow(channel: string, ...args: any[]): void {
  showAndFocusMainWindow();
  if (!mainWindow) return;
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send(channel, ...args);
    });
  } else {
    mainWindow.webContents.send(channel, ...args);
  }
}

interface DesktopTimerPayload {
  habitId: string;
  habitName: string;
  habitColor: string;
  habitEmoji?: string;
  targetSeconds: number;
  accumulatedSeconds: number;
  startedAtMs: number | null;
  mode: 'countdown' | 'stopwatch';
  soundscape: string;
  notifiedTargetReached: boolean;
}

let activeTimerState: DesktopTimerPayload | null = null;

const safeHandle = (channel: string, handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any) => {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
};

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
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
  const widgetWidth = 320;
  const widgetHeight = 48;

  const iconPath = getAppIconPath();
  const appIcon = getAppNativeImage();

  timerWidgetWindow = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    minWidth: 240,
    minHeight: 46,
    maxWidth: 440,
    maxHeight: 520,
    x: x + Math.round((width - widgetWidth) / 2),
    y: y + 16,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    hasShadow: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });

  timerWidgetWindow.setIcon(iconPath);
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

function toggleTimerWidgetWindow(): void {
  if (timerWidgetWindow && !timerWidgetWindow.isDestroyed() && timerWidgetWindow.isVisible()) {
    destroyTimerWidgetWindow();
  } else {
    createTimerWidgetWindow();
  }
}

interface TrayStatusPayload {
  activeBlockTitle?: string;
  activeBlockTimeRange?: string;
  activeBlockRemaining?: string;
  activeTimerHabit?: string;
  activeTimerRemaining?: string;
  habitsCompleted?: number;
  habitsTotal?: number;
}

let latestTrayStatus: TrayStatusPayload = {};

function getTrayMenuIcon(name: string): Electron.NativeImage | undefined {
  const candidates = [
    path.join(__dirname, `../assets/tray-icons/${name}.png`),
    path.join(app.getAppPath(), `assets/tray-icons/${name}.png`),
    path.join(process.resourcesPath, `assets/tray-icons/${name}.png`),
    path.join(__dirname, `assets/tray-icons/${name}.png`),
    path.join(process.cwd(), `assets/tray-icons/${name}.png`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const img = nativeImage.createFromPath(c);
      if (!img.isEmpty()) {
        return img.resize({ width: 16, height: 16 });
      }
    }
  }
  return undefined;
}

function updateTrayMenu(): void {
  if (!tray) return;

  const items: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Open Zion Studio',
      click: () => {
        showAndFocusMainWindow();
      },
    },
    { type: 'separator' },
  ];

  // Active Timer or Active Routine Block in Tray Menu
  if (latestTrayStatus.activeTimerHabit) {
    items.push({
      label: `Focus: ${latestTrayStatus.activeTimerHabit} (${latestTrayStatus.activeTimerRemaining || 'Running'})`,
      enabled: false,
    });
    items.push({
      label: 'Toggle Focus Timer (Ctrl+Alt+F)',
      click: () => {
        mainWindow?.webContents.send('timer:remote-action', 'toggle-play');
        timerWidgetWindow?.webContents.send('timer:remote-action', 'toggle-play');
      },
    });
    items.push({
      label: 'Mark Focus Completed',
      click: () => {
        mainWindow?.webContents.send('timer:remote-action', 'finish');
      },
    });
    items.push({ type: 'separator' });
  } else if (latestTrayStatus.activeBlockTitle) {
    items.push({
      label: `Active: ${latestTrayStatus.activeBlockTitle}`,
      enabled: false,
    });
    if (latestTrayStatus.activeBlockTimeRange) {
      items.push({
        label: `   ${latestTrayStatus.activeBlockTimeRange} (${latestTrayStatus.activeBlockRemaining || 'In progress'})`,
        enabled: false,
      });
    }
    items.push({
      label: 'Start Focus for Routine',
      click: () => {
        sendToMainWindow('timetable:start-active-focus');
      },
    });
    items.push({
      label: 'Check Off Active Block',
      click: () => {
        sendToMainWindow('timetable:toggle-active-block');
      },
    });
    items.push({ type: 'separator' });
  }

  // Habits Progress Summary
  if (latestTrayStatus.habitsTotal !== undefined && latestTrayStatus.habitsTotal > 0) {
    const pct = Math.round(((latestTrayStatus.habitsCompleted || 0) / latestTrayStatus.habitsTotal) * 100);
    items.push({
      label: `Today: ${latestTrayStatus.habitsCompleted || 0}/${latestTrayStatus.habitsTotal} Habits (${pct}%)`,
      enabled: false,
    });
    items.push({ type: 'separator' });
  }

  // Quick navigation with clean labels & keyboard accelerators
  items.push({
    label: 'Open Today Studio (Ctrl+1)',
    click: () => {
      sendToMainWindow('nav:go-to', 'dashboard');
    },
  });

  items.push({
    label: 'Open Habits Matrix (Ctrl+2)',
    click: () => {
      sendToMainWindow('nav:go-to', 'habits');
    },
  });

  items.push({
    label: 'Open Timetable (Ctrl+3)',
    click: () => {
      sendToMainWindow('nav:go-to', 'timetable');
    },
  });

  items.push({
    label: 'Toggle Dynamic HUD Island (Ctrl+Alt+Space)',
    click: () => {
      toggleTimerWidgetWindow();
    },
  });

  items.push({
    label: 'Open Zen Focus Studio',
    click: () => {
      sendToMainWindow('zen:open');
    },
  });

  items.push({ type: 'separator' });
  items.push({
    label: 'Quit Zion',
    click: () => {
      isQuitting = true;
      app.quit();
    },
  });

  const contextMenu = Menu.buildFromTemplate(items);
  tray.setContextMenu(contextMenu);

  // Set real-time tooltip (clean typography, no raw emojis)
  let tooltip = 'Zion Studio · Habit & Schedule Tracker';
  if (latestTrayStatus.activeTimerHabit) {
    tooltip = `${latestTrayStatus.activeTimerRemaining || 'Focusing'} · ${latestTrayStatus.activeTimerHabit} — Zion`;
  } else if (latestTrayStatus.activeBlockTitle) {
    tooltip = `${latestTrayStatus.activeBlockTitle} (${latestTrayStatus.activeBlockRemaining || 'Scheduled'}) — Zion`;
  } else if (latestTrayStatus.habitsTotal !== undefined) {
    tooltip = `Zion · ${latestTrayStatus.habitsCompleted || 0}/${latestTrayStatus.habitsTotal} Habits Done`;
  }
  tray.setToolTip(tooltip);
}

const isDev = process.env.NODE_ENV === 'development';

function getAppIconPath(): string {
  const isWin = process.platform === 'win32';
  const candidates = isWin
    ? [
        path.join(__dirname, '../build/icon.ico'),
        path.join(process.cwd(), 'build/icon.ico'),
        path.join(__dirname, '../assets/icon.ico'),
        path.join(process.cwd(), 'assets/icon.ico'),
        path.join(app.getAppPath(), 'assets/icon.ico'),
        path.join(process.resourcesPath, 'assets/icon.ico'),
        path.join(__dirname, '../build/icon.png'),
        path.join(__dirname, '../assets/icon.png'),
        path.join(process.cwd(), 'assets/icon.png'),
        path.join(app.getAppPath(), 'assets/icon.png'),
      ]
    : [
        path.join(__dirname, '../build/icon.png'),
        path.join(__dirname, '../assets/icon.png'),
        path.join(process.cwd(), 'assets/icon.png'),
        path.join(app.getAppPath(), 'assets/icon.png'),
        path.join(process.resourcesPath, 'assets/icon.png'),
        path.join(__dirname, '../build/icon.ico'),
        path.join(__dirname, '../assets/icon.ico'),
        path.join(app.getAppPath(), 'assets/icon.ico'),
      ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function getAppNativeImage(): Electron.NativeImage {
  const iconPath = getAppIconPath();
  return nativeImage.createFromPath(iconPath);
}


const FALLBACK_TRAY_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGqSURBVDhPlZNLSwJhFIaPIIiIoogliBtX7lQUBHEhiqvCjavJQNzZylBxUbtCocuMZKuyqXaCv6AU/CMVFHRZdfkHb5yvnKZP6TLwwvCe8z58c745RB/PIhEdEdEtET3/Iu45JiL/Z5YWiOiKiPBPXU8hTJOLf9UJAx7kgsfjwYqioNVqoV6vI5PJyMGpnhjwajaz2SxO+n1UKhUkk0nkcjlsb21hd2cHFotFBrwxgAcjjFgsBl3X4Xa75Uak02k0m02MRiPE4/Gp//INoKkqQqHQTNhqteJU1zGZTFAsFmG322cBwWAQnU5HFAqFAobDoQEYj8foHRwglUohHA6b4V+AWDSKzY0NUfB6vbi8uBCzOOz1MBgMhL9WrWJ5aWk+wO/3o6tpRpEH9nB/L8SfwF6320UgEJgPYLXbbeTzeaMhkUggEomI99VSSVyrKWwAjGv0+Xw4PzuDoihwuVzCczqdWK/VxOlsNpsMENf4aDY50Gg0oGka9vf2oKoqyuWyHJxK/Ej9OQUhh8Mx40nSGcCbyIshF3/TjXkj+YWX6u5zMD+Je/jUIvwOFNM8QC+n1I8AAAAASUVORK5CYII=';

function getTrayIconPath(): string {
  const isWin = process.platform === 'win32';
  const candidates = isWin
    ? [
        path.join(process.resourcesPath, 'assets/icon.ico'),
        path.join(process.resourcesPath, 'app.asar.unpacked/assets/icon.ico'),
        path.join(__dirname, '../assets/icon.ico'),
        path.join(app.getAppPath(), 'assets/icon.ico'),
        path.join(__dirname, '../assets/icon-16.png'),
        path.join(app.getAppPath(), 'assets/icon-16.png'),
        path.join(__dirname, '../assets/icon-32.png'),
        path.join(app.getAppPath(), 'assets/icon-32.png'),
      ]
    : [
        path.join(__dirname, '../assets/icon-32.png'),
        path.join(app.getAppPath(), 'assets/icon-32.png'),
        path.join(process.resourcesPath, 'assets/icon-32.png'),
        path.join(__dirname, '../assets/icon.png'),
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

function registerGlobalShortcuts(): void {
  try {
    globalShortcut.unregisterAll();

    // Ctrl+Alt+Space or Ctrl+Alt+T: Toggle Floating Dynamic Island HUD
    globalShortcut.register('CommandOrControl+Alt+Space', () => {
      toggleTimerWidgetWindow();
    });
    globalShortcut.register('CommandOrControl+Alt+T', () => {
      toggleTimerWidgetWindow();
    });

    // Ctrl+Alt+F: Toggle Focus Timer Play/Pause
    globalShortcut.register('CommandOrControl+Alt+F', () => {
      mainWindow?.webContents.send('timer:remote-action', 'toggle-play');
      timerWidgetWindow?.webContents.send('timer:remote-action', 'toggle-play');
    });

    // Ctrl+Alt+Z: Toggle Zion Window Visibility
    globalShortcut.register('CommandOrControl+Alt+Z', () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow();
        return;
      }
      if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
        mainWindow.hide();
        createTray();
      } else {
        showAndFocusMainWindow();
      }
    });
  } catch (err) {
    console.error('Failed to register global shortcuts:', err);
  }
}

function setupPowerMonitor(): void {
  try {
    powerMonitor.on('suspend', () => {
      focusShieldManager.setSuspended(true);
      mainWindow?.webContents.send('os:system-suspended');
      timerWidgetWindow?.webContents.send('os:system-suspended');
    });

    powerMonitor.on('lock-screen', () => {
      focusShieldManager.setSuspended(true);
      mainWindow?.webContents.send('os:system-suspended');
      timerWidgetWindow?.webContents.send('os:system-suspended');
    });

    powerMonitor.on('resume', () => {
      focusShieldManager.setSuspended(false);
      mainWindow?.webContents.send('os:system-resumed');
      timerWidgetWindow?.webContents.send('os:system-resumed');
    });

    powerMonitor.on('unlock-screen', () => {
      focusShieldManager.setSuspended(false);
      mainWindow?.webContents.send('os:system-resumed');
      timerWidgetWindow?.webContents.send('os:system-resumed');
    });
  } catch (err) {
    console.error('Failed to setup powerMonitor:', err);
  }
}

function createTray(): void {
  if (tray) return;

  try {
    const trayIconPath = getTrayIconPath();
    let icon = nativeImage.createFromPath(trayIconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createFromDataURL(FALLBACK_TRAY_ICON_DATA_URL);
    }

    tray = new Tray(icon);
    updateTrayMenu();

    tray.on('click', () => {
      showAndFocusMainWindow();
    });

    tray.on('double-click', () => {
      showAndFocusMainWindow();
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
  const iconPath = getAppIconPath();
  const appIcon = getAppNativeImage();

  mainWindow = new BrowserWindow({
    title: 'Zion',
    width: width || 1320,
    height: height || 880,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    thickFrame: true,
    backgroundColor: '#09090b',
    titleBarStyle: 'hidden',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: true,
    },
    show: false,
  });

  mainWindow.setIcon(iconPath);
  mainWindow.setProgressBar(-1);

  // Intercept external links: prevent blank child windows and open directly in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return { action: 'deny' };
    }
    if (url.startsWith('https:') || url.startsWith('http:') || url.startsWith('mailto:')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      if (parsed.origin !== 'http://localhost:5173' && parsed.protocol !== 'file:') {
        event.preventDefault();
        void shell.openExternal(navigationUrl);
      }
    } catch {}
  });

  registerIpcHandlers(mainWindow, (key: string, value: any) => {
    if (key === 'minimize_to_tray') {
      if (value) {
        createTray();
      } else {
        destroyTray();
      }
    }
    if (key === 'reminder_time') {
      cachedReminderTime = typeof value === 'string' ? value : null;
    }
  });

  // Initialize Focus Shield App & Distraction Firewall
  focusShieldManager.init(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.on('minimize', () => {
    if (global.gc) {
      try { global.gc(); } catch {}
    }
  });

  mainWindow.on('hide', () => {
    if (global.gc) {
      try { global.gc(); } catch {}
    }
  });

  mainWindow.on('show', () => {
    // Preserve floating desktop widget if active
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

    if ((minimizeToTray || hasActiveTimer || tray) && !isQuitting) {
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

let cachedReminderTime: string | null = null;

function refreshCachedReminderTime(): void {
  try {
    const settings = getSettings();
    let reminderTime = settings['reminder_time'];
    if (reminderTime) {
      try {
        reminderTime = JSON.parse(reminderTime);
      } catch {}
      if (typeof reminderTime === 'string') {
        cachedReminderTime = reminderTime;
        return;
      }
    }
  } catch {}
  cachedReminderTime = null;
}

function setupReminderCheck(): void {
  let lastNotifiedDate = '';
  refreshCachedReminderTime();

  reminderInterval = setInterval(() => {
    try {
      if (!cachedReminderTime) return;

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;
      const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (currentTimeStr === cachedReminderTime && lastNotifiedDate !== todayDateStr) {
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

function initAutoUpdater(): void {
  setupAutoUpdater(() => mainWindow);

  safeHandle('updater:check', (_event, manual = true) => {
    return checkUpdate(manual, mainWindow);
  });

  safeHandle('updater:get-status', () => {
    return getLastStatus();
  });

  safeHandle('updater:quit-and-install', () => {
    quitAndInstall();
  });

  // Backwards compatibility with previous handlers
  safeHandle('app:checkForUpdates', (_event) => {
    return checkUpdate(true, mainWindow);
  });

  safeHandle('app:installUpdate', () => {
    quitAndInstall();
  });
}

function setupDesktopTimerService(): void {
  activeTimerState = loadPersistedTimerState();

  function startDesktopTimerLoop(): void {
    if (desktopTimerInterval) return;
    desktopTimerInterval = setInterval(() => {
      if (!activeTimerState) {
        stopDesktopTimerLoop();
        return;
      }
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
        const stateLabel = activeTimerState.startedAtMs ? 'Focusing' : 'Paused';
        tray.setToolTip(
          `${stateLabel} · ${displayStr} · ${activeTimerState.habitName} — Zion`
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

  function stopDesktopTimerLoop(): void {
    if (desktopTimerInterval) {
      clearInterval(desktopTimerInterval);
      desktopTimerInterval = null;
    }
  }

  if (activeTimerState) {
    startDesktopTimerLoop();
  }

  safeHandle('timer:get', () => {
    return activeTimerState;
  });

  safeHandle('timer:set-size', (_event, width: number, height: number) => {
    if (timerWidgetWindow && !timerWidgetWindow.isDestroyed()) {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenW, x: screenX } = primaryDisplay.workArea;
      const w = Math.max(240, Math.min(460, Math.round(width)));
      const h = Math.max(46, Math.min(520, Math.round(height)));
      const currentBounds = timerWidgetWindow.getBounds();
      // If expanding or collapsing near top center, keep centered horizontally
      const isNearTopCenter = Math.abs((currentBounds.x + currentBounds.width / 2) - (screenX + screenW / 2)) < 80;
      const newX = isNearTopCenter ? screenX + Math.round((screenW - w) / 2) : currentBounds.x;
      const newY = currentBounds.y;

      timerWidgetWindow.setBounds({
        x: newX,
        y: newY,
        width: w,
        height: h,
      });
    }
  });

  safeHandle('timer:get-size', () => {
    if (timerWidgetWindow && !timerWidgetWindow.isDestroyed()) {
      const [width, height] = timerWidgetWindow.getSize();
      return { width, height };
    }
    return { width: 220, height: 220 };
  });

  safeHandle('timer:sync', (_event, timer: DesktopTimerPayload | null) => {
    activeTimerState = timer;
    savePersistedTimerState(timer);

    if (timer) {
      startDesktopTimerLoop();
    } else {
      stopDesktopTimerLoop();
    }

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

  safeHandle('timer:action', (_event, action: 'pause' | 'resume' | 'finish' | 'discard' | 'open-main' | 'add-5m') => {
    if (action === 'open-main') {
      destroyTimerWidgetWindow();
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      return;
    }

    if (action === 'add-5m') {
      if (activeTimerState) {
        activeTimerState = {
          ...activeTimerState,
          targetSeconds: activeTimerState.targetSeconds + 300,
          notifiedTargetReached: false,
        };
        savePersistedTimerState(activeTimerState);
        if (timerWidgetWindow && !timerWidgetWindow.isDestroyed()) {
          timerWidgetWindow.webContents.send('timer:state-updated', activeTimerState);
        }
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer:remote-action', action);
    }

    if (action === 'finish' || action === 'discard') {
      stopDesktopTimerLoop();
      destroyTimerWidgetWindow();
    }
  });

  // OS Level Real-Time Handlers
  safeHandle('os:updateTray', (_event, status: any) => {
    latestTrayStatus = { ...latestTrayStatus, ...status };
    updateTrayMenu();
  });

  safeHandle('os:flashFrame', (_event, flag: boolean = true) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.flashFrame(flag);
    }
  });

  safeHandle('os:toggleTimerWidget', () => {
    toggleTimerWidgetWindow();
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  if (desktopTimerInterval) clearInterval(desktopTimerInterval);
  destroyTimerWidgetWindow();
  focusShieldManager.disableHostsWebShield();
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.whenReady().then(() => {
  initDatabase();
  syncNativeTheme();
  createWindow();
  createTray();
  registerGlobalShortcuts();
  setupPowerMonitor();
  setupReminderCheck();
  setupDesktopTimerService();
  initAutoUpdater();

  app.on('activate', () => {
    showAndFocusMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (reminderInterval) clearInterval(reminderInterval);
  if (process.platform !== 'darwin' && !tray) {
    app.quit();
  }
});
