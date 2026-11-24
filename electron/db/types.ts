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
  user_id?: string;
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

// Timetable schedules
export interface TimetableScheduleRow {
  id: string;
  title: string;
  description: string;
  days_of_week: string; // JSON string e.g. "[1,2,3,4,5,6]"
  is_active: number; // 0 | 1
  created_at: string;
  updated_at: string;
}

// Timetable blocks
export interface TimetableBlockRow {
  id: string;
  schedule_id: string;
  title: string;
  start_time: string;
  end_time: string;
  category: string;
  description: string;
  color: string;
  emoji: string;
  sound_enabled: number; // 0 | 1
  habit_id?: string | null;
  sort_order: number;
  created_at: string;
}

// Timetable block executions
export interface TimetableExecutionRow {
  date: string;
  block_id: string;
  completed: number; // 0 | 1
  completed_at?: string | null;
}

// Identity Proof Journaling (Photos, Audio, Media)
export interface HabitProofRow {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  image_data: string; // Base64 data URL or local URI
  audio_data?: string; // Optional Base64 audio clip
  caption: string;
  created_at: string;
}

// Habit Stacking & Synergy Connections
export interface HabitStackRow {
  id: string;
  parent_habit_id: string;
  child_habit_id: string;
  cue_trigger: 'immediate' | '15m_after' | 'evening';
  synergy_score: number;
  created_at: string;
}

// P2P Accountability Duels & Contracts
export interface P2PDuelRow {
  id: string;
  room_code: string;
  title: string;
  habit_name: string;
  target_days: number;
  stake_xp: number;
  my_progress: number;
  peer_name: string;
  peer_progress: number;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}