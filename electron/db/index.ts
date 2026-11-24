import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { runMigrations } from './migrations';
import type {
  HabitRow,
  CheckinRow,
  SettingRow,
  HabitDependencyRow,
  WellnessLogRow,
  SkipReasonRow,
  SkillProgressRow,
  TriggerRuleRow,
  TimetableScheduleRow,
  TimetableBlockRow,
  TimetableExecutionRow,
  HabitProofRow,
  HabitStackRow,
  P2PDuelRow,
} from './types';

let dbInstance: Database.Database | null = null;

export function initDatabase(customPath?: string): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = customPath || path.join(app.getPath('userData'), 'habit_tracker.db');
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');
  dbInstance.pragma('cache_size = -64000'); // 64MB RAM cache for instant queries
  dbInstance.pragma('temp_store = MEMORY'); // Keep temporary tables in memory
  dbInstance.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O

  runMigrations(dbInstance);

  return dbInstance;
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (err) {
      console.warn('[Database] Error closing db instance:', err);
    }
    dbInstance = null;
  }
}

// Habits
export function getHabits(includeArchived = false, userId?: string): HabitRow[] {
  const db = getDb();
  if (userId) {
    if (includeArchived) {
      return db.prepare("SELECT * FROM habits WHERE (user_id = ? OR user_id = '' OR user_id IS NULL) ORDER BY sort_order ASC, created_at ASC").all(userId) as HabitRow[];
    }
    return db.prepare("SELECT * FROM habits WHERE archived = 0 AND (user_id = ? OR user_id = '' OR user_id IS NULL) ORDER BY sort_order ASC, created_at ASC").all(userId) as HabitRow[];
  }
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
  user_id?: string;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO habits (id, name, emoji, color, monthly_goal, schedule_days, sort_order, archived, created_at, type, target_value, unit, category, user_id)
    VALUES (@id, @name, @emoji, @color, @monthly_goal, @schedule_days, @sort_order, @archived, @created_at, @type, @target_value, @unit, @category, @user_id)
  `).run({
    type: 'boolean',
    target_value: 1,
    unit: '',
    category: 'routine',
    user_id: '',
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

export function getAllCheckins(userId?: string): CheckinRow[] {
  const db = getDb();
  if (userId) {
    return db.prepare(`
      SELECT c.* FROM checkins c
      JOIN habits h ON c.habit_id = h.id
      WHERE (h.user_id = ? OR h.user_id = '' OR h.user_id IS NULL)
    `).all(userId) as CheckinRow[];
  }
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

// Habit Dependencies
export function getHabitDependencies(habitId?: string): HabitDependencyRow[] {
  const db = getDb();
  if (habitId) {
    return db.prepare('SELECT * FROM habit_dependencies WHERE habit_id = ?').all(habitId) as HabitDependencyRow[];
  }
  return db.prepare('SELECT * FROM habit_dependencies').all() as HabitDependencyRow[];
}

export function getHabitDependents(dependsOnId: string): HabitDependencyRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM habit_dependencies WHERE depends_on_id = ?').all(dependsOnId) as HabitDependencyRow[];
}

export function createHabitDependency(dep: {
  habit_id: string;
  depends_on_id: string;
  type: 'prerequisite' | 'anti';
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO habit_dependencies (habit_id, depends_on_id, type, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(dep.habit_id, dep.depends_on_id, dep.type);
}

export function deleteHabitDependency(habitId: string, dependsOnId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM habit_dependencies WHERE habit_id = ? AND depends_on_id = ?').run(habitId, dependsOnId);
}

export function deleteAllHabitDependencies(habitId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM habit_dependencies WHERE habit_id = ? OR depends_on_id = ?').run(habitId, habitId);
}

// Wellness Logs
export function getWellnessLog(date: string): WellnessLogRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM wellness_logs WHERE date = ?').get(date) as WellnessLogRow | undefined;
}

export function getWellnessLogsForMonth(yearMonth: string): WellnessLogRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM wellness_logs WHERE date LIKE ? ORDER BY date DESC").all(`${yearMonth}-%`) as WellnessLogRow[];
}

export function getAllWellnessLogs(): WellnessLogRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM wellness_logs ORDER BY date DESC').all() as WellnessLogRow[];
}

export function upsertWellnessLog(log: {
  id: string;
  date: string;
  energy: number;
  mood: number;
  note?: string;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO wellness_logs (id, date, energy, mood, note, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(date) DO UPDATE SET
      energy = excluded.energy,
      mood = excluded.mood,
      note = excluded.note
  `).run(log.id, log.date, log.energy, log.mood, log.note || '');
}

export function deleteWellnessLog(date: string): void {
  const db = getDb();
  db.prepare('DELETE FROM wellness_logs WHERE date = ?').run(date);
}

// Skip Reasons
export function getSkipReason(habitId: string, date: string): SkipReasonRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM skip_reasons WHERE habit_id = ? AND date = ?').get(habitId, date) as SkipReasonRow | undefined;
}

export function getSkipReasonsForHabit(habitId: string): SkipReasonRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM skip_reasons WHERE habit_id = ? ORDER BY date DESC').all(habitId) as SkipReasonRow[];
}

export function getSkipReasonsForDate(date: string): SkipReasonRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM skip_reasons WHERE date = ?').all(date) as SkipReasonRow[];
}

export function upsertSkipReason(reason: {
  id: string;
  habit_id: string;
  date: string;
  reason: 'forgot' | 'busy' | 'sick' | 'resistance' | 'other';
  note?: string;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO skip_reasons (id, habit_id, date, reason, note, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      reason = excluded.reason,
      note = excluded.note
  `).run(reason.id, reason.habit_id, reason.date, reason.reason, reason.note || '');
}

export function deleteSkipReason(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM skip_reasons WHERE id = ?').run(id);
}

// Skill Progress
export function getSkillProgress(userId: string): SkillProgressRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM skill_progress WHERE user_id = ?').all(userId) as SkillProgressRow[];
}

export function getSkillLevel(userId: string, skillId: string): SkillProgressRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM skill_progress WHERE user_id = ? AND skill_id = ?').get(userId, skillId) as SkillProgressRow | undefined;
}

export function upsertSkillProgress(progress: {
  user_id: string;
  skill_id: string;
  level: number;
  unlocked_at?: string | null;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO skill_progress (user_id, skill_id, level, unlocked_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, skill_id) DO UPDATE SET
      level = excluded.level,
      unlocked_at = excluded.unlocked_at
  `).run(progress.user_id, progress.skill_id, progress.level, progress.unlocked_at || null);
}

// Trigger Rules
export function getTriggerRules(habitId?: string): TriggerRuleRow[] {
  const db = getDb();
  if (habitId) {
    return db.prepare('SELECT * FROM trigger_rules WHERE habit_id = ? AND enabled = 1').all(habitId) as TriggerRuleRow[];
  }
  return db.prepare('SELECT * FROM trigger_rules WHERE enabled = 1').all() as TriggerRuleRow[];
}

export function createTriggerRule(rule: {
  id: string;
  habit_id: string;
  type: string;
  config: string;
  enabled?: number;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO trigger_rules (id, habit_id, type, config, enabled, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(rule.id, rule.habit_id, rule.type, rule.config, rule.enabled ?? 1);
}

export function updateTriggerRule(id: string, updates: {
  type?: string;
  config?: string;
  enabled?: number;
}): void {
  const db = getDb();
  const current = db.prepare('SELECT * FROM trigger_rules WHERE id = ?').get(id) as TriggerRuleRow | undefined;
  if (!current) return;

  const merged = {
    id,
    type: updates.type !== undefined ? updates.type : current.type,
    config: updates.config !== undefined ? updates.config : current.config,
    enabled: updates.enabled !== undefined ? updates.enabled : current.enabled,
  };

  db.prepare(`
    UPDATE trigger_rules
    SET type = @type, config = @config, enabled = @enabled
    WHERE id = @id
  `).run(merged);
}

export function deleteTriggerRule(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM trigger_rules WHERE id = ?').run(id);
}

// Export / Import / Reset
export function exportData(): { habits: HabitRow[]; checkins: CheckinRow[]; settings: Record<string, string>; dependencies: HabitDependencyRow[]; wellness_logs: WellnessLogRow[]; skip_reasons: SkipReasonRow[]; skill_progress: SkillProgressRow[]; trigger_rules: TriggerRuleRow[] } {
  const db = getDb();
  return {
    habits: getHabits(true),
    checkins: getAllCheckins(),
    settings: getSettings(),
    dependencies: getHabitDependencies(),
    wellness_logs: getAllWellnessLogs(),
    skip_reasons: db.prepare('SELECT * FROM skip_reasons').all() as SkipReasonRow[],
    skill_progress: db.prepare('SELECT * FROM skill_progress').all() as SkillProgressRow[],
    trigger_rules: db.prepare('SELECT * FROM trigger_rules').all() as TriggerRuleRow[],
  };
}

export function importData(data: { habits: HabitRow[]; checkins: CheckinRow[]; settings?: Record<string, string>; dependencies?: HabitDependencyRow[]; wellness_logs?: WellnessLogRow[]; skip_reasons?: SkipReasonRow[]; skill_progress?: SkillProgressRow[]; trigger_rules?: TriggerRuleRow[] }): void {
  const db = getDb();
  const runTx = db.transaction(() => {
    // Clear existing
    db.prepare('DELETE FROM checkins').run();
    db.prepare('DELETE FROM habits').run();
    db.prepare('DELETE FROM settings').run();
    db.prepare('DELETE FROM habit_dependencies').run();
    db.prepare('DELETE FROM wellness_logs').run();
    db.prepare('DELETE FROM skip_reasons').run();
    db.prepare('DELETE FROM skill_progress').run();
    db.prepare('DELETE FROM trigger_rules').run();

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

    // Insert dependencies
    if (data.dependencies) {
      const insertDep = db.prepare(`
        INSERT INTO habit_dependencies (habit_id, depends_on_id, type, created_at)
        VALUES (?, ?, ?, ?)
      `);
      for (const d of data.dependencies) {
        insertDep.run(d.habit_id, d.depends_on_id, d.type, d.created_at);
      }
    }

    // Insert wellness logs
    if (data.wellness_logs) {
      const insertWellness = db.prepare(`
        INSERT INTO wellness_logs (id, date, energy, mood, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const w of data.wellness_logs) {
        insertWellness.run(w.id, w.date, w.energy, w.mood, w.note, w.created_at);
      }
    }

    // Insert skip reasons
    if (data.skip_reasons) {
      const insertSkip = db.prepare(`
        INSERT INTO skip_reasons (id, habit_id, date, reason, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const s of data.skip_reasons) {
        insertSkip.run(s.id, s.habit_id, s.date, s.reason, s.note, s.created_at);
      }
    }

    // Insert skill progress
    if (data.skill_progress) {
      const insertSkill = db.prepare(`
        INSERT INTO skill_progress (user_id, skill_id, level, unlocked_at)
        VALUES (?, ?, ?, ?)
      `);
      for (const s of data.skill_progress) {
        insertSkill.run(s.user_id, s.skill_id, s.level, s.unlocked_at);
      }
    }

    // Insert trigger rules
    if (data.trigger_rules) {
      const insertTrigger = db.prepare(`
        INSERT INTO trigger_rules (id, habit_id, type, config, enabled, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const t of data.trigger_rules) {
        insertTrigger.run(t.id, t.habit_id, t.type, t.config, t.enabled, t.created_at);
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
    db.prepare('DELETE FROM habit_dependencies').run();
    db.prepare('DELETE FROM wellness_logs').run();
    db.prepare('DELETE FROM skip_reasons').run();
    db.prepare('DELETE FROM skill_progress').run();
    db.prepare('DELETE FROM trigger_rules').run();
    db.prepare('DELETE FROM timetable_executions').run();
    db.prepare('DELETE FROM timetable_blocks').run();
    db.prepare('DELETE FROM timetable_schedules').run();
    db.prepare('DELETE FROM habit_proofs').run();
    db.prepare('DELETE FROM habit_stacks').run();
    db.prepare('DELETE FROM p2p_duels').run();
  });
  runTx();
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.prepare('VACUUM').run();
  } catch {}
}

// Timetable Schedules & Blocks
export function getTimetableSchedules(): Array<TimetableScheduleRow & { blocks: TimetableBlockRow[] }> {
  const db = getDb();
  const schedules = db.prepare('SELECT * FROM timetable_schedules ORDER BY created_at ASC').all() as TimetableScheduleRow[];
  const allBlocks = db.prepare('SELECT * FROM timetable_blocks ORDER BY sort_order ASC, start_time ASC').all() as TimetableBlockRow[];
  
  const blocksBySchedule: Record<string, TimetableBlockRow[]> = {};
  for (const b of allBlocks) {
    if (!blocksBySchedule[b.schedule_id]) blocksBySchedule[b.schedule_id] = [];
    blocksBySchedule[b.schedule_id].push(b);
  }

  return schedules.map((s) => ({
    ...s,
    blocks: blocksBySchedule[s.id] || [],
  }));
}

export function saveTimetableSchedule(schedule: {
  id: string;
  title: string;
  description: string;
  days_of_week: string;
  is_active: number;
  blocks?: Array<{
    id: string;
    schedule_id: string;
    title: string;
    start_time: string;
    end_time: string;
    category: string;
    description: string;
    color: string;
    emoji: string;
    sound_enabled: number;
    habit_id?: string | null;
    sort_order: number;
  }>;
}): void {
  const db = getDb();
  const runTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO timetable_schedules (id, title, description, days_of_week, is_active, updated_at)
      VALUES (@id, @title, @description, @days_of_week, @is_active, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        days_of_week = excluded.days_of_week,
        is_active = excluded.is_active,
        updated_at = CURRENT_TIMESTAMP
    `).run(schedule);

    if (schedule.blocks) {
      db.prepare('DELETE FROM timetable_blocks WHERE schedule_id = ?').run(schedule.id);
      const insertBlock = db.prepare(`
        INSERT INTO timetable_blocks (id, schedule_id, title, start_time, end_time, category, description, color, emoji, sound_enabled, habit_id, sort_order)
        VALUES (@id, @schedule_id, @title, @start_time, @end_time, @category, @description, @color, @emoji, @sound_enabled, @habit_id, @sort_order)
      `);
      for (const b of schedule.blocks) {
        insertBlock.run({
          habit_id: null,
          ...b,
        });
      }
    }
  });
  runTx();
}

export function deleteTimetableSchedule(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM timetable_schedules WHERE id = ?').run(id);
}

export function getTimetableExecutions(date: string): TimetableExecutionRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM timetable_executions WHERE date = ?').all(date) as TimetableExecutionRow[];
}

export function toggleTimetableExecution(date: string, blockId: string, completed: boolean): void {
  const db = getDb();
  if (completed) {
    db.prepare(`
      INSERT INTO timetable_executions (date, block_id, completed, completed_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(date, block_id) DO UPDATE SET completed = 1, completed_at = CURRENT_TIMESTAMP
    `).run(date, blockId);
  } else {
    db.prepare('DELETE FROM timetable_executions WHERE date = ? AND block_id = ?').run(date, blockId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Identity Proof Journaling Queries
// ─────────────────────────────────────────────────────────────────────────────
export function getHabitProofs(habitId?: string): HabitProofRow[] {
  const db = getDb();
  if (habitId) {
    return db.prepare('SELECT * FROM habit_proofs WHERE habit_id = ? ORDER BY date DESC, created_at DESC').all(habitId) as HabitProofRow[];
  }
  return db.prepare('SELECT * FROM habit_proofs ORDER BY date DESC, created_at DESC').all() as HabitProofRow[];
}

export function addHabitProof(proof: {
  id: string;
  habit_id: string;
  date: string;
  image_data: string;
  audio_data?: string;
  caption?: string;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO habit_proofs (id, habit_id, date, image_data, audio_data, caption, created_at)
    VALUES (@id, @habit_id, @date, @image_data, @audio_data, @caption, CURRENT_TIMESTAMP)
  `).run({
    audio_data: '',
    caption: '',
    ...proof,
  });
}

export function deleteHabitProof(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM habit_proofs WHERE id = ?').run(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Habit Stacking & Synergy Queries
// ─────────────────────────────────────────────────────────────────────────────
export function getHabitStacks(): HabitStackRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM habit_stacks ORDER BY created_at ASC').all() as HabitStackRow[];
}

export function saveHabitStack(stack: {
  id: string;
  parent_habit_id: string;
  child_habit_id: string;
  cue_trigger?: 'immediate' | '15m_after' | 'evening';
  synergy_score?: number;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO habit_stacks (id, parent_habit_id, child_habit_id, cue_trigger, synergy_score, created_at)
    VALUES (@id, @parent_habit_id, @child_habit_id, @cue_trigger, @synergy_score, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      cue_trigger = excluded.cue_trigger,
      synergy_score = excluded.synergy_score
  `).run({
    cue_trigger: 'immediate',
    synergy_score: 1.0,
    ...stack,
  });
}

export function deleteHabitStack(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM habit_stacks WHERE id = ?').run(id);
}

// ─────────────────────────────────────────────────────────────────────────────
// P2P Accountability Duels Queries
// ─────────────────────────────────────────────────────────────────────────────
export function getP2PDuels(): P2PDuelRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM p2p_duels ORDER BY updated_at DESC').all() as P2PDuelRow[];
}

export function saveP2PDuel(duel: {
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
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO p2p_duels (id, room_code, title, habit_name, target_days, stake_xp, my_progress, peer_name, peer_progress, status, created_at, updated_at)
    VALUES (@id, @room_code, @title, @habit_name, @target_days, @stake_xp, @my_progress, @peer_name, @peer_progress, @status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      my_progress = excluded.my_progress,
      peer_name = excluded.peer_name,
      peer_progress = excluded.peer_progress,
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).run(duel);
}

export function deleteP2PDuel(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM p2p_duels WHERE id = ?').run(id);
}
