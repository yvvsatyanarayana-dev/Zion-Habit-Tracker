import { autoUpdater } from 'electron-updater';
import { Notification, dialog, app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

export interface UpdaterStatus {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'dev-mode' | 'error';
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
  error?: string;
  message?: string;
}

let lastStatus: UpdaterStatus = {
  status: 'idle',
  version: app?.getVersion ? app.getVersion() : '1.1.2',
};

let isSilentBackgroundCheck = false;

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    lastStatus = { status: 'checking', version: app.getVersion() };
    if (!isSilentBackgroundCheck) {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:status', lastStatus);
      }
    }
  });

  autoUpdater.on('update-available', (info: any) => {
    lastStatus = {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    };
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', lastStatus);
    }
    if (Notification.isSupported()) {
      const iconPath = path.join(__dirname, '../assets/icon.png');
      new Notification({
        title: 'Zion Update Available',
        body: `Version ${info.version} is downloading in the background.`,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
      }).show();
    }
  });

  autoUpdater.on('download-progress', (progressObj: any) => {
    lastStatus = {
      status: 'downloading',
      percent: Math.round(progressObj.percent || 0),
      bytesPerSecond: progressObj.bytesPerSecond || 0,
      transferred: progressObj.transferred || 0,
      total: progressObj.total || 0,
      version: lastStatus.version,
    };
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', lastStatus);
    }
  });

  autoUpdater.on('update-not-available', (info: any) => {
    lastStatus = {
      status: 'not-available',
      version: info?.version || app.getVersion(),
    };
    if (!isSilentBackgroundCheck) {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:status', lastStatus);
      }
    }
  });

  autoUpdater.on('error', (err: any) => {
    let userFriendlyError = 'Could not check for updates.';
    const rawMsg = err?.message || '';
    if (rawMsg.includes('404') || rawMsg.includes('Cannot find latest')) {
      userFriendlyError = 'No new update releases published yet.';
    } else if (rawMsg.includes('net::ERR_') || rawMsg.includes('ENOTFOUND') || rawMsg.includes('ETIMEDOUT')) {
      userFriendlyError = 'Network connection unavailable.';
    }

    lastStatus = {
      status: 'error',
      error: userFriendlyError,
    };
    if (!isSilentBackgroundCheck) {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:status', lastStatus);
      }
    }
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    lastStatus = {
      status: 'downloaded',
      version: info.version,
      releaseNotes: info.releaseNotes,
    };
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', lastStatus);
    }

    const dialogOpts: Electron.MessageBoxOptions = {
      type: 'info',
      buttons: ['Restart and Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update Ready',
      message: `A new version of Zion (${info.version}) has been downloaded.`,
      detail: 'Restart the application now to apply updates.',
    };

    const dialogPromise = win && !win.isDestroyed()
      ? dialog.showMessageBox(win, dialogOpts)
      : dialog.showMessageBox(dialogOpts);

    dialogPromise.then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  // Check silently on startup after 8 seconds (production only)
  if (app.isPackaged) {
    setTimeout(() => {
      checkUpdate(false, getMainWindow());
    }, 8000);
  }
}

export function checkUpdate(manual = false, win: BrowserWindow | null = null): Promise<any> {
  isSilentBackgroundCheck = !manual;
  if (!app.isPackaged) {
    const devStatus: UpdaterStatus = {
      status: 'dev-mode',
      version: app.getVersion(),
      message: 'Running in development mode. Auto-updates connect to GitHub Releases in production builds.',
    };
    lastStatus = devStatus;
    if (win && !win.isDestroyed() && manual) {
      win.webContents.send('updater:status', devStatus);
      const devOpts: Electron.MessageBoxOptions = {
        type: 'info',
        title: 'Check for Updates',
        message: 'Zion is running in local development mode.',
        detail: `Version: ${app.getVersion()}\nAutomated releases are managed via GitHub Actions.`,
      };
      dialog.showMessageBox(win, devOpts);
    }
    return Promise.resolve(devStatus);
  }

  try {
    return autoUpdater.checkForUpdates()
      .then((updateCheckResult) => updateCheckResult)
      .catch((err) => {
        lastStatus = { status: 'error', error: err.message };
        if (win && !win.isDestroyed() && manual) {
          win.webContents.send('updater:status', lastStatus);
          const latestOpts: Electron.MessageBoxOptions = {
            type: 'info',
            title: 'Check for Updates',
            message: 'You are using the latest version of Zion.',
            detail: `Version: ${app.getVersion()}`,
          };
          dialog.showMessageBox(win, latestOpts);
        }
        return { status: 'error', error: err.message };
      });
  } catch (err: any) {
    lastStatus = { status: 'error', error: err?.message || 'Update check failed' };
    if (manual && win && !win.isDestroyed()) {
      const errOpts: Electron.MessageBoxOptions = {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not connect to the update server.',
        detail: err?.message || '',
      };
      dialog.showMessageBox(win, errOpts);
    }
    return Promise.resolve({ status: 'error', error: err?.message });
  }
}

export function getLastStatus(): UpdaterStatus {
  return lastStatus;
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall(false, true);
}
