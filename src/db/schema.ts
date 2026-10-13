import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { Citation } from "@/types";

/**
 * Document lifecycle. The column is plain text with a check constraint (not a
 * Postgres enum) so the set of statuses can evolve without enum gymnastics:
 * uploading -> processing -> ready | failed
 */
export const DocumentStatus = {
  Uploading: "uploading",
  Processing: "processing",
  Ready: "ready",
  Failed: "failed",
} as const;

export type DocumentStatusValue = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const messageRole = pgEnum("message_role", ["user", "assistant"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("users_role_check", sql`${table.role} IN ('admin', 'user')`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const PlanTier = {
  Free: "free",
  Starter: "starter",
  Pro: "pro",
  Enterprise: "enterprise",
} as const;

export type PlanTierValue = (typeof PlanTier)[keyof typeof PlanTier];

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    planTier: text("plan_tier").notNull().default(PlanTier.Free),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "organizations_plan_tier_check",
      sql`${table.planTier} IN ('free', 'starter', 'pro', 'enterprise')`,
    ),
  ],
);

export const OrgMemberRole = {
  Owner: "owner",
  Admin: "admin",
  Member: "member",
  Viewer: "viewer",
} as const;

export type OrgMemberRoleValue = (typeof OrgMemberRole)[keyof typeof OrgMemberRole];

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default(OrgMemberRole.Member),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "org_members_role_check",
      sql`${table.role} IN ('owner', 'admin', 'member', 'viewer')`,
    ),
    index("org_members_org_id_idx").on(table.organizationId),
    index("org_members_user_id_idx").on(table.userId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    pageCount: integer("page_count"),
    // Corpus collection (constitutional | statutes | case-law). Nullable so
    // documents uploaded before collections existed stay uncategorized.
    collection: text("collection"),
    status: text("status").notNull().default(DocumentStatus.Uploading),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "documents_status_check",
      sql`${table.status} IN ('uploading', 'processing', 'ready', 'failed')`,
    ),
    check(
      "documents_collection_check",
      sql`(${table.collection} IS NULL OR ${table.collection} IN ('constitutional', 'statutes', 'case-law'))`,
    ),
    index("documents_org_id_idx").on(table.organizationId),
    index("documents_user_id_idx").on(table.userId),
  ],
);

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    pageNumber: integer("page_number"),
    chunkIndex: integer("chunk_index").notNull(),
    charCount: integer("char_count").notNull(),
    charStart: integer("char_start"),
    charEnd: integer("char_end"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chunks_document_id_idx").on(table.documentId),
    index("chunks_document_chunk_idx").on(
      table.documentId,
      table.chunkIndex,
    ),
  ],
);

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    // Nullable only to preserve chats created before auth existed; the app
    // always sets an owner for new chats and filters reads by owner.
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chats_org_id_idx").on(table.organizationId),
    index("chats_user_id_idx").on(table.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations")
      .$type<Citation[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("messages_chat_id_idx").on(table.chatId)],
);

export const dots = pgTable(
  "dots",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default(""),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    purpose: text("purpose").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    look: text("look").notNull(),
    status: text("status").notNull().default("idle"),
    localAccess: integer("local_access").notNull().default(0),
    model: text("model"),
    boxId: text("box_id"),
    thread: text("thread"),
    pending: text("pending"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("dots_user_id_idx").on(table.userId),
    index("dots_org_id_idx").on(table.organizationId),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    dotId: text("dot_id").notNull(),
    userId: text("user_id").notNull().default(""),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("chat"),
    ref: text("ref"),
    thread: text("thread"),
    pending: text("pending"),
    history: text("history"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("conversations_dot_idx").on(table.dotId, table.updatedAt),
    index("conversations_user_idx").on(table.userId, table.updatedAt),
    index("conversations_org_id_idx").on(table.organizationId),
  ],
);

export const dotMessages = pgTable(
  "dot_messages",
  {
    id: text("id").primaryKey(),
    dotId: text("dot_id").notNull(),
    conversationId: text("conversation_id"),
    channelId: text("channel_id"),
    role: text("role").notNull(),
    text: text("text").notNull().default(""),
    title: text("title"),
    card: text("card"),
    source: text("source"),
    attachments: text("attachments"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("dot_messages_conv_idx").on(table.conversationId, table.createdAt),
    index("dot_messages_dot_idx").on(table.dotId, table.createdAt),
  ],
);

export const rules = pgTable(
  "rules",
  {
    id: text("id").primaryKey(),
    dotId: text("dot_id"),
    userId: text("user_id").notNull().default(""),
    action: text("action").notNull(),
    decision: text("decision").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("rules_user_idx").on(table.userId)],
);

export const memories = pgTable(
  "memories",
  {
    id: text("id").primaryKey(),
    dotId: text("dot_id").notNull(),
    userId: text("user_id").notNull().default(""),
    text: text("text").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("memories_dot_idx").on(table.dotId),
    index("memories_user_idx").on(table.userId),
  ],
);

export const skills = pgTable(
  "skills",
  {
    id: text("id").primaryKey(),
    dotId: text("dot_id").notNull(),
    userId: text("user_id").notNull().default(""),
    name: text("name").notNull(),
    description: text("description").notNull(),
    body: text("body").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("skills_dot_idx").on(table.dotId),
    index("skills_user_idx").on(table.userId),
  ],
);

export const routines = pgTable(
  "routines",
  {
    id: text("id").primaryKey(),
    dotId: text("dot_id").notNull(),
    userId: text("user_id").notNull().default(""),
    name: text("name").notNull(),
    instruction: text("instruction").notNull(),
    schedule: text("schedule").notNull(),
    enabled: integer("enabled").notNull().default(1),
    lastRunAt: bigint("last_run_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("routines_user_idx").on(table.userId)],
);

export const triggers = pgTable(
  "triggers",
  {
    id: text("id").primaryKey(),
    dotId: text("dot_id").notNull(),
    userId: text("user_id").notNull().default(""),
    composioId: text("composio_id").notNull(),
    slug: text("slug").notNull(),
    toolkit: text("toolkit").notNull(),
    name: text("name").notNull(),
    config: text("config").notNull(),
    instruction: text("instruction").notNull(),
    enabled: integer("enabled").notNull().default(1),
    lastFiredAt: bigint("last_fired_at", { mode: "number" }),
    lastError: text("last_error"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("triggers_user_idx").on(table.userId)],
);

export const dotFiles = pgTable(
  "dot_files",
  {
    id: text("id").primaryKey(),
    dotId: text("dot_id").notNull(),
    userId: text("user_id").notNull().default(""),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    source: text("source").notNull(),
    boxPath: text("box_path"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("dot_files_user_idx").on(table.userId)],
);

export const channels = pgTable(
  "channels",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default(""),
    name: text("name").notNull(),
    leadId: text("lead_id").notNull(),
    members: text("members").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("channels_user_idx").on(table.userId)],
);

export const settings = pgTable(
  "settings",
  {
    userId: text("user_id").notNull().default(""),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.key] }),
    index("settings_user_idx").on(table.userId),
  ],
);

export const passwords = pgTable(
  "passwords",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default(""),
    site: text("site").notNull(),
    username: text("username").notNull(),
    secret: text("secret").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("passwords_user_idx").on(table.userId)],
);

export const ragEvals = pgTable(
  "rag_evals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    query: text("query").notNull(),
    expectedAnswer: text("expected_answer").notNull(),
    category: text("category").notNull().default("general"),
    expectedDocTitle: text("expected_doc_title"),
    lastScore: integer("last_score"), // 0 - 100
    lastPassed: integer("last_passed"), // 0 or 1
    lastLatencyMs: integer("last_latency_ms"),
    lastResult: text("last_result"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("rag_evals_category_idx").on(table.category)],
);

export const planConfigs = pgTable(
  "plan_configs",
  {
    tier: text("tier").primaryKey(), // 'free', 'starter', 'pro', 'enterprise'
    name: text("name").notNull(),
    monthlyPriceUsd: integer("monthly_price_usd").notNull().default(0),
    monthlyTokens: integer("monthly_tokens").notNull().default(500000),
    maxDocuments: integer("max_documents").notNull().default(50),
    maxSeats: integer("max_seats").notNull().default(1),
    topKLimit: integer("top_k_limit").notNull().default(5),
    allowedModels: text("allowed_models").notNull().default("standard"),
    features: text("features").notNull().default("[]"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);