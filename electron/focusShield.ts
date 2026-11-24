import { app, Notification, BrowserWindow, ipcMain } from 'electron';
import { execFile, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';

export interface FocusShieldConfig {
  enabled: boolean;
  mode: 'gentle' | 'strict';
  blockedKeywords: string[];
  blockedProcesses: string[];
  whitelist: string[];
  emergencyCooldownUntil: number | null;
  hardcoreKillMode: boolean;
  lockdownUntil: number | null;
  hostageApps: string[];
  webShieldEnabled: boolean;
  blockedDomains: string[];
  hostsWritePermission?: boolean;
  socialShieldEnabled?: boolean;
  adultShieldEnabled?: boolean;
}

export interface FocusShieldViolation {
  processName: string;
  windowTitle: string;
  matchedRule: string;
  timestamp: number;
  killed?: boolean;
}

export interface FocusShieldStats {
  todayDeflections: number;
  totalDeflections: number;
  lastDeflectionTime?: number;
  totalKilledProcesses: number;
}

export const ADULT_18_PLUS_DOMAINS = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'redtube.com',
  'xhamster.com',
  'youporn.com',
  'onlyfans.com',
  'fansly.com',
  'chaturbate.com',
  'stripchat.com',
  'cam4.com',
  'bongacams.com',
  'spankbang.com',
  'tube8.com',
  'beeg.com',
  'brazzers.com',
  'eporner.com',
  'tnaflix.com',
  'porn.com',
  'erome.com',
];

export const ADULT_18_PLUS_KEYWORDS = [
  'pornhub',
  'xvideos',
  'xnxx',
  'redtube',
  'xhamster',
  'youporn',
  'onlyfans',
  'fansly',
  'chaturbate',
  'stripchat',
  'bongacams',
  'spankbang',
  'brazzers',
  'eporner',
  'erome',
];

const DEFAULT_CONFIG: FocusShieldConfig = {
  enabled: true,
  mode: 'gentle',
  blockedKeywords: [
    'youtube',
    'twitter',
    'reddit',
    'twitch',
    'netflix',
    'instagram',
    'tiktok',
    'facebook',
    'steam',
    'discord',
    'valorant',
    'league of legends',
    'roblox',
    'epic games',
    'hulu',
    'prime video',
    '9gag',
    ...ADULT_18_PLUS_KEYWORDS,
  ],
  blockedProcesses: [
    'steam.exe',
    'discord.exe',
    'epicgameslauncher.exe',
    'riotclientux.exe',
    'leagueclient.exe',
    'valorant.exe',
    'spotify.exe',
    'telegram.exe',
    'tiktok.exe',
  ],
  whitelist: [
    'youtube.com/playlist', // e.g. tutorial playlists
    'stackoverflow',
    'github',
    'chatgpt',
    'gemini',
    'claude',
    'localhost',
  ],
  emergencyCooldownUntil: null,
  hardcoreKillMode: false,
  lockdownUntil: null,
  hostageApps: ['steam.exe', 'discord.exe'],
  webShieldEnabled: false,
  blockedDomains: [
    'youtube.com',
    'twitter.com',
    'x.com',
    'reddit.com',
    'instagram.com',
    'tiktok.com',
    'twitch.tv',
    'netflix.com',
    'facebook.com',
    '9gag.com',
    'pinterest.com',
  ],
  hostsWritePermission: true,
  socialShieldEnabled: true,
  adultShieldEnabled: true,
};

class FocusShieldManager {
  private config: FocusShieldConfig = { ...DEFAULT_CONFIG };
  private monitorInterval: NodeJS.Timeout | null = null;
  private isScanning = false;
  private isSuspended = false;
  private lastAlertTimestamp = 0;
  private mainWindow: BrowserWindow | null = null;
  private stats: FocusShieldStats = { todayDeflections: 0, totalDeflections: 0, totalKilledProcesses: 0 };
  private activeBlockTitle: string | null = null;
  private deflectionServer: http.Server | null = null;
  private readonly HOSTS_FILE =
    process.platform === 'win32'
      ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
      : '/etc/hosts';
  private readonly HOSTS_TAG_START = '# === ZION MONK MODE FOCUS SHIELD START ===';
  private readonly HOSTS_TAG_END = '# === ZION MONK MODE FOCUS SHIELD END ===';

  public init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    this.loadConfig();
    this.loadStats();
    this.registerIpc();
    this.start();
  }

  public setSuspended(suspended: boolean): void {
    this.isSuspended = suspended;
  }

  public setActiveBlock(title: string | null): void {
    this.activeBlockTitle = title;
  }

  private getConfigPath(): string {
    return path.join(app.getPath('userData'), 'focus-shield-config.json');
  }

  private getStatsPath(): string {
    return path.join(app.getPath('userData'), 'focus-shield-stats.json');
  }

  private loadConfig(): void {
    try {
      const p = this.getConfigPath();
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
        this.config = { ...DEFAULT_CONFIG, ...raw };
      }
    } catch {}
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.getConfigPath(), JSON.stringify(this.config, null, 2), 'utf-8');
    } catch {}
  }

  private loadStats(): void {
    try {
      const p = this.getStatsPath();
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
        this.stats = { ...this.stats, ...raw };
      }
    } catch {}
  }

  private saveStats(): void {
    try {
      fs.writeFileSync(this.getStatsPath(), JSON.stringify(this.stats, null, 2), 'utf-8');
    } catch {}
  }

  public start(): void {
    if (this.monitorInterval) clearInterval(this.monitorInterval);
    // Poll every 5 seconds when active to eliminate idle CPU drain
    this.monitorInterval = setInterval(() => {
      if (!this.config.enabled || this.isSuspended) return;
      void this.scanRunningProcesses();
    }, 5000);
  }

  public stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  public async updateConfig(newConfig: Partial<FocusShieldConfig>): Promise<FocusShieldConfig> {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();

    if (newConfig.webShieldEnabled !== undefined) {
      if (newConfig.webShieldEnabled) {
        await this.enableHostsWebShield(this.config.blockedDomains || []);
      } else {
        await this.disableHostsWebShield();
      }
    } else if (this.config.webShieldEnabled && newConfig.blockedDomains) {
      await this.enableHostsWebShield(newConfig.blockedDomains);
    }

    return this.config;
  }

  public startLocalDeflectionServer(): void {
    if (this.deflectionServer) return;
    try {
      this.deflectionServer = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Zion Focus Shield · Deflected</title>
  <style>
    body {
      margin: 0; padding: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #09090b; color: #f4f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      background: #131316; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 40px;
      max-width: 480px; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.85);
    }
    .badge {
      display: inline-block; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
      color: #818cf8; font-size: 11px; font-weight: bold; letter-spacing: 0.08em; padding: 4px 12px;
      border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px;
    }
    h1 { margin: 0 0 12px; font-size: 24px; font-weight: 800; }
    p { margin: 0 0 20px; font-size: 13px; color: #9898a4; line-height: 1.6; }
    .quote {
      font-style: italic; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      padding: 16px; border-radius: 12px; color: #d4d4d8; font-size: 12.5px; margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Zion Monk Mode Shield</div>
    <h1>Domain Deflected</h1>
    <p>This website is restricted during your active focus protocol. Keep your streak alive.</p>
    <div class="quote">"You have power over your mind — not outside events. Realize this, and you will find strength."<br><small style="color:#71717a">— Marcus Aurelius</small></div>
  </div>
</body>
</html>`);
      });
      this.deflectionServer.listen(3182, '127.0.0.1');
    } catch {}
  }

  public stopLocalDeflectionServer(): void {
    if (this.deflectionServer) {
      try {
        this.deflectionServer.close();
      } catch {}
      this.deflectionServer = null;
    }
  }

  private async writeHostsFileWithFallback(content: string): Promise<boolean> {
    if (!fs.existsSync(this.HOSTS_FILE)) return false;

    // 1. Direct write attempt (succeeds instantly if running as Administrator or write permissions exist)
    try {
      await fs.promises.writeFile(this.HOSTS_FILE, content, 'utf-8');
      if (process.platform === 'win32') {
        execFile('ipconfig', ['/flushdns'], { windowsHide: true }, () => {});
      }
      this.config.hostsWritePermission = true;
      return true;
    } catch (directErr: any) {
      // 2. Windows UAC Elevation fallback (asynchronous child process, non-blocking)
      if (process.platform === 'win32' && (directErr.code === 'EPERM' || directErr.code === 'EACCES')) {
        return new Promise<boolean>((resolve) => {
          const tempFile = path.join(app.getPath('temp'), `zion_hosts_${Date.now()}.tmp`);
          fs.writeFileSync(tempFile, content, 'utf-8');

          const safeTemp = tempFile.replace(/'/g, "''");
          const safeHosts = this.HOSTS_FILE.replace(/'/g, "''");
          const psCommand = `Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command Copy-Item -LiteralPath ''${safeTemp}'' -Destination ''${safeHosts}'' -Force; icacls ''${safeHosts}'' /grant Users:M; ipconfig /flushdns'`;

          // Asynchronous execution so Electron main process event loop never freezes
          exec(
            `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`,
            { windowsHide: true, timeout: 60000 },
            (psErr) => {
              try {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
              } catch {}

              if (psErr) {
                console.warn('[FocusShield] UAC elevation was declined or cancelled by user. Operating in window-title deflection mode.');
                this.config.hostsWritePermission = false;
                resolve(false);
                return;
              }

              // Verify if hosts was written
              try {
                const checkContent = fs.readFileSync(this.HOSTS_FILE, 'utf-8');
                const isWritten = content.includes(this.HOSTS_TAG_START)
                  ? checkContent.includes(this.HOSTS_TAG_START)
                  : !checkContent.includes(this.HOSTS_TAG_START);
                this.config.hostsWritePermission = isWritten;
                resolve(isWritten);
              } catch {
                this.config.hostsWritePermission = false;
                resolve(false);
              }
            }
          );
        });
      }

      this.config.hostsWritePermission = false;
      return false;
    }
  }

  public async enableHostsWebShield(domains: string[]): Promise<boolean> {
    if (process.platform !== 'win32' && process.platform !== 'darwin') return false;
    try {
      if (!fs.existsSync(this.HOSTS_FILE)) return false;
      let content = fs.readFileSync(this.HOSTS_FILE, 'utf-8');

      // Strip existing Zion block if present
      const regex = new RegExp(`${this.HOSTS_TAG_START}[\\s\\S]*?${this.HOSTS_TAG_END}\\n?`, 'g');
      content = content.replace(regex, '').trimEnd() + '\n\n';

      const lines = [this.HOSTS_TAG_START];
      for (const d of domains) {
        const clean = d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!clean) continue;
        lines.push(`0.0.0.0 ${clean}`);
        lines.push(`127.0.0.1 ${clean}`);
        if (!clean.startsWith('www.')) {
          lines.push(`0.0.0.0 www.${clean}`);
          lines.push(`127.0.0.1 www.${clean}`);
        }

        // Subdomain & mobile variations for thorough OS-level blocking
        if (clean === 'youtube.com') {
          lines.push('0.0.0.0 m.youtube.com', '127.0.0.1 m.youtube.com');
          lines.push('0.0.0.0 music.youtube.com', '127.0.0.1 music.youtube.com');
        } else if (clean === 'twitter.com' || clean === 'x.com') {
          lines.push('0.0.0.0 mobile.twitter.com', '127.0.0.1 mobile.twitter.com');
          lines.push('0.0.0.0 api.twitter.com', '127.0.0.1 api.twitter.com');
          lines.push('0.0.0.0 x.com', '127.0.0.1 x.com');
          lines.push('0.0.0.0 www.x.com', '127.0.0.1 www.x.com');
        } else if (clean === 'instagram.com') {
          lines.push('0.0.0.0 m.instagram.com', '127.0.0.1 m.instagram.com');
        } else if (clean === 'reddit.com') {
          lines.push('0.0.0.0 old.reddit.com', '127.0.0.1 old.reddit.com');
          lines.push('0.0.0.0 new.reddit.com', '127.0.0.1 new.reddit.com');
        } else if (clean === 'facebook.com') {
          lines.push('0.0.0.0 m.facebook.com', '127.0.0.1 m.facebook.com');
        } else if (clean === 'tiktok.com') {
          lines.push('0.0.0.0 m.tiktok.com', '127.0.0.1 m.tiktok.com');
        }
      }
      lines.push(this.HOSTS_TAG_END + '\n');

      content += lines.join('\n');
      const success = await this.writeHostsFileWithFallback(content);
      if (success) {
        this.startLocalDeflectionServer();
      }
      return success;
    } catch (err) {
      console.warn('[FocusShield] Error enabling hosts web shield:', err);
      this.config.hostsWritePermission = false;
      return false;
    }
  }

  public async disableHostsWebShield(): Promise<void> {
    try {
      if (!fs.existsSync(this.HOSTS_FILE)) return;
      let content = fs.readFileSync(this.HOSTS_FILE, 'utf-8');
      const regex = new RegExp(`${this.HOSTS_TAG_START}[\\s\\S]*?${this.HOSTS_TAG_END}\\n?`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, '').trimEnd() + '\n';
        await this.writeHostsFileWithFallback(content);
      }
    } catch {}
    this.stopLocalDeflectionServer();
  }

  public getConfig(): FocusShieldConfig {
    return this.config;
  }

  public getStats(): FocusShieldStats {
    return this.stats;
  }

  public recordDeflection(): FocusShieldStats {
    this.stats.todayDeflections += 1;
    this.stats.totalDeflections += 1;
    this.stats.lastDeflectionTime = Date.now();
    this.saveStats();
    return this.stats;
  }

  public requestEmergencyBypass(durationMinutes = 5): void {
    this.config.emergencyCooldownUntil = Date.now() + durationMinutes * 60 * 1000;
    this.saveConfig();
  }

  private async scanRunningProcesses(): Promise<void> {
    if (this.isScanning || !this.config.enabled || this.isSuspended) return;

    // Check emergency bypass cooldown
    if (this.config.emergencyCooldownUntil && Date.now() < this.config.emergencyCooldownUntil) {
      return;
    }

    this.isScanning = true;

    try {
      if (process.platform === 'win32') {
        execFile('tasklist', ['/v', '/fo', 'csv', '/nh'], { windowsHide: true, maxBuffer: 1024 * 1024 * 2 }, (error, stdout) => {
          this.isScanning = false;
          if (error || !stdout) return;
          this.evaluateTaskListOutput(stdout);
        });
      } else {
        this.isScanning = false;
      }
    } catch {
      this.isScanning = false;
    }
  }

  private evaluateTaskListOutput(csvData: string): void {
    const lines = csvData.split('\r\n');
    const blockedKeywordsLower = this.config.blockedKeywords.map((k) => k.toLowerCase().trim()).filter(Boolean);
    const blockedProcessesLower = this.config.blockedProcesses.map((p) => p.toLowerCase().trim()).filter(Boolean);
    const whitelistLower = this.config.whitelist.map((w) => w.toLowerCase().trim()).filter(Boolean);

    for (const line of lines) {
      if (!line.trim()) continue;
      // Parse CSV line quotes
      const parts = line.split('","').map((p) => p.replace(/^"|"$/g, ''));
      if (parts.length < 9) continue;

      const processName = (parts[0] || '').toLowerCase();
      const windowTitle = (parts[8] || '').trim();

      if (!windowTitle || windowTitle === 'N/A') continue;
      const windowTitleLower = windowTitle.toLowerCase();

      // Check if title contains whitelist
      const isWhitelisted = whitelistLower.some((w) => windowTitleLower.includes(w));
      if (isWhitelisted) continue;

      // Check process name match
      const matchedProcess = blockedProcessesLower.find((bp) => processName.includes(bp));
      // Check title keywords match
      const matchedKeyword = blockedKeywordsLower.find((kw) => windowTitleLower.includes(kw));

      // Check web domain match if webShieldEnabled
      let matchedDomain: string | undefined = undefined;
      if (this.config.webShieldEnabled && this.config.blockedDomains) {
        matchedDomain = this.config.blockedDomains.find((d) => {
          const clean = d.toLowerCase().replace(/^www\./, '').replace(/\..*$/, '');
          return clean.length >= 3 && windowTitleLower.includes(clean);
        });
      }

      if (matchedProcess || matchedKeyword || matchedDomain) {
        const isAdult =
          (matchedDomain && ADULT_18_PLUS_DOMAINS.some((d) => matchedDomain?.toLowerCase().includes(d))) ||
          (matchedKeyword && ADULT_18_PLUS_KEYWORDS.some((k) => matchedKeyword?.toLowerCase().includes(k)));

        const rule = isAdult
          ? 'Restricted 18+ Content'
          : matchedDomain
          ? `Web Domain: ${matchedDomain}`
          : matchedKeyword || matchedProcess || 'distraction';

        this.handleViolation({
          processName: parts[0],
          windowTitle,
          matchedRule: rule,
          timestamp: Date.now(),
        });
        break; // Alert once per scan cycle
      }
    }
  }

  public startLockdown(durationMins: number): FocusShieldConfig {
    this.config.lockdownUntil = Date.now() + durationMins * 60 * 1000;
    this.config.hardcoreKillMode = true;
    this.config.mode = 'strict';
    this.saveConfig();

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
      this.mainWindow.setAlwaysOnTop(true, 'screen-saver');
      this.mainWindow.webContents.send('focusShield:lockdownStarted', {
        lockdownUntil: this.config.lockdownUntil,
      });
    }
    return this.config;
  }

  public stopLockdown(): FocusShieldConfig {
    this.config.lockdownUntil = null;
    this.config.hardcoreKillMode = false;
    this.saveConfig();

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.setAlwaysOnTop(false);
      this.mainWindow.webContents.send('focusShield:lockdownEnded');
    }
    return this.config;
  }

  public getLockdownStatus(): { isLocked: boolean; remainingMs: number; lockdownUntil: number | null } {
    const isLocked = Boolean(this.config.lockdownUntil && Date.now() < this.config.lockdownUntil);
    const remainingMs = isLocked ? Math.max(0, (this.config.lockdownUntil || 0) - Date.now()) : 0;
    return {
      isLocked,
      remainingMs,
      lockdownUntil: this.config.lockdownUntil,
    };
  }

  private handleViolation(violation: FocusShieldViolation): void {
    const isLockdownActive = Boolean(this.config.lockdownUntil && Date.now() < this.config.lockdownUntil);
    const shouldKill = this.config.hardcoreKillMode || isLockdownActive;

    // If hardcore app-killing is enabled, terminate the blacklisted process immediately
    if (shouldKill && process.platform === 'win32' && violation.processName) {
      execFile('taskkill', ['/F', '/IM', violation.processName], { windowsHide: true }, (err) => {
        if (!err) {
          violation.killed = true;
          this.stats.totalKilledProcesses = (this.stats.totalKilledProcesses || 0) + 1;
          this.saveStats();
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('focusShield:killed', {
              processName: violation.processName,
              timestamp: Date.now(),
            });
          }
        }
      });
    }

    const now = Date.now();
    // Throttle notifications to at most once every 30 seconds
    if (now - this.lastAlertTimestamp < 30000) return;
    this.lastAlertTimestamp = now;

    this.recordDeflection();

    // 1. Notify Renderer via IPC
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('focusShield:violation', {
        ...violation,
        activeBlockTitle: this.activeBlockTitle || 'Current Focus Session',
        stats: this.stats,
      });
      // Flash the taskbar to draw attention back
      this.mainWindow.flashFrame(true);

      // In Strict Mode or Lockdown, aggressively reclaim focus
      if (this.config.mode === 'strict' || isLockdownActive) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.show();
        this.mainWindow.focus();
        this.mainWindow.setAlwaysOnTop(true, 'screen-saver');
        if (!isLockdownActive) {
          setTimeout(() => {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.setAlwaysOnTop(false);
            }
          }, 3000);
        }
      }
    }

    // 2. Native OS Desktop Notification
    try {
      if (Notification.isSupported()) {
        const titleMsg = violation.killed
          ? `🛡️ Dopamine Vault KILLED: ${violation.processName}`
          : `Focus Shield Deflected: ${violation.matchedRule.toUpperCase()}`;
        const bodyMsg = isLockdownActive
          ? `HARDCORE LOCKDOWN ACTIVE: ${violation.processName} was terminated to protect your focus!`
          : this.activeBlockTitle
          ? `Stay in the zone! You have an active routine for "${this.activeBlockTitle}". Keep your streak alive!`
          : `Distraction detected! Return to Zion to protect your focus flow.`;

        const notif = new Notification({
          title: titleMsg,
          body: bodyMsg,
          silent: false,
        });

        notif.on('click', () => {
          if (this.mainWindow) {
            if (this.mainWindow.isMinimized()) this.mainWindow.restore();
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        });

        notif.show();
      }
    } catch {}
  }

  private registerIpc(): void {
    ipcMain.handle('focusShield:getConfig', () => {
      return this.getConfig();
    });

    ipcMain.handle('focusShield:updateConfig', async (_event, updates: Partial<FocusShieldConfig>) => {
      return await this.updateConfig(updates);
    });

    ipcMain.handle('focusShield:getStats', () => {
      return this.getStats();
    });

    ipcMain.handle('focusShield:requestBypass', (_event, minutes?: number) => {
      this.requestEmergencyBypass(minutes || 5);
      return this.getConfig();
    });

    ipcMain.handle('focusShield:startLockdown', (_event, durationMins: number) => {
      return this.startLockdown(durationMins);
    });

    ipcMain.handle('focusShield:stopLockdown', () => {
      return this.stopLockdown();
    });

    ipcMain.handle('focusShield:getLockdownStatus', () => {
      return this.getLockdownStatus();
    });

    ipcMain.handle('focusShield:recordDeflection', () => {
      return this.recordDeflection();
    });

    ipcMain.handle('focusShield:setActiveBlock', (_event, title: string | null) => {
      this.setActiveBlock(title);
      return true;
    });

    ipcMain.handle('focusShield:toggleWebShield', async (_event, enabled: boolean) => {
      return await this.updateConfig({ webShieldEnabled: enabled });
    });

    ipcMain.handle('focusShield:getBlockedDomains', () => {
      return this.config.blockedDomains || [];
    });

    ipcMain.handle('focusShield:setBlockedDomains', async (_event, domains: string[]) => {
      return await this.updateConfig({ blockedDomains: domains });
    });
  }
}

export const focusShieldManager = new FocusShieldManager();
