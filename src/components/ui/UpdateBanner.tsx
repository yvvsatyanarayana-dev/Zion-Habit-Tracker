import React, { useEffect, useState } from 'react';
import { Sparkles, Download, X, ExternalLink, ArrowRight } from 'lucide-react';
import {
  checkGitHubUpdate,
  getDismissedVersion,
  setDismissedVersion,
  UpdateInfo,
} from '../../lib/updaterService';
import { isAndroidApp } from '../../lib/reminders';

export const UpdateBanner: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;

    // Check GitHub for updates 3 seconds after startup
    const timer = setTimeout(() => {
      checkGitHubUpdate()
        .then((info) => {
          if (!active || !info || !info.hasUpdate) return;
          const dismissedVer = getDismissedVersion();
          if (dismissedVer === info.latestVersion) return;
          setUpdateInfo(info);
        })
        .catch(() => {});
    }, 3000);

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
      window.open(updateInfo.downloadUrl, '_blank');
    }
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-32px)] animate-in slide-in-from-bottom-5 duration-300">
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--accent-primary)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px var(--accent-glow)',
        }}
        className="rounded-[16px] border-2 p-3.5 flex flex-col gap-2.5 backdrop-blur-md"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.16)',
                color: 'var(--accent-primary)',
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <Sparkles size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  style={{ color: 'var(--text-primary)' }}
                  className="text-xs font-bold leading-tight"
                >
                  New Version Available!
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--accent-primary)] text-white font-bold">
                  v{updateInfo.latestVersion}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-[10.5px] mt-0.5">
                Current: v{updateInfo.currentVersion} · Free GitHub Update
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            style={{ color: 'var(--text-muted)' }}
            className="hover:text-[var(--text-primary)] p-1 rounded-md transition-colors cursor-pointer"
            title="Dismiss for this version"
          >
            <X size={14} />
          </button>
        </div>

        {/* Release Notes snippet if available */}
        {updateInfo.releaseNotes && (
          <p
            style={{ color: 'var(--text-secondary)' }}
            className="text-[11px] line-clamp-2 px-0.5 leading-relaxed bg-[var(--bg-surface-subtle)] p-2 rounded-lg border border-[var(--border-subtle)]"
          >
            {updateInfo.releaseNotes}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
            className="flex-1 py-1.5 px-3 rounded-[9px] text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:brightness-110 active:scale-98 cursor-pointer shadow-sm"
          >
            <Download size={13} strokeWidth={2.4} />
            <span>
              {isAndroid && updateInfo.downloadType === 'apk'
                ? 'Download APK'
                : 'Get Update'}
            </span>
            <ArrowRight size={12} />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
            className="py-1.5 px-2.5 rounded-[9px] border text-xs font-medium hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};
