import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';

describe('SQLite User-Scoped Query Syntax', () => {
  it('executes getHabits query with single-quoted empty string and NULL fallback without SqliteError', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE habits (
        id TEXT PRIMARY KEY,
        name TEXT,
        archived INT DEFAULT 0,
        user_id TEXT,
        sort_order INT DEFAULT 0,
        created_at TEXT
      );
    `);

    // Insert legacy habits (NULL user_id, '' user_id) and user-scoped habit
    db.exec(`
      INSERT INTO habits (id, name, archived, user_id, sort_order, created_at)
      VALUES 
        ('h1', 'Legacy Null', 0, NULL, 0, '2026-11-01'),
        ('h2', 'Legacy Empty', 0, '', 1, '2026-11-01'),
        ('h3', 'User Specific', 0, 'u123', 2, '2026-11-01'),
        ('h4', 'Other User', 0, 'u999', 3, '2026-11-01');
    `);

    const query = "SELECT * FROM habits WHERE archived = 0 AND (user_id = ? OR user_id = '' OR user_id IS NULL) ORDER BY sort_order ASC, created_at ASC";
    const stmt = db.prepare(query);
    const rows = stmt.all('u123') as any[];

    // Should return h1 (NULL), h2 (''), and h3 ('u123'), but NOT h4 ('u999')
    expect(rows.length).toBe(3);
    expect(rows.map(r => r.id)).toEqual(['h1', 'h2', 'h3']);

    db.close();
  });
});
