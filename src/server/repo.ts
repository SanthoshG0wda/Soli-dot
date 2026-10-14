import "server-only";
import { db, getSetting, id, setSetting } from "./db";
import { emit } from "./bus";
import { safeParse } from "./validate";
import { Cron } from "croner";
import { normalizeLook } from "@/lib/look";
import type {
  AppTrigger, ArtifactKind, Attachment, CardData, Channel, Conversation, DocumentArtifact, Dot, DotStatus, Look, Memory, Message, MessageRole, PasswordEntry, Routine, Rule, RuleDecision, Skill,
} from "@/lib/types";

type Row = Record<string, unknown>;
const now = () => Date.now();

// ---------- ownership ----------
// Every dot-owned row carries its owner's user id ('' = legacy, unclaimed).
// Reads that feed the UI always filter by owner; background jobs resolve the
// owner from the row they act on. Messages inherit ownership via conversation.

/** Last-known owner of deleted ids, so the event stream can still filter their delete events. */
const gt = globalThis as unknown as { __dotsTombstones?: Map<string, string> };
const tombstones = (gt.__dotsTombstones ??= new Map<string, string>());
function rememberOwner(id: string, owner: string) {
  if (!owner) return;
  tombstones.set(id, owner);
  if (tombstones.size > 2000) {
    const oldest = tombstones.keys().next();
    if (!oldest.done) tombstones.delete(oldest.value);
  }
}
/** Owner remembered for a deleted id (undefined when never seen). */
export function lastOwner(id: string): string | undefined {
  return tombstones.get(id);
}

const ownerOf = (table: string, id: string): string => {
  const r = db().prepare(`SELECT user_id FROM ${table} WHERE id = ?`).get(id) as Row | undefined;
  return (r?.user_id as string) ?? "";
};

export const ownerOfDot = (dotId: string): string => ownerOf("dots", dotId);
export const ownerOfPassword = (pwId: string): string => ownerOf("passwords", pwId);
export const ownerOfChannel = (channelId: string): string => ownerOf("channels", channelId);
export const ownerOfRule = (ruleId: string): string => ownerOf("rules", ruleId);
export const ownerOfMemory = (memId: string): string => ownerOf("memories", memId);
export const ownerOfSkill = (skillId: string): string => ownerOf("skills", skillId);
export const ownerOfRoutine = (routineId: string): string => ownerOf("routines", routineId);
export const ownerOfTrigger = (triggerId: string): string => ownerOf("triggers", triggerId);
export const ownerOfArtifact = (artifactId: string): string => ownerOf("artifacts", artifactId);
export const ownerOfFile = (fileId: string): string => {
  const r = db().prepare("SELECT f.user_id AS u, d.user_id AS du FROM files f LEFT JOIN dots d ON d.id = f.dot_id WHERE f.id = ?").get(fileId) as Row | undefined;
  return ((r?.u as string) || (r?.du as string) || "") as string;
};

export function ownerOfConversation(convId: string): string {
  const r = db().prepare("SELECT c.user_id AS u, d.user_id AS du FROM conversations c LEFT JOIN dots d ON d.id = c.dot_id WHERE c.id = ?").get(convId) as Row | undefined;
  return ((r?.u as string) || (r?.du as string) || "") as string;
}

export function ownerOfMessage(messageId: string): string {
  const r = db().prepare("SELECT m.conversation_id AS c FROM messages m WHERE m.id = ?").get(messageId) as Row | undefined;
  return r?.c ? ownerOfConversation(r.c as string) : "";
}

/**
 * Assign all legacy (unclaimed) rows to one user. Runs once — guarded by a
 * global flag — on that user's first login/registration after the upgrade.
 */
export function claimUnowned(userId: string) {
  if (!userId || getSetting("legacy_claimed_by")) return;
  const d = db();
  for (const t of ["dots", "conversations", "memories", "rules", "skills", "routines", "triggers", "files", "channels", "passwords"]) {
    d.prepare(`UPDATE ${t} SET user_id = ? WHERE user_id = ''`).run(userId);
  }
  // Personal integration keys move with the data; the E2B key stays deployment-global infrastructure.
  d.prepare("UPDATE settings SET user_id = ? WHERE user_id = '' AND key != 'e2b_key'").run(userId);
  setSetting("legacy_claimed_by", userId);
}

// ---------- dots ----------

const toDot = (r: Row): Dot => ({
  id: r.id as string,
  name: r.name as string,
  purpose: r.purpose as string,
  instructions: r.instructions as string,
  look: normalizeLook(safeParse<Partial<Record<keyof Look, unknown>> | null>(r.look as string, null)),
  status: r.status as DotStatus,
  activity: activity.get(r.id as string) ?? null,
  localAccess: r.local_access === 1,
  model: (r.model as string) ?? null,
  createdAt: r.created_at as number,
});

// Transient "what is the dot doing right now" label; not persisted.
const g = globalThis as unknown as { __dotsActivity?: Map<string, string | null> };
const activity = (g.__dotsActivity ??= new Map());

export function listDots(userId: string): Dot[] {
  return db().prepare("SELECT * FROM dots WHERE user_id = ? ORDER BY created_at").all(userId).map(toDot);
}

/** System use only (boot resets stuck "working" dots for every user). */
export function listAllDots(): Dot[] {
  return db().prepare("SELECT * FROM dots ORDER BY created_at").all().map(toDot);
}

export function getDot(dotId: string): Dot | null {
  const r = db().prepare("SELECT * FROM dots WHERE id = ?").get(dotId);
  return r ? toDot(r) : null;
}

export function findDotByName(name: string, userId: string): Dot | null {
  const r = db().prepare("SELECT * FROM dots WHERE user_id = ? AND lower(name) = lower(?)").get(userId, name.trim());
  return r ? toDot(r) : null;
}

export function createDot(input: { name: string; purpose: string; instructions?: string; look: Look; userId: string }): Dot {
  const dotId = id("vakil");
  db().prepare("INSERT INTO dots (id, name, purpose, instructions, look, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(dotId, input.name, input.purpose, input.instructions ?? "", JSON.stringify(input.look), input.userId, now());
  const dot = getDot(dotId)!;
  emit({ type: "dot", data: dot });
  return dot;
}

export function updateDot(
  dotId: string,
  patch: Partial<Pick<Dot, "name" | "purpose" | "instructions" | "look" | "status" | "localAccess" | "model">>,
): Dot | null {
  const cols: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    cols.push("name = ?");
    vals.push(patch.name);
  }
  if (patch.purpose !== undefined) {
    cols.push("purpose = ?");
    vals.push(patch.purpose);
  }
  if (patch.instructions !== undefined) {
    cols.push("instructions = ?");
    vals.push(patch.instructions);
  }
  if (patch.look !== undefined) {
    cols.push("look = ?");
    vals.push(JSON.stringify(patch.look));
  }
  if (patch.status !== undefined) {
    cols.push("status = ?");
    vals.push(patch.status);
  }
  if (patch.model !== undefined) {
    cols.push("model = ?");
    vals.push(patch.model);
  }
  if (patch.localAccess !== undefined) {
    cols.push("local_access = ?");
    vals.push(patch.localAccess ? 1 : 0);
  }
  if (cols.length) db().prepare(`UPDATE dots SET ${cols.join(", ")} WHERE id = ?`).run(...vals, dotId);
  const dot = getDot(dotId);
  if (dot) emit({ type: "dot", data: dot });
  return dot;
}

export function setActivity(dotId: string, label: string | null) {
  if (activity.get(dotId) === label) return;
  activity.set(dotId, label);
  const dot = getDot(dotId);
  if (dot) emit({ type: "dot", data: dot });
}

export function deleteDot(dotId: string) {
  const d = db();
  rememberOwner(dotId, ownerOfDot(dotId));
  const convs = d.prepare("SELECT id FROM conversations WHERE dot_id = ?").all(dotId) as Row[];
  for (const c of convs) rememberOwner(c.id as string, ownerOfConversation(c.id as string));
  try {
    d.exec("BEGIN");
    for (const t of ["messages", "memories", "skills", "routines", "triggers", "rules", "conversations", "files"]) d.prepare(`DELETE FROM ${t} WHERE dot_id = ?`).run(dotId);
    d.prepare("DELETE FROM dots WHERE id = ?").run(dotId);
    d.exec("COMMIT");
  } catch {
    try { d.exec("ROLLBACK"); } catch {}
    throw new Error("Couldn't delete the dot.");
  }
  emit({ type: "dot_deleted", id: dotId });
}

// Conversation thread (OpenAI previous_response_id) and pending tool state for approvals.
// ---------- conversations ----------
// A dot has many conversations (like ChatGPT chats). While a dot works, the runtime routes it to one
// conversation; its model thread (previous_response_id), pending approvals, and messages live there.
// Routines and channel work use hidden conversations (kind "routine" / "channel") so they don't clutter the list.

const toConversation = (r: Row): Conversation => ({
  id: r.id as string, dotId: r.dot_id as string, title: r.title as string, createdAt: r.created_at as number, updatedAt: r.updated_at as number,
});

export function listConversations(userId: string, dotId?: string): Conversation[] {
  const q = dotId
    ? db().prepare("SELECT * FROM conversations WHERE user_id = ? AND dot_id = ? AND kind = 'chat' ORDER BY updated_at DESC").all(userId, dotId)
    : db().prepare("SELECT * FROM conversations WHERE user_id = ? AND kind = 'chat' ORDER BY updated_at DESC").all(userId);
  return q.map(toConversation);
}

export function getConversation(convId: string): Conversation | null {
  const r = db().prepare("SELECT * FROM conversations WHERE id = ?").get(convId);
  return r ? toConversation(r) : null;
}

export function createConversation(dotId: string, title = "New chat", kind = "chat", ref: string | null = null): Conversation {
  const convId = id("conv");
  db().prepare("INSERT INTO conversations (id, dot_id, title, kind, ref, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(convId, dotId, title, kind, ref, ownerOfDot(dotId), now(), now());
  const c = getConversation(convId)!;
  if (kind === "chat") emit({ type: "conversation", data: c });
  return c;
}

/** A conversation reused across runs: a routine's (listed, kind "chat") or a dot's work in a channel (hidden). */
export function workConversation(dotId: string, kind: "chat" | "channel", ref: string, title: string): string {
  const r = db().prepare("SELECT id FROM conversations WHERE dot_id = ? AND kind = ? AND ref = ?").get(dotId, kind, ref) as Row | undefined;
  return (r?.id as string) ?? createConversation(dotId, title, kind, ref).id;
}

/** The dot's most recently active chat (created if it has none). */
export function latestConversationId(dotId: string): string {
  const r = db().prepare("SELECT id FROM conversations WHERE dot_id = ? AND kind = 'chat' ORDER BY updated_at DESC LIMIT 1").get(dotId) as Row | undefined;
  return (r?.id as string) ?? createConversation(dotId).id;
}

export function renameConversation(convId: string, title: string) {
  db().prepare("UPDATE conversations SET title = ? WHERE id = ?").run(title, convId);
  const c = getConversation(convId);
  if (c) emit({ type: "conversation", data: c });
}

/** Move a chat to another dot (the sidebar's "Move to…" item). */
export function moveConversation(convId: string, targetDotId: string) {
  const d = db();
  d.prepare("UPDATE conversations SET dot_id = ?, updated_at = ? WHERE id = ?").run(targetDotId, now(), convId);
  d.prepare("UPDATE messages SET dot_id = ? WHERE conversation_id = ?").run(targetDotId, convId);
  const c = getConversation(convId);
  if (c) emit({ type: "conversation", data: c });
}

function touchConversation(convId: string) {
  db().prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now(), convId);
}

export function deleteConversation(convId: string, owner?: string) {
  rememberOwner(convId, owner || ownerOfConversation(convId));
  const d = db();
  try {
    d.exec("BEGIN");
    d.prepare("DELETE FROM messages WHERE conversation_id = ?").run(convId);
    d.prepare("DELETE FROM conversations WHERE id = ?").run(convId);
    d.exec("COMMIT");
  } catch {
    try { d.exec("ROLLBACK"); } catch {}
    throw new Error("Couldn't delete the conversation.");
  }
  emit({ type: "conversation_deleted", id: convId });
}

const gc = globalThis as unknown as { __dotsConvRouting?: Map<string, string> };
const convRouting = (gc.__dotsConvRouting ??= new Map());
export function routeToConversation(dotId: string, convId: string | null) {
  if (convId) convRouting.set(dotId, convId);
  else convRouting.delete(dotId);
}
/** The conversation a dot is working in right now (or its latest chat). */
export const currentConversation = (dotId: string) => convRouting.get(dotId) ?? latestConversationId(dotId);

/**
 * What was said on voice calls in this conversation since the text agent last saw it, as a transcript.
 * Voice lines are saved as ordinary chat messages (source "voice"); the text agent's thread doesn't include them.
 */
export function takeVoiceTranscript(convId: string, dotName: string): string {
  const key = `voiceSeen:${convId}`;
  const since = Number(getSetting(key) ?? 0);
  const rows = db()
    .prepare("SELECT * FROM messages WHERE conversation_id = ? AND source = 'voice' AND created_at > ? ORDER BY created_at")
    .all(convId, since)
    .map(toMessage);
  if (!rows.length) return "";
  setSetting(key, String(rows[rows.length - 1].createdAt));
  return rows.map((m) => `${m.role === "user" ? "User" : dotName}: ${m.text}`).join("\n");
}

export function conversationMessages(convId: string, limit = 400): Message[] {
  return db()
    .prepare("SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at")
    .all(convId, limit)
    .map(toMessage);
}

/** Model thread + pending approval state of a specific conversation. */
export function threadOf(convId: string): { thread: string | null; pending: string | null } {
  const r = db().prepare("SELECT thread, pending FROM conversations WHERE id = ?").get(convId) as Row | undefined;
  return { thread: (r?.thread as string) ?? null, pending: (r?.pending as string) ?? null };
}

/** Model thread + pending approval state of the conversation the dot is working in. */
export function getThread(dotId: string): { thread: string | null; pending: string | null } {
  const r = db().prepare("SELECT thread, pending FROM conversations WHERE id = ?").get(currentConversation(dotId)) as Row | undefined;
  return { thread: (r?.thread as string) ?? null, pending: (r?.pending as string) ?? null };
}

export function setThread(dotId: string, thread: string | null, pending: string | null) {
  db().prepare("UPDATE conversations SET thread = ?, pending = ? WHERE id = ?").run(thread, pending, currentConversation(dotId));
}

/** Model-facing history of the conversation the dot is working in (for stateless providers). */
export function getHistory(dotId: string): unknown[] {
  const r = db().prepare("SELECT history FROM conversations WHERE id = ?").get(currentConversation(dotId)) as Row | undefined;
  try {
    return r?.history ? (JSON.parse(r.history as string) as unknown[]) : [];
  } catch {
    return [];
  }
}

export function setHistory(dotId: string, items: unknown[] | null) {
  db().prepare("UPDATE conversations SET history = ? WHERE id = ?").run(items ? JSON.stringify(items) : null, currentConversation(dotId));
}

/** The dot's cloud computer (sandbox id), if it has one. */
export function getBoxId(dotId: string): string | null {
  const r = db().prepare("SELECT box_id FROM dots WHERE id = ?").get(dotId) as Row | undefined;
  return (r?.box_id as string) ?? null;
}

export function setBoxId(dotId: string, boxId: string | null) {
  db().prepare("UPDATE dots SET box_id = ? WHERE id = ?").run(boxId, dotId);
}

// ---------- messages ----------

const toMessage = (r: Row): Message => ({
  id: r.id as string,
  dotId: r.dot_id as string,
  role: r.role as MessageRole,
  text: r.text as string,
  title: (r.title as string) ?? null,
  card: r.card ? safeParse<CardData | null>(r.card as string, null) : null,
  from: (r.source as string) ?? null,
  attachments: r.attachments ? safeParse<Attachment[] | null>(r.attachments as string, null) : null,
  artifactId: (r.artifact_id as string) ?? null,
  channelId: (r.channel_id as string) ?? null,
  conversationId: (r.conversation_id as string) ?? null,
  createdAt: r.created_at as number,
});

export function recentMessages(userId: string, perConv = 200): Message[] {
  return db()
    .prepare(
      `SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) rn FROM messages WHERE channel_id IS NULL AND conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)) WHERE rn <= ? ORDER BY created_at`,
    )
    .all(userId, perConv)
    .map(toMessage);
}

export function dotMessages(dotId: string, limit = 30): Message[] {
  return db()
    .prepare("SELECT * FROM (SELECT * FROM messages WHERE dot_id = ? AND channel_id IS NULL ORDER BY created_at DESC LIMIT ?) ORDER BY created_at")
    .all(dotId, limit)
    .map(toMessage);
}

export function getMessage(messageId: string): Message | null {
  const r = db().prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
  return r ? toMessage(r) : null;
}

// While a dot works on a channel message, its output (replies, activity, cards) is posted to that channel.
const gr = globalThis as unknown as { __dotsRouting?: Map<string, string> };
const routing = (gr.__dotsRouting ??= new Map());
export function routeToChannel(dotId: string, channelId: string | null) {
  if (channelId) routing.set(dotId, channelId);
  else routing.delete(dotId);
}
export const channelRoute = (dotId: string) => routing.get(dotId) ?? null;

export function addMessage(input: {
  dotId: string; role: MessageRole; text: string; title?: string | null; card?: CardData | null; from?: string | null; attachments?: Attachment[] | null;
  artifactId?: string | null;
  channelId?: string | null;
  conversationId?: string | null;
}): Message {
  const msgId = id("msg");
  const channelId = input.channelId !== undefined ? input.channelId : ["dot", "activity", "card"].includes(input.role) ? channelRoute(input.dotId) : null;
  const conversationId = input.conversationId ?? (channelId && input.channelId !== undefined ? null : currentConversation(input.dotId));
  db().prepare("INSERT INTO messages (id, dot_id, role, text, title, card, source, attachments, artifact_id, channel_id, conversation_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(msgId, input.dotId, input.role, input.text, input.title ?? null, input.card ? JSON.stringify(input.card) : null, input.from ?? null,
      input.attachments?.length ? JSON.stringify(input.attachments) : null, input.artifactId ?? null, channelId, conversationId, now());
  if (conversationId && (input.role === "user" || input.role === "dot")) touchConversation(conversationId);
  const msg = getMessage(msgId)!;
  emit({ type: "message", data: msg });
  return msg;
}

export function updateMessage(messageId: string, patch: { text?: string; card?: CardData; artifactId?: string | null }): Message | null {
  if (patch.text !== undefined) db().prepare("UPDATE messages SET text = ? WHERE id = ?").run(patch.text, messageId);
  if (patch.card !== undefined) db().prepare("UPDATE messages SET card = ? WHERE id = ?").run(JSON.stringify(patch.card), messageId);
  if (patch.artifactId !== undefined) db().prepare("UPDATE messages SET artifact_id = ? WHERE id = ?").run(patch.artifactId, messageId);
  const msg = getMessage(messageId);
  if (msg) emit({ type: "message", data: msg });
  return msg;
}

export function pendingCards(dotId: string): Message[] {
  return db()
    .prepare("SELECT * FROM messages WHERE dot_id = ? AND role = 'card' AND json_extract(card, '$.status') = 'pending'")
    .all(dotId)
    .map(toMessage);
}

// ---------- channels ----------

const toChannel = (r: Row): Channel => ({
  id: r.id as string, name: r.name as string, leadId: r.lead_id as string, memberIds: safeParse<string[]>(r.members as string, []), createdAt: r.created_at as number,
});

export function listChannels(userId: string): Channel[] {
  return db().prepare("SELECT * FROM channels WHERE user_id = ? ORDER BY created_at").all(userId).map(toChannel);
}

export function getChannel(channelId: string): Channel | null {
  const r = db().prepare("SELECT * FROM channels WHERE id = ?").get(channelId);
  return r ? toChannel(r) : null;
}

export function createChannel(name: string, leadId: string, memberIds: string[], userId: string): Channel {
  const chId = id("ch");
  const members = [...new Set([leadId, ...memberIds])];
  db().prepare("INSERT INTO channels (id, name, lead_id, members, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(chId, name, leadId, JSON.stringify(members), userId, now());
  const ch = getChannel(chId)!;
  emit({ type: "channel", data: ch });
  return ch;
}

export function deleteChannel(channelId: string) {
  rememberOwner(channelId, ownerOfChannel(channelId));
  const d = db();
  try {
    d.exec("BEGIN");
    d.prepare("DELETE FROM messages WHERE channel_id = ?").run(channelId);
    d.prepare("DELETE FROM channels WHERE id = ?").run(channelId);
    d.exec("COMMIT");
  } catch {
    try { d.exec("ROLLBACK"); } catch {}
    throw new Error("Couldn't delete the channel.");
  }
  emit({ type: "channel_deleted", id: channelId });
}

/** Channel messages for the snapshot (dot chats only carry messages without a channel). */
export function channelMessages(userId: string, limit = 300): Message[] {
  return db()
    .prepare("SELECT * FROM (SELECT * FROM messages WHERE channel_id IS NOT NULL AND channel_id IN (SELECT id FROM channels WHERE user_id = ?) ORDER BY created_at DESC LIMIT ?) ORDER BY created_at")
    .all(userId, limit)
    .map(toMessage);
}

// ---------- rules ----------

const toRule = (r: Row): Rule => ({
  id: r.id as string, dotId: (r.dot_id as string) ?? null, action: r.action as string,
  decision: r.decision as RuleDecision, createdAt: r.created_at as number,
});

export function listRules(userId: string): Rule[] {
  return db().prepare("SELECT * FROM rules WHERE user_id = ? ORDER BY created_at").all(userId).map(toRule);
}

export function rulesFor(dotId: string, userId: string): Rule[] {
  return db().prepare("SELECT * FROM rules WHERE user_id = ? AND (dot_id IS NULL OR dot_id = ?) ORDER BY created_at").all(userId, dotId).map(toRule);
}

export function addRule(input: { dotId: string | null; action: string; decision: RuleDecision; userId: string }): Rule {
  const ruleId = id("rule");
  db().prepare("INSERT INTO rules (id, dot_id, action, decision, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(ruleId, input.dotId, input.action, input.decision, input.userId, now());
  const rule = toRule(db().prepare("SELECT * FROM rules WHERE id = ?").get(ruleId)!);
  emit({ type: "rule", data: rule });
  return rule;
}

export function deleteRule(ruleId: string) {
  rememberOwner(ruleId, ownerOfRule(ruleId));
  db().prepare("DELETE FROM rules WHERE id = ?").run(ruleId);
  emit({ type: "rule_deleted", id: ruleId });
}

// ---------- memories ----------

const toMemory = (r: Row): Memory => ({ id: r.id as string, dotId: r.dot_id as string, text: r.text as string, createdAt: r.created_at as number });

export function listMemories(userId: string, dotId?: string): Memory[] {
  const q = dotId
    ? db().prepare("SELECT * FROM memories WHERE user_id = ? AND dot_id = ? ORDER BY created_at").all(userId, dotId)
    : db().prepare("SELECT * FROM memories WHERE user_id = ? ORDER BY created_at").all(userId);
  return q.map(toMemory);
}

export function addMemory(dotId: string, text: string): Memory {
  const memId = id("mem");
  db().prepare("INSERT INTO memories (id, dot_id, text, user_id, created_at) VALUES (?, ?, ?, ?, ?)").run(memId, dotId, text, ownerOfDot(dotId), now());
  const mem = toMemory(db().prepare("SELECT * FROM memories WHERE id = ?").get(memId)!);
  emit({ type: "memory", data: mem });
  return mem;
}

export function deleteMemory(memId: string) {
  rememberOwner(memId, ownerOfMemory(memId));
  db().prepare("DELETE FROM memories WHERE id = ?").run(memId);
  emit({ type: "memory_deleted", id: memId });
}

// ---------- skills ----------

const toSkill = (r: Row): Skill => ({
  id: r.id as string, dotId: r.dot_id as string, name: r.name as string, description: r.description as string,
  body: r.body as string, createdAt: r.created_at as number,
});

export function listSkills(userId: string, dotId?: string): Skill[] {
  const q = dotId
    ? db().prepare("SELECT * FROM skills WHERE user_id = ? AND dot_id = ? ORDER BY created_at").all(userId, dotId)
    : db().prepare("SELECT * FROM skills WHERE user_id = ? ORDER BY created_at").all(userId);
  return q.map(toSkill);
}

export function upsertSkill(dotId: string, name: string, description: string, body: string): Skill {
  const existing = db().prepare("SELECT id FROM skills WHERE dot_id = ? AND lower(name) = lower(?)").get(dotId, name) as Row | undefined;
  const skillId = (existing?.id as string) ?? id("skill");
  if (existing) db().prepare("UPDATE skills SET description = ?, body = ? WHERE id = ?").run(description, body, skillId);
  else db().prepare("INSERT INTO skills (id, dot_id, name, description, body, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(skillId, dotId, name, description, body, ownerOfDot(dotId), now());
  const skill = toSkill(db().prepare("SELECT * FROM skills WHERE id = ?").get(skillId)!);
  emit({ type: "skill", data: skill });
  return skill;
}

export function deleteSkill(skillId: string) {
  rememberOwner(skillId, ownerOfSkill(skillId));
  db().prepare("DELETE FROM skills WHERE id = ?").run(skillId);
  emit({ type: "skill_deleted", id: skillId });
}

// ---------- routines ----------

function nextRun(schedule: string): number | null {
  try {
    return new Cron(schedule, { paused: true }).nextRun()?.getTime() ?? null;
  } catch {
    return null;
  }
}

const toRoutine = (r: Row): Routine => ({
  id: r.id as string, dotId: r.dot_id as string, name: r.name as string, instruction: r.instruction as string,
  schedule: r.schedule as string, enabled: r.enabled === 1, lastRunAt: (r.last_run_at as number) ?? null,
  nextRunAt: r.enabled === 1 ? nextRun(r.schedule as string) : null, createdAt: r.created_at as number,
});

export function listRoutines(userId: string, dotId?: string): Routine[] {
  const q = dotId
    ? db().prepare("SELECT * FROM routines WHERE user_id = ? AND dot_id = ? ORDER BY created_at").all(userId, dotId)
    : db().prepare("SELECT * FROM routines WHERE user_id = ? ORDER BY created_at").all(userId);
  return q.map(toRoutine);
}

/** System use only (the scheduler runs every user's routines). */
export function listAllRoutines(): Routine[] {
  return db().prepare("SELECT * FROM routines ORDER BY created_at").all().map(toRoutine);
}

export function getRoutine(routineId: string): Routine | null {
  const r = db().prepare("SELECT * FROM routines WHERE id = ?").get(routineId);
  return r ? toRoutine(r) : null;
}

export function validSchedule(schedule: string): boolean {
  return nextRun(schedule) !== null;
}

export function addRoutine(input: { dotId: string; name: string; instruction: string; schedule: string }): Routine {
  const routineId = id("rtn");
  db().prepare("INSERT INTO routines (id, dot_id, name, instruction, schedule, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(routineId, input.dotId, input.name, input.instruction, input.schedule, ownerOfDot(input.dotId), now());
  const routine = getRoutine(routineId)!;
  emit({ type: "routine", data: routine });
  return routine;
}

export function updateRoutine(routineId: string, patch: { enabled?: boolean; lastRunAt?: number }): Routine | null {
  if (patch.enabled !== undefined) db().prepare("UPDATE routines SET enabled = ? WHERE id = ?").run(patch.enabled ? 1 : 0, routineId);
  if (patch.lastRunAt !== undefined) db().prepare("UPDATE routines SET last_run_at = ? WHERE id = ?").run(patch.lastRunAt, routineId);
  const routine = getRoutine(routineId);
  if (routine) emit({ type: "routine", data: routine });
  return routine;
}

export function deleteRoutine(routineId: string) {
  rememberOwner(routineId, ownerOfRoutine(routineId));
  db().prepare("DELETE FROM routines WHERE id = ?").run(routineId);
  emit({ type: "routine_deleted", id: routineId });
}

// ---------- triggers (Composio events that wake a dot) ----------

const toTrigger = (r: Row): AppTrigger => ({
  id: r.id as string, dotId: r.dot_id as string, composioId: r.composio_id as string, slug: r.slug as string,
  toolkit: r.toolkit as string, name: r.name as string, config: safeParse<Record<string, unknown>>(r.config as string, {}),
  instruction: r.instruction as string, enabled: r.enabled === 1, createdAt: r.created_at as number,
  lastFiredAt: (r.last_fired_at as number) ?? null, lastError: (r.last_error as string) ?? null,
});

export function listTriggers(userId: string, dotId?: string): AppTrigger[] {
  const q = dotId
    ? db().prepare("SELECT * FROM triggers WHERE user_id = ? AND dot_id = ? ORDER BY created_at").all(userId, dotId)
    : db().prepare("SELECT * FROM triggers WHERE user_id = ? ORDER BY created_at").all(userId);
  return q.map(toTrigger);
}

export function getTrigger(triggerId: string): AppTrigger | null {
  const r = db().prepare("SELECT * FROM triggers WHERE id = ?").get(triggerId);
  return r ? toTrigger(r) : null;
}

export function triggerByComposioId(composioId: string): AppTrigger | null {
  const r = db().prepare("SELECT * FROM triggers WHERE composio_id = ?").get(composioId);
  return r ? toTrigger(r) : null;
}

export function addTrigger(input: { dotId: string; composioId: string; slug: string; toolkit: string; name: string; config: Record<string, unknown>; instruction: string }): AppTrigger {
  const triggerId = id("trg");
  db()
    .prepare("INSERT INTO triggers (id, dot_id, composio_id, slug, toolkit, name, config, instruction, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(triggerId, input.dotId, input.composioId, input.slug, input.toolkit, input.name, JSON.stringify(input.config), input.instruction, ownerOfDot(input.dotId), now());
  const t = getTrigger(triggerId)!;
  emit({ type: "trigger", data: t });
  return t;
}

export function updateTrigger(triggerId: string, patch: { enabled?: boolean; lastFiredAt?: number; lastError?: string | null }): AppTrigger | null {
  if (patch.enabled !== undefined) db().prepare("UPDATE triggers SET enabled = ? WHERE id = ?").run(patch.enabled ? 1 : 0, triggerId);
  if (patch.lastFiredAt !== undefined) db().prepare("UPDATE triggers SET last_fired_at = ? WHERE id = ?").run(patch.lastFiredAt, triggerId);
  if (patch.lastError !== undefined) db().prepare("UPDATE triggers SET last_error = ? WHERE id = ?").run(patch.lastError, triggerId);
  const t = getTrigger(triggerId);
  if (t) emit({ type: "trigger", data: t });
  return t;
}

export function deleteTrigger(triggerId: string) {
  rememberOwner(triggerId, ownerOfTrigger(triggerId));
  db().prepare("DELETE FROM triggers WHERE id = ?").run(triggerId);
  emit({ type: "trigger_deleted", id: triggerId });
}

/** Start a conversation's next run from a clean model context (the chat itself keeps its messages). */
export function resetThread(convId: string) {
  db().prepare("UPDATE conversations SET thread = NULL, pending = NULL, history = NULL WHERE id = ?").run(convId);
}

// ---------- passwords (secret column is encrypted; see vault.ts) ----------

const toPassword = (r: Row): PasswordEntry => ({ id: r.id as string, site: r.site as string, username: r.username as string, createdAt: r.created_at as number });

export function listPasswords(userId: string): PasswordEntry[] {
  return db().prepare("SELECT id, site, username, created_at FROM passwords WHERE user_id = ? ORDER BY site").all(userId).map(toPassword);
}

export function insertPassword(site: string, username: string, sealed: string, userId: string): PasswordEntry {
  const pwId = id("pw");
  db().prepare("INSERT INTO passwords (id, site, username, secret, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(pwId, site, username, sealed, userId, now());
  const entry = toPassword(db().prepare("SELECT * FROM passwords WHERE id = ?").get(pwId)!);
  emit({ type: "password", data: entry });
  return entry;
}

export function sealedPasswordFor(site: string, userId: string): { username: string; sealed: string; site: string } | null {
  const rows = db().prepare("SELECT site, username, secret FROM passwords WHERE user_id = ?").all(userId) as Row[];
  const host = hostOf(site);
  const match = rows.find((r) => hostOf(r.site as string) === host) ??
    rows.find((r) => host.endsWith("." + hostOf(r.site as string)) || hostOf(r.site as string).endsWith("." + host));
  return match ? { site: match.site as string, username: match.username as string, sealed: match.secret as string } : null;
}

export function deletePassword(pwId: string) {
  rememberOwner(pwId, ownerOfPassword(pwId));
  db().prepare("DELETE FROM passwords WHERE id = ?").run(pwId);
  emit({ type: "password_deleted", id: pwId });
}

export function hostOf(site: string): string {
  try {
    return new URL(site.includes("://") ? site : `https://${site}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return site.toLowerCase();
  }
}

// ---------- artifacts (rich documents, legal papers, PDFs, DOCX) ----------

export const toArtifact = (r: Row): DocumentArtifact => ({
  id: r.id as string,
  conversationId: (r.conversation_id as string) ?? null,
  dotId: r.dot_id as string,
  title: r.title as string,
  filename: r.filename as string,
  kind: r.kind as ArtifactKind,
  content: r.content as string,
  summary: (r.summary as string) ?? null,
  metadata: r.metadata ? safeParse<Record<string, unknown> | null>(r.metadata as string, null) : null,
  fileId: (r.file_id as string) ?? null,
  pdfFileId: (r.pdf_file_id as string) ?? null,
  docxFileId: (r.docx_file_id as string) ?? null,
  createdAt: r.created_at as number,
  updatedAt: r.updated_at as number,
});

export function getArtifact(artifactId: string): DocumentArtifact | null {
  const r = db().prepare("SELECT * FROM artifacts WHERE id = ?").get(artifactId);
  return r ? toArtifact(r) : null;
}

export function listArtifacts(userId: string, conversationId?: string | null): DocumentArtifact[] {
  if (conversationId) {
    return db()
      .prepare("SELECT * FROM artifacts WHERE user_id = ? AND conversation_id = ? ORDER BY created_at DESC")
      .all(userId, conversationId)
      .map(toArtifact);
  }
  return db()
    .prepare("SELECT * FROM artifacts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100")
    .all(userId)
    .map(toArtifact);
}

export function saveArtifact(data: {
  id?: string;
  conversationId?: string | null;
  dotId: string;
  userId: string;
  title: string;
  filename: string;
  kind: ArtifactKind;
  content: string;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  fileId?: string | null;
  pdfFileId?: string | null;
  docxFileId?: string | null;
}): DocumentArtifact {
  const artId = data.id || id("art");
  const convId = data.conversationId ?? currentConversation(data.dotId);
  const metaStr = data.metadata ? JSON.stringify(data.metadata) : null;
  const existing = getArtifact(artId);
  const nowTs = now();
  if (existing) {
    db()
      .prepare(
        "UPDATE artifacts SET title = ?, filename = ?, kind = ?, content = ?, summary = ?, metadata = ?, file_id = ?, pdf_file_id = ?, docx_file_id = ?, updated_at = ? WHERE id = ?"
      )
      .run(data.title, data.filename, data.kind, data.content, data.summary ?? null, metaStr, data.fileId ?? null, data.pdfFileId ?? null, data.docxFileId ?? null, nowTs, artId);
  } else {
    db()
      .prepare(
        "INSERT INTO artifacts (id, conversation_id, dot_id, user_id, title, filename, kind, content, summary, metadata, file_id, pdf_file_id, docx_file_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(artId, convId, data.dotId, data.userId, data.title, data.filename, data.kind, data.content, data.summary ?? null, metaStr, data.fileId ?? null, data.pdfFileId ?? null, data.docxFileId ?? null, nowTs, nowTs);
  }
  const art = getArtifact(artId)!;
  emit({ type: "artifact", data: art });
  return art;
}

export function deleteArtifact(artId: string) {
  rememberOwner(artId, ownerOfArtifact(artId));
  db().prepare("DELETE FROM artifacts WHERE id = ?").run(artId);
  emit({ type: "artifact_deleted", id: artId });
}
