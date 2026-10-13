import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";

const DATA_DIR = process.env.DOTS_DATA_DIR || path.join(process.cwd(), ".data");
const SQLITE_PATH = path.join(DATA_DIR, "dots.db");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  if (!fs.existsSync(SQLITE_PATH)) {
    console.log(`No SQLite database found at ${SQLITE_PATH}. Nothing to migrate.`);
    return;
  }

  console.log(`Found SQLite database at ${SQLITE_PATH}. Starting migration to PostgreSQL...`);
  const sqlite = new DatabaseSync(SQLITE_PATH);

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql, { schema });

  try {
    // 1. Migrate dots
    const dotsRows = sqlite.prepare("SELECT * FROM dots").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${dotsRows.length} dots...`);
    for (const r of dotsRows) {
      await db.insert(schema.dots).values({
        id: String(r.id),
        userId: String(r.user_id ?? ""),
        name: String(r.name),
        purpose: String(r.purpose ?? ""),
        instructions: String(r.instructions ?? ""),
        look: String(r.look),
        status: String(r.status ?? "idle"),
        localAccess: Number(r.local_access ?? 0),
        model: r.model ? String(r.model) : null,
        boxId: r.box_id ? String(r.box_id) : null,
        thread: r.thread ? String(r.thread) : null,
        pending: r.pending ? String(r.pending) : null,
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    // 2. Migrate conversations
    const convRows = sqlite.prepare("SELECT * FROM conversations").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${convRows.length} conversations...`);
    for (const r of convRows) {
      await db.insert(schema.conversations).values({
        id: String(r.id),
        dotId: String(r.dot_id),
        userId: String(r.user_id ?? ""),
        title: String(r.title),
        kind: String(r.kind ?? "chat"),
        ref: r.ref ? String(r.ref) : null,
        thread: r.thread ? String(r.thread) : null,
        pending: r.pending ? String(r.pending) : null,
        history: r.history ? String(r.history) : null,
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
      }).onConflictDoNothing();
    }

    // 3. Migrate messages
    const msgRows = sqlite.prepare("SELECT * FROM messages").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${msgRows.length} dot messages...`);
    for (const r of msgRows) {
      await db.insert(schema.dotMessages).values({
        id: String(r.id),
        dotId: String(r.dot_id),
        conversationId: r.conversation_id ? String(r.conversation_id) : null,
        channelId: r.channel_id ? String(r.channel_id) : null,
        role: String(r.role),
        text: String(r.text ?? ""),
        title: r.title ? String(r.title) : null,
        card: r.card ? String(r.card) : null,
        source: r.source ? String(r.source) : null,
        attachments: r.attachments ? String(r.attachments) : null,
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    // 4. Migrate rules
    const ruleRows = sqlite.prepare("SELECT * FROM rules").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${ruleRows.length} rules...`);
    for (const r of ruleRows) {
      await db.insert(schema.rules).values({
        id: String(r.id),
        dotId: r.dot_id ? String(r.dot_id) : null,
        userId: String(r.user_id ?? ""),
        action: String(r.action),
        decision: String(r.decision),
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    // 5. Migrate memories
    const memRows = sqlite.prepare("SELECT * FROM memories").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${memRows.length} memories...`);
    for (const r of memRows) {
      await db.insert(schema.memories).values({
        id: String(r.id),
        dotId: String(r.dot_id),
        userId: String(r.user_id ?? ""),
        text: String(r.text),
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    // 6. Migrate skills
    const skillRows = sqlite.prepare("SELECT * FROM skills").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${skillRows.length} skills...`);
    for (const r of skillRows) {
      await db.insert(schema.skills).values({
        id: String(r.id),
        dotId: String(r.dot_id),
        userId: String(r.user_id ?? ""),
        name: String(r.name),
        description: String(r.description),
        body: String(r.body),
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    // 7. Migrate routines
    const routineRows = sqlite.prepare("SELECT * FROM routines").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${routineRows.length} routines...`);
    for (const r of routineRows) {
      await db.insert(schema.routines).values({
        id: String(r.id),
        dotId: String(r.dot_id),
        userId: String(r.user_id ?? ""),
        name: String(r.name),
        instruction: String(r.instruction),
        schedule: String(r.schedule),
        enabled: Number(r.enabled ?? 1),
        lastRunAt: r.last_run_at ? Number(r.last_run_at) : null,
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    // 8. Migrate triggers
    const triggerRows = sqlite.prepare("SELECT * FROM triggers").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${triggerRows.length} triggers...`);
    for (const r of triggerRows) {
      await db.insert(schema.triggers).values({
        id: String(r.id),
        dotId: String(r.dot_id),
        userId: String(r.user_id ?? ""),
        composioId: String(r.composio_id),
        slug: String(r.slug),
        toolkit: String(r.toolkit),
        name: String(r.name),
        config: String(r.config),
        instruction: String(r.instruction),
        enabled: Number(r.enabled ?? 1),
        lastFiredAt: r.last_fired_at ? Number(r.last_fired_at) : null,
        lastError: r.last_error ? String(r.last_error) : null,
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    // 9. Migrate files
    const fileRows = sqlite.prepare("SELECT * FROM files").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${fileRows.length} dot files...`);
    for (const r of fileRows) {
      await db.insert(schema.dotFiles).values({
        id: String(r.id),
        dotId: String(r.dot_id),
        userId: String(r.user_id ?? ""),
        name: String(r.name),
        mime: String(r.mime),
        size: Number(r.size),
        source: String(r.source),
        boxPath: r.box_path ? String(r.box_path) : null,
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    // 10. Migrate channels
    const channelRows = sqlite.prepare("SELECT * FROM channels").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${channelRows.length} channels...`);
    for (const r of channelRows) {
      await db.insert(schema.channels).values({
        id: String(r.id),
        userId: String(r.user_id ?? ""),
        name: String(r.name),
        leadId: String(r.lead_id),
        members: String(r.members),
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    // 11. Migrate settings
    const settingRows = sqlite.prepare("SELECT * FROM settings").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${settingRows.length} settings...`);
    for (const r of settingRows) {
      await db.insert(schema.settings).values({
        userId: String(r.user_id ?? ""),
        key: String(r.key),
        value: String(r.value),
      }).onConflictDoNothing();
    }

    // 12. Migrate passwords
    const passwordRows = sqlite.prepare("SELECT * FROM passwords").all() as Array<Record<string, unknown>>;
    console.log(`Migrating ${passwordRows.length} passwords...`);
    for (const r of passwordRows) {
      await db.insert(schema.passwords).values({
        id: String(r.id),
        userId: String(r.user_id ?? ""),
        site: String(r.site),
        username: String(r.username),
        secret: String(r.secret),
        createdAt: Number(r.created_at),
      }).onConflictDoNothing();
    }

    console.log("Migration from SQLite to PostgreSQL completed successfully!");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
