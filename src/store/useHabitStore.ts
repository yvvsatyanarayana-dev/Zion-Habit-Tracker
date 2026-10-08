import { create } from 'zustand';
import type { Habit, Checkin, AppSettings, TabType, UserProfile, CheckinMood } from '../lib/types';
import { DEFAULT_SETTINGS, HABIT_PALETTE } from '../lib/constants';
import { formatLocalDate } from '../lib/dateUtils';
import { isHabitScheduledOnDay } from '../lib/statsUtils';
import { sound } from '../lib/audio';
import type { ElectronAPI } from '../../electron/preload';

declare global {
  interface Window {
    api?: ElectronAPI;
  }
}

const syncTaskbarProgress = (habits: Habit[], checkins: Record<string, Checkin>, currentDate: Date) => {
  if (typeof window !== 'undefined' && window.api?.os?.setProgressBar) {
    const todayStr = formatLocalDate(currentDate);
    const todayWday = currentDate.getDay();
    const activeHabits = habits.filter((h) => !h.archived);
    const scheduledToday = activeHabits.filter((h) => isHabitScheduledOnDay(h, todayWday));
    const doneToday = scheduledToday.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length;

    if (scheduledToday.length === 0) {
      window.api.os.setProgressBar(-1);
    } else if (doneToday >= scheduledToday.length) {
      window.api.os.setProgressBar(-1);
    } else {
      window.api.os.setProgressBar(doneToday / scheduledToday.length);
    }
  }
};

interface HabitStoreState {
  habits: Habit[];
  checkins: Record<string, Checkin>; // key: `${habitId}_${date}`
  allCheckinsList: Checkin[];
  settings: AppSettings;
  
  // User Authentication & Profile
  currentUser: UserProfile | null;
  usersList: UserProfile[];
  authScreen: 'register' | 'login' | 'app';
  prefilledAuthIdentifier: string;
  authMessage: string | null;

  // Navigation & Time
  currentDate: Date;
  selectedYear: number;
  selectedMonth: number; // 0-11
  activeTab: TabType;
  
  // UI states & Filters
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  habitModalOpen: boolean;
  editingHabit: Habit | null;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string; // 'all' | 'health' | 'mind' | 'work' | 'routine'
  setSelectedCategory: (cat: string) => void;
  weeklyReviewOpen: boolean;
  setWeeklyReviewOpen: (open: boolean) => void;
  reflectionModal: { isOpen: boolean; habitId: string; dateStr: string } | null;
  openReflectionModal: (habitId: string, dateStr: string) => void;
  closeReflectionModal: () => void;
  todayTrigger: number;
  
  // Actions
  init: () => Promise<void>;
  setTab: (tab: TabType) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openHabitModal: (habit?: Habit) => void;
  closeHabitModal: () => void;
  
  // Auth actions
  setAuthScreen: (screen: 'register' | 'login' | 'app', message?: string) => void;
  registerUser: (userData: {
    name: string;
    username: string;
    email: string;
    avatarColor?: string;
    avatarEmoji?: string;
    bio?: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginUser: (identifier: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  switchUser: (userId: string) => void;
  
  // Date actions
  prevMonth: () => void;
  nextMonth: () => void;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  jumpToToday: () => void;
  tickClock: (newDate: Date) => void;
  
  // Data actions
  toggleCheckin: (habitId: string, dateStr: string) => Promise<void>;
  updateNumericValue: (habitId: string, dateStr: string, deltaOrValue: number, isDelta?: boolean) => Promise<void>;
  updateCheckinDetails: (habitId: string, dateStr: string, details: { note?: string; mood?: CheckinMood }) => Promise<void>;
  toggleSound: () => Promise<void>;
  saveHabit: (habit: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  archiveHabit: (id: string) => Promise<void>;
  reorderHabits: (ids: string[]) => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  toggleTheme: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (jsonStr: string) => Promise<boolean>;
  resetAllData: () => Promise<void>;
}

// Fallback in-memory / localStorage helpers when running outside Electron
const LOCAL_STORAGE_KEY_HABITS = 'ht_habits';
const LOCAL_STORAGE_KEY_CHECKINS = 'ht_checkins';
const LOCAL_STORAGE_KEY_SETTINGS = 'ht_settings';
const LOCAL_STORAGE_KEY_USERS = 'ht_users';
const LOCAL_STORAGE_KEY_CURRENT_USER_ID = 'ht_current_user_id';
const LOCAL_STORAGE_KEY_HAS_ONBOARDED = 'ht_has_onboarded';

const getInitialAuthState = (): {
  currentUser: UserProfile | null;
  usersList: UserProfile[];
  authScreen: 'register' | 'login' | 'app';
  prefilledAuthIdentifier: string;
} => {
  if (typeof window === 'undefined') {
    return {
      currentUser: null,
      usersList: [],
      authScreen: 'register',
      prefilledAuthIdentifier: '',
    };
  }

  let users: UserProfile[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
    if (raw) users = JSON.parse(raw);
  } catch {}

  const currentId = localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT_USER_ID);
  const lastUser = users.find((u) => u.id === currentId) || users[0] || null;
  const hasOnboarded =
    localStorage.getItem(LOCAL_STORAGE_KEY_HAS_ONBOARDED) === 'true' || users.length > 0;

  // Requirement: Every time the app is opened, the login page should appear.
  // First time install only: show user creation ('register'). All other times: always show 'login'!
  let authScreen: 'register' | 'login' | 'app' = 'login';
  if (!hasOnboarded) {
    authScreen = 'register';
  } else {
    authScreen = 'login';
  }

  return {
    currentUser: null, // Require authentication every time app is opened
    usersList: users,
    authScreen,
    prefilledAuthIdentifier: lastUser ? (lastUser.username || lastUser.email || '') : '',
  };
};

export const useHabitStore = create<HabitStoreState>((set, get) => {
  const now = new Date();
  const initialAuth = getInitialAuthState();

  return {
    habits: [],
    checkins: {},
    allCheckinsList: [],
    settings: { ...DEFAULT_SETTINGS },
    
    // Auth & Profile state
    currentUser: initialAuth.currentUser,
    usersList: initialAuth.usersList,
    authScreen: initialAuth.authScreen,
    prefilledAuthIdentifier: initialAuth.prefilledAuthIdentifier,
    authMessage: null,

    currentDate: now,
    selectedYear: now.getFullYear(),
    selectedMonth: now.getMonth(),
    activeTab: 'dashboard',
    
    sidebarCollapsed: false,
    commandPaletteOpen: false,
    habitModalOpen: false,
    editingHabit: null,
    isLoading: true,
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    selectedCategory: 'all',
    setSelectedCategory: (cat) => set({ selectedCategory: cat }),
    weeklyReviewOpen: false,
    setWeeklyReviewOpen: (open) => set({ weeklyReviewOpen: open }),
    reflectionModal: null,
    openReflectionModal: (habitId, dateStr) => set({ reflectionModal: { isOpen: true, habitId, dateStr } }),
    closeReflectionModal: () => set({ reflectionModal: null }),
    todayTrigger: 0,

    init: async () => {
      set({ isLoading: true });
      try {
        // Load user profiles
        let usersList: UserProfile[] = [];
        const rawUsers = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
        if (rawUsers) {
          try {
            usersList = JSON.parse(rawUsers);
          } catch {}
        }

        const currentUserId = localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT_USER_ID);
        const lastUser = usersList.find((u) => u.id === currentUserId) || usersList[0] || null;
        const hasOnboarded =
          localStorage.getItem(LOCAL_STORAGE_KEY_HAS_ONBOARDED) === 'true' ||
          usersList.length > 0;

        // Requirement: Every time the app is opened, the login page should appear
        let initialAuthScreen: 'register' | 'login' | 'app' = 'login';
        if (!hasOnboarded) {
          initialAuthScreen = 'register';
        } else {
          initialAuthScreen = 'login';
        }

        if (window.api) {
          // Electron environment
          const [dbHabits, dbCheckins, dbSettings] = await Promise.all([
            window.api.habits.getAll(true),
            window.api.checkins.getAll(),
            window.api.settings.getAll(),
          ]);

          const parsedHabits: Habit[] = dbHabits.map((h) => ({
            id: h.id,
            name: h.name,
            emoji: h.emoji || '',
            color: h.color,
            monthly_goal: Number(h.monthly_goal) || 30,
            schedule_days: JSON.parse(h.schedule_days || '[0,1,2,3,4,5,6]'),
            sort_order: Number(h.sort_order) || 0,
            archived: Boolean(h.archived),
            created_at: h.created_at,
            type: (h.type as any) || 'boolean',
            target_value: Number(h.target_value) || 1,
            unit: h.unit || '',
            category: (h.category as any) || 'routine',
          }));

          const checkinsMap: Record<string, Checkin> = {};
          const checkinsList: Checkin[] = dbCheckins.map((c) => {
            const item: Checkin = {
              id: c.id,
              habit_id: c.habit_id,
              date: c.date,
              completed: Boolean(c.completed),
              note: c.note || '',
              updated_at: c.updated_at,
              value: c.value !== undefined ? Number(c.value) : (c.completed ? 1 : 0),
              mood: (c.mood as any) || undefined,
            };
            checkinsMap[`${c.habit_id}_${c.date}`] = item;
            return item;
          });

          const loadedSettings: AppSettings = { ...DEFAULT_SETTINGS };
          if (dbSettings) {
            for (const [k, v] of Object.entries(dbSettings)) {
              if (k in loadedSettings) {
                try {
                  (loadedSettings as any)[k] = JSON.parse(v);
                } catch {
                  (loadedSettings as any)[k] = v;
                }
              }
            }
          }

          document.documentElement.setAttribute('data-theme', loadedSettings.theme || 'dark');
          sound.setEnabled(loadedSettings.sound_enabled ?? true);

          set({
            habits: parsedHabits,
            checkins: checkinsMap,
            allCheckinsList: checkinsList,
            settings: loadedSettings,
            currentUser: null,
            usersList,
            authScreen: initialAuthScreen,
            prefilledAuthIdentifier: lastUser ? (lastUser.username || lastUser.email) : '',
            isLoading: false,
          });

          syncTaskbarProgress(parsedHabits, checkinsMap, get().currentDate);
        } else {
          // Browser fallback
          const rawHabits = localStorage.getItem(LOCAL_STORAGE_KEY_HABITS);
          const rawCheckins = localStorage.getItem(LOCAL_STORAGE_KEY_CHECKINS);
          const rawSettings = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);

          const parsedHabits: Habit[] = rawHabits ? JSON.parse(rawHabits) : [];
          const checkinsList: Checkin[] = rawCheckins ? JSON.parse(rawCheckins) : [];
          const checkinsMap: Record<string, Checkin> = {};
          for (const c of checkinsList) {
            checkinsMap[`${c.habit_id}_${c.date}`] = c;
          }

          const parsedSettings: AppSettings = rawSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) } : DEFAULT_SETTINGS;

          document.documentElement.setAttribute('data-theme', parsedSettings.theme || 'dark');

          set({
            habits: parsedHabits,
            checkins: checkinsMap,
            allCheckinsList: checkinsList,
            settings: parsedSettings,
            currentUser: null,
            usersList,
            authScreen: initialAuthScreen,
            prefilledAuthIdentifier: lastUser ? (lastUser.username || lastUser.email) : '',
            isLoading: false,
          });
        }
      } catch (err) {
        console.error('Failed to init store:', err);
        set({ isLoading: false });
      }
    },

    setTab: (tab) => set({ activeTab: tab }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    
    openHabitModal: (habit) => set({ habitModalOpen: true, editingHabit: habit || null }),
    closeHabitModal: () => set({ habitModalOpen: false, editingHabit: null }),

    prevMonth: () => {
      set((s) => {
        if (s.selectedMonth === 0) {
          return { selectedMonth: 11, selectedYear: s.selectedYear - 1 };
        }
        return { selectedMonth: s.selectedMonth - 1 };
      });
    },

    nextMonth: () => {
      set((s) => {
        if (s.selectedMonth === 11) {
          return { selectedMonth: 0, selectedYear: s.selectedYear + 1 };
        }
        return { selectedMonth: s.selectedMonth + 1 };
      });
    },

    setMonth: (month) => set({ selectedMonth: month }),
    setYear: (year) => set({ selectedYear: year }),

    jumpToToday: () => {
      const now = new Date();
      const currentTab = get().activeTab;
      // If already on habits, stay on habits. If on dashboard, stay on dashboard.
      // If on other pages (analytics, streaks, settings), navigate to habits so user can track today's habits!
      const targetTab = currentTab === 'dashboard' ? 'dashboard' : 'habits';

      set((state) => ({
        activeTab: targetTab,
        currentDate: now,
        selectedYear: now.getFullYear(),
        selectedMonth: now.getMonth(),
        searchQuery: '',
        todayTrigger: state.todayTrigger + 1,
      }));
    },

    tickClock: (newDate) => {
      const prev = get().currentDate;
      const prevDateStr = formatLocalDate(prev);
      const newDateStr = formatLocalDate(newDate);

      if (prevDateStr !== newDateStr) {
        // Midnight rollover detected!
        set({
          currentDate: newDate,
          selectedYear: newDate.getFullYear(),
          selectedMonth: newDate.getMonth(),
        });
      } else {
        set({ currentDate: newDate });
      }
    },

    toggleCheckin: async (habitId, dateStr) => {
      const key = `${habitId}_${dateStr}`;
      const existing = get().checkins[key];
      const habit = get().habits.find((h) => h.id === habitId);
      const nextCompleted = !existing?.completed;

      // Play audio feedback
      if (nextCompleted) {
        sound.playCheckin();
        const todayStr = formatLocalDate(get().currentDate);
        if (dateStr === todayStr) {
          const todayWday = get().currentDate.getDay();
          const scheduledToday = get().habits.filter((h) => !h.archived && isHabitScheduledOnDay(h, todayWday));
          const willAllBeDone = scheduledToday.every(
            (h) => h.id === habitId || get().checkins[`${h.id}_${todayStr}`]?.completed
          );
          if (willAllBeDone && scheduledToday.length > 0) {
            sound.playCelebration();
          }
        }
      } else {
        sound.playUncheck();
      }

      const now = new Date().toISOString();
      const numTarget = habit?.target_value ?? 1;
      const updatedItem: Checkin = {
        id: `${habitId}_${dateStr}`,
        habit_id: habitId,
        date: dateStr,
        completed: nextCompleted,
        note: existing?.note || '',
        updated_at: now,
        value: nextCompleted ? numTarget : 0,
        mood: existing?.mood,
      };

      // 1. Instant optimistic update (<50ms)
      const nextCheckins = { ...get().checkins, [key]: updatedItem };
      const nextList = get().allCheckinsList.filter((c) => !(c.habit_id === habitId && c.date === dateStr));
      if (nextCompleted) {
        nextList.push(updatedItem);
      }

      set({
        checkins: nextCheckins,
        allCheckinsList: nextList,
      });

      syncTaskbarProgress(get().habits, nextCheckins, get().currentDate);

      // 2. Persist to SQLite / storage
      if (window.api) {
        try {
          await window.api.checkins.toggle(
            habitId,
            dateStr,
            nextCompleted,
            updatedItem.note,
            updatedItem.value,
            updatedItem.mood
          );
        } catch (err) {
          console.error('IPC toggleCheckin failed:', err);
        }
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(nextList));
      }
    },

    updateNumericValue: async (habitId, dateStr, deltaOrValue, isDelta = false) => {
      const key = `${habitId}_${dateStr}`;
      const existing = get().checkins[key];
      const habit = get().habits.find((h) => h.id === habitId);
      const targetVal = habit?.target_value ?? 1;
      const currentVal = existing?.value ?? (existing?.completed ? targetVal : 0);
      const nextVal = Math.max(0, isDelta ? currentVal + deltaOrValue : deltaOrValue);
      const nextCompleted = nextVal >= targetVal;

      if (nextCompleted && !existing?.completed) {
        sound.playCheckin();
      } else {
        sound.playClick();
      }

      const now = new Date().toISOString();
      const updatedItem: Checkin = {
        id: `${habitId}_${dateStr}`,
        habit_id: habitId,
        date: dateStr,
        completed: nextCompleted,
        note: existing?.note || '',
        updated_at: now,
        value: nextVal,
        mood: existing?.mood,
      };

      const nextCheckins = { ...get().checkins, [key]: updatedItem };
      const nextList = get().allCheckinsList.filter((c) => !(c.habit_id === habitId && c.date === dateStr));
      nextList.push(updatedItem);

      set({
        checkins: nextCheckins,
        allCheckinsList: nextList,
      });

      syncTaskbarProgress(get().habits, nextCheckins, get().currentDate);

      if (window.api) {
        try {
          await window.api.checkins.toggle(
            habitId,
            dateStr,
            nextCompleted,
            updatedItem.note,
            nextVal,
            updatedItem.mood
          );
        } catch (err) {
          console.error('IPC toggle checkin failed:', err);
        }
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(nextList));
      }
    },

    updateCheckinDetails: async (habitId, dateStr, details) => {
      const key = `${habitId}_${dateStr}`;
      const existing = get().checkins[key];
      const habit = get().habits.find((h) => h.id === habitId);
      const now = new Date().toISOString();
      const updatedItem: Checkin = {
        id: `${habitId}_${dateStr}`,
        habit_id: habitId,
        date: dateStr,
        completed: existing?.completed ?? true,
        note: details.note !== undefined ? details.note : (existing?.note || ''),
        updated_at: now,
        value: existing?.value ?? (habit?.target_value ?? 1),
        mood: details.mood !== undefined ? details.mood : existing?.mood,
      };

      sound.playReflectionSaved();

      const nextCheckins = { ...get().checkins, [key]: updatedItem };
      const nextList = get().allCheckinsList.filter((c) => !(c.habit_id === habitId && c.date === dateStr));
      nextList.push(updatedItem);

      set({
        checkins: nextCheckins,
        allCheckinsList: nextList,
      });

      if (window.api) {
        try {
          await window.api.checkins.toggle(
            habitId,
            dateStr,
            updatedItem.completed,
            updatedItem.note,
            updatedItem.value,
            updatedItem.mood
          );
        } catch (err) {
          console.error('IPC toggle details failed:', err);
        }
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(nextList));
      }
    },

    toggleSound: async () => {
      const current = get().settings.sound_enabled ?? true;
      const next = !current;
      sound.setEnabled(next);
      await get().updateSetting('sound_enabled', next);
    },

    saveHabit: async (habitData) => {
      const habits = get().habits;
      const isEditing = Boolean(habitData.id);

      if (isEditing) {
        const id = habitData.id!;
        const updatedHabits = habits.map((h) => {
          if (h.id === id) {
            return {
              ...h,
              ...habitData,
            } as Habit;
          }
          return h;
        });

        set({ habits: updatedHabits });

        const updatedHabit = updatedHabits.find((h) => h.id === id);
        if (window.api && updatedHabit) {
          await window.api.habits.update({
            id,
            name: updatedHabit.name,
            emoji: updatedHabit.emoji,
            color: updatedHabit.color,
            monthly_goal: updatedHabit.monthly_goal,
            schedule_days: JSON.stringify(updatedHabit.schedule_days || [0, 1, 2, 3, 4, 5, 6]),
            sort_order: updatedHabit.sort_order,
            archived: updatedHabit.archived ? 1 : 0,
            type: updatedHabit.type || 'boolean',
            target_value: updatedHabit.target_value ?? 1,
            unit: updatedHabit.unit || '',
            category: updatedHabit.category || 'routine',
          });
        } else {
          localStorage.setItem(LOCAL_STORAGE_KEY_HABITS, JSON.stringify(updatedHabits));
        }
      } else {
        // Create new habit
        const usedColors = new Set(habits.map((h) => h.color));
        const autoColor = HABIT_PALETTE.find((c) => !usedColors.has(c)) || HABIT_PALETTE[habits.length % HABIT_PALETTE.length];

        const newHabit: Habit = {
          id: `h_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: habitData.name || 'New Habit',
          emoji: habitData.emoji || '',
          color: habitData.color || autoColor,
          monthly_goal: habitData.monthly_goal || 30,
          schedule_days: habitData.schedule_days || [0, 1, 2, 3, 4, 5, 6],
          sort_order: habits.length,
          archived: false,
          created_at: new Date().toISOString(),
          type: habitData.type || 'boolean',
          target_value: habitData.target_value ?? 1,
          unit: habitData.unit || '',
          category: habitData.category || 'routine',
        };

        const updatedHabits = [...habits, newHabit];
        set({ habits: updatedHabits });

        if (window.api) {
          await window.api.habits.create({
            id: newHabit.id,
            name: newHabit.name,
            emoji: newHabit.emoji,
            color: newHabit.color,
            monthly_goal: newHabit.monthly_goal,
            schedule_days: JSON.stringify(newHabit.schedule_days),
            sort_order: newHabit.sort_order,
            archived: 0,
            created_at: newHabit.created_at,
            type: newHabit.type,
            target_value: newHabit.target_value,
            unit: newHabit.unit,
            category: newHabit.category,
          });
        } else {
          localStorage.setItem(LOCAL_STORAGE_KEY_HABITS, JSON.stringify(updatedHabits));
        }
      }
    },

    deleteHabit: async (id) => {
      const updatedHabits = get().habits.filter((h) => h.id !== id);
      const updatedCheckins = { ...get().checkins };
      for (const k of Object.keys(updatedCheckins)) {
        if (k.startsWith(`${id}_`)) {
          delete updatedCheckins[k];
        }
      }
      const updatedList = get().allCheckinsList.filter((c) => c.habit_id !== id);

      set({
        habits: updatedHabits,
        checkins: updatedCheckins,
        allCheckinsList: updatedList,
      });

      if (window.api) {
        await window.api.habits.delete(id);
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_HABITS, JSON.stringify(updatedHabits));
        localStorage.setItem(LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(updatedList));
      }
    },

    archiveHabit: async (id) => {
      const habit = get().habits.find((h) => h.id === id);
      if (!habit) return;
      await get().saveHabit({ id, archived: !habit.archived });
    },

    reorderHabits: async (ids) => {
      const habitsMap = new Map(get().habits.map((h) => [h.id, h]));
      const newHabits: Habit[] = [];
      ids.forEach((id, index) => {
        const h = habitsMap.get(id);
        if (h) {
          newHabits.push({ ...h, sort_order: index });
        }
      });

      set({ habits: newHabits });

      if (window.api) {
        await window.api.habits.reorder(ids);
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_HABITS, JSON.stringify(newHabits));
      }
    },

    updateSetting: async (key, value) => {
      const nextSettings = { ...get().settings, [key]: value };
      set({ settings: nextSettings });

      if (key === 'theme') {
        document.documentElement.setAttribute('data-theme', value as string);
      }

      if (window.api) {
        await window.api.settings.save(key as string, JSON.stringify(value));
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(nextSettings));
      }
    },

    toggleTheme: async () => {
      const currentTheme = get().settings.theme || 'dark';
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      await get().updateSetting('theme', nextTheme);
    },

    // Auth & Profile actions
    setAuthScreen: (screen, message) => {
      set({
        authScreen: screen,
        authMessage: message || null,
      });
    },

    registerUser: async (userData) => {
      const users = get().usersList;
      const usernameClean = userData.username.trim().replace(/^@/, '').toLowerCase();
      const emailClean = userData.email.trim().toLowerCase();

      // Check if username or email already exists
      const existing = users.find(
        (u) =>
          u.username.toLowerCase() === usernameClean ||
          u.email.toLowerCase() === emailClean
      );
      if (existing) {
        return { success: false, error: 'A profile with this email or username already exists' };
      }

      const newUser: UserProfile = {
        id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: userData.name.trim(),
        username: usernameClean,
        email: emailClean,
        avatarColor: userData.avatarColor || '#6366f1',
        avatarEmoji: userData.avatarEmoji || '',
        bio: userData.bio?.trim() || 'Building consistent daily habits with Studio.',
        password: userData.password || '',
        created_at: new Date().toISOString(),
      };

      const updatedUsers = [...users, newUser];
      localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
      localStorage.setItem(LOCAL_STORAGE_KEY_HAS_ONBOARDED, 'true');

      // As specifically requested: "first create user creating page then once user created login page should open after the main app"
      set({
        usersList: updatedUsers,
        authScreen: 'login',
        prefilledAuthIdentifier: newUser.username,
        authMessage: 'Profile created successfully! Please enter your password to sign in.',
      });

      return { success: true };
    },

    loginUser: async (identifier, password) => {
      const users = get().usersList;
      const idClean = identifier.trim().toLowerCase().replace(/^@/, '');

      const user = users.find(
        (u) =>
          u.username.toLowerCase() === idClean ||
          u.email.toLowerCase() === idClean
      );

      if (!user) {
        return { success: false, error: 'No profile found with this username or email' };
      }

      if (user.password && user.password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER_ID, user.id);
      localStorage.setItem(LOCAL_STORAGE_KEY_HAS_ONBOARDED, 'true');

      set({
        currentUser: user,
        authScreen: 'app',
        authMessage: null,
        activeTab: 'dashboard',
      });

      return { success: true };
    },

    logoutUser: () => {
      localStorage.removeItem(LOCAL_STORAGE_KEY_CURRENT_USER_ID);
      localStorage.setItem(LOCAL_STORAGE_KEY_HAS_ONBOARDED, 'true');
      set({
        currentUser: null,
        authScreen: 'login',
        authMessage: 'You have signed out. Log in to resume tracking.',
      });
    },

    updateProfile: async (data) => {
      const current = get().currentUser;
      if (!current) return;

      const updated: UserProfile = { ...current, ...data };
      const updatedUsers = get().usersList.map((u) => (u.id === current.id ? updated : u));

      localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER_ID, updated.id);

      set({
        currentUser: updated,
        usersList: updatedUsers,
      });
    },

    switchUser: (userId) => {
      const targetUser = get().usersList.find((u) => u.id === userId);
      if (targetUser) {
        localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER_ID, targetUser.id);
        set({
          currentUser: targetUser,
          authScreen: 'app',
          authMessage: null,
        });
      } else {
        set({
          currentUser: null,
          authScreen: 'login',
          prefilledAuthIdentifier: '',
          authMessage: null,
        });
      }
    },

    exportData: async () => {
      if (window.api) {
        const raw = await window.api.data.export();
        return JSON.stringify(raw, null, 2);
      }
      return JSON.stringify({
        habits: get().habits,
        checkins: get().allCheckinsList,
        settings: get().settings,
      }, null, 2);
    },

    importData: async (jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (window.api) {
          await window.api.data.import(parsed);
          await get().init();
          return true;
        } else {
          localStorage.setItem(LOCAL_STORAGE_KEY_HABITS, JSON.stringify(parsed.habits || []));
          localStorage.setItem(LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(parsed.checkins || []));
          localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(parsed.settings || {}));
          await get().init();
          return true;
        }
      } catch (err) {
        console.error('Import error:', err);
        return false;
      }
    },

    resetAllData: async () => {
      if (window.api) {
        await window.api.data.reset();
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY_HABITS);
        localStorage.removeItem(LOCAL_STORAGE_KEY_CHECKINS);
        localStorage.removeItem(LOCAL_STORAGE_KEY_SETTINGS);
      }
      set({
        habits: [],
        checkins: {},
        allCheckinsList: [],
        settings: { ...DEFAULT_SETTINGS },
      });
    },
  };
});
