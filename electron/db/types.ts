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

