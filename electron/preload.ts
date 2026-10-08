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

export interface ExportDataPayload {
  habits: HabitData[];
  checkins: CheckinData[];
  settings: Record<string, string>;
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
};

contextBridge.exposeInMainWorld('api', api);
