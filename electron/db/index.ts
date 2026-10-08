import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { runMigrations } from './migrations';
import type { HabitRow, CheckinRow, SettingRow } from './types';

let dbInstance: Database.Database | null = null;

export function initDatabase(customPath?: string): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = customPath || path.join(app.getPath('userData'), 'habit_tracker.db');
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  runMigrations(dbInstance);

  return dbInstance;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

// Habits
export function getHabits(includeArchived = false): HabitRow[] {
  const db = getDb();
  if (includeArchived) {
    return db.prepare('SELECT * FROM habits ORDER BY sort_order ASC, created_at ASC').all() as HabitRow[];
  }
  return db.prepare('SELECT * FROM habits WHERE archived = 0 ORDER BY sort_order ASC, created_at ASC').all() as HabitRow[];
}

export function createHabit(habit: {
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
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO habits (id, name, emoji, color, monthly_goal, schedule_days, sort_order, archived, created_at, type, target_value, unit, category)
    VALUES (@id, @name, @emoji, @color, @monthly_goal, @schedule_days, @sort_order, @archived, @created_at, @type, @target_value, @unit, @category)
  `).run({
    type: 'boolean',
    target_value: 1,
    unit: '',
    category: 'routine',
    ...habit,
  });
}

export function updateHabit(habit: {
  id: string;
  name?: string;
  emoji?: string;
  color?: string;
  monthly_goal?: number;
  schedule_days?: string;
  sort_order?: number;
  archived?: number;
  type?: string;
  target_value?: number;
  unit?: string;
  category?: string;
}): void {
  const db = getDb();
  const current = db.prepare('SELECT * FROM habits WHERE id = ?').get(habit.id) as HabitRow | undefined;
  if (!current) return;

  const merged = {
    id: habit.id,
    name: habit.name !== undefined ? habit.name : current.name,
    emoji: habit.emoji !== undefined ? habit.emoji : current.emoji,
    color: habit.color !== undefined ? habit.color : current.color,
    monthly_goal: habit.monthly_goal !== undefined ? habit.monthly_goal : current.monthly_goal,
    schedule_days: habit.schedule_days !== undefined ? habit.schedule_days : current.schedule_days,
    sort_order: habit.sort_order !== undefined ? habit.sort_order : current.sort_order,
    archived: habit.archived !== undefined ? habit.archived : current.archived,
    type: habit.type !== undefined ? habit.type : (current.type || 'boolean'),
    target_value: habit.target_value !== undefined ? habit.target_value : (current.target_value ?? 1),
    unit: habit.unit !== undefined ? habit.unit : (current.unit || ''),
    category: habit.category !== undefined ? habit.category : (current.category || 'routine'),
  };

  db.prepare(`
    UPDATE habits
    SET name = @name,
        emoji = @emoji,
        color = @color,
        monthly_goal = @monthly_goal,
        schedule_days = @schedule_days,
        sort_order = @sort_order,
        archived = @archived,
        type = @type,
        target_value = @target_value,
        unit = @unit,
        category = @category
    WHERE id = @id
  `).run(merged);
}

export function deleteHabit(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM habits WHERE id = ?').run(id);
}

export function reorderHabits(orderedIds: string[]): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE habits SET sort_order = ? WHERE id = ?');
  const updateMany = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => {
      stmt.run(index, id);
    });
  });
  updateMany(orderedIds);
}

// Checkins
export function getCheckinsForMonth(yearMonth: string): CheckinRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM checkins WHERE date LIKE ?").all(`${yearMonth}-%`) as CheckinRow[];
}

export function getAllCheckins(): CheckinRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM checkins").all() as CheckinRow[];
}

export function toggleCheckin(
  habitId: string,
  date: string,
  completed: boolean,
  note = '',
  value?: number,
  mood = ''
): CheckinRow {
  const db = getDb();
  const now = new Date().toISOString();
  const checkinId = `${habitId}_${date}`;
  const compNum = completed ? 1 : 0;
  const numVal = value !== undefined ? value : (completed ? 1 : 0);

  db.prepare(`
    INSERT INTO checkins (id, habit_id, date, completed, note, updated_at, value, mood)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(habit_id, date) DO UPDATE SET
      completed = excluded.completed,
      note = excluded.note,
      updated_at = excluded.updated_at,
      value = excluded.value,
      mood = excluded.mood
  `).run(checkinId, habitId, date, compNum, note, now, numVal, mood);

  return { id: checkinId, habit_id: habitId, date, completed: compNum, note, updated_at: now, value: numVal, mood };
}

// Settings
export function getSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as SettingRow[];
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

export function saveSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

// Export / Import / Reset
export function exportData(): { habits: HabitRow[]; checkins: CheckinRow[]; settings: Record<string, string> } {
  return {
    habits: getHabits(true),
    checkins: getAllCheckins(),
    settings: getSettings(),
  };
}

export function importData(data: { habits: HabitRow[]; checkins: CheckinRow[]; settings?: Record<string, string> }): void {
  const db = getDb();
  const runTx = db.transaction(() => {
    // Clear existing
    db.prepare('DELETE FROM checkins').run();
    db.prepare('DELETE FROM habits').run();
    if (data.settings) {
      db.prepare('DELETE FROM settings').run();
    }

    // Insert habits
    const insertHabit = db.prepare(`
      INSERT INTO habits (id, name, emoji, color, monthly_goal, schedule_days, sort_order, archived, created_at)
      VALUES (@id, @name, @emoji, @color, @monthly_goal, @schedule_days, @sort_order, @archived, @created_at)
    `);
    for (const h of data.habits || []) {
      insertHabit.run(h);
    }

    // Insert checkins
    const insertCheckin = db.prepare(`
      INSERT INTO checkins (id, habit_id, date, completed, note, updated_at)
      VALUES (@id, @habit_id, @date, @completed, @note, @updated_at)
    `);
    for (const c of data.checkins || []) {
      insertCheckin.run(c);
    }

    // Insert settings
    if (data.settings) {
      const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
      for (const [k, v] of Object.entries(data.settings)) {
        insertSetting.run(k, v);
      }
    }
  });

  runTx();
}

export function resetAllData(): void {
  const db = getDb();
  const runTx = db.transaction(() => {
    db.prepare('DELETE FROM checkins').run();
    db.prepare('DELETE FROM habits').run();
    db.prepare('DELETE FROM settings').run();
  });
  runTx();
}
