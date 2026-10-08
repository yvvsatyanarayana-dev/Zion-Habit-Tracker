import type { AppSettings } from './types';

export const HABIT_PALETTE = [
  '#6366f1', // Electric Indigo (Brand Accent)
  '#10b981', // Emerald (Success)
  '#f59e0b', // Amber (Warmth/Streak)
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f43f5e', // Rose Crimson
  '#d946ef', // Fuchsia
  '#3b82f6', // Cobalt Blue
  '#14b8a6', // Teal
  '#fb7185', // Coral
  '#38bdf8', // Sky Blue
  '#84cc16', // Lime
] as const;

export const STUDIO_COLORS = {
  accent: '#6366f1',
  accentHover: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#f43f5e',
  cyan: '#06b6d4',
} as const;

export const RING_COLORS = {
  today: '#6366f1',   // Electric Indigo - Today's focus
  week: '#10b981',    // Emerald - This week
  month: '#06b6d4',   // Cyan - This month
  streak: '#f59e0b',  // Amber - Streaks
} as const;

export const HABIT_CATEGORIES = [
  { id: 'all', label: 'All Routines', icon: 'Sparkles', color: '#6366f1' },
  { id: 'health', label: 'Health & Fitness', icon: 'Activity', color: '#10b981' },
  { id: 'mind', label: 'Mind & Growth', icon: 'Brain', color: '#8b5cf6' },
  { id: 'work', label: 'Deep Work & Career', icon: 'Briefcase', color: '#3b82f6' },
  { id: 'routine', label: 'Daily Lifestyle', icon: 'Coffee', color: '#f59e0b' },
] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  week_start_day: 'mon',
  clock_format: '12h',
  show_emoji: false,
  streak_threshold: 50,
  allow_future_edits: false,
  density: 'comfortable',
  reduce_motion: false,
  reminder_time: '',
  launch_on_startup: false,
  minimize_to_tray: false,
  theme: 'dark',
  sound_enabled: true,
};
