import type Database from 'better-sqlite3';

interface Migration {
  version: number;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      // Habits table
      db.exec(`
        CREATE TABLE IF NOT EXISTS habits (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          emoji TEXT NOT NULL DEFAULT '',
          color TEXT NOT NULL,
          monthly_goal INTEGER NOT NULL DEFAULT 30,
          schedule_days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
          sort_order INTEGER NOT NULL DEFAULT 0,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);

      // Checkins table
      db.exec(`
        CREATE TABLE IF NOT EXISTS checkins (
          id TEXT PRIMARY KEY,
          habit_id TEXT NOT NULL,
          date TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 1,
          note TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL,
          UNIQUE(habit_id, date),
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);
        CREATE INDEX IF NOT EXISTS idx_checkins_habit ON checkins(habit_id);
      `);

      // Settings table
      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    up: (db) => {
      // Add numeric habits & categories
      try {
        db.exec(`
          ALTER TABLE habits ADD COLUMN type TEXT NOT NULL DEFAULT 'boolean';
          ALTER TABLE habits ADD COLUMN target_value REAL NOT NULL DEFAULT 1;
          ALTER TABLE habits ADD COLUMN unit TEXT NOT NULL DEFAULT '';
          ALTER TABLE habits ADD COLUMN category TEXT NOT NULL DEFAULT 'routine';
        `);
      } catch {}

      // Add numeric value and mood reflection to checkins
      try {
        db.exec(`
          ALTER TABLE checkins ADD COLUMN value REAL NOT NULL DEFAULT 0;
          ALTER TABLE checkins ADD COLUMN mood TEXT NOT NULL DEFAULT '';
        `);
      } catch {}
    },
  },
  {
    version: 3,
    up: (db) => {
      // Habit dependencies table (for chains/prerequisites)
      db.exec(`
        CREATE TABLE IF NOT EXISTS habit_dependencies (
          habit_id TEXT NOT NULL,
          depends_on_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('prerequisite', 'anti')),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (habit_id, depends_on_id),
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
          FOREIGN KEY (depends_on_id) REFERENCES habits(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_habit_deps_habit ON habit_dependencies(habit_id);
        CREATE INDEX IF NOT EXISTS idx_habit_deps_depends_on ON habit_dependencies(depends_on_id);
      `);

      // Wellness logs (energy/mood tracking)
      db.exec(`
        CREATE TABLE IF NOT EXISTS wellness_logs (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL UNIQUE,
          energy INTEGER NOT NULL CHECK(energy BETWEEN 1 AND 5),
          mood INTEGER NOT NULL CHECK(mood BETWEEN 1 AND 5),
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_wellness_date ON wellness_logs(date);
      `);

      // Skip reasons for failure autopsies
      db.exec(`
        CREATE TABLE IF NOT EXISTS skip_reasons (
          id TEXT PRIMARY KEY,
          habit_id TEXT NOT NULL,
          date TEXT NOT NULL,
          reason TEXT NOT NULL CHECK(reason IN ('forgot', 'busy', 'sick', 'resistance', 'other')),
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_skip_reasons_habit_date ON skip_reasons(habit_id, date);
      `);

      // Skill tree progress
      db.exec(`
        CREATE TABLE IF NOT EXISTS skill_progress (
          user_id TEXT NOT NULL,
          skill_id TEXT NOT NULL,
          level INTEGER NOT NULL DEFAULT 0,
          unlocked_at TEXT,
          PRIMARY KEY (user_id, skill_id)
        );
      `);

      // Trigger rules
      db.exec(`
        CREATE TABLE IF NOT EXISTS trigger_rules (
          id TEXT PRIMARY KEY,
          habit_id TEXT NOT NULL,
          type TEXT NOT NULL,
          config TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_trigger_rules_habit ON trigger_rules(habit_id);
      `);
    },
  },
  {
    version: 4,
    up: (db) => {
      // Timetable schedules
      db.exec(`
        CREATE TABLE IF NOT EXISTS timetable_schedules (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          days_of_week TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]',
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS timetable_blocks (
          id TEXT PRIMARY KEY,
          schedule_id TEXT NOT NULL,
          title TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'general',
          description TEXT NOT NULL DEFAULT '',
          color TEXT NOT NULL DEFAULT '#6366f1',
          emoji TEXT NOT NULL DEFAULT '⏱',
          sound_enabled INTEGER NOT NULL DEFAULT 1,
          habit_id TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (schedule_id) REFERENCES timetable_schedules(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_timetable_blocks_schedule ON timetable_blocks(schedule_id);
        CREATE INDEX IF NOT EXISTS idx_timetable_blocks_start ON timetable_blocks(start_time);

        CREATE TABLE IF NOT EXISTS timetable_executions (
          date TEXT NOT NULL,
          block_id TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 1,
          completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (date, block_id),
          FOREIGN KEY (block_id) REFERENCES timetable_blocks(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_timetable_exec_date ON timetable_executions(date);
      `);
    },
  },
  {
    version: 5,
    up: (db) => {
      // Identity Proof Journaling
      db.exec(`
        CREATE TABLE IF NOT EXISTS habit_proofs (
          id TEXT PRIMARY KEY,
          habit_id TEXT NOT NULL,
          date TEXT NOT NULL,
          image_data TEXT NOT NULL,
          audio_data TEXT DEFAULT '',
          caption TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_habit_proofs_habit_date ON habit_proofs(habit_id, date);
      `);

      // Habit Stacking & Synergy Connections
      db.exec(`
        CREATE TABLE IF NOT EXISTS habit_stacks (
          id TEXT PRIMARY KEY,
          parent_habit_id TEXT NOT NULL,
          child_habit_id TEXT NOT NULL,
          cue_trigger TEXT NOT NULL DEFAULT 'immediate',
          synergy_score REAL NOT NULL DEFAULT 1.0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_habit_id) REFERENCES habits(id) ON DELETE CASCADE,
          FOREIGN KEY (child_habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_habit_stacks_parent ON habit_stacks(parent_habit_id);
        CREATE INDEX IF NOT EXISTS idx_habit_stacks_child ON habit_stacks(child_habit_id);
      `);

      // P2P Duels & Accountability Contracts
      db.exec(`
        CREATE TABLE IF NOT EXISTS p2p_duels (
          id TEXT PRIMARY KEY,
          room_code TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          habit_name TEXT NOT NULL,
          target_days INTEGER NOT NULL DEFAULT 7,
          stake_xp INTEGER NOT NULL DEFAULT 100,
          my_progress INTEGER NOT NULL DEFAULT 0,
          peer_name TEXT NOT NULL DEFAULT 'Peer',
          peer_progress INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_p2p_duels_room ON p2p_duels(room_code);
      `);
    },
  },
  {
    version: 6,
    up: (db) => {
      // User-based Data Scoping
      try {
        db.exec(`
          ALTER TABLE habits ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
          CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
        `);
      } catch {}
      try {
        db.exec(`
          ALTER TABLE timetable_schedules ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
          CREATE INDEX IF NOT EXISTS idx_timetable_schedules_user ON timetable_schedules(user_id);
        `);
      } catch {}
      try {
        db.exec(`
          ALTER TABLE wellness_logs ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
          CREATE INDEX IF NOT EXISTS idx_wellness_user ON wellness_logs(user_id);
        `);
      } catch {}
      try {
        db.exec(`
          ALTER TABLE habit_proofs ADD COLUMN user_id TEXT NOT NULL DEFAULT '';
          CREATE INDEX IF NOT EXISTS idx_habit_proofs_user ON habit_proofs(user_id);
        `);
      } catch {}
    },
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations ORDER BY version ASC').all() as { version: number }[];
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  const insertStmt = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      const runTx = db.transaction(() => {
        migration.up(db);
        insertStmt.run(migration.version, new Date().toISOString());
      });
      runTx();
    }
  }
}