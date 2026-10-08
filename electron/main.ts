import { app, BrowserWindow, Tray, Menu, nativeImage, Notification, nativeTheme, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, getSettings } from './db';
import { registerIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let reminderInterval: NodeJS.Timeout | null = null;
let isQuitting = false;

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

  // Handle minimize to tray when closed
  mainWindow.on('close', (event) => {
    const settings = getSettings();
    let minimizeToTray = false;
    try {
      const val = settings['minimize_to_tray'];
      minimizeToTray = val ? JSON.parse(val) : false;
    } catch {}

    if (minimizeToTray && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      createTray();
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

  // Check if tray should already exist on startup
  try {
    const settings = getSettings();
    const val = settings['minimize_to_tray'];
    if (val && JSON.parse(val)) {
      createTray();
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
      const todayDateStr = now.toISOString().split('T')[0];

      if (currentTimeStr === reminderTime && lastNotifiedDate !== todayDateStr) {
        lastNotifiedDate = todayDateStr;

        if (Notification.isSupported()) {
          const notification = new Notification({
            title: 'Zion Reminder',
            body: "Time to check off today's habits in Zion! Keep your consistency and streak burning.",
            icon: getAppIconPath(),
          });
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

app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(() => {
  initDatabase();
  syncNativeTheme();
  createWindow();
  setupReminderCheck();

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
