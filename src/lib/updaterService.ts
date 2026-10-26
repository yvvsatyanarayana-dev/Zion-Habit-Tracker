import { APP_VERSION, GITHUB_API_LATEST_RELEASE, GITHUB_RELEASES_URL } from './constants';
import { isAndroidApp } from './reminders';

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: GitHubReleaseAsset[];
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  publishedAt: string;
  releaseUrl: string;
  downloadUrl?: string;
  downloadType?: 'apk' | 'exe' | 'dmg' | 'web';
}

/**
 * Universal safe external URL opener.
 * On Android (Capacitor), window.open with '_system' opens the device default browser
 * (e.g. Chrome) so APK downloads and GitHub pages work 100% reliably.
 */
export function openExternalUrl(url: string): void {
  if (!url) return;
  try {
    if (isAndroidApp()) {
      // In Capacitor Android, '_system' signals the native Capacitor intent to open in external browser
      const win = window.open(url, '_system');
      if (!win) {
        window.location.href = url;
      }
    } else if (typeof window !== 'undefined' && (window as any).api?.openExternal) {
      (window as any).api.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    console.warn('Failed to open external URL with window.open, falling back to location.href:', err);
    try {
      window.location.href = url;
    } catch {}
  }
}

/**
 * Compare two semver strings: returns > 0 if v1 > v2, < 0 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || '').replace(/^v/, '').trim();
  const clean2 = (v2 || '').replace(/^v/, '').trim();
  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Cleans up raw GitHub changelog text and removes raw compare links, hashes, markdown tags
 */
export function formatReleaseNotes(rawBody: string): string {
  if (!rawBody || typeof rawBody !== 'string') {
    return 'Performance improvements, UI refinements, and bug fixes.';
  }

  // Remove markdown links: [text](url) -> text
  let text = rawBody.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Strip bold/italics symbols
  text = text.replace(/[*_~`]/g, '');
  // Strip raw URLs
  text = text.replace(/https?:\/\/\S+/gi, '');

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      const lower = l.toLowerCase();
      if (!l) return false;
      if (lower.includes('full changelog')) return false;
      if (lower.startsWith('whats changed') || lower.startsWith("what's changed")) return false;
      if (lower.includes('compare/')) return false;
      if (lower.startsWith('@') && lower.includes('in #')) return false;
      return true;
    });

  const cleaned = lines.join('\n').trim();
  if (!cleaned || cleaned.length < 5) {
    return 'Performance improvements, UI refinements, and bug fixes.';
  }
  return cleaned;
}

const DISMISSED_UPDATE_KEY = 'zion_dismissed_update_version';
const LAST_CHECKED_KEY = 'zion_last_update_check_time';

export function getDismissedVersion(): string | null {
  return localStorage.getItem(DISMISSED_UPDATE_KEY);
}

export function setDismissedVersion(version: string): void {
  localStorage.setItem(DISMISSED_UPDATE_KEY, version);
}

export function getLastCheckedTime(): string | null {
  return localStorage.getItem(LAST_CHECKED_KEY);
}

/**
 * Fetch latest release from public GitHub repository releases (100% free)
 */
export async function checkGitHubUpdate(): Promise<UpdateInfo | null> {
  try {
    localStorage.setItem(LAST_CHECKED_KEY, new Date().toISOString());

    const res = await fetch(GITHUB_API_LATEST_RELEASE, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        // No releases tagged yet in GitHub repository
        return {
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          releaseTitle: 'Up to date',
          releaseNotes: 'You are running the latest version.',
          publishedAt: '',
          releaseUrl: GITHUB_RELEASES_URL,
        };
      }
      if (res.status === 403) {
        // GitHub rate limited
        return {
          hasUpdate: false,
          currentVersion: APP_VERSION,
          latestVersion: APP_VERSION,
          releaseTitle: 'Rate limit reached',
          releaseNotes: 'GitHub API rate limit reached. You can view releases directly on GitHub.',
          publishedAt: '',
          releaseUrl: GITHUB_RELEASES_URL,
        };
      }
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const data: GitHubRelease = await res.json();
    const latestVersion = (data.tag_name || '').replace(/^v/, '');
    const hasUpdate = compareVersions(latestVersion, APP_VERSION) > 0;

    const isAndroid = isAndroidApp();
    const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

    let downloadUrl: string | undefined = undefined;
    let downloadType: UpdateInfo['downloadType'] = undefined;

    if (Array.isArray(data.assets) && data.assets.length > 0) {
      if (isAndroid) {
        const apk = data.assets.find((a) => a.name.toLowerCase().endsWith('.apk'));
        if (apk) {
          downloadUrl = apk.browser_download_url;
          downloadType = 'apk';
        }
      } else if (isWindows) {
        const exe = data.assets.find((a) => a.name.toLowerCase().endsWith('.exe'));
        if (exe) {
          downloadUrl = exe.browser_download_url;
          downloadType = 'exe';
        }
      }
    }

    if (!downloadUrl) {
      downloadUrl = data.html_url || GITHUB_RELEASES_URL;
      downloadType = 'web';
    }

    return {
      hasUpdate,
      currentVersion: APP_VERSION,
      latestVersion,
      releaseTitle: data.name || `Version ${latestVersion}`,
      releaseNotes: formatReleaseNotes(data.body || ''),
      publishedAt: data.published_at || '',
      releaseUrl: data.html_url || GITHUB_RELEASES_URL,
      downloadUrl,
      downloadType,
    };
  } catch (error) {
    console.warn('Failed to check for updates from GitHub:', error);
    return null;
  }
}
