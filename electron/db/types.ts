export interface HabitRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
  monthly_goal: number;
  schedule_days: string; // JSON string e.g. "[0,1,2,3,4,5,6]"
  sort_order: number;
  archived: number; // 0 | 1
  created_at: string;
  type?: string; // 'boolean' | 'numeric'
  target_value?: number;
  unit?: string;
  category?: string;
}

export interface CheckinRow {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed: number; // 0 | 1
  note: string;
  updated_at: string;
  value?: number;
  mood?: string;
}

export interface SettingRow {
  key: string;
  value: string;
}

// Habit Dependencies (for chains/prerequisites)
export interface HabitDependencyRow {
  habit_id: string;
  depends_on_id: string;
  type: 'prerequisite' | 'anti';
  created_at: string;
}

// Wellness logs (energy/mood tracking)
export interface WellnessLogRow {
  id: string;
  date: string; // YYYY-MM-DD
  energy: number; // 1-5
  mood: number; // 1-5
  note: string;
  created_at: string;
}

// Skip reasons for failure autopsies
export interface SkipReasonRow {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  reason: 'forgot' | 'busy' | 'sick' | 'resistance' | 'other';
  note: string;
  created_at: string;
}

// Skill tree progress
export interface SkillProgressRow {
  user_id: string;
  skill_id: string;
  level: number;
  unlocked_at: string | null;
}

// Trigger rules
export interface TriggerRuleRow {
  id: string;
  habit_id: string;
  type: string;
  config: string; // JSON string
  enabled: number; // 0 | 1
  created_at: string;
}