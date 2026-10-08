import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('split.db');

export function initDatabase(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_currency TEXT NOT NULL,
      invite_code TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      user_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      payer_id TEXT NOT NULL REFERENCES members(id),
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      rate REAL NOT NULL,
      base_amount_cents INTEGER NOT NULL,
      split_type TEXT NOT NULL,
      category TEXT,
      note TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_shares (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES members(id),
      item_name TEXT,
      share_cents INTEGER NOT NULL,
      base_share_cents INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      from_member_id TEXT NOT NULL REFERENCES members(id),
      to_member_id TEXT NOT NULL REFERENCES members(id),
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  migrate();
}

function migrate(): void {
  const groupCols = db.getAllSync<{ name: string }>(`PRAGMA table_info(groups)`);
  if (!groupCols.some((c) => c.name === 'invite_code')) {
    db.execSync(`ALTER TABLE groups ADD COLUMN invite_code TEXT`);
  }
  const memberCols = db.getAllSync<{ name: string }>(`PRAGMA table_info(members)`);
  if (!memberCols.some((c) => c.name === 'user_id')) {
    db.execSync(`ALTER TABLE members ADD COLUMN user_id TEXT`);
  }
}
