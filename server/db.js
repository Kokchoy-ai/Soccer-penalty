import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vercelda: Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
// Lokal: server/data/soccer_penalty.db fayli.
const LOCAL_PATH = path.join(__dirname, 'data', 'soccer_penalty.db');
const remoteUrl = process.env.TURSO_DATABASE_URL;

if (!remoteUrl) fs.mkdirSync(path.dirname(LOCAL_PATH), { recursive: true });

export const DB_PATH = remoteUrl || LOCAL_PATH;

const client = createClient({
  url: remoteUrl || `file:${LOCAL_PATH.replace(/\\/g, '/')}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      difficulty   TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      player_goals INTEGER NOT NULL,
      cpu_goals    INTEGER NOT NULL,
      result       TEXT NOT NULL CHECK (result IN ('win', 'loss')),
      player_kicks TEXT NOT NULL, -- JSON: ["goal","saved","miss","post", ...]
      cpu_kicks    TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id, created_at);
  `);

  // 1-bosqichda yaratilgan bazaga profil ustunlarini qo'shish
  const { rows } = await client.execute('PRAGMA table_info(users)');
  const userColumns = rows.map((c) => c.name);
  if (!userColumns.includes('avatar')) {
    await client.execute("ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT '⚽'");
  }
  if (!userColumns.includes('favorite_team')) {
    await client.execute("ALTER TABLE users ADD COLUMN favorite_team TEXT NOT NULL DEFAULT ''");
  }
}

// Serverless muhitda har bir sovuq start'da bir marta bajariladi
let ready;
const query = async (sql, args) => {
  ready ??= migrate().catch((e) => {
    ready = undefined;
    throw e;
  });
  await ready;
  return client.execute({ sql, args });
};

const db = {
  get: async (sql, ...args) => (await query(sql, args)).rows[0],
  all: async (sql, ...args) => (await query(sql, args)).rows,
  run: async (sql, ...args) => {
    const r = await query(sql, args);
    return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.rowsAffected };
  },
};

export default db;
