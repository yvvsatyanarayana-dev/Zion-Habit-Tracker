export type HabitType = 'boolean' | 'numeric';
export type HabitCategory = 'health' | 'mind' | 'work' | 'routine';
export type CheckinMood = 'energized' | 'good' | 'neutral' | 'tired';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  monthly_goal: number;
  schedule_days: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  sort_order: number;
  archived: boolean;
  created_at: string;
  type?: HabitType; // 'boolean' | 'numeric'
  target_value?: number; // e.g. 2000 ml, 20 pages
  unit?: string; // e.g. "ml", "pages", "mins", "km"
  category?: HabitCategory; // 'health' | 'mind' | 'work' | 'routine'
}

export interface Checkin {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  note: string;
  updated_at: string;
  value?: number; // numeric progress, e.g. 1500
  mood?: CheckinMood; // 'energized' | 'good' | 'neutral' | 'tired'
}

export type WeekStartDay = 'mon' | 'sun' | 'thu';
export type ClockFormat = '12h' | '24h';
export type DensityMode = 'comfortable' | 'compact';

export interface AppSettings {
  week_start_day: WeekStartDay;
  clock_format: ClockFormat;
  show_emoji: boolean;
  streak_threshold: number; // percentage, e.g. 50
  allow_future_edits: boolean;
  density: DensityMode;
  reduce_motion: boolean;
  reminder_time: string; // e.g. "20:00" or ""
  launch_on_startup: boolean;
  minimize_to_tray: boolean;
  theme: 'dark' | 'light';
  sound_enabled: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarColor: string;
  avatarEmoji?: string;
  bio: string;
  password?: string;
  created_at: string;
}

export type TabType = 'dashboard' | 'habits' | 'analytics' | 'streaks' | 'settings' | 'profile' | 'guide';

export interface DayStats {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  weekday: number; // 0-6
  isToday: boolean;
  isFuture: boolean;
  isPast: boolean;
  scheduledCount: number;
  completedCount: number;
  rate: number; // 0.0 to 1.0
  isStreakDay: boolean; // completedCount / scheduledCount >= streak_threshold
}

export interface HabitMonthlyProgress {
  habit: Habit;
  scheduledDaysInMonth: number;
  completedDays: number;
  goal: number;
  rate: number; // 0.0 to 1.0 (completedDays / goal or scheduledDays)
  currentStreak: number;
  longestStreak: number;
}

// Habit Dependencies (Chains)
export type DependencyType = 'prerequisite' | 'anti';

export interface HabitDependency {
  habit_id: string;
  depends_on_id: string;
  type: DependencyType;
  created_at: string;
}

// Wellness Logs (Energy/Mood tracking)
export interface WellnessLog {
  id: string;
  date: string; // YYYY-MM-DD
  energy: number; // 1-5
  mood: number; // 1-5
  note: string;
  created_at: string;
}

// Skip Reasons (Failure autopsies)
export type SkipReason = 'forgot' | 'busy' | 'sick' | 'resistance' | 'other';

export interface SkipReasonEntry {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  reason: SkipReason;
  note: string;
  created_at: string;
}

// Skill Tree Progress
export interface SkillProgress {
  user_id: string;
  skill_id: string;
  level: number;
  unlocked_at: string | null;
}

// Trigger Rules
export interface TriggerRule {
  id: string;
  habit_id: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
}

// Habit Chain Validation Result
export interface ChainValidationResult {
  valid: boolean;
  cycles: string[][]; // arrays of habit IDs forming cycles
  errors: string[];
}

// Smart Reschedule Result
export interface RescheduleResult {
  moved: Array<{ habitId: string; fromDate: string; toDate: string }>;
  blocked: Array<{ habitId: string; reason: string }>;
}

// Habit Replay State
export interface HabitReplayState {
  date: Date;
  habits: Habit[];
  checkins: Record<string, import('./types').Checkin>;
  wellnessLog?: WellnessLog;
}

// ───────────────────────────────────────────────
// Feature 1: Routine Flow Runner & Habit Stacking
// ───────────────────────────────────────────────
export interface RoutineStep {
  id: string;
  habit_id: string;
  duration_minutes: number; // e.g. 5, 10, or 0 for instant
  notes?: string;
}

export interface RoutineStack {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'anytime';
  steps: RoutineStep[];
  created_at: string;
}

// ───────────────────────────────────────────────
// Feature 2: "Never Miss Twice" Streak Shields & Recovery Quests
// ───────────────────────────────────────────────
export interface ShieldEvent {
  id: string;
  date: string; // YYYY-MM-DD that was protected/frozen
  reason: 'auto_freeze' | 'manual_forgiveness';
  note?: string;
  created_at: string;
}

export interface ResurrectionQuest {
  active: boolean;
  lost_streak_count: number;
  started_date: string; // YYYY-MM-DD
  required_days: number; // default 3 days
  completed_dates: string[]; // YYYY-MM-DD
  restored: boolean;
}

export interface StreakShieldState {
  available_shields: number; // default 2, max 3
  shield_events: ShieldEvent[];
  resurrection_quest: ResurrectionQuest | null;
}

// ───────────────────────────────────────────────
// Feature 3: Smart Habit Correlation Engine & Pattern Insights
// ───────────────────────────────────────────────
export interface HabitCorrelation {
  source_habit_id: string;
  source_habit_name: string;
  source_habit_color: string;
  target_habit_id: string;
  target_habit_name: string;
  target_habit_color: string;
  probability_with: number; // e.g. 0.85
  probability_without: number; // e.g. 0.35
  lift_percentage: number; // e.g. +62%
  sample_size: number;
  insight_text: string;
}

export interface WellnessCorrelation {
  habit_id: string;
  habit_name: string;
  habit_color: string;
  metric: 'energy' | 'mood';
  average_with: number;
  average_without: number;
  difference: number; // e.g. +1.3 points
  insight_text: string;
}

export interface DangerZoneAlert {
  habit_id: string;
  habit_name: string;
  habit_color: string;
  weekday: number; // 0=Sun, ..., 6=Sat
  weekday_name: string;
  failure_rate: number; // e.g. 75%
  miss_count: number;
  sample_weeks: number;
  suggestion: string;
}

export interface SmartInsightsReport {
  correlations: HabitCorrelation[];
  wellness_correlations: WellnessCorrelation[];
  danger_zones: DangerZoneAlert[];
  golden_habit: { habit: Habit; boost_percentage: number; synergy_count: number } | null;
}
