import { contextBridge, ipcRenderer } from 'electron';

export interface HabitData {
  id: string;
  name: string;
  emoji: string;
  color: string;
  monthly_goal: number;
  schedule_days: string;
  sort_order: number;
  archived: number;
  created_at: string;
  type?: string;
  target_value?: number;
  unit?: string;
  category?: string;
  user_id?: string;
}

export interface CheckinData {
  id: string;
  habit_id: string;
  date: string;
  completed: number;
  note: string;
  updated_at: string;
  value?: number;
  mood?: string;
}

export interface HabitDependencyData {
  habit_id: string;
  depends_on_id: string;
  type: 'prerequisite' | 'anti';
  created_at: string;
}

export interface WellnessLogData {
  id: string;
  date: string;
  energy: number;
  mood: number;
  note: string;
  created_at: string;
}

export interface SkipReasonData {
  id: string;
  habit_id: string;
  date: string;
  reason: 'forgot' | 'busy' | 'sick' | 'resistance' | 'other';
  note: string;
  created_at: string;
}

export interface SkillProgressData {
  user_id: string;
  skill_id: string;
  level: number;
  unlocked_at: string | null;
}

export interface TriggerRuleData {
  id: string;
  habit_id: string;
  type: string;
  config: string;
  enabled: number;
  created_at: string;
}

export interface ExportDataPayload {
  habits: HabitData[];
  checkins: CheckinData[];
  settings: Record<string, string>;
  dependencies?: HabitDependencyData[];
  wellness_logs?: WellnessLogData[];
  skip_reasons?: SkipReasonData[];
  skill_progress?: SkillProgressData[];
  trigger_rules?: TriggerRuleData[];
}

export interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<boolean>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  os: {
    getLaunchOnStartup: () => Promise<boolean>;
    setLaunchOnStartup: (enabled: boolean) => Promise<boolean>;
    openDataFolder: () => Promise<string>;
    openExternal: (url: string) => Promise<boolean>;
    setProgressBar: (progress: number, options?: any) => Promise<void>;
    flashFrame: (flag?: boolean) => Promise<void>;
    updateTray: (status: any) => Promise<void>;
    toggleTimerWidget: () => Promise<void>;
    getVersion: () => Promise<string>;
    onSystemResumed: (callback: () => void) => () => void;
  };
  navigation: {
    onNavigate: (callback: (tab: string) => void) => () => void;
  };
  timetableLive: {
    onStartActiveFocus: (callback: () => void) => () => void;
    onToggleActiveBlock: (callback: () => void) => () => void;
    onOpenZen: (callback: () => void) => () => void;
  };
  onDataChanged?: (callback: () => void) => () => void;
  habits: {
    getAll: (includeArchived?: boolean, userId?: string) => Promise<HabitData[]>;
    create: (habit: HabitData) => Promise<HabitData[]>;
    update: (habit: Partial<HabitData> & { id: string }) => Promise<HabitData[]>;
    delete: (id: string) => Promise<HabitData[]>;
    reorder: (ids: string[]) => Promise<HabitData[]>;
  };
  checkins: {
    getMonth: (yearMonth: string) => Promise<CheckinData[]>;
    getAll: (userId?: string) => Promise<CheckinData[]>;
    toggle: (habitId: string, date: string, completed: boolean, note?: string, value?: number, mood?: string) => Promise<CheckinData>;
  };
  settings: {
    getAll: () => Promise<Record<string, string>>;
    save: (key: string, value: string) => Promise<Record<string, string>>;
  };
  data: {
    export: () => Promise<ExportDataPayload>;
    import: (data: ExportDataPayload) => Promise<{ habits: HabitData[]; checkins: CheckinData[]; settings: Record<string, string> }>;
    reset: () => Promise<{ habits: HabitData[]; checkins: CheckinData[]; settings: Record<string, string> }>;
    uninstall: () => Promise<boolean>;
  };
  notify: (
    title: string,
    body: string,
    options?: { silent?: boolean; urgency?: 'normal' | 'critical' | 'low'; sound?: boolean }
  ) => Promise<boolean>;
  updater: {
    check: (manual?: boolean) => Promise<{ status: string; message?: string }>;
    getStatus?: () => Promise<any>;
    quitAndInstall?: () => Promise<void>;
    onStatus?: (callback: (status: any) => void) => () => void;
    install: () => Promise<void>;
    onUpdateDownloaded: (callback: (info: { version?: string }) => void) => () => void;
  };
  desktopTimer: {
    sync: (timer: unknown | null) => Promise<void>;
    get: () => Promise<unknown | null>;
    sendAction: (action: 'pause' | 'resume' | 'finish' | 'discard' | 'open-main' | 'add-5m') => Promise<void>;
    setSize: (width: number, height: number) => Promise<void>;
    getSize: () => Promise<{ width: number; height: number }>;
    onSync: (callback: (timer: unknown | null) => void) => () => void;
    onRemoteAction: (callback: (action: 'pause' | 'resume' | 'finish' | 'discard' | 'open-main' | 'add-5m') => void) => () => void;
  };
  // Habit Dependencies
  dependencies: {
    getAll: (habitId?: string) => Promise<HabitDependencyData[]>;
    getDependents: (dependsOnId: string) => Promise<HabitDependencyData[]>;
    create: (dep: { habit_id: string; depends_on_id: string; type: 'prerequisite' | 'anti' }) => Promise<HabitDependencyData[]>;
    delete: (habitId: string, dependsOnId: string) => Promise<HabitDependencyData[]>;
    deleteAll: (habitId: string) => Promise<HabitDependencyData[]>;
  };
  // Wellness Logs
  wellness: {
    get: (date: string) => Promise<WellnessLogData | undefined>;
    getMonth: (yearMonth: string) => Promise<WellnessLogData[]>;
    getAll: () => Promise<WellnessLogData[]>;
    upsert: (log: { id: string; date: string; energy: number; mood: number; note?: string }) => Promise<WellnessLogData | undefined>;
    delete: (date: string) => Promise<WellnessLogData[]>;
  };
  // Skip Reasons
  skipReasons: {
    get: (habitId: string, date: string) => Promise<SkipReasonData | undefined>;
    getForHabit: (habitId: string) => Promise<SkipReasonData[]>;
    getForDate: (date: string) => Promise<SkipReasonData[]>;
    upsert: (reason: { id: string; habit_id: string; date: string; reason: 'forgot' | 'busy' | 'sick' | 'resistance' | 'other'; note?: string }) => Promise<SkipReasonData | undefined>;
    delete: (id: string) => Promise<boolean>;
  };
  // Skill Progress
  skills: {
    getAll: (userId: string) => Promise<SkillProgressData[]>;
    get: (userId: string, skillId: string) => Promise<SkillProgressData | undefined>;
    upsert: (progress: { user_id: string; skill_id: string; level: number; unlocked_at?: string | null }) => Promise<SkillProgressData | undefined>;
  };
  // Trigger Rules
  triggers: {
    getAll: (habitId?: string) => Promise<TriggerRuleData[]>;
    create: (rule: { id: string; habit_id: string; type: string; config: string; enabled?: number }) => Promise<TriggerRuleData[]>;
    update: (id: string, updates: { type?: string; config?: string; enabled?: number }) => Promise<TriggerRuleData[]>;
    delete: (id: string) => Promise<TriggerRuleData[]>;
  };
  // Timetable & Daily Schedule
  timetable: {
    getSchedules: () => Promise<any[]>;
    saveSchedule: (schedule: any) => Promise<any[]>;
    deleteSchedule: (id: string) => Promise<any[]>;
    getExecutions: (date: string) => Promise<any[]>;
    toggleExecution: (date: string, blockId: string, completed: boolean) => Promise<any[]>;
  };
  // Identity Proof Journaling
  proofs: {
    get: (habitId?: string) => Promise<any[]>;
    add: (proof: any) => Promise<any[]>;
    delete: (id: string, habitId?: string) => Promise<any[]>;
  };
  // Habit Stacking & Synergy Connections
  stacks: {
    get: () => Promise<any[]>;
    save: (stack: any) => Promise<any[]>;
    delete: (id: string) => Promise<any[]>;
  };
  // P2P Accountability Duels
  duels: {
    get: () => Promise<any[]>;
    save: (duel: any) => Promise<any[]>;
    delete: (id: string) => Promise<any[]>;
  };
  // Focus Shield (App & Website Distraction Blocker & Dopamine Vault)
  focusShield: {
    getConfig: () => Promise<{
      enabled: boolean;
      mode: 'gentle' | 'strict';
      blockedKeywords: string[];
      blockedProcesses: string[];
      whitelist: string[];
      emergencyCooldownUntil: number | null;
      hardcoreKillMode?: boolean;
      lockdownUntil?: number | null;
      hostageApps?: string[];
      webShieldEnabled?: boolean;
      blockedDomains?: string[];
      hostsWritePermission?: boolean;
      socialShieldEnabled?: boolean;
      adultShieldEnabled?: boolean;
    }>;
    updateConfig: (updates: any) => Promise<any>;
    getStats: () => Promise<{ todayDeflections: number; totalDeflections: number; lastDeflectionTime?: number; totalKilledProcesses?: number }>;
    requestBypass: (minutes?: number) => Promise<any>;
    recordDeflection: () => Promise<any>;
    setActiveBlock: (title: string | null) => Promise<boolean>;
    startLockdown: (durationMins: number) => Promise<any>;
    stopLockdown: () => Promise<any>;
    getLockdownStatus: () => Promise<{ isLocked: boolean; remainingMs: number; lockdownUntil: number | null }>;
    toggleWebShield: (enabled: boolean) => Promise<any>;
    getBlockedDomains: () => Promise<string[]>;
    setBlockedDomains: (domains: string[]) => Promise<string[]>;
    onViolation: (callback: (violation: any) => void) => () => void;
    onProcessKilled: (callback: (data: { processName: string; timestamp: number }) => void) => () => void;
  };
}

const api: ElectronAPI = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  os: {
    getLaunchOnStartup: () => ipcRenderer.invoke('os:getLaunchOnStartup'),
    setLaunchOnStartup: (enabled: boolean) => ipcRenderer.invoke('os:setLaunchOnStartup', enabled),
    openDataFolder: () => ipcRenderer.invoke('os:openDataFolder'),
    openExternal: (url: string) => ipcRenderer.invoke('os:openExternal', url),
    setProgressBar: (progress: number, options?: any) => ipcRenderer.invoke('os:setProgressBar', progress, options),
    flashFrame: (flag?: boolean) => ipcRenderer.invoke('os:flashFrame', flag),
    updateTray: (status: any) => ipcRenderer.invoke('os:updateTray', status),
    toggleTimerWidget: () => ipcRenderer.invoke('os:toggleTimerWidget'),
    getVersion: () => ipcRenderer.invoke('os:getVersion'),
    onSystemResumed: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('os:system-resumed', listener);
      return () => ipcRenderer.removeListener('os:system-resumed', listener);
    },
  },
  navigation: {
    onNavigate: (callback: (tab: string) => void) => {
      const listener = (_e: any, tab: string) => callback(tab);
      ipcRenderer.on('nav:go-to', listener);
      return () => ipcRenderer.removeListener('nav:go-to', listener);
    },
  },
  timetableLive: {
    onStartActiveFocus: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('timetable:start-active-focus', listener);
      return () => ipcRenderer.removeListener('timetable:start-active-focus', listener);
    },
    onToggleActiveBlock: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('timetable:toggle-active-block', listener);
      return () => ipcRenderer.removeListener('timetable:toggle-active-block', listener);
    },
    onOpenZen: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('zen:open', listener);
      return () => ipcRenderer.removeListener('zen:open', listener);
    },
  },
  onDataChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('data:changed', handler);
    return () => {
      ipcRenderer.removeListener('data:changed', handler);
    };
  },
  habits: {
    getAll: (includeArchived, userId) => ipcRenderer.invoke('habits:getAll', includeArchived, userId),
    create: (habit) => ipcRenderer.invoke('habits:create', habit),
    update: (habit) => ipcRenderer.invoke('habits:update', habit),
    delete: (id) => ipcRenderer.invoke('habits:delete', id),
    reorder: (ids) => ipcRenderer.invoke('habits:reorder', ids),
  },
  checkins: {
    getMonth: (yearMonth) => ipcRenderer.invoke('checkins:getMonth', yearMonth),
    getAll: (userId) => ipcRenderer.invoke('checkins:getAll', userId),
    toggle: (habitId, date, completed, note, value, mood) => ipcRenderer.invoke('checkins:toggle', habitId, date, completed, note, value, mood),
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    save: (key, value) => ipcRenderer.invoke('settings:save', key, value),
  },
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: (data) => ipcRenderer.invoke('data:import', data),
    reset: () => ipcRenderer.invoke('data:reset'),
    uninstall: () => ipcRenderer.invoke('app:uninstall'),
  },
  notify: (title, body, options) => ipcRenderer.invoke('app:notify', title, body, options),
  // Habit Dependencies
  dependencies: {
    getAll: (habitId) => ipcRenderer.invoke('dependencies:getAll', habitId),
    getDependents: (dependsOnId) => ipcRenderer.invoke('dependencies:getDependents', dependsOnId),
    create: (dep) => ipcRenderer.invoke('dependencies:create', dep),
    delete: (habitId, dependsOnId) => ipcRenderer.invoke('dependencies:delete', habitId, dependsOnId),
    deleteAll: (habitId) => ipcRenderer.invoke('dependencies:deleteAll', habitId),
  },
  // Wellness Logs
  wellness: {
    get: (date) => ipcRenderer.invoke('wellness:get', date),
    getMonth: (yearMonth) => ipcRenderer.invoke('wellness:getMonth', yearMonth),
    getAll: () => ipcRenderer.invoke('wellness:getAll'),
    upsert: (log) => ipcRenderer.invoke('wellness:upsert', log),
    delete: (date) => ipcRenderer.invoke('wellness:delete', date),
  },
  // Skip Reasons
  skipReasons: {
    get: (habitId, date) => ipcRenderer.invoke('skipReasons:get', habitId, date),
    getForHabit: (habitId) => ipcRenderer.invoke('skipReasons:getForHabit', habitId),
    getForDate: (date) => ipcRenderer.invoke('skipReasons:getForDate', date),
    upsert: (reason) => ipcRenderer.invoke('skipReasons:upsert', reason),
    delete: (id) => ipcRenderer.invoke('skipReasons:delete', id),
  },
  // Skill Progress
  skills: {
    getAll: (userId) => ipcRenderer.invoke('skills:getAll', userId),
    get: (userId, skillId) => ipcRenderer.invoke('skills:get', userId, skillId),
    upsert: (progress) => ipcRenderer.invoke('skills:upsert', progress),
  },
  // Trigger Rules
  triggers: {
    getAll: (habitId) => ipcRenderer.invoke('triggers:getAll', habitId),
    create: (rule) => ipcRenderer.invoke('triggers:create', rule),
    update: (id, updates) => ipcRenderer.invoke('triggers:update', id, updates),
    delete: (id) => ipcRenderer.invoke('triggers:delete', id),
  },
  updater: {
    check: (manual = true) => ipcRenderer.invoke('updater:check', manual),
    getStatus: () => ipcRenderer.invoke('updater:get-status'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    onStatus: (callback: (status: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: any) => callback(status);
      ipcRenderer.on('updater:status', handler);
      return () => {
        ipcRenderer.removeListener('updater:status', handler);
      };
    },
    install: () => ipcRenderer.invoke('updater:quit-and-install'),
    onUpdateDownloaded: (callback: (info: { version?: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, info: { version?: string }) => callback(info);
      ipcRenderer.on('app:update-downloaded', handler);
      ipcRenderer.on('updater:status', (_event, status: any) => {
        if (status?.status === 'downloaded') callback(status);
      });
      return () => {
        ipcRenderer.removeListener('app:update-downloaded', handler);
      };
    },
  },
  desktopTimer: {
    sync: (timer) => ipcRenderer.invoke('timer:sync', timer),
    get: () => ipcRenderer.invoke('timer:get'),
    sendAction: (action) => ipcRenderer.invoke('timer:action', action),
    setSize: (w, h) => ipcRenderer.invoke('timer:set-size', w, h),
    getSize: () => ipcRenderer.invoke('timer:get-size'),
    onSync: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, timer: unknown | null) => callback(timer);
      ipcRenderer.on('timer:state-updated', handler);
      return () => {
        ipcRenderer.removeListener('timer:state-updated', handler);
      };
    },
    onRemoteAction: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, action: 'pause' | 'resume' | 'finish' | 'discard' | 'open-main') => callback(action);
      ipcRenderer.on('timer:remote-action', handler);
      return () => {
        ipcRenderer.removeListener('timer:remote-action', handler);
      };
    },
  },
  timetable: {
    getSchedules: () => ipcRenderer.invoke('timetable:getSchedules'),
    saveSchedule: (schedule) => ipcRenderer.invoke('timetable:saveSchedule', schedule),
    deleteSchedule: (id) => ipcRenderer.invoke('timetable:deleteSchedule', id),
    getExecutions: (date) => ipcRenderer.invoke('timetable:getExecutions', date),
    toggleExecution: (date, blockId, completed) => ipcRenderer.invoke('timetable:toggleExecution', date, blockId, completed),
  },
  proofs: {
    get: (habitId) => ipcRenderer.invoke('proofs:get', habitId),
    add: (proof) => ipcRenderer.invoke('proofs:add', proof),
    delete: (id, habitId) => ipcRenderer.invoke('proofs:delete', id, habitId),
  },
  stacks: {
    get: () => ipcRenderer.invoke('stacks:get'),
    save: (stack) => ipcRenderer.invoke('stacks:save', stack),
    delete: (id) => ipcRenderer.invoke('stacks:delete', id),
  },
  duels: {
    get: () => ipcRenderer.invoke('duels:get'),
    save: (duel) => ipcRenderer.invoke('duels:save', duel),
    delete: (id) => ipcRenderer.invoke('duels:delete', id),
  },
  focusShield: {
    getConfig: () => ipcRenderer.invoke('focusShield:getConfig'),
    updateConfig: (updates) => ipcRenderer.invoke('focusShield:updateConfig', updates),
    getStats: () => ipcRenderer.invoke('focusShield:getStats'),
    requestBypass: (minutes) => ipcRenderer.invoke('focusShield:requestBypass', minutes),
    recordDeflection: () => ipcRenderer.invoke('focusShield:recordDeflection'),
    setActiveBlock: (title) => ipcRenderer.invoke('focusShield:setActiveBlock', title),
    startLockdown: (durationMins) => ipcRenderer.invoke('focusShield:startLockdown', durationMins),
    stopLockdown: () => ipcRenderer.invoke('focusShield:stopLockdown'),
    getLockdownStatus: () => ipcRenderer.invoke('focusShield:getLockdownStatus'),
    toggleWebShield: (enabled) => ipcRenderer.invoke('focusShield:toggleWebShield', enabled),
    getBlockedDomains: () => ipcRenderer.invoke('focusShield:getBlockedDomains'),
    setBlockedDomains: (domains) => ipcRenderer.invoke('focusShield:setBlockedDomains', domains),
    onViolation: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, violation: any) => callback(violation);
      ipcRenderer.on('focusShield:violation', handler);
      return () => {
        ipcRenderer.removeListener('focusShield:violation', handler);
      };
    },
    onProcessKilled: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('focusShield:killed', handler);
      return () => {
        ipcRenderer.removeListener('focusShield:killed', handler);
      };
    },
  },
};

(api as any).openExternal = (url: string) => ipcRenderer.invoke('os:openExternal', url);

contextBridge.exposeInMainWorld('api', api);

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url: string) => ipcRenderer.invoke('os:openExternal', url),
  checkForUpdates: (manual = true) => ipcRenderer.invoke('updater:check', manual),
  getUpdateStatus: () => ipcRenderer.invoke('updater:get-status'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['updater:status', 'app:update-downloaded', 'app:update-available'];
    if (validChannels.includes(channel)) {
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    }
  },
});
