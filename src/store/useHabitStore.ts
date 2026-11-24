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
  FocusSession,
  SoundscapeType,
  ActiveHabitTimer,
  TimetableSchedule,
  TimetableBlock,
  TimetableCategory,
  HabitProof,
  HabitStack,
  P2PDuel,
} from '../lib/types';
import { parseTimetableMarkdown, calculateBlockDurationMinutes } from '../lib/timetableParser';
import { syncAndroidWidget, syncPendingWidgetToggles } from '../lib/androidWidgetBridge';
import {
  type UserRpgProfile,
  type SkillBranch,
  createInitialRpgProfile,
  awardXpToProfile,
  mapCategoryToBranch,
} from '../lib/levelingSystem';
import { cascadeShiftBlocks, snapBlockToNow } from '../lib/scheduleCascade';
import { APP_VERSION, DEFAULT_SETTINGS, HABIT_PALETTE } from '../lib/constants';
import { formatLocalDate } from '../lib/dateUtils';
import { isHabitScheduledOnDay, computeStreakStats } from '../lib/statsUtils';
import { sound, playShieldProtect } from '../lib/audio';
import { soundscapeEngine } from '../lib/soundscapes';
import { syncAndroidDailyReminder } from '../lib/reminders';
import type { ElectronAPI } from '../../electron/preload';

declare global {
  interface Window {
    api?: ElectronAPI;
  }
}

const applyThemeToDom = (theme: string) => {
  const resolved = theme === 'light' ? 'light' : 'dark';
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolved);
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = resolved === 'light' ? '#f8fafc' : '#09090b';
  }
};

const syncTaskbarProgress = (habits: Habit[], checkins: Record<string, Checkin>, currentDate: Date) => {
  if (typeof window !== 'undefined' && window.api?.os?.setProgressBar) {
    const todayStr = formatLocalDate(currentDate);
    const todayWday = currentDate.getDay();
    const activeHabits = habits.filter((h) => !h.archived);
    const scheduledToday = activeHabits.filter((h) => isHabitScheduledOnDay(h, todayWday));
    const doneToday = scheduledToday.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length;

    if (scheduledToday.length === 0 || doneToday <= 0 || doneToday >= scheduledToday.length) {
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
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
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
  loadUserData: (userId: string) => Promise<void>;

  // Date actions
  prevMonth: () => void;
  nextMonth: () => void;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  jumpToToday: () => void;
  selectDate: (date: Date) => void;
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
  uninstallApp: () => Promise<void>;

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

  // Feature 4 & 5: Deep Focus Studio, Share Card & Wellness Modal
  focusStudioOpen: boolean;
  setFocusStudioOpen: (open: boolean) => void;
  shareCardOpen: boolean;
  setShareCardOpen: (open: boolean) => void;
  wellnessModalOpen: boolean;
  setWellnessModalOpen: (open: boolean) => void;
  focusSessions: FocusSession[];
  logFocusSession: (session: {
    habit_id?: string;
    habit_name: string;
    duration_minutes: number;
    soundscape: SoundscapeType;
    autoCheckin?: boolean;
  }) => Promise<void>;

  // Feature 6: Real-Time Persistent Per-Habit Timer
  activeHabitTimer: ActiveHabitTimer | null;
  startHabitTimer: (habit: Habit, overrideMinutes?: number, mode?: 'countdown' | 'stopwatch') => void;
  pauseHabitTimer: () => void;
  resumeHabitTimer: () => void;
  extendHabitTimer: (extraMinutes: number) => void;
  stopAndLogHabitTimer: (autoCheckin?: boolean) => Promise<number>;
  discardHabitTimer: () => void;
  setHabitTimerSoundscape: (soundscape: SoundscapeType) => void;
  markHabitTimerTargetNotified: () => void;

  // Feature 7: Studio Timetable & Daily Schedule Planner
  timetableSchedules: TimetableSchedule[];
  timetableExecutions: Record<string, boolean>; // key: `${date}_${blockId}`
  activeScheduleId: string | null;
  timetableImportModalOpen: boolean;
  timetableBlockModalOpen: boolean;
  selectedTimetableBlock: TimetableBlock | null;
  selectedScheduleIdForBlock: string | null;
  loadTimetableSchedules: () => Promise<void>;
  saveTimetableSchedule: (schedule: TimetableSchedule) => Promise<void>;
  deleteTimetableSchedule: (scheduleId: string) => Promise<void>;
  saveTimetableBlock: (scheduleId: string, block: TimetableBlock) => Promise<void>;
  deleteTimetableBlock: (scheduleId: string, blockId: string) => Promise<void>;
  toggleTimetableExecution: (date: string, blockId: string) => Promise<void>;
  setActiveScheduleId: (id: string | null) => void;
  setTimetableImportModalOpen: (open: boolean) => void;
  setTimetableBlockModalOpen: (open: boolean, block?: TimetableBlock | null, scheduleId?: string | null) => void;
  clearAllTimetableSchedules: () => Promise<void>;
  importTimetableMarkdown: (content: string) => Promise<number>;
  startTimetableBlockTimer: (block: TimetableBlock) => void;

  // Feature 8: RPG Leveling & Skill Tree Engine
  rpgProfile: UserRpgProfile;
  rpgSkillTreeModalOpen: boolean;
  setRpgSkillTreeModalOpen: (open: boolean) => void;
  awardXp: (amount: number, branch: SkillBranch, sourceTitle: string) => void;

  // Feature 9: Smart Schedule Shift & Adaptive Routine
  cascadeShiftActiveSchedule: (startingBlockId: string, shiftMinutes: number) => Promise<void>;
  snapBlockToCurrentTime: (blockId: string) => Promise<void>;

  // Feature 10: Interactive Timetable Timeline & Zen Studio
  timetableTimelineViewMode: 'list' | 'timeline';
  setTimetableTimelineViewMode: (mode: 'list' | 'timeline') => void;
  zenStudioModalOpen: boolean;
  setZenStudioModalOpen: (open: boolean) => void;

  // Feature 11: App Blocker & Focus Shield
  focusShieldModalOpen: boolean;
  setFocusShieldModalOpen: (open: boolean) => void;

  // Feature: The Ghost Protocol (Offline AI Debrief)
  ghostDebriefOpen: boolean;
  setGhostDebriefOpen: (open: boolean) => void;

  // Feature 12: Habit Stacking & Synergy Graph
  habitStacks: HabitStack[];
  synergyGraphModalOpen: boolean;
  loadHabitStacks: () => Promise<void>;
  saveHabitStack: (stack: { id?: string; parent_habit_id: string; child_habit_id: string; cue_trigger?: 'immediate' | '15m_after' | 'evening'; synergy_score?: number }) => Promise<void>;
  deleteHabitStack: (id: string) => Promise<void>;
  setSynergyGraphModalOpen: (open: boolean) => void;

  // Feature 13: Identity Proof Journaling & Time Capsule
  habitProofs: HabitProof[];
  timeCapsuleModalOpen: boolean;
  timeCapsuleHabitId: string | null;
  loadHabitProofs: (habitId?: string) => Promise<void>;
  addHabitProof: (proof: { habit_id: string; date: string; image_data: string; audio_data?: string; caption?: string }) => Promise<void>;
  deleteHabitProof: (id: string, habitId?: string) => Promise<void>;
  setTimeCapsuleModalOpen: (open: boolean, habitId?: string | null) => void;

  // Feature 14: P2P Accountability Duels
  p2pDuels: P2PDuel[];
  p2pDuelModalOpen: boolean;
  loadP2PDuels: () => Promise<void>;
  saveP2PDuel: (duel: P2PDuel) => Promise<void>;
  deleteP2PDuel: (id: string) => Promise<void>;
  setP2PDuelModalOpen: (open: boolean) => void;

  // Ultra-Advanced Features: Dopamine Vault, Titan Boss Battles, AI Vision Sentinel
  hardcoreLockdownModalOpen: boolean;
  setHardcoreLockdownModalOpen: (open: boolean) => void;
  titanBossArenaModalOpen: boolean;
  setTitanBossArenaModalOpen: (open: boolean) => void;
  aiVisionSentinelModalOpen: boolean;
  setAiVisionSentinelModalOpen: (open: boolean) => void;
  circadianModalOpen: boolean;
  setCircadianModalOpen: (open: boolean) => void;
  androidWidgetStudioOpen: boolean;
  setAndroidWidgetStudioOpen: (open: boolean) => void;
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
const LOCAL_STORAGE_KEY_FOCUS_SESSIONS = 'ht_focus_sessions';
const LOCAL_STORAGE_KEY_ACTIVE_TIMER = 'ht_active_habit_timer';
const LOCAL_STORAGE_KEY_HABIT_FOCUS_GOALS = 'ht_habit_focus_goals';
const LOCAL_STORAGE_KEY_TIMETABLE_SCHEDULES = 'ht_timetable_schedules';
const LOCAL_STORAGE_KEY_TIMETABLE_EXECUTIONS = 'ht_timetable_executions';

const loadHabitFocusGoals = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_HABIT_FOCUS_GOALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
};

const saveHabitFocusGoal = (habitId: string, minutes?: number) => {
  const map = loadHabitFocusGoals();
  if (minutes && minutes > 0) {
    map[habitId] = minutes;
  } else {
    delete map[habitId];
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_HABIT_FOCUS_GOALS, JSON.stringify(map));
};

const persistActiveTimer = (timer: ActiveHabitTimer | null) => {
  if (timer) {
    localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_TIMER, JSON.stringify(timer));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_TIMER);
  }
  if (typeof window !== 'undefined' && window.api?.desktopTimer?.sync) {
    void window.api.desktopTimer.sync(timer);
  }
};

const DEFAULT_ROUTINES: RoutineStack[] = [
  {
    id: 'routine-morning-ignition',
    title: 'Morning Ignition Flow',
    description: 'Prime your mind, body, and energy for focused momentum.',
    emoji: 'sun',
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
    emoji: 'moon',
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

    // Feature 4 & 5: Deep Focus Studio, Share Card & Wellness Modal
    focusStudioOpen: false,
    setFocusStudioOpen: (open) => set({ focusStudioOpen: open }),
    shareCardOpen: false,
    setShareCardOpen: (open) => set({ shareCardOpen: open }),
    wellnessModalOpen: false,
    setWellnessModalOpen: (open) => set({ wellnessModalOpen: open }),
    focusSessions: [],
    activeHabitTimer: null,

    // Feature 7: Studio Timetable & Daily Schedule Planner
    timetableSchedules: [],
    timetableExecutions: {},
    activeScheduleId: null,
    timetableImportModalOpen: false,
    timetableBlockModalOpen: false,
    selectedTimetableBlock: null,
    selectedScheduleIdForBlock: null,
    timetableTimelineViewMode: 'list',
    zenStudioModalOpen: false,
    focusShieldModalOpen: false,
    setFocusShieldModalOpen: (open) => set({ focusShieldModalOpen: open }),
    ghostDebriefOpen: false,
    setGhostDebriefOpen: (open) => set({ ghostDebriefOpen: open }),

    // Feature 12: Habit Stacking & Synergy Graph
    habitStacks: [],
    synergyGraphModalOpen: false,

    // Feature 13: Identity Proof Journaling & Time Capsule
    habitProofs: [],
    timeCapsuleModalOpen: false,
    timeCapsuleHabitId: null,

    // Feature 14: P2P Accountability Duels
    p2pDuels: [],
    p2pDuelModalOpen: false,

    // Ultra-Advanced Systems
    hardcoreLockdownModalOpen: false,
    setHardcoreLockdownModalOpen: (open) => set({ hardcoreLockdownModalOpen: open }),
    titanBossArenaModalOpen: false,
    setTitanBossArenaModalOpen: (open) => set({ titanBossArenaModalOpen: open }),
    aiVisionSentinelModalOpen: false,
    setAiVisionSentinelModalOpen: (open) => set({ aiVisionSentinelModalOpen: open }),
    circadianModalOpen: false,
    setCircadianModalOpen: (open) => set({ circadianModalOpen: open }),
    androidWidgetStudioOpen: false,
    setAndroidWidgetStudioOpen: (open) => set({ androidWidgetStudioOpen: open }),
    // Feature 8: RPG Leveling & Skill Tree Engine
    rpgProfile: (() => {
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('zion_rpg_profile') : null;
        return saved ? JSON.parse(saved) : createInitialRpgProfile();
      } catch {
        return createInitialRpgProfile();
      }
    })(),
    rpgSkillTreeModalOpen: false,

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
    mobileMenuOpen: false,
    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
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
            window.api.habits.getAll(true, lastUser?.id),
            window.api.checkins.getAll(lastUser?.id),
            window.api.settings.getAll(),
            window.api.dependencies.getAll(),
            window.api.wellness.getAll(),
            window.api.skipReasons.getForDate(''), // Will return empty for now
            window.api.skills.getAll(''), // Will return empty for now
            window.api.triggers.getAll(),
          ]);

          const focusGoalsMap = loadHabitFocusGoals();
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
            daily_focus_minutes: focusGoalsMap[h.id],
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

          // Parse trigger rules safely
          const triggerRules: TriggerRule[] = dbTriggerRules.map(t => {
            let parsedCfg = {};
            try {
              parsedCfg = typeof t.config === 'string' ? JSON.parse(t.config || '{}') : (t.config || {});
            } catch {}
            return {
              id: t.id,
              habit_id: t.habit_id,
              type: t.type,
              config: parsedCfg as any,
              enabled: Boolean(t.enabled),
              created_at: t.created_at,
            };
          });

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

          let focusSessions: FocusSession[] = [];
          const rawFocusSessions = localStorage.getItem(LOCAL_STORAGE_KEY_FOCUS_SESSIONS);
          if (rawFocusSessions) {
            try {
              const parsed = JSON.parse(rawFocusSessions);
              if (Array.isArray(parsed)) focusSessions = parsed;
            } catch {}
          }

          let activeHabitTimer: ActiveHabitTimer | null = null;
          const rawActiveTimer = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_TIMER);
          if (rawActiveTimer) {
            try {
              const parsed = JSON.parse(rawActiveTimer);
              if (parsed && parsed.habitId) activeHabitTimer = parsed;
            } catch {}
          }
          if (!activeHabitTimer && window.api?.desktopTimer?.get) {
            try {
              const osTimer = await window.api.desktopTimer.get();
              if (osTimer && (osTimer as ActiveHabitTimer).habitId) {
                activeHabitTimer = osTimer as ActiveHabitTimer;
              }
            } catch {}
          }
          if (activeHabitTimer && window.api?.desktopTimer?.sync) {
            void window.api.desktopTimer.sync(activeHabitTimer);
          }

          applyThemeToDom(loadedSettings.theme || 'dark');
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
            focusSessions,
            activeHabitTimer,
            currentUser: null,
            usersList,
            authScreen: initialAuthScreen,
            prefilledAuthIdentifier: lastUser ? (lastUser.username || lastUser.email) : '',
            isLoading: false,
          });

          syncTaskbarProgress(parsedHabits, checkinsMap, get().currentDate);
          await Promise.all([
            get().loadTimetableSchedules(),
            get().loadHabitStacks(),
            get().loadHabitProofs(),
            get().loadP2PDuels(),
          ]);
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

          let parsedHabits: Habit[] = [];
          if (rawHabits) {
            try {
              const h = JSON.parse(rawHabits);
              if (Array.isArray(h)) {
                const focusGoalsMap = loadHabitFocusGoals();
                parsedHabits = h.map((item) => ({
                  ...item,
                  daily_focus_minutes: item.daily_focus_minutes ?? focusGoalsMap[item.id],
                }));
              }
            } catch {}
          }

          let checkinsList: Checkin[] = [];
          if (rawCheckins) {
            try {
              const c = JSON.parse(rawCheckins);
              if (Array.isArray(c)) checkinsList = c;
            } catch {}
          }
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

          let focusSessions: FocusSession[] = [];
          const rawFocusSessions = localStorage.getItem(LOCAL_STORAGE_KEY_FOCUS_SESSIONS);
          if (rawFocusSessions) {
            try {
              const parsed = JSON.parse(rawFocusSessions);
              if (Array.isArray(parsed)) focusSessions = parsed;
            } catch {}
          }

          let activeHabitTimer: ActiveHabitTimer | null = null;
          const rawActiveTimer = localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_TIMER);
          if (rawActiveTimer) {
            try {
              const parsed = JSON.parse(rawActiveTimer);
              if (parsed && parsed.habitId) activeHabitTimer = parsed;
            } catch {}
          }

          applyThemeToDom(parsedSettings.theme || 'dark');
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
            focusSessions,
            activeHabitTimer,
            currentUser: null,
            usersList,
            authScreen: initialAuthScreen,
            prefilledAuthIdentifier: lastUser ? (lastUser.username || lastUser.email) : '',
            isLoading: false,
          });

          await Promise.all([
            get().loadTimetableSchedules(),
            get().loadHabitStacks(),
            get().loadHabitProofs(),
            get().loadP2PDuels(),
          ]);
        }

        // Real-Time Android Home Screen Widget sync & pending check-ins
        void syncAndroidWidget({
          habits: get().habits,
          checkins: get().checkins,
          streak: computeStreakStats(get().habits, get().allCheckinsList, get().settings.streak_threshold, get().currentDate).currentStreak,
          currentDate: get().currentDate,
          activeTimer: get().activeHabitTimer ? {
            habitName: get().activeHabitTimer!.habitName,
            remainingSeconds: Math.max(0, get().activeHabitTimer!.targetSeconds - get().activeHabitTimer!.accumulatedSeconds),
            isRunning: Boolean(get().activeHabitTimer!.startedAtMs),
          } : null,
        });
        void syncPendingWidgetToggles((hId, dStr) => get().toggleCheckin(hId, dStr), get().currentDate);
      } catch (err) {
        console.error('Failed to init store:', err);
        set({ isLoading: false });
      }
    },

    setTab: (tab) => set({ activeTab: tab }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    setSidebarCollapsed: (collapsed) => set((s) => (s.sidebarCollapsed === collapsed ? s : { sidebarCollapsed: collapsed })),
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

    selectDate: (date) => {
      set((state) => ({
        currentDate: date,
        selectedYear: date.getFullYear(),
        selectedMonth: date.getMonth(),
        todayTrigger: state.todayTrigger + 1,
      }));
    },

    tickClock: (newDate) => {
      const prev = get().currentDate;
      const prevDateStr = formatLocalDate(prev);
      const newDateStr = formatLocalDate(newDate);

      if (prevDateStr !== newDateStr) {
        // Real-time midnight rollover detected!
        set({
          currentDate: newDate,
          selectedYear: newDate.getFullYear(),
          selectedMonth: newDate.getMonth(),
        });
        syncTaskbarProgress(get().habits, get().checkins, newDate);
      }
    },

    toggleCheckin: async (habitId, dateStr) => {
      const todayStr = formatLocalDate(get().currentDate);
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;
      const allowPast = get().settings.allow_past_edits ?? false;
      const allowFuture = get().settings.allow_future_edits ?? false;

      // Strict date validation: prevent tampering with past/future dates unless explicitly allowed
      if (isPast && !allowPast) {
        return;
      }
      if (isFuture && !allowFuture) {
        return;
      }

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
        if (habit) {
          get().awardXp(50, mapCategoryToBranch(habit.category || 'routine'), habit.name);
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
        const uid = get().currentUser?.id;
        localStorage.setItem(uid ? `zion_checkins_${uid}` : LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(nextList));
      }

      // Synchronize changes to native Android home screen widget immediately
      void syncAndroidWidget({
        habits: get().habits,
        checkins: nextCheckins,
        streak: computeStreakStats(get().habits, nextList, get().settings.streak_threshold, get().currentDate).currentStreak,
        currentDate: get().currentDate,
        activeTimer: get().activeHabitTimer ? {
          habitName: get().activeHabitTimer!.habitName,
          remainingSeconds: Math.max(0, get().activeHabitTimer!.targetSeconds - get().activeHabitTimer!.accumulatedSeconds),
          isRunning: Boolean(get().activeHabitTimer!.startedAtMs),
        } : null,
      });
    },

    updateNumericValue: async (habitId, dateStr, deltaOrValue, isDelta = false) => {
      const todayStr = formatLocalDate(get().currentDate);
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;
      const allowPast = get().settings.allow_past_edits ?? false;
      const allowFuture = get().settings.allow_future_edits ?? false;

      if (isPast && !allowPast) {
        return;
      }
      if (isFuture && !allowFuture) {
        return;
      }

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
        const uid = get().currentUser?.id;
        localStorage.setItem(uid ? `zion_checkins_${uid}` : LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(nextList));
      }

      // Synchronize changes to native Android home screen widget immediately
      void syncAndroidWidget({
        habits: get().habits,
        checkins: nextCheckins,
        streak: computeStreakStats(get().habits, nextList, get().settings.streak_threshold, get().currentDate).currentStreak,
        currentDate: get().currentDate,
        activeTimer: get().activeHabitTimer ? {
          habitName: get().activeHabitTimer!.habitName,
          remainingSeconds: Math.max(0, get().activeHabitTimer!.targetSeconds - get().activeHabitTimer!.accumulatedSeconds),
          isRunning: Boolean(get().activeHabitTimer!.startedAtMs),
        } : null,
      });
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
        const uid = get().currentUser?.id;
        localStorage.setItem(uid ? `zion_checkins_${uid}` : LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(nextList));
      }

      // Synchronize changes to native Android home screen widget immediately
      void syncAndroidWidget({
        habits: get().habits,
        checkins: nextCheckins,
        streak: computeStreakStats(get().habits, nextList, get().settings.streak_threshold, get().currentDate).currentStreak,
        currentDate: get().currentDate,
        activeTimer: get().activeHabitTimer ? {
          habitName: get().activeHabitTimer!.habitName,
          remainingSeconds: Math.max(0, get().activeHabitTimer!.targetSeconds - get().activeHabitTimer!.accumulatedSeconds),
          isRunning: Boolean(get().activeHabitTimer!.startedAtMs),
        } : null,
      });
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
        if (updatedHabit) {
          saveHabitFocusGoal(id, updatedHabit.daily_focus_minutes);
        }
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

        const currentUserId = get().currentUser?.id || localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT_USER_ID) || '';

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
          daily_focus_minutes: habitData.daily_focus_minutes,
          user_id: currentUserId,
        };

        saveHabitFocusGoal(newHabit.id, newHabit.daily_focus_minutes);
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
            user_id: currentUserId,
          });
        } else {
          localStorage.setItem(currentUserId ? `zion_habits_${currentUserId}` : LOCAL_STORAGE_KEY_HABITS, JSON.stringify(updatedHabits));
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
        const uid = get().currentUser?.id;
        localStorage.setItem(uid ? `zion_habits_${uid}` : LOCAL_STORAGE_KEY_HABITS, JSON.stringify(updatedHabits));
        localStorage.setItem(uid ? `zion_checkins_${uid}` : LOCAL_STORAGE_KEY_CHECKINS, JSON.stringify(updatedList));
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
        const uid = get().currentUser?.id;
        localStorage.setItem(uid ? `zion_habits_${uid}` : LOCAL_STORAGE_KEY_HABITS, JSON.stringify(newHabits));
      }
    },

    updateSetting: async (key, value) => {
      const nextSettings = { ...get().settings, [key]: value };
      set({ settings: nextSettings });

      if (key === 'theme') {
        applyThemeToDom(value as string);
      } else if (key === 'sound_enabled') {
        sound.setEnabled(Boolean(value));
      } else if (key === 'reminder_time') {
        await syncAndroidDailyReminder((value as string) || '');
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

      // Load user-scoped routines and habits in real time
      await get().loadUserData(user.id);

      return { success: true };
    },

    logoutUser: () => {
      localStorage.removeItem(LOCAL_STORAGE_KEY_CURRENT_USER_ID);
      localStorage.setItem(LOCAL_STORAGE_KEY_HAS_ONBOARDED, 'true');
      set({
        currentUser: null,
        authScreen: 'login',
        authMessage: 'You have signed out. Log in to resume tracking.',
        habits: [],
        checkins: {},
        allCheckinsList: [],
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

    switchUser: async (userId) => {
      const targetUser = get().usersList.find((u) => u.id === userId);
      if (targetUser) {
        localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER_ID, targetUser.id);
        set({
          currentUser: targetUser,
          authScreen: 'app',
          authMessage: null,
        });
        await get().loadUserData(targetUser.id);
      } else {
        set({
          currentUser: null,
          authScreen: 'login',
          prefilledAuthIdentifier: '',
          authMessage: null,
          habits: [],
          checkins: {},
          allCheckinsList: [],
        });
      }
    },

    loadUserData: async (userId: string) => {
      set({ isLoading: true });
      try {
        if (window.api) {
          const [dbHabits, dbCheckins, dbDependencies, dbWellnessLogs, dbTriggerRules] = await Promise.all([
            window.api.habits.getAll(true, userId),
            window.api.checkins.getAll(userId),
            window.api.dependencies.getAll(),
            window.api.wellness.getAll(),
            window.api.triggers.getAll(),
          ]);

          const focusGoalsMap = loadHabitFocusGoals();
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
            daily_focus_minutes: focusGoalsMap[h.id],
            user_id: h.user_id || userId,
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

          const wellnessLogsMap: Record<string, WellnessLog> = {};
          for (const w of dbWellnessLogs) {
            wellnessLogsMap[w.date] = w;
          }

          const parsedTriggerRules: TriggerRule[] = dbTriggerRules.map((t) => ({
            id: t.id,
            habit_id: t.habit_id,
            type: t.type,
            config: typeof t.config === 'string' ? JSON.parse(t.config || '{}') : t.config,
            enabled: Boolean(t.enabled),
            created_at: t.created_at,
          }));

          set({
            habits: parsedHabits,
            checkins: checkinsMap,
            allCheckinsList: checkinsList,
            habitDependencies: dbDependencies,
            wellnessLogs: wellnessLogsMap,
            triggerRules: parsedTriggerRules,
            isLoading: false,
          });
        } else {
          // LocalStorage multi-user fallback
          const userHabitsKey = `zion_habits_${userId}`;
          const userCheckinsKey = `zion_checkins_${userId}`;
          let parsedHabits: Habit[] = [];
          const rawHabits = localStorage.getItem(userHabitsKey);
          if (rawHabits) {
            try { parsedHabits = JSON.parse(rawHabits); } catch {}
          } else {
            const legacy = localStorage.getItem(LOCAL_STORAGE_KEY_HABITS);
            if (legacy) {
              try { parsedHabits = JSON.parse(legacy); } catch {}
            }
          }

          let checkinsMap: Record<string, Checkin> = {};
          const rawCheckins = localStorage.getItem(userCheckinsKey);
          if (rawCheckins) {
            try { checkinsMap = JSON.parse(rawCheckins); } catch {}
          } else {
            const legacyCheckins = localStorage.getItem(LOCAL_STORAGE_KEY_CHECKINS);
            if (legacyCheckins) {
              try { checkinsMap = JSON.parse(legacyCheckins); } catch {}
            }
          }

          set({
            habits: parsedHabits,
            checkins: checkinsMap,
            allCheckinsList: Object.values(checkinsMap),
            isLoading: false,
          });
        }
      } catch (err) {
        console.error('Error loading user-scoped data:', err);
        set({ isLoading: false });
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
          focus_sessions: get().focusSessions,
        };
        return JSON.stringify(enriched, null, 2);
      }
      return JSON.stringify({
        app: 'Zion Habit Tracker Studio',
        version: APP_VERSION,
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
        focus_sessions: get().focusSessions,
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
        if (Array.isArray(parsed.focus_sessions)) {
          localStorage.setItem(LOCAL_STORAGE_KEY_FOCUS_SESSIONS, JSON.stringify(parsed.focus_sessions));
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
      if (window.api?.data?.reset) {
        await window.api.data.reset();
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      soundscapeEngine.stop();

      try {
        if (typeof window !== 'undefined' && window.api?.desktopTimer?.sendAction) {
          void window.api.desktopTimer.sendAction('discard');
        }
      } catch {}

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
        focusSessions: [],
        activeHabitTimer: null,
        activeRoutineRunner: null,
        routineManagerOpen: false,
        timetableSchedules: [],
        timetableExecutions: {},
        activeScheduleId: null,
        habitStacks: [],
        habitProofs: [],
        p2pDuels: [],
        currentUser: null,
        usersList: [],
        authScreen: 'register',
        prefilledAuthIdentifier: '',
        authMessage: null,
        activeTab: 'dashboard',
      });
    },

    uninstallApp: async () => {
      soundscapeEngine.stop();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      if (window.api?.data?.uninstall) {
        await window.api.data.uninstall();
      } else {
        // Fallback for web mode
        try {
          if (typeof window !== 'undefined' && 'indexedDB' in window) {
            const dbs = await window.indexedDB.databases?.();
            if (dbs) {
              for (const d of dbs) {
                if (d.name) window.indexedDB.deleteDatabase(d.name);
              }
            }
          }
        } catch {}
        window.location.reload();
      }
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
        emoji: routineData.emoji || 'zap',
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

    logFocusSession: async ({ habit_id, habit_name, duration_minutes, soundscape, autoCheckin }) => {
      const todayStr = formatLocalDate(get().currentDate);
      const newSession: FocusSession = {
        id: `fs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        habit_id,
        habit_name,
        duration_minutes,
        soundscape,
        date: todayStr,
        completed_at: new Date().toISOString(),
      };

      const nextSessions = [newSession, ...(get().focusSessions || [])].slice(0, 500);
      localStorage.setItem(LOCAL_STORAGE_KEY_FOCUS_SESSIONS, JSON.stringify(nextSessions));
      set({ focusSessions: nextSessions });

      if (autoCheckin && habit_id) {
        const habit = get().habits.find((h) => h.id === habit_id);
        if (habit) {
          if (habit.type === 'numeric') {
            await get().updateNumericValue(habit.id, todayStr, duration_minutes, true);
          } else {
            const existing = get().checkins[`${habit.id}_${todayStr}`];
            if (!existing?.completed) {
              await get().toggleCheckin(habit.id, todayStr);
            }
          }
        }
      }

      sound.playCelebration();
    },

    startHabitTimer: (habit, overrideMinutes, mode = 'countdown') => {
      const existing = get().activeHabitTimer;
      if (existing && existing.habitId === habit.id) {
        // Resume if paused
        if (!existing.startedAtMs) {
          const resumed: ActiveHabitTimer = { ...existing, startedAtMs: Date.now() };
          persistActiveTimer(resumed);
          set({ activeHabitTimer: resumed });
          if (resumed.soundscape !== 'none') soundscapeEngine.play(resumed.soundscape);
        }
        return;
      }

      const targetMins =
        overrideMinutes ??
        (habit.daily_focus_minutes && habit.daily_focus_minutes > 0
          ? habit.daily_focus_minutes
          : habit.type === 'numeric' && (habit.unit || '').toLowerCase().includes('min')
          ? habit.target_value || 25
          : 25);

      const newTimer: ActiveHabitTimer = {
        habitId: habit.id,
        habitName: habit.name,
        habitColor: habit.color || '#6366f1',
        habitEmoji: habit.emoji || 'target',
        targetSeconds: Math.max(60, Math.round(targetMins * 60)),
        accumulatedSeconds: 0,
        startedAtMs: Date.now(),
        mode,
        soundscape: existing?.soundscape || 'none',
        notifiedTargetReached: false,
      };

      persistActiveTimer(newTimer);
      set({ activeHabitTimer: newTimer });
      if (newTimer.soundscape !== 'none') soundscapeEngine.play(newTimer.soundscape);
      sound.playClick();
    },

    pauseHabitTimer: () => {
      const t = get().activeHabitTimer;
      if (!t || !t.startedAtMs) return;
      const elapsedDelta = Math.max(0, Math.floor((Date.now() - t.startedAtMs) / 1000));
      const paused: ActiveHabitTimer = {
        ...t,
        accumulatedSeconds: t.accumulatedSeconds + elapsedDelta,
        startedAtMs: null,
      };
      persistActiveTimer(paused);
      set({ activeHabitTimer: paused });
      soundscapeEngine.stop();
    },

    resumeHabitTimer: () => {
      const t = get().activeHabitTimer;
      if (!t || t.startedAtMs) return;
      const resumed: ActiveHabitTimer = {
        ...t,
        startedAtMs: Date.now(),
      };
      persistActiveTimer(resumed);
      set({ activeHabitTimer: resumed });
      if (resumed.soundscape !== 'none') soundscapeEngine.play(resumed.soundscape);
    },

    extendHabitTimer: (extraMinutes: number) => {
      const t = get().activeHabitTimer;
      if (!t) return;
      const extraSeconds = extraMinutes * 60;
      const updated: ActiveHabitTimer = {
        ...t,
        targetSeconds: t.targetSeconds + extraSeconds,
        notifiedTargetReached: false,
      };
      persistActiveTimer(updated);
      set({ activeHabitTimer: updated });
      sound.playClick();
    },

    stopAndLogHabitTimer: async (autoCheckin = true) => {
      const t = get().activeHabitTimer;
      if (!t) return 0;

      const elapsedDelta = t.startedAtMs ? Math.max(0, Math.floor((Date.now() - t.startedAtMs) / 1000)) : 0;
      const totalSeconds = t.accumulatedSeconds + elapsedDelta;
      const elapsedMinutes = Math.max(1, Math.round(totalSeconds / 60));

      soundscapeEngine.stop();
      persistActiveTimer(null);
      set({ activeHabitTimer: null });

      if (totalSeconds >= 10) {
        await get().logFocusSession({
          habit_id: t.habitId,
          habit_name: t.habitName,
          duration_minutes: elapsedMinutes,
          soundscape: t.soundscape,
          autoCheckin,
        });
      }
      return elapsedMinutes;
    },

    discardHabitTimer: () => {
      soundscapeEngine.stop();
      persistActiveTimer(null);
      set({ activeHabitTimer: null });
    },

    setHabitTimerSoundscape: (soundscape) => {
      const t = get().activeHabitTimer;
      if (!t) return;
      const next: ActiveHabitTimer = { ...t, soundscape };
      persistActiveTimer(next);
      set({ activeHabitTimer: next });
      if (next.startedAtMs) {
        if (soundscape === 'none') soundscapeEngine.stop();
        else soundscapeEngine.play(soundscape);
      }
    },

    markHabitTimerTargetNotified: () => {
      const t = get().activeHabitTimer;
      if (!t || t.notifiedTargetReached) return;
      const next: ActiveHabitTimer = { ...t, notifiedTargetReached: true };
      persistActiveTimer(next);
      set({ activeHabitTimer: next });
    },

    // ─────────────────────────────────────────────
    // Feature 7: Studio Timetable & Daily Schedule
    // ─────────────────────────────────────────────
    loadTimetableSchedules: async () => {
      const todayStr = formatLocalDate(get().currentDate);
      let schedules: TimetableSchedule[] = [];
      const executionsMap: Record<string, boolean> = {};

      if (typeof window !== 'undefined' && window.api?.timetable) {
        try {
          const dbSchedules = await window.api.timetable.getSchedules();
          if (Array.isArray(dbSchedules) && dbSchedules.length > 0) {
            schedules = dbSchedules.map((s: any) => ({
              id: s.id,
              title: s.title,
              description: s.description,
              daysOfWeek: typeof s.days_of_week === 'string' ? JSON.parse(s.days_of_week) : s.days_of_week,
              isActive: Boolean(s.is_active),
              createdAt: s.created_at,
              updatedAt: s.updated_at,
              blocks: (s.blocks || []).map((b: any) => ({
                id: b.id,
                scheduleId: b.schedule_id,
                title: b.title,
                startTime: b.start_time,
                endTime: b.end_time,
                category: b.category as TimetableCategory,
                color: b.color,
                icon: b.emoji || 'clock',
                emoji: b.emoji,
                description: b.description,
                soundAlert: Boolean(b.sound_enabled),
                linkedHabitId: b.habit_id || undefined,
                sortOrder: b.sort_order,
              })),
            }));
          }

          const dbExecutions = await window.api.timetable.getExecutions(todayStr);
          if (Array.isArray(dbExecutions)) {
            for (const e of dbExecutions) {
              if (e.completed) executionsMap[`${e.date}_${e.block_id}`] = true;
            }
          }
        } catch (err) {
          console.error('Failed to load timetables from DB:', err);
        }
      } else {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TIMETABLE_SCHEDULES);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) schedules = parsed;
          } catch {}
        }
        const rawExec = localStorage.getItem(LOCAL_STORAGE_KEY_TIMETABLE_EXECUTIONS);
        if (rawExec) {
          try {
            const parsed = JSON.parse(rawExec);
            if (parsed && typeof parsed === 'object') Object.assign(executionsMap, parsed);
          } catch {}
        }
      }

      // No hardcoding or auto-population: purely user-driven & real-time
      const activeId = get().activeScheduleId || (schedules.length > 0 ? schedules[0].id : null);
      set({
        timetableSchedules: schedules,
        timetableExecutions: executionsMap,
        activeScheduleId: activeId,
      });
    },

    clearAllTimetableSchedules: async () => {
      const schedules = get().timetableSchedules;
      if (typeof window !== 'undefined' && window.api?.timetable) {
        for (const s of schedules) {
          try {
            await window.api.timetable.deleteSchedule(s.id);
          } catch (err) {
            console.error('Error deleting schedule:', err);
          }
        }
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY_TIMETABLE_SCHEDULES);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TIMETABLE_EXECUTIONS);
      set({
        timetableSchedules: [],
        timetableExecutions: {},
        activeScheduleId: null,
      });
    },

    saveTimetableSchedule: async (schedule) => {
      const current = get().timetableSchedules;
      const exists = current.some((s) => s.id === schedule.id);
      const next = exists ? current.map((s) => (s.id === schedule.id ? schedule : s)) : [...current, schedule];

      set({ timetableSchedules: next, activeScheduleId: schedule.id });

      if (typeof window !== 'undefined' && window.api?.timetable) {
        await window.api.timetable.saveSchedule({
          id: schedule.id,
          title: schedule.title,
          description: schedule.description,
          days_of_week: JSON.stringify(schedule.daysOfWeek),
          is_active: schedule.isActive ? 1 : 0,
          blocks: schedule.blocks.map((b) => ({
            id: b.id,
            schedule_id: schedule.id,
            title: b.title,
            start_time: b.startTime,
            end_time: b.endTime,
            category: b.category,
            description: b.description || '',
            color: b.color,
            emoji: b.icon || b.emoji || 'clock',
            sound_enabled: b.soundAlert ? 1 : 0,
            habit_id: b.linkedHabitId || null,
            sort_order: b.sortOrder,
          })),
        });
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_TIMETABLE_SCHEDULES, JSON.stringify(next));
      }
    },

    deleteTimetableSchedule: async (scheduleId) => {
      const current = get().timetableSchedules;
      const next = current.filter((s) => s.id !== scheduleId);
      const nextActive = next.length > 0 ? next[0].id : null;
      set({ timetableSchedules: next, activeScheduleId: nextActive });

      if (typeof window !== 'undefined' && window.api?.timetable) {
        await window.api.timetable.deleteSchedule(scheduleId);
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_TIMETABLE_SCHEDULES, JSON.stringify(next));
      }
    },

    saveTimetableBlock: async (scheduleId, block) => {
      const schedules = get().timetableSchedules;
      const targetSchedule = schedules.find((s) => s.id === scheduleId);
      if (!targetSchedule) return;

      const blockExists = targetSchedule.blocks.some((b) => b.id === block.id);
      const nextBlocks = blockExists
        ? targetSchedule.blocks.map((b) => (b.id === block.id ? block : b))
        : [...targetSchedule.blocks, block];

      nextBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
      const updatedSchedule = { ...targetSchedule, blocks: nextBlocks, updatedAt: new Date().toISOString() };
      await get().saveTimetableSchedule(updatedSchedule);
    },

    deleteTimetableBlock: async (scheduleId, blockId) => {
      const schedules = get().timetableSchedules;
      const targetSchedule = schedules.find((s) => s.id === scheduleId);
      if (!targetSchedule) return;

      const nextBlocks = targetSchedule.blocks.filter((b) => b.id !== blockId);
      const updatedSchedule = { ...targetSchedule, blocks: nextBlocks, updatedAt: new Date().toISOString() };
      await get().saveTimetableSchedule(updatedSchedule);
    },

    toggleTimetableExecution: async (date, blockId) => {
      const key = `${date}_${blockId}`;
      const current = Boolean(get().timetableExecutions[key]);
      const nextState = !current;
      const nextMap = { ...get().timetableExecutions, [key]: nextState };

      set({ timetableExecutions: nextMap });
      if (nextState) {
        sound.playCheckin();

        // Award RPG XP on routine block completion
        const schedules = get().timetableSchedules;
        for (const s of schedules) {
          const b = s.blocks.find((blk) => blk.id === blockId);
          if (b) {
            const duration = calculateBlockDurationMinutes(b.startTime, b.endTime);
            const xp = Math.max(25, Math.round(duration * 1.5));
            get().awardXp(xp, mapCategoryToBranch(b.category), b.title);
            break;
          }
        }
      } else {
        sound.playClick();
      }

      if (typeof window !== 'undefined' && window.api?.timetable) {
        await window.api.timetable.toggleExecution(date, blockId, nextState);
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY_TIMETABLE_EXECUTIONS, JSON.stringify(nextMap));
      }
    },

    setActiveScheduleId: (id) => set({ activeScheduleId: id }),
    setTimetableImportModalOpen: (open) => set({ timetableImportModalOpen: open }),
    setTimetableBlockModalOpen: (open, block = null, scheduleId = null) =>
      set({
        timetableBlockModalOpen: open,
        selectedTimetableBlock: block || null,
        selectedScheduleIdForBlock: scheduleId || get().activeScheduleId,
      }),

    importTimetableMarkdown: async (content) => {
      const result = parseTimetableMarkdown(content);
      if (result.schedules.length === 0) return 0;

      for (const s of result.schedules) {
        await get().saveTimetableSchedule(s);
      }
      set({ activeScheduleId: result.schedules[0].id });
      sound.playCelebration();
      return result.schedules.length;
    },

    startTimetableBlockTimer: (block) => {
      const habits = get().habits;
      let matchedHabit = block.linkedHabitId ? habits.find((h) => h.id === block.linkedHabitId) : undefined;
      if (!matchedHabit) {
        const text = block.title.toLowerCase();
        matchedHabit = habits.find((h) => {
          const hn = h.name.toLowerCase();
          return text.includes(hn) || hn.includes(block.category) || (block.category === 'cs' && hn.includes('program'));
        });
      }

      const durationMinutes = calculateBlockDurationMinutes(block.startTime, block.endTime);

      if (matchedHabit) {
        get().startHabitTimer(matchedHabit, durationMinutes, 'countdown');
      } else {
        const habitCatMap: Record<TimetableCategory, 'health' | 'mind' | 'work' | 'routine'> = {
          cs: 'work',
          english: 'mind',
          health: 'health',
          sleep: 'routine',
          meal: 'routine',
          break: 'routine',
          review: 'work',
          general: 'routine',
        };

        const synthetic: Habit = {
          id: `tt_${block.id}`,
          name: block.title,
          emoji: block.emoji || 'clock',
          color: block.color || '#6366f1',
          monthly_goal: 30,
          schedule_days: [0, 1, 2, 3, 4, 5, 6],
          sort_order: 0,
          archived: false,
          created_at: new Date().toISOString(),
          type: 'boolean',
          target_value: 1,
          unit: '',
          category: habitCatMap[block.category] || 'routine',
        };
        get().startHabitTimer(synthetic, durationMinutes, 'countdown');
      }
    },

    // Feature 8 & 9 & 10 Actions
    setRpgSkillTreeModalOpen: (open) => set({ rpgSkillTreeModalOpen: open }),

    awardXp: (amount, branch, sourceTitle) => {
      const cur = get().rpgProfile;
      const { updatedProfile, didLevelUpOverall } = awardXpToProfile(
        cur,
        amount,
        branch,
        sourceTitle
      );
      set({ rpgProfile: updatedProfile });
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('zion_rpg_profile', JSON.stringify(updatedProfile));
        }
      } catch {}

      if (didLevelUpOverall) {
        sound.playCelebration();
      }
    },

    setTimetableTimelineViewMode: (mode) => set({ timetableTimelineViewMode: mode }),
    setZenStudioModalOpen: (open) => set({ zenStudioModalOpen: open }),

    cascadeShiftActiveSchedule: async (startingBlockId, shiftMinutes) => {
      const activeSched = get().timetableSchedules.find((s) => s.id === get().activeScheduleId);
      if (!activeSched) return;
      const shiftedBlocks = cascadeShiftBlocks(activeSched.blocks, startingBlockId, shiftMinutes);
      const updated = { ...activeSched, blocks: shiftedBlocks, updatedAt: new Date().toISOString() };
      await get().saveTimetableSchedule(updated);
      sound.playClick();
    },

    snapBlockToCurrentTime: async (blockId) => {
      const activeSched = get().timetableSchedules.find((s) => s.id === get().activeScheduleId);
      if (!activeSched) return;
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, '0');
      const mm = now.getMinutes().toString().padStart(2, '0');
      const snappedBlocks = snapBlockToNow(activeSched.blocks, blockId, `${hh}:${mm}`);
      const updated = { ...activeSched, blocks: snappedBlocks, updatedAt: new Date().toISOString() };
      await get().saveTimetableSchedule(updated);
      sound.playClick();
    },

    // Feature 12: Habit Stacking & Synergy Graph Actions
    setSynergyGraphModalOpen: (open) => set({ synergyGraphModalOpen: open }),
    loadHabitStacks: async () => {
      if (typeof window !== 'undefined' && window.api?.stacks?.get) {
        const stacks = await window.api.stacks.get();
        set({ habitStacks: stacks || [] });
      } else {
        try {
          const raw = localStorage.getItem('zion_habit_stacks');
          set({ habitStacks: raw ? JSON.parse(raw) : [] });
        } catch {}
      }
    },
    saveHabitStack: async (stackData) => {
      const id = stackData.id || `stack-${Date.now()}`;
      const payload: HabitStack = {
        id,
        parent_habit_id: stackData.parent_habit_id,
        child_habit_id: stackData.child_habit_id,
        cue_trigger: stackData.cue_trigger || 'immediate',
        synergy_score: stackData.synergy_score || 1.0,
        created_at: new Date().toISOString(),
      };
      if (typeof window !== 'undefined' && window.api?.stacks?.save) {
        const updated = await window.api.stacks.save(payload);
        set({ habitStacks: updated || [] });
      } else {
        const cur = get().habitStacks.filter((s) => s.id !== id);
        const updated = [...cur, payload];
        set({ habitStacks: updated });
        localStorage.setItem('zion_habit_stacks', JSON.stringify(updated));
      }
      sound.playClick();
    },
    deleteHabitStack: async (id) => {
      if (typeof window !== 'undefined' && window.api?.stacks?.delete) {
        const updated = await window.api.stacks.delete(id);
        set({ habitStacks: updated || [] });
      } else {
        const updated = get().habitStacks.filter((s) => s.id !== id);
        set({ habitStacks: updated });
        localStorage.setItem('zion_habit_stacks', JSON.stringify(updated));
      }
      sound.playClick();
    },

    // Feature 13: Identity Proof Journaling & Time Capsule Actions
    setTimeCapsuleModalOpen: (open, habitId = null) =>
      set({ timeCapsuleModalOpen: open, timeCapsuleHabitId: habitId || null }),
    loadHabitProofs: async (habitId) => {
      if (typeof window !== 'undefined' && window.api?.proofs?.get) {
        const proofs = await window.api.proofs.get(habitId);
        set({ habitProofs: proofs || [] });
      } else {
        try {
          const raw = localStorage.getItem('zion_habit_proofs');
          const all: HabitProof[] = raw ? JSON.parse(raw) : [];
          set({ habitProofs: habitId ? all.filter((p) => p.habit_id === habitId) : all });
        } catch {}
      }
    },
    addHabitProof: async (proofData) => {
      const id = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const payload: HabitProof = {
        id,
        habit_id: proofData.habit_id,
        date: proofData.date,
        image_data: proofData.image_data,
        audio_data: proofData.audio_data || '',
        caption: proofData.caption || '',
        created_at: new Date().toISOString(),
      };
      if (typeof window !== 'undefined' && window.api?.proofs?.add) {
        await window.api.proofs.add(payload);
        const allProofs = await window.api.proofs.get();
        set({ habitProofs: allProofs || [] });
      } else {
        const cur = get().habitProofs;
        const updated = [payload, ...cur];
        set({ habitProofs: updated });
        localStorage.setItem('zion_habit_proofs', JSON.stringify(updated));
      }
      sound.playCelebration();
    },
    deleteHabitProof: async (id, habitId) => {
      if (typeof window !== 'undefined' && window.api?.proofs?.delete) {
        await window.api.proofs.delete(id, habitId);
        const allProofs = await window.api.proofs.get();
        set({ habitProofs: allProofs || [] });
      } else {
        const updated = get().habitProofs.filter((p) => p.id !== id);
        set({ habitProofs: updated });
        localStorage.setItem('zion_habit_proofs', JSON.stringify(updated));
      }
      sound.playClick();
    },

    // Feature 14: P2P Accountability Duels Actions
    setP2PDuelModalOpen: (open) => set({ p2pDuelModalOpen: open }),
    loadP2PDuels: async () => {
      if (typeof window !== 'undefined' && window.api?.duels?.get) {
        const duels = await window.api.duels.get();
        set({ p2pDuels: duels || [] });
      } else {
        try {
          const raw = localStorage.getItem('zion_p2p_duels');
          set({ p2pDuels: raw ? JSON.parse(raw) : [] });
        } catch {}
      }
    },
    saveP2PDuel: async (duel) => {
      if (typeof window !== 'undefined' && window.api?.duels?.save) {
        const updated = await window.api.duels.save(duel);
        set({ p2pDuels: updated || [] });
      } else {
        const cur = get().p2pDuels.filter((d) => d.id !== duel.id);
        const updated = [duel, ...cur];
        set({ p2pDuels: updated });
        localStorage.setItem('zion_p2p_duels', JSON.stringify(updated));
      }
      sound.playClick();
    },
    deleteP2PDuel: async (id) => {
      if (typeof window !== 'undefined' && window.api?.duels?.delete) {
        const updated = await window.api.duels.delete(id);
        set({ p2pDuels: updated || [] });
      } else {
        const updated = get().p2pDuels.filter((d) => d.id !== id);
        set({ p2pDuels: updated });
        localStorage.setItem('zion_p2p_duels', JSON.stringify(updated));
      }
      sound.playClick();
    },
  };
});
