import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertCircle, X, ArrowUpCircle } from 'lucide-react';

export interface UpdaterStatusPayload {
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

/**
 * UpdateReceiverToast
 * Listens for electron-updater events from the Electron main process via IPC.
 * Identical architecture & UX to Doodle Desk.
 * Displays background download progress, notifications, and a 1-click 'Restart & Install' action.
 */
export const UpdateReceiverToast: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdaterStatusPayload | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const electronApi = (window as any).electronAPI || (window as any).api?.updater;
    if (!electronApi) return;

    // Check initial cached status on mount
    if (electronApi.getUpdateStatus || electronApi.getStatus) {
      const getStatusFn = electronApi.getUpdateStatus || electronApi.getStatus;
      getStatusFn().then((status: UpdaterStatusPayload) => {
        if (status && status.status !== 'idle') {
          setUpdateState(status);
        }
      }).catch(() => {});
    }

    // Subscribe to live updater events
    let unsubscribe: (() => void) | undefined;
    if (electronApi.on) {
      unsubscribe = electronApi.on('updater:status', (data: UpdaterStatusPayload) => {
        if (!data) return;
        setUpdateState(data);
        setIsDismissed(false);

        if (data.status === 'not-available' || data.status === 'dev-mode' || data.status === 'error') {
          const timer = setTimeout(() => {
            setIsDismissed(true);
          }, 5000);
          return () => clearTimeout(timer);
        }
      });
    } else if (electronApi.onStatus) {
      unsubscribe = electronApi.onStatus((data: UpdaterStatusPayload) => {
        if (!data) return;
        setUpdateState(data);
        setIsDismissed(false);

        if (data.status === 'not-available' || data.status === 'dev-mode' || data.status === 'error') {
          const timer = setTimeout(() => {
            setIsDismissed(true);
          }, 5000);
          return () => clearTimeout(timer);
        }
      });
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (!updateState || isDismissed || updateState.status === 'idle') {
    return null;
  }

  const handleRestart = () => {
    const electronApi = (window as any).electronAPI || (window as any).api?.updater;
    if (electronApi?.quitAndInstall) {
      electronApi.quitAndInstall();
    } else if (electronApi?.install) {
      electronApi.install();
    }
  };

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '';
    if (bytesPerSec > 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    }
    return `${Math.round(bytesPerSec / 1024)} KB/s`;
  };

  return (
    <div className="doodle-update-toast" role="status" aria-live="polite">
      {/* Checking for updates */}
      {updateState.status === 'checking' && (
        <div className="update-toast-content">
          <div className="update-toast-icon spin">
            <RefreshCw size={16} />
          </div>
          <div className="update-toast-text">
            <span className="update-toast-title">Checking for updates...</span>
            <span className="update-toast-desc">Connecting to GitHub Releases</span>
          </div>
          <button
            type="button"
            className="update-toast-close"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Update Available */}
      {updateState.status === 'available' && (
        <div className="update-toast-content">
          <div className="update-toast-icon highlight">
            <Download size={16} />
          </div>
          <div className="update-toast-text">
            <span className="update-toast-title">Update Available: v{updateState.version}</span>
            <span className="update-toast-desc">Downloading update in background...</span>
          </div>
          <button
            type="button"
            className="update-toast-close"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Downloading with live progress bar */}
      {updateState.status === 'downloading' && (
        <div className="update-toast-content column">
          <div className="update-toast-header">
            <div className="update-toast-icon spin">
              <Download size={16} />
            </div>
            <div className="update-toast-text">
              <span className="update-toast-title">Downloading Update v{updateState.version || ''}</span>
              <span className="update-toast-desc">
                {updateState.percent || 0}%
                {updateState.bytesPerSecond ? ` • ${formatSpeed(updateState.bytesPerSecond)}` : ''}
              </span>
            </div>
            <button
              type="button"
              className="update-toast-close"
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
          <div className="update-toast-progress-track">
            <div
              className="update-toast-progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, updateState.percent || 0))}%` }}
            />
          </div>
        </div>
      )}

      {/* Download Complete - Ready to Install */}
      {updateState.status === 'downloaded' && (
        <div className="update-toast-content column">
          <div className="update-toast-header">
            <div className="update-toast-icon success">
              <CheckCircle2 size={16} />
            </div>
            <div className="update-toast-text">
              <span className="update-toast-title">Update Ready: v{updateState.version}</span>
              <span className="update-toast-desc">Downloaded and verified. Restart to apply updates.</span>
            </div>
            <button
              type="button"
              className="update-toast-close"
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
          <div className="update-toast-actions">
            <button
              type="button"
              className="update-toast-btn primary"
              onClick={handleRestart}
            >
              <ArrowUpCircle size={14} />
              <span>Restart and Install</span>
            </button>
            <button
              type="button"
              className="update-toast-btn secondary"
              onClick={() => setIsDismissed(true)}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Already Up to date */}
      {updateState.status === 'not-available' && (
        <div className="update-toast-content">
          <div className="update-toast-icon success">
            <CheckCircle2 size={16} />
          </div>
          <div className="update-toast-text">
            <span className="update-toast-title">You're up to date</span>
            <span className="update-toast-desc">Zion v{updateState.version} is the latest release</span>
          </div>
          <button
            type="button"
            className="update-toast-close"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dev mode notice */}
      {updateState.status === 'dev-mode' && (
        <div className="update-toast-content">
          <div className="update-toast-icon highlight">
            <CheckCircle2 size={16} />
          </div>
          <div className="update-toast-text">
            <span className="update-toast-title">Development Mode (v{updateState.version})</span>
            <span className="update-toast-desc">{updateState.message}</span>
          </div>
          <button
            type="button"
            className="update-toast-close"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error */}
      {updateState.status === 'error' && (
        <div className="update-toast-content">
          <div className="update-toast-icon error">
            <AlertCircle size={16} />
          </div>
          <div className="update-toast-text">
            <span className="update-toast-title">Update Check</span>
            <span className="update-toast-desc">
              {(() => {
                const msg = updateState.error || '';
                if (msg.includes('404') || msg.includes('latest.yml') || msg.includes('Cannot find')) {
                  return 'You are on the latest version or no release has been published yet.';
                }
                if (msg.length > 90) {
                  return 'Unable to reach the update server. Please check your internet connection.';
                }
                return msg || 'Could not connect to update service.';
              })()}
            </span>
          </div>
          <button
            type="button"
            className="update-toast-close"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
