import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// The desktop app points this at its Application Support folder; in development it's .data/ in the project.
export const DATA_DIR = process.env.DOTS_DATA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".data");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS dots (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, purpose TEXT NOT NULL DEFAULT '', instructions TEXT NOT NULL DEFAULT '',
  look TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle', local_access INTEGER NOT NULL DEFAULT 0,
  thread TEXT, pending TEXT, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, dot_id TEXT NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL DEFAULT '', title TEXT,
  card TEXT, source TEXT, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_dot ON messages(dot_id, created_at);
CREATE TABLE IF NOT EXISTS rules (id TEXT PRIMARY KEY, dot_id TEXT, action TEXT NOT NULL, decision TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS memories (id TEXT PRIMARY KEY, dot_id TEXT NOT NULL, text TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, dot_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, body TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY, dot_id TEXT NOT NULL, name TEXT NOT NULL, instruction TEXT NOT NULL, schedule TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1, last_run_at INTEGER, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS triggers (
  id TEXT PRIMARY KEY, dot_id TEXT NOT NULL, composio_id TEXT NOT NULL, slug TEXT NOT NULL, toolkit TEXT NOT NULL,
  name TEXT NOT NULL, config TEXT NOT NULL, instruction TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
  last_fired_at INTEGER, last_error TEXT, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY, dot_id TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
  source TEXT NOT NULL, box_path TEXT, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS channels (id TEXT PRIMARY KEY, name TEXT NOT NULL, lead_id TEXT NOT NULL, members TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, dot_id TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'chat', ref TEXT,
  thread TEXT, pending TEXT, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS conversations_dot ON conversations(dot_id, updated_at);
CREATE TABLE IF NOT EXISTS settings (key TEXT NOT NULL, value TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '', PRIMARY KEY (user_id, key));
CREATE TABLE IF NOT EXISTS passwords (id TEXT PRIMARY KEY, site TEXT NOT NULL, username TEXT NOT NULL, secret TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY, conversation_id TEXT, dot_id TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL, filename TEXT NOT NULL, kind TEXT NOT NULL, content TEXT NOT NULL,
  summary TEXT, metadata TEXT, file_id TEXT, pdf_file_id TEXT, docx_file_id TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS artifacts_conv ON artifacts(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS artifacts_user ON artifacts(user_id, created_at);
`;

const SCHEMA_VERSION = 2;
const g = globalThis as unknown as { __dotsDb?: DatabaseSync; __dotsDbSchemaVersion?: number };

export function db(): DatabaseSync {
  if (!g.__dotsDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const conn = new DatabaseSync(path.join(DATA_DIR, "dots.db"));
    conn.exec("PRAGMA journal_mode = WAL;");
    conn.exec(SCHEMA);
    g.__dotsDb = conn;
  }
  if (g.__dotsDbSchemaVersion !== SCHEMA_VERSION) {
    g.__dotsDb.exec(SCHEMA);
    migrate(g.__dotsDb);
    g.__dotsDbSchemaVersion = SCHEMA_VERSION;
  }
  return g.__dotsDb;
}

/** Additive migrations for databases created by earlier versions. */
function migrate(conn: DatabaseSync) {
  const hasCol = (table: string, col: string) =>
    conn.prepare(`PRAGMA table_info(${table})`).all().map((c) => (c as { name: string }).name).includes(col);
  const cols = conn.prepare("PRAGMA table_info(dots)").all().map((c) => (c as { name: string }).name);
  if (!cols.includes("model")) conn.exec("ALTER TABLE dots ADD COLUMN model TEXT");
  if (!cols.includes("box_id")) conn.exec("ALTER TABLE dots ADD COLUMN box_id TEXT");
  const convCols = conn.prepare("PRAGMA table_info(conversations)").all().map((c) => (c as { name: string }).name);
  // Model-facing history for providers that don't keep conversation state (OpenRouter).
  if (convCols.length && !convCols.includes("history")) conn.exec("ALTER TABLE conversations ADD COLUMN history TEXT");
  const msgCols = conn.prepare("PRAGMA table_info(messages)").all().map((c) => (c as { name: string }).name);
  if (!msgCols.includes("attachments")) conn.exec("ALTER TABLE messages ADD COLUMN attachments TEXT");
  if (!msgCols.includes("channel_id")) conn.exec("ALTER TABLE messages ADD COLUMN channel_id TEXT");
  if (!msgCols.includes("artifact_id")) conn.exec("ALTER TABLE messages ADD COLUMN artifact_id TEXT");
  if (!msgCols.includes("conversation_id")) {
    conn.exec("ALTER TABLE messages ADD COLUMN conversation_id TEXT");
    // Each dot's existing single chat becomes its first conversation (keeping its model thread).
    const dots = conn.prepare("SELECT id, thread, pending FROM dots").all() as { id: string; thread: string | null; pending: string | null }[];
    for (const d of dots) {
      const span = conn
        .prepare("SELECT MIN(created_at) a, MAX(created_at) b, COUNT(*) n FROM messages WHERE dot_id = ? AND channel_id IS NULL")
        .get(d.id) as { a: number | null; b: number | null; n: number };
      if (!span.n) continue;
      const convId = `conv_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      conn.prepare("INSERT INTO conversations (id, dot_id, title, thread, pending, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(convId, d.id, "First chat", d.thread, d.pending, span.a, span.b);
      conn.prepare("UPDATE messages SET conversation_id = ? WHERE dot_id = ? AND channel_id IS NULL").run(convId, d.id);
    }
  }
  // Per-user isolation: every owned row carries its owner's user id ('' = legacy, unclaimed).
  // Messages inherit ownership through their conversation; settings with user_id '' are deployment-global.
  for (const t of ["dots", "conversations", "memories", "rules", "skills", "routines", "triggers", "files", "channels", "passwords", "artifacts"]) {
    if (!hasCol(t, "user_id")) conn.exec(`ALTER TABLE ${t} ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`);
  }
  conn.exec("CREATE INDEX IF NOT EXISTS dots_user ON dots(user_id, created_at)");
  conn.exec("CREATE INDEX IF NOT EXISTS conversations_user ON conversations(user_id, updated_at)");
  // Drop blank placeholder rows left by older streaming code: tool-only turns
  // were persisted as empty/"…" dot messages with no card or attachments.
  conn.exec("DELETE FROM messages WHERE role = 'dot' AND (text = '' OR text = '…') AND card IS NULL AND (attachments IS NULL OR attachments IN ('', '[]'))");
  if (!hasCol("settings", "user_id")) {
    // Rebuild settings with a composite (user_id, key) primary key so each user holds their own keys.
    conn.exec("ALTER TABLE settings ADD COLUMN user_id TEXT NOT NULL DEFAULT ''");
    const pk = conn.prepare("PRAGMA table_info(settings)").all() as { name: string; pk: number }[];
    if (pk.filter((c) => c.pk > 0).length === 1) {
      conn.exec("CREATE TABLE IF NOT EXISTS settings_new (key TEXT NOT NULL, value TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT '', PRIMARY KEY (user_id, key))");
      conn.exec("INSERT OR IGNORE INTO settings_new (key, value, user_id) SELECT key, value, user_id FROM settings");
      conn.exec("DROP TABLE settings");
      conn.exec("ALTER TABLE settings_new RENAME TO settings");
    }
  }
}

export function getSetting(key: string): string | null {
  const r = db().prepare("SELECT value FROM settings WHERE user_id = '' AND key = ?").get(key) as { value: string } | undefined;
  return r?.value ?? null;
}

export function setSetting(key: string, value: string | null) {
  if (value === null) db().prepare("DELETE FROM settings WHERE user_id = '' AND key = ?").run(key);
  else db().prepare("INSERT INTO settings (key, value, user_id) VALUES (?, ?, '') ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value").run(key, value);
}

/**
 * Whether this user is a deployment operator (admin). The role is mirrored
 * from Postgres into a per-user SQLite setting on login/signup (and on every
 * admin role change), so sync model-resolution code can read it. Missing =
 * regular user (fail closed): only admins may hold personal provider keys or
 * personal model defaults; everyone else runs on env keys + admin defaults.
 */
export function isOperator(userId: string): boolean {
  return getUserSetting(userId, "role") === "admin";
}

/** A single user's own setting (API keys, model defaults, integrations). No fallback to global. */
export function getUserSetting(userId: string, key: string): string | null {
  const r = db().prepare("SELECT value FROM settings WHERE user_id = ? AND key = ?").get(userId, key) as { value: string } | undefined;
  return r?.value ?? null;
}

export function setUserSetting(userId: string, key: string, value: string | null) {
  if (value === null) db().prepare("DELETE FROM settings WHERE user_id = ? AND key = ?").run(userId, key);
  else db().prepare("INSERT INTO settings (key, value, user_id) VALUES (?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value").run(key, value, userId);
}

/** Distinct user ids holding a given setting (for boot-time reconnects). */
export function usersWithSetting(key: string): string[] {
  return (db().prepare("SELECT DISTINCT user_id AS u FROM settings WHERE key = ? AND user_id != ''").all(key) as { u: string }[]).map((r) => r.u);
}

/** Distinct user ids holding any setting (i.e. known users of the local store). */
export function settingUserIds(): string[] {
  return (db().prepare("SELECT DISTINCT user_id AS u FROM settings WHERE user_id != ''").all() as { u: string }[]).map((r) => r.u);
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
