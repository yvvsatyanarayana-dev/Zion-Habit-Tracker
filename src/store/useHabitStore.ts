import { create } from 'zustand';
import type {
  Habit,
  Checkin,
  AppSettings,
  TabType,
  UserProfile,
  CheckinMood,
  HabitDependency,
  WellnessLog,
  SkipReasonEntry,
  SkillProgress,
  TriggerRule,
  RoutineStack,
  StreakShieldState,
  ShieldEvent,
  ResurrectionQuest,
} from '../lib/types';
import { DEFAULT_SETTINGS, HABIT_PALETTE } from '../lib/constants';
import { formatLocalDate } from '../lib/dateUtils';
import { isHabitScheduledOnDay, computeStreakStats } from '../lib/statsUtils';
import { sound, playShieldProtect } from '../lib/audio';
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

  // New features state
  habitDependencies: HabitDependency[];
  wellnessLogs: Record<string, WellnessLog>; // key: date (YYYY-MM-DD)
  skipReasons: Record<string, SkipReasonEntry>; // key: `${habitId}_${date}`
  skillProgress: Record<string, SkillProgress>; // key: `${userId}_${skillId}`
  triggerRules: TriggerRule[];

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

  // Habit Dependencies actions
  loadDependencies: () => Promise<void>;
  addDependency: (habitId: string, dependsOnId: string, type: 'prerequisite' | 'anti') => Promise<void>;
  removeDependency: (habitId: string, dependsOnId: string) => Promise<void>;
  removeAllDependencies: (habitId: string) => Promise<void>;

  // Wellness Logs actions
  loadWellnessLogs: () => Promise<void>;
  upsertWellnessLog: (log: { id: string; date: string; energy: number; mood: number; note?: string }) => Promise<void>;
  deleteWellnessLog: (date: string) => Promise<void>;

  // Skip Reasons actions
  loadSkipReasons: () => Promise<void>;
  upsertSkipReason: (reason: { id: string; habit_id: string; date: string; reason: 'forgot' | 'busy' | 'sick' | 'resistance' | 'other'; note?: string }) => Promise<void>;
  deleteSkipReason: (id: string) => Promise<void>;

  // Skill Progress actions
  loadSkillProgress: (userId: string) => Promise<void>;
  upsertSkillProgress: (progress: { user_id: string; skill_id: string; level: number; unlocked_at?: string | null }) => Promise<void>;

  // Trigger Rules actions
  loadTriggerRules: () => Promise<void>;
  createTriggerRule: (rule: { id: string; habit_id: string; type: string; config: Record<string, unknown>; enabled?: boolean }) => Promise<void>;
  updateTriggerRule: (id: string, updates: { type?: string; config?: Record<string, unknown>; enabled?: boolean }) => Promise<void>;
  deleteTriggerRule: (id: string) => Promise<void>;

  // Feature 1: Routine Flow Runner & Habit Stacking
  routines: RoutineStack[];
  activeRoutineRunner: RoutineStack | null;
  routineManagerOpen: boolean;
  startRoutineRunner: (routine: RoutineStack) => void;
  closeRoutineRunner: () => void;
  setRoutineManagerOpen: (open: boolean) => void;
  saveRoutine: (routine: Partial<RoutineStack> & { id?: string }) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;

  // Feature 2: "Never Miss Twice" Streak Shields & Recovery Quests
  streakShields: StreakShieldState;
  applyShield: (dateStr: string, reason?: 'auto_freeze' | 'manual_forgiveness', note?: string) => Promise<{ success: boolean; message: string }>;
  startResurrectionQuest: (lostStreak: number) => Promise<void>;
  claimShieldReward: () => Promise<void>;
}

// Fallback in-memory / localStorage helpers when running outside Electron
const LOCAL_STORAGE_KEY_HABITS = 'ht_habits';
const LOCAL_STORAGE_KEY_CHECKINS = 'ht_checkins';
const LOCAL_STORAGE_KEY_SETTINGS = 'ht_settings';
const LOCAL_STORAGE_KEY_USERS = 'ht_users';
const LOCAL_STORAGE_KEY_CURRENT_USER_ID = 'ht_current_user_id';
const LOCAL_STORAGE_KEY_HAS_ONBOARDED = 'ht_has_onboarded';
const LOCAL_STORAGE_KEY_DEPENDENCIES = 'ht_dependencies';
const LOCAL_STORAGE_KEY_WELLNESS_LOGS = 'ht_wellness_logs';
const LOCAL_STORAGE_KEY_SKIP_REASONS = 'ht_skip_reasons';
const LOCAL_STORAGE_KEY_SKILL_PROGRESS = 'ht_skill_progress';
const LOCAL_STORAGE_KEY_TRIGGER_RULES = 'ht_trigger_rules';
const LOCAL_STORAGE_KEY_ROUTINES = 'ht_routines';
const LOCAL_STORAGE_KEY_SHIELDS = 'ht_shields';

const DEFAULT_ROUTINES: RoutineStack[] = [
  {
    id: 'routine-morning-ignition',
    title: 'Morning Ignition Flow',
    description: 'Prime your mind, body, and energy for focused momentum.',
    emoji: '🌅',
    color: '#f59e0b',
    time_of_day: 'morning',
    steps: [
      { id: 'step-1', habit_id: '', duration_minutes: 5, notes: 'Hydrate with 500ml water & deep breathing' },
      { id: 'step-2', habit_id: '', duration_minutes: 10, notes: 'Morning mobility stretch or sunlight exposure' },
      { id: 'step-3', habit_id: '', duration_minutes: 5, notes: 'Identify and write top 3 priority tasks' },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'routine-evening-winddown',
    title: 'Evening Wind-Down',
    description: 'Disconnect, celebrate daily progress, and prepare for restorative sleep.',
    emoji: '🌙',
    color: '#8b5cf6',
    time_of_day: 'evening',
    steps: [
      { id: 'step-e1', habit_id: '', duration_minutes: 10, notes: 'Screens down & switch to warm ambient lighting' },
      { id: 'step-e2', habit_id: '', duration_minutes: 15, notes: 'Read inspiring book chapters or meditate' },
      { id: 'step-e3', habit_id: '', duration_minutes: 5, notes: 'Reflect on wins and plan tomorrow morning' },
    ],
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_SHIELDS: StreakShieldState = {
  available_shields: 2,
  shield_events: [],
  resurrection_quest: null,
};

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

    // New features state
    habitDependencies: [],
    wellnessLogs: {},
    skipReasons: {},
    skillProgress: {},
    triggerRules: [],

    // Feature 1: Routines
    routines: DEFAULT_ROUTINES,
    activeRoutineRunner: null,
    routineManagerOpen: false,

    // Feature 2: Streak Shields
    streakShields: DEFAULT_SHIELDS,

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
          const [dbHabits, dbCheckins, dbSettings, dbDependencies, dbWellnessLogs, dbSkipReasons, dbSkillProgress, dbTriggerRules] = await Promise.all([
            window.api.habits.getAll(true),
            window.api.checkins.getAll(),
            window.api.settings.getAll(),
            window.api.dependencies.getAll(),
            window.api.wellness.getAll(),
            window.api.skipReasons.getForDate(''), // Will return empty for now
            window.api.skills.getAll(''), // Will return empty for now
            window.api.triggers.getAll(),
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

          // Parse wellness logs into map
          const wellnessLogsMap: Record<string, WellnessLog> = {};
          for (const w of dbWellnessLogs) {
            wellnessLogsMap[w.date] = w;
          }

          // Parse skip reasons into map
          const skipReasonsMap: Record<string, SkipReasonEntry> = {};
          // Note: We'll load skip reasons on demand per habit/date

          // Parse skill progress into map
          const skillProgressMap: Record<string, SkillProgress> = {};
          // Note: We'll load skill progress on demand per user

          // Parse trigger rules
          const triggerRules: TriggerRule[] = dbTriggerRules.map(t => ({
            id: t.id,
            habit_id: t.habit_id,
            type: t.type,
            config: JSON.parse(t.config),
            enabled: Boolean(t.enabled),
            created_at: t.created_at,
          }));

          let routines: RoutineStack[] = DEFAULT_ROUTINES;
          const rawRoutines = localStorage.getItem(LOCAL_STORAGE_KEY_ROUTINES);
          if (rawRoutines) {
            try {
              const parsed = JSON.parse(rawRoutines);
              if (Array.isArray(parsed) && parsed.length > 0) routines = parsed;
            } catch {}
          }

          let streakShields: StreakShieldState = DEFAULT_SHIELDS;
          const rawShields = localStorage.getItem(LOCAL_STORAGE_KEY_SHIELDS);
          if (rawShields) {
            try {
              const parsed = JSON.parse(rawShields);
              if (parsed && typeof parsed.available_shields === 'number') {
                streakShields = parsed;
              }
            } catch {}
          }

          document.documentElement.setAttribute('data-theme', loadedSettings.theme || 'dark');
          sound.setEnabled(loadedSettings.sound_enabled ?? true);

          set({
            habits: parsedHabits,
            checkins: checkinsMap,
            allCheckinsList: checkinsList,
            settings: loadedSettings,
            habitDependencies: dbDependencies,
            wellnessLogs: wellnessLogsMap,
            skipReasons: skipReasonsMap,
            skillProgress: skillProgressMap,
            triggerRules,
            routines,
            streakShields,
            currentUser: null,
            usersList,
            authScreen: initialAuthScreen,
            prefilledAuthIdentifier: lastUser ? (lastUser.username || lastUser.email) : '',
            isLoading: false,
          });

          syncTaskbarProgress(parsedHabits, checkinsMap, get().currentDate);
        } else {
          // Browser & Android Capacitor fallback
          const rawHabits = localStorage.getItem(LOCAL_STORAGE_KEY_HABITS);
          const rawCheckins = localStorage.getItem(LOCAL_STORAGE_KEY_CHECKINS);
          const rawSettings = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
          const rawDependencies = localStorage.getItem(LOCAL_STORAGE_KEY_DEPENDENCIES);
          const rawWellnessLogs = localStorage.getItem(LOCAL_STORAGE_KEY_WELLNESS_LOGS);
          const rawSkipReasons = localStorage.getItem(LOCAL_STORAGE_KEY_SKIP_REASONS);
          const rawSkillProgress = localStorage.getItem(LOCAL_STORAGE_KEY_SKILL_PROGRESS);
          const rawTriggerRules = localStorage.getItem(LOCAL_STORAGE_KEY_TRIGGER_RULES);

          const parsedHabits: Habit[] = rawHabits ? JSON.parse(rawHabits) : [];
          const checkinsList: Checkin[] = rawCheckins ? JSON.parse(rawCheckins) : [];
          const checkinsMap: Record<string, Checkin> = {};
          for (const c of checkinsList) {
            checkinsMap[`${c.habit_id}_${c.date}`] = c;
          }

          const parsedSettings: AppSettings = rawSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) } : DEFAULT_SETTINGS;
          const habitDependencies: HabitDependency[] = rawDependencies ? JSON.parse(rawDependencies) : [];

          let wellnessLogs: Record<string, WellnessLog> = {};
          if (rawWellnessLogs) {
            try {
              const parsed = JSON.parse(rawWellnessLogs);
              if (Array.isArray(parsed)) {
                for (const l of parsed) wellnessLogs[l.date] = l;
              } else if (typeof parsed === 'object' && parsed !== null) {
                wellnessLogs = parsed;
              }
            } catch {}
          }

          let skipReasons: Record<string, SkipReasonEntry> = {};
          if (rawSkipReasons) {
            try {
              const parsed = JSON.parse(rawSkipReasons);
              if (Array.isArray(parsed)) {
                for (const s of parsed) skipReasons[`${s.habit_id}_${s.date}`] = s;
              } else if (typeof parsed === 'object' && parsed !== null) {
                skipReasons = parsed;
              }
            } catch {}
          }

          const skillProgress: Record<string, SkillProgress> = rawSkillProgress ? JSON.parse(rawSkillProgress) : {};
          const triggerRules: TriggerRule[] = rawTriggerRules ? JSON.parse(rawTriggerRules) : [];

          let routines: RoutineStack[] = DEFAULT_ROUTINES;
          const rawRoutines = localStorage.getItem(LOCAL_STORAGE_KEY_ROUTINES);
          if (rawRoutines) {
            try {
              const parsed = JSON.parse(rawRoutines);
              if (Array.isArray(parsed) && parsed.length > 0) routines = parsed;
            } catch {}
          }

          let streakShields: StreakShieldState = DEFAULT_SHIELDS;
          const rawShields = localStorage.getItem(LOCAL_STORAGE_KEY_SHIELDS);
          if (rawShields) {
            try {
              const parsed = JSON.parse(rawShields);
              if (parsed && typeof parsed.available_shields === 'number') {
                streakShields = parsed;
              }
            } catch {}
          }

          document.documentElement.setAttribute('data-theme', parsedSettings.theme || 'dark');
          sound.setEnabled(parsedSettings.sound_enabled ?? true);

          set({
            habits: parsedHabits,
            checkins: checkinsMap,
            allCheckinsList: checkinsList,
            settings: parsedSettings,
            habitDependencies,
            wellnessLogs,
            skipReasons,
            skillProgress,
            triggerRules,
            routines,
            streakShields,
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

        // Streak Shield / Resurrection Quest Progression
        const shields = get().streakShields;
        if (shields.resurrection_quest?.active && !shields.resurrection_quest.restored) {
          const quest = shields.resurrection_quest;
          if (!quest.completed_dates.includes(dateStr)) {
            const nextCompletedDates = [...quest.completed_dates, dateStr];
            const isRestored = nextCompletedDates.length >= quest.required_days;
            const nextShields: StreakShieldState = {
              ...shields,
              resurrection_quest: {
                ...quest,
                completed_dates: nextCompletedDates,
                restored: isRestored,
                active: !isRestored,
              },
            };
            localStorage.setItem(LOCAL_STORAGE_KEY_SHIELDS, JSON.stringify(nextShields));
            set({ streakShields: nextShields });
          }
        }
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
        // Attach routines and streak shields to export payload
        const enriched = {
          ...raw,
          routines: get().routines,
          streak_shields: get().streakShields,
        };
        return JSON.stringify(enriched, null, 2);
      }
      return JSON.stringify({
        app: 'Zion Habit Tracker Studio',
        version: '1.1.0',
        exported_at: new Date().toISOString(),
        habits: get().habits,
        checkins: get().allCheckinsList,
        settings: get().settings,
        dependencies: get().habitDependencies,
        wellness_logs: Object.values(get().wellnessLogs),
        skip_reasons: Object.values(get().skipReasons),
        users: get().usersList,
        routines: get().routines,
        streak_shields: get().streakShields,
      }, null, 2);
    },

    importData: async (jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed.routines)) {
          localStorage.setItem(LOCAL_STORAGE_KEY_ROUTINES, JSON.stringify(parsed.routines));
        }
        if (parsed.streak_shields && typeof parsed.streak_shields === 'object') {
          localStorage.setItem(LOCAL_STORAGE_KEY_SHIELDS, JSON.stringify(parsed.streak_shields));
        }

        if (window.api) {
          await window.api.data.import(parsed);
          await get().init();
          return true;
        } else {
          if (Array.isArray(parsed.habits)) {
            localStorage.setItem(LOCAL_STORAGE_KEY_HABITS, JSON.stringify(parsed.habits));
          }
          if (Array.isArray(parsed.checkins)) {
            localStorage.setItem(LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(parsed.checkins));
          }
          if (parsed.settings && typeof parsed.settings === 'object') {
            localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(parsed.settings));
          }
          if (Array.isArray(parsed.dependencies)) {
            localStorage.setItem(LOCAL_STORAGE_KEY_DEPENDENCIES, JSON.stringify(parsed.dependencies));
          }
          if (parsed.wellness_logs) {
            const wMap: Record<string, WellnessLog> = {};
            if (Array.isArray(parsed.wellness_logs)) {
              for (const w of parsed.wellness_logs) wMap[w.date] = w;
            } else if (typeof parsed.wellness_logs === 'object') {
              Object.assign(wMap, parsed.wellness_logs);
            }
            localStorage.setItem(LOCAL_STORAGE_KEY_WELLNESS_LOGS, JSON.stringify(wMap));
          }
          if (parsed.skip_reasons) {
            const sMap: Record<string, SkipReasonEntry> = {};
            if (Array.isArray(parsed.skip_reasons)) {
              for (const s of parsed.skip_reasons) sMap[`${s.habit_id}_${s.date}`] = s;
            } else if (typeof parsed.skip_reasons === 'object') {
              Object.assign(sMap, parsed.skip_reasons);
            }
            localStorage.setItem(LOCAL_STORAGE_KEY_SKIP_REASONS, JSON.stringify(sMap));
          }
          if (Array.isArray(parsed.users) && parsed.users.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(parsed.users));
          }
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
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY_HABITS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_CHECKINS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_SETTINGS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_DEPENDENCIES);
      localStorage.removeItem(LOCAL_STORAGE_KEY_WELLNESS_LOGS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_SKIP_REASONS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_SKILL_PROGRESS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TRIGGER_RULES);
      localStorage.removeItem(LOCAL_STORAGE_KEY_ROUTINES);
      localStorage.removeItem(LOCAL_STORAGE_KEY_SHIELDS);

      set({
        habits: [],
        checkins: {},
        allCheckinsList: [],
        settings: { ...DEFAULT_SETTINGS },
        habitDependencies: [],
        wellnessLogs: {},
        skipReasons: {},
        skillProgress: {},
        triggerRules: [],
        routines: DEFAULT_ROUTINES,
        streakShields: DEFAULT_SHIELDS,
        activeRoutineRunner: null,
        routineManagerOpen: false,
      });
    },

    // Habit Dependencies actions
    loadDependencies: async () => {
      if (window.api) {
        const deps = await window.api.dependencies.getAll();
        set({ habitDependencies: deps });
      } else {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DEPENDENCIES);
          if (raw) set({ habitDependencies: JSON.parse(raw) });
        } catch {}
      }
    },

    addDependency: async (habitId, dependsOnId, type) => {
      if (window.api) {
        await window.api.dependencies.create({ habit_id: habitId, depends_on_id: dependsOnId, type });
        const deps = await window.api.dependencies.getAll();
        set({ habitDependencies: deps });
      } else {
        const newDep: HabitDependency = {
          habit_id: habitId,
          depends_on_id: dependsOnId,
          type,
          created_at: new Date().toISOString(),
        };
        const next = [...get().habitDependencies, newDep];
        localStorage.setItem(LOCAL_STORAGE_KEY_DEPENDENCIES, JSON.stringify(next));
        set({ habitDependencies: next });
      }
    },

    removeDependency: async (habitId, dependsOnId) => {
      if (window.api) {
        await window.api.dependencies.delete(habitId, dependsOnId);
        const deps = await window.api.dependencies.getAll();
        set({ habitDependencies: deps });
      } else {
        const next = get().habitDependencies.filter(
          (d) => !(d.habit_id === habitId && d.depends_on_id === dependsOnId)
        );
        localStorage.setItem(LOCAL_STORAGE_KEY_DEPENDENCIES, JSON.stringify(next));
        set({ habitDependencies: next });
      }
    },

    removeAllDependencies: async (habitId) => {
      if (window.api) {
        await window.api.dependencies.deleteAll(habitId);
        const deps = await window.api.dependencies.getAll();
        set({ habitDependencies: deps });
      } else {
        const next = get().habitDependencies.filter(
          (d) => d.habit_id !== habitId && d.depends_on_id !== habitId
        );
        localStorage.setItem(LOCAL_STORAGE_KEY_DEPENDENCIES, JSON.stringify(next));
        set({ habitDependencies: next });
      }
    },

    // Wellness Logs actions
    loadWellnessLogs: async () => {
      if (window.api) {
        const logs = await window.api.wellness.getAll();
        const logsMap: Record<string, WellnessLog> = {};
        for (const log of logs) {
          logsMap[log.date] = log;
        }
        set({ wellnessLogs: logsMap });
      } else {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY_WELLNESS_LOGS);
          if (raw) set({ wellnessLogs: JSON.parse(raw) });
        } catch {}
      }
    },

    upsertWellnessLog: async (log) => {
      if (window.api) {
        await window.api.wellness.upsert(log);
        const updated = await window.api.wellness.get(log.date);
        if (updated) {
          set((state) => ({
            wellnessLogs: { ...state.wellnessLogs, [log.date]: updated },
          }));
        }
      } else {
        const newLog: WellnessLog = {
          id: log.id,
          date: log.date,
          energy: log.energy,
          mood: log.mood,
          note: log.note || '',
          created_at: new Date().toISOString(),
        };
        const next = { ...get().wellnessLogs, [log.date]: newLog };
        localStorage.setItem(LOCAL_STORAGE_KEY_WELLNESS_LOGS, JSON.stringify(next));
        set({ wellnessLogs: next });
      }
    },

    deleteWellnessLog: async (date) => {
      if (window.api) {
        await window.api.wellness.delete(date);
        const logs = await window.api.wellness.getAll();
        const logsMap: Record<string, WellnessLog> = {};
        for (const log of logs) {
          logsMap[log.date] = log;
        }
        set({ wellnessLogs: logsMap });
      } else {
        const next = { ...get().wellnessLogs };
        delete next[date];
        localStorage.setItem(LOCAL_STORAGE_KEY_WELLNESS_LOGS, JSON.stringify(next));
        set({ wellnessLogs: next });
      }
    },

    // Skip Reasons actions
    loadSkipReasons: async () => {
      if (window.api) {
        // Loaded on demand
      } else {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SKIP_REASONS);
          if (raw) set({ skipReasons: JSON.parse(raw) });
        } catch {}
      }
    },

    upsertSkipReason: async (reason) => {
      if (window.api) {
        await window.api.skipReasons.upsert(reason);
        const updated = await window.api.skipReasons.get(reason.habit_id, reason.date);
        if (updated) {
          set((state) => ({
            skipReasons: { ...state.skipReasons, [`${reason.habit_id}_${reason.date}`]: updated },
          }));
        }
      } else {
        const newReason: SkipReasonEntry = {
          id: reason.id,
          habit_id: reason.habit_id,
          date: reason.date,
          reason: reason.reason,
          note: reason.note || '',
          created_at: new Date().toISOString(),
        };
        const next = { ...get().skipReasons, [`${reason.habit_id}_${reason.date}`]: newReason };
        localStorage.setItem(LOCAL_STORAGE_KEY_SKIP_REASONS, JSON.stringify(next));
        set({ skipReasons: next });
      }
    },

    deleteSkipReason: async (id) => {
      if (window.api) {
        await window.api.skipReasons.delete(id);
      } else {
        const next = { ...get().skipReasons };
        for (const key of Object.keys(next)) {
          if (next[key].id === id) {
            delete next[key];
            break;
          }
        }
        localStorage.setItem(LOCAL_STORAGE_KEY_SKIP_REASONS, JSON.stringify(next));
        set({ skipReasons: next });
      }
    },

    // Skill Progress actions
    loadSkillProgress: async (userId) => {
      if (window.api) {
        const progress = await window.api.skills.getAll(userId);
        const progressMap: Record<string, SkillProgress> = {};
        for (const p of progress) {
          progressMap[`${userId}_${p.skill_id}`] = p;
        }
        set((state) => ({
          skillProgress: { ...state.skillProgress, ...progressMap },
        }));
      }
    },

    upsertSkillProgress: async (progress) => {
      if (window.api) {
        await window.api.skills.upsert(progress);
        const updated = await window.api.skills.get(progress.user_id, progress.skill_id);
        if (updated) {
          set((state) => ({
            skillProgress: { ...state.skillProgress, [`${progress.user_id}_${progress.skill_id}`]: updated },
          }));
        }
      } else {
        const newProgress: SkillProgress = {
          user_id: progress.user_id,
          skill_id: progress.skill_id,
          level: progress.level,
          unlocked_at: progress.unlocked_at || null,
        };
        set((state) => ({
          skillProgress: { ...state.skillProgress, [`${progress.user_id}_${progress.skill_id}`]: newProgress },
        }));
      }
    },

    // Trigger Rules actions
    loadTriggerRules: async () => {
      if (window.api) {
        const rules = await window.api.triggers.getAll();
        const parsedRules: TriggerRule[] = rules.map(r => ({
          id: r.id,
          habit_id: r.habit_id,
          type: r.type,
          config: JSON.parse(r.config),
          enabled: Boolean(r.enabled),
          created_at: r.created_at,
        }));
        set({ triggerRules: parsedRules });
      }
    },

    createTriggerRule: async (rule) => {
      if (window.api) {
        await window.api.triggers.create({
          id: rule.id,
          habit_id: rule.habit_id,
          type: rule.type,
          config: JSON.stringify(rule.config),
          enabled: rule.enabled ? 1 : 0,
        });
        const rules = await window.api.triggers.getAll();
        const parsedRules: TriggerRule[] = rules.map(r => ({
          id: r.id,
          habit_id: r.habit_id,
          type: r.type,
          config: JSON.parse(r.config),
          enabled: Boolean(r.enabled),
          created_at: r.created_at,
        }));
        set({ triggerRules: parsedRules });
      }
    },

    updateTriggerRule: async (id, updates) => {
      if (window.api) {
        await window.api.triggers.update(id, {
          type: updates.type,
          config: updates.config ? JSON.stringify(updates.config) : undefined,
          enabled: updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : undefined,
        });
        const rules = await window.api.triggers.getAll();
        const parsedRules: TriggerRule[] = rules.map(r => ({
          id: r.id,
          habit_id: r.habit_id,
          type: r.type,
          config: JSON.parse(r.config),
          enabled: Boolean(r.enabled),
          created_at: r.created_at,
        }));
        set({ triggerRules: parsedRules });
      }
    },

    deleteTriggerRule: async (id) => {
      if (window.api) {
        await window.api.triggers.delete(id);
        const rules = await window.api.triggers.getAll();
        const parsedRules: TriggerRule[] = rules.map(r => ({
          id: r.id,
          habit_id: r.habit_id,
          type: r.type,
          config: JSON.parse(r.config),
          enabled: Boolean(r.enabled),
          created_at: r.created_at,
        }));
        set({ triggerRules: parsedRules });
      }
    },

    // Routine Flow Runner & Habit Stacking actions
    startRoutineRunner: (routine) => {
      set({ activeRoutineRunner: routine });
    },

    closeRoutineRunner: () => {
      set({ activeRoutineRunner: null });
    },

    setRoutineManagerOpen: (open) => {
      set({ routineManagerOpen: open });
    },

    saveRoutine: async (routineData) => {
      const currentRoutines = get().routines;
      const id = routineData.id || `routine-${Date.now()}`;
      const existingIdx = currentRoutines.findIndex((r) => r.id === id);

      const routineToSave: RoutineStack = {
        id,
        title: routineData.title || 'Untitled Routine',
        description: routineData.description || '',
        emoji: routineData.emoji || '⚡',
        color: routineData.color || '#3b82f6',
        time_of_day: routineData.time_of_day || 'morning',
        steps: routineData.steps || [],
        created_at: routineData.created_at || new Date().toISOString(),
      };

      let nextRoutines: RoutineStack[];
      if (existingIdx >= 0) {
        nextRoutines = [...currentRoutines];
        nextRoutines[existingIdx] = routineToSave;
      } else {
        nextRoutines = [...currentRoutines, routineToSave];
      }

      localStorage.setItem(LOCAL_STORAGE_KEY_ROUTINES, JSON.stringify(nextRoutines));
      set({ routines: nextRoutines });
    },

    deleteRoutine: async (id) => {
      const nextRoutines = get().routines.filter((r) => r.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY_ROUTINES, JSON.stringify(nextRoutines));
      set({ routines: nextRoutines });
    },

    // Streak Shields actions
    applyShield: async (dateStr, reason = 'manual_forgiveness', note) => {
      const currentShields = get().streakShields;
      if (currentShields.available_shields <= 0) {
        return { success: false, message: 'No Streak Shields available! Keep up your streaks to earn more.' };
      }

      // Check if already protected
      if (currentShields.shield_events.some((e) => e.date === dateStr)) {
        return { success: false, message: `Date ${dateStr} is already protected by a streak shield.` };
      }

      const newEvent: ShieldEvent = {
        id: `shield-${Date.now()}`,
        date: dateStr,
        reason,
        note,
        created_at: new Date().toISOString(),
      };

      const updatedState: StreakShieldState = {
        ...currentShields,
        available_shields: Math.max(0, currentShields.available_shields - 1),
        shield_events: [newEvent, ...currentShields.shield_events],
      };

      localStorage.setItem(LOCAL_STORAGE_KEY_SHIELDS, JSON.stringify(updatedState));
      set({ streakShields: updatedState });

      playShieldProtect();

      return {
        success: true,
        message: `Streak Shield deployed! Your streak is safely preserved for ${dateStr}.`,
      };
    },

    startResurrectionQuest: async (lostStreak) => {
      const todayStr = formatLocalDate(get().currentDate);
      const currentShields = get().streakShields;

      const newQuest: ResurrectionQuest = {
        active: true,
        lost_streak_count: lostStreak,
        started_date: todayStr,
        required_days: 3,
        completed_dates: [todayStr],
        restored: false,
      };

      const updatedState: StreakShieldState = {
        ...currentShields,
        resurrection_quest: newQuest,
      };

      localStorage.setItem(LOCAL_STORAGE_KEY_SHIELDS, JSON.stringify(updatedState));
      set({ streakShields: updatedState });
    },

    claimShieldReward: async () => {
      const currentShields = get().streakShields;
      if (currentShields.available_shields >= 3) return;

      const updatedState: StreakShieldState = {
        ...currentShields,
        available_shields: Math.min(3, currentShields.available_shields + 1),
      };

      localStorage.setItem(LOCAL_STORAGE_KEY_SHIELDS, JSON.stringify(updatedState));
      set({ streakShields: updatedState });
      sound.playCelebration();
    },
  };
});
