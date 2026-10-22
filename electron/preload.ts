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
    setProgressBar: (progress: number) => Promise<void>;
  };
  habits: {
    getAll: (includeArchived?: boolean) => Promise<HabitData[]>;
    create: (habit: HabitData) => Promise<HabitData[]>;
    update: (habit: Partial<HabitData> & { id: string }) => Promise<HabitData[]>;
    delete: (id: string) => Promise<HabitData[]>;
    reorder: (ids: string[]) => Promise<HabitData[]>;
  };
  checkins: {
    getMonth: (yearMonth: string) => Promise<CheckinData[]>;
    getAll: () => Promise<CheckinData[]>;
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
  };
  notify: (title: string, body: string) => Promise<boolean>;
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
    setProgressBar: (progress: number) => ipcRenderer.invoke('os:setProgressBar', progress),
  },
  habits: {
    getAll: (includeArchived) => ipcRenderer.invoke('habits:getAll', includeArchived),
    create: (habit) => ipcRenderer.invoke('habits:create', habit),
    update: (habit) => ipcRenderer.invoke('habits:update', habit),
    delete: (id) => ipcRenderer.invoke('habits:delete', id),
    reorder: (ids) => ipcRenderer.invoke('habits:reorder', ids),
  },
  checkins: {
    getMonth: (yearMonth) => ipcRenderer.invoke('checkins:getMonth', yearMonth),
    getAll: () => ipcRenderer.invoke('checkins:getAll'),
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
  },
  notify: (title, body) => ipcRenderer.invoke('app:notify', title, body),
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
};

contextBridge.exposeInMainWorld('api', api);
