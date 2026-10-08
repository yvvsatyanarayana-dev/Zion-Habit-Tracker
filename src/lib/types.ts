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
