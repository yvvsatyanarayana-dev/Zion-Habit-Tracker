import React, { useEffect, useState } from 'react';
import { Sparkles, Download, X, ArrowUpRight } from 'lucide-react';
import {
  checkGitHubUpdate,
  getDismissedVersion,
  setDismissedVersion,
  openExternalUrl,
  UpdateInfo,
} from '../../lib/updaterService';
import { isAndroidApp } from '../../lib/reminders';

export const UpdateBanner: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;

    // Check GitHub for updates 2 seconds after launch
    const timer = setTimeout(() => {
      checkGitHubUpdate()
        .then((info) => {
          if (!active || !info || !info.hasUpdate) return;
          const dismissedVer = getDismissedVersion();
          // Don't show if user previously dismissed this exact version
          if (dismissedVer === info.latestVersion) return;
          setUpdateInfo(info);
        })
        .catch(() => {});
    }, 2000);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  if (!updateInfo || !updateInfo.hasUpdate || dismissed) {
    return null;
  }

  const isAndroid = isAndroidApp();

  const handleDismiss = () => {
    setDismissed(true);
    setDismissedVersion(updateInfo.latestVersion);
  };

  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
      openExternalUrl(updateInfo.downloadUrl);
    }
  };

  return (
    <div className="fixed bottom-[74px] sm:bottom-6 left-3.5 right-3.5 sm:left-auto sm:right-6 sm:w-[380px] z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-medium)',
          boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.35), 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
        className="rounded-[20px] border p-4 backdrop-blur-xl flex flex-col gap-3"
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.14)',
                color: 'var(--accent-primary)',
              }}
              className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
            >
              <Sparkles size={16} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  style={{ color: 'var(--text-primary)' }}
                  className="text-[13px] font-bold tracking-tight"
                >
                  Update Available
                </span>
                <span
                  style={{
                    backgroundColor: 'var(--accent-surface)',
                    borderColor: 'var(--accent-border)',
                    color: 'var(--accent-primary)',
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold"
                >
                  v{updateInfo.latestVersion}
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)' }} className="text-[11px]">
                Installed: v{updateInfo.currentVersion}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            style={{ color: 'var(--text-muted)' }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title="Dismiss for this version"
          >
            <X size={15} />
          </button>
        </div>

        {/* Release Notes Preview */}
        {updateInfo.releaseNotes && (
          <div
            style={{
              backgroundColor: 'var(--bg-surface-card)',
              borderColor: 'var(--border-subtle)',
            }}
            className="p-2.5 rounded-[12px] border"
          >
            <p
              style={{ color: 'var(--text-secondary)' }}
              className="text-[11.5px] line-clamp-2 leading-relaxed"
            >
              {updateInfo.releaseNotes}
            </p>
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleDownload}
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              boxShadow: 'var(--btn-primary-shadow)',
            }}
            className="flex-1 h-9 px-3.5 rounded-[11px] text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:brightness-105 active:scale-98 cursor-pointer"
          >
            <Download size={14} strokeWidth={2.5} />
            <span>
              {isAndroid && updateInfo.downloadType === 'apk'
                ? 'Download APK'
                : 'Update Now'}
            </span>
            <ArrowUpRight size={13} />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            className="h-9 px-3.5 rounded-[11px] border text-xs font-semibold hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};
