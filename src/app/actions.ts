"use server";

import * as repo from "@/server/repo";
import * as runtime from "@/server/agent/runtime";
import * as computer from "@/server/computer";
import { savePassword as vaultSave } from "@/server/vault";
import { setUserSetting } from "@/server/db";
import { emit } from "@/server/bus";
import { computerInfo } from "@/server/snapshot";
import { models, resetModels, saveApiKey } from "@/server/agent/client";
import { saveOpenRouterKey } from "@/server/agent/openrouter";
import { saveNvidiaKey } from "@/server/agent/nvidia";
import { saveGroqKey } from "@/server/agent/groq";
import { saveAntigravityKey } from "@/server/agent/antigravity";
import * as triggers from "@/server/triggers";
import * as composio from "@/server/composio";
import * as voice from "@/server/voice";
import { autoTitle } from "@/server/titles";
import { getSessionUser, requireUser } from "@/lib/auth";
import type { Attachment, Dot, Look, RuleDecision, TriggerApp, TriggerType } from "@/lib/types";

// All mutations go through here; the UI updates from the event stream, not from return values.
// Every action authenticates the caller and verifies ownership: a user can only
// touch dots, conversations, and configs that belong to their own account.

async function caller() {
  return requireUser();
}

/**
 * Engine settings (provider keys, model defaults) are operator-only: only
 * Soli decides what models users run on. Throws for regular users so direct
 * action calls can't bypass the hidden UI.
 */
async function callerAdmin() {
  const user = await getSessionUser();
  if (!user) throw new Error("Sign in required.");
  if (user.role !== "admin") throw new Error("Only admins can change engine settings.");
  return user;
}

function ownDot(dotId: string, userId: string): Dot {
  const dot = repo.getDot(dotId);
  if (!dot || repo.ownerOfDot(dotId) !== userId) throw new Error("Dot not found.");
  return dot;
}

function ownConversation(convId: string, userId: string) {
  const conv = repo.getConversation(convId);
  if (!conv || repo.ownerOfConversation(convId) !== userId) throw new Error("Conversation not found.");
  return conv;
}

export async function createDot(input: { name: string; purpose: string; instructions?: string; look: Look }): Promise<string> {
  const user = await caller();
  const name = input.name.trim() || "Dot";
  const { getPersonaByName } = await import("@/lib/personas");
  const defaultInstructions = getPersonaByName(name)?.instructions ?? "";
  const instructions = (input.instructions?.trim() || defaultInstructions);
  const dot = repo.createDot({ name, purpose: input.purpose.trim(), instructions, look: input.look, userId: user.id });
  repo.addMessage({
    dotId: dot.id,
    role: "dot",
    text: `Hi, I'm ${dot.name}! Give me anything to work on — I have my own computer and browser, I'll remember what matters, and I'll ask before doing anything important.`,
  });
  return dot.id;
}

export async function updateDot(dotId: string, patch: Partial<Pick<Dot, "name" | "purpose" | "instructions" | "look">>) {
  const user = await caller();
  ownDot(dotId, user.id);
  repo.updateDot(dotId, patch);
}

export async function deleteDot(dotId: string) {
  const user = await caller();
  // Idempotent: a double-click (or stale UI) deleting twice must not crash the page.
  if (!repo.getDot(dotId)) return;
  ownDot(dotId, user.id);
  runtime.stop(dotId);
  await computer.destroy(dotId);
  await triggers.removeTriggersFor(dotId);
  repo.deleteDot(dotId);
}

export async function sendMessage(dotId: string, text: string, attachments: Attachment[] = [], conversationId?: string) {
  if (!text.trim() && !attachments.length) return;
  const user = await caller();
  ownDot(dotId, user.id);
  if (conversationId) {
    const conv = ownConversation(conversationId, user.id);
    if (conv.dotId !== dotId) throw new Error("Conversation not found.");
  }
  runtime.sendMessage(dotId, text.trim(), attachments, conversationId);
  const conv = conversationId ? repo.getConversation(conversationId) : null;
  if (conv?.title === "New chat") void autoTitle(conv.id, text || attachments.map((a) => a.name).join(", "));
}

// ---------- conversations ----------

/** Start a new conversation with its first message. Returns the conversation id. */
export async function startConversation(dotId: string, text: string, attachments: Attachment[] = []): Promise<string> {
  const user = await caller();
  ownDot(dotId, user.id);
  const conv = repo.createConversation(dotId);
  runtime.sendMessage(dotId, text.trim(), attachments, conv.id);
  void autoTitle(conv.id, text || attachments.map((a) => a.name).join(", "));
  return conv.id;
}

export async function renameConversation(convId: string, title: string) {
  const user = await caller();
  ownConversation(convId, user.id);
  if (title.trim()) repo.renameConversation(convId, title.trim().slice(0, 80));
}

export async function deleteConversation(convId: string) {
  const user = await caller();
  // Idempotent: deleting an already-gone conversation is a no-op, not an error.
  if (!repo.getConversation(convId)) return;
  ownConversation(convId, user.id);
  repo.deleteConversation(convId);
}

export async function moveConversation(convId: string, targetDotId: string) {
  const user = await caller();
  ownConversation(convId, user.id);
  ownDot(targetDotId, user.id);
  repo.moveConversation(convId, targetDotId);
}

export async function stopDot(dotId: string) {
  const user = await caller();
  ownDot(dotId, user.id);
  runtime.stop(dotId);
}

export async function pauseDot(dotId: string) {
  const user = await caller();
  ownDot(dotId, user.id);
  runtime.pause(dotId);
}

export async function resumeDot(dotId: string) {
  const user = await caller();
  ownDot(dotId, user.id);
  runtime.resume(dotId);
}

export async function resolveCard(messageId: string, choice: "approve" | "deny" | "always" | "answer", answer?: string) {
  const user = await caller();
  if (repo.ownerOfMessage(messageId) !== user.id) throw new Error("Message not found.");
  await runtime.resolveCard(messageId, choice, answer);
}

export async function setLocalAccess(dotId: string, allowed: boolean) {
  const user = await caller();
  ownDot(dotId, user.id);
  const dot = repo.updateDot(dotId, { localAccess: allowed });
  if (dot)
    repo.addMessage({
      dotId,
      role: "system",
      text: allowed
        ? `${dot.name} can now run tasks on this computer (it will still ask first).`
        : `${dot.name} will no longer be able to access this computer. You can allow access again from its settings on this computer.`,
    });
}

export async function addRule(dotId: string | null, action: string, decision: RuleDecision) {
  const user = await caller();
  if (dotId) ownDot(dotId, user.id);
  if (action.trim()) repo.addRule({ dotId, action: action.trim(), decision, userId: user.id });
}

export async function deleteRule(ruleId: string) {
  const user = await caller();
  if (repo.ownerOfRule(ruleId) !== user.id) throw new Error("Rule not found.");
  repo.deleteRule(ruleId);
}

export async function addMemory(dotId: string, text: string) {
  const user = await caller();
  ownDot(dotId, user.id);
  if (text.trim()) repo.addMemory(dotId, text.trim());
}

export async function deleteMemory(memoryId: string) {
  const user = await caller();
  if (repo.ownerOfMemory(memoryId) !== user.id) throw new Error("Memory not found.");
  repo.deleteMemory(memoryId);
}

export async function saveSkill(dotId: string, name: string, description: string, body: string) {
  const user = await caller();
  ownDot(dotId, user.id);
  if (name.trim() && body.trim()) repo.upsertSkill(dotId, name.trim(), description.trim(), body);
}

export async function deleteSkill(skillId: string) {
  const user = await caller();
  if (repo.ownerOfSkill(skillId) !== user.id) throw new Error("Skill not found.");
  repo.deleteSkill(skillId);
}

export async function addRoutine(dotId: string, name: string, instruction: string, schedule: string): Promise<string | null> {
  const user = await caller();
  ownDot(dotId, user.id);
  if (!repo.validSchedule(schedule)) return "That schedule isn't a valid cron expression.";
  repo.addRoutine({ dotId, name: name.trim() || "Routine", instruction, schedule: schedule.trim() });
  return null;
}

export async function toggleRoutine(routineId: string, enabled: boolean) {
  const user = await caller();
  if (repo.ownerOfRoutine(routineId) !== user.id) throw new Error("Routine not found.");
  repo.updateRoutine(routineId, { enabled });
}

export async function runRoutineNow(routineId: string) {
  const user = await caller();
  if (repo.ownerOfRoutine(routineId) !== user.id) throw new Error("Routine not found.");
  const r = repo.getRoutine(routineId);
  if (r) runtime.runRoutine({ ...r, enabled: true });
}

export async function deleteRoutine(routineId: string) {
  const user = await caller();
  if (repo.ownerOfRoutine(routineId) !== user.id) throw new Error("Routine not found.");
  repo.deleteRoutine(routineId);
}

export async function savePassword(site: string, username: string, password: string): Promise<string | null> {
  const user = await caller();
  if (!site.trim() || !password) return "Site and password are required.";
  vaultSave(site, username, password, user.id);
  return null;
}

export async function deletePassword(passwordId: string) {
  const user = await caller();
  if (repo.ownerOfPassword(passwordId) !== user.id) throw new Error("Password not found.");
  repo.deletePassword(passwordId);
}

/** Take over the dot's computer. Cloud: returns an interactive live-view URL. Local: opens the browser here. */
export async function takeOverComputer(dotId: string): Promise<{ url: string | null; error?: string }> {
  const user = await caller();
  ownDot(dotId, user.id);
  runtime.pause(dotId);
  try {
    return { url: await computer.takeOver(dotId) };
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Start the dot's computer from the Computer tab (Refresh), without pausing the dot. */
export async function wakeComputer(dotId: string) {
  const user = await caller();
  ownDot(dotId, user.id);
  await computer.wake(dotId);
}

export async function handBackComputer(dotId: string) {
  const user = await caller();
  ownDot(dotId, user.id);
  await computer.handBack(dotId);
  runtime.resume(dotId);
}

export async function resetComputer(dotId: string) {
  const user = await caller();
  ownDot(dotId, user.id);
  runtime.stop(dotId);
  await computer.reset(dotId);
  repo.addMessage({
    dotId,
    role: "system",
    text: computer.modeFor(dotId) === "cloud" ? "Computer reset. A fresh cloud computer starts next time." : "Computer reset. Files in /workspace were kept; installed packages were removed.",
  });
}

/** Pick a model for one dot (null = follow the default). Operators only. */
export async function setDotModel(dotId: string, model: string | null) {
  const user = await callerAdmin();
  ownDot(dotId, user.id);
  repo.updateDot(dotId, { model });
}

/** Default model for dots that don't choose their own. */
/** Operator-only: provider keys live with Soli, not with end users. */
export async function setOpenAIKey(key: string): Promise<string | null> {
  const user = await callerAdmin();
  const err = await saveApiKey(key.trim(), user.id);
  if (err) return err;
  emit({ type: "computer", data: computerInfo(user.id) });
  void models(user.id).then(() => emit({ type: "computer", data: computerInfo(user.id) })).catch(() => {});
  return null;
}

/** Operator-only: provider keys live with Soli, not with end users. */
export async function setOpenRouterKey(key: string): Promise<string | null> {
  const user = await callerAdmin();
  const err = await saveOpenRouterKey(key.trim(), user.id);
  if (err) return err;
  resetModels();
  emit({ type: "computer", data: computerInfo(user.id) });
  void models(user.id).then(() => emit({ type: "computer", data: computerInfo(user.id) })).catch(() => {});
  return null;
}

/** Operator-only: provider keys live with Soli, not with end users. */
export async function setNvidiaKey(key: string): Promise<string | null> {
  const user = await callerAdmin();
  const err = await saveNvidiaKey(key.trim(), user.id);
  if (err) return err;
  resetModels();
  emit({ type: "computer", data: computerInfo(user.id) });
  void models(user.id).then(() => emit({ type: "computer", data: computerInfo(user.id) })).catch(() => {});
  return null;
}

/** Operator-only: provider keys live with Soli, not with end users. */
export async function setGroqKey(key: string): Promise<string | null> {
  const user = await callerAdmin();
  const err = await saveGroqKey(key.trim(), user.id);
  if (err) return err;
  resetModels();
  emit({ type: "computer", data: computerInfo(user.id) });
  void models(user.id).then(() => emit({ type: "computer", data: computerInfo(user.id) })).catch(() => {});
  return null;
}

/** Operator-only: provider keys live with Soli, not with end users. */
export async function setAntigravityKey(key: string): Promise<string | null> {
  const user = await callerAdmin();
  const err = await saveAntigravityKey(key.trim(), user.id);
  if (err) return err;
  resetModels();
  emit({ type: "computer", data: computerInfo(user.id) });
  void models(user.id).then(() => emit({ type: "computer", data: computerInfo(user.id) })).catch(() => {});
  return null;
}

// ---------- triggers (Composio API key) ----------

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Paste a Composio API key in Settings to turn on triggers (empty removes it). */
export async function setComposioKey(key: string): Promise<string | null> {
  const user = await caller();
  const err = await triggers.saveComposioKey(key.trim(), user.id);
  if (!err) emit({ type: "computer", data: computerInfo(user.id) });
  return err;
}

export async function listTriggerApps(): Promise<{ apps?: TriggerApp[]; error?: string }> {
  const user = await caller();
  try {
    return { apps: await triggers.triggerApps(user.id) };
  } catch (err) {
    return { error: errText(err) };
  }
}

export async function connectTriggerApp(toolkit: string): Promise<{ url?: string; error?: string }> {
  const user = await caller();
  try {
    return { url: await triggers.connectTriggerApp(toolkit, user.id) };
  } catch (err) {
    return { error: errText(err) };
  }
}

export async function listTriggerTypes(toolkit: string): Promise<{ types?: TriggerType[]; error?: string }> {
  const user = await caller();
  try {
    return { types: await triggers.triggerTypes(toolkit, user.id) };
  } catch (err) {
    return { error: errText(err) };
  }
}

export async function addTrigger(dotId: string, toolkit: string, slug: string, config: Record<string, unknown>, instruction: string): Promise<string | null> {
  const user = await caller();
  ownDot(dotId, user.id);
  if (!instruction.trim()) return "Say what the dot should do when it fires.";
  try {
    await triggers.addTrigger(dotId, toolkit, slug, config, instruction.trim(), user.id);
    return null;
  } catch (err) {
    return errText(err);
  }
}

export async function toggleTrigger(triggerId: string, enabled: boolean): Promise<string | null> {
  const user = await caller();
  if (repo.ownerOfTrigger(triggerId) !== user.id) throw new Error("Trigger not found.");
  try {
    await triggers.setTriggerEnabled(triggerId, enabled, user.id);
    return null;
  } catch (err) {
    return errText(err);
  }
}

export async function deleteTrigger(triggerId: string) {
  const user = await caller();
  if (repo.ownerOfTrigger(triggerId) !== user.id) throw new Error("Trigger not found.");
  await triggers.removeTrigger(triggerId, user.id).catch(() => {});
}

/** Operator-only: the E2B key is shared deployment infrastructure. */
export async function setCloudKey(key: string): Promise<string | null> {
  // The E2B key is deployment infrastructure (the SDK reads it from the
  // process environment), so it stays shared. Computer *contents* are per dot.
  const user = await callerAdmin();
  const err = await computer.saveCloudKey(key.trim());
  if (!err) emit({ type: "computer", data: computerInfo(user.id) });
  return err;
}

/** Operator-only: model choice lives with Soli (admin console), not end users. */
export async function setDefaultModel(model: string | null) {
  const user = await callerAdmin();
  setUserSetting(user.id, "default_model", model);
  emit({ type: "computer", data: computerInfo(user.id) });
}

// ---------- Composio For You (the user's apps) ----------

/** Start signing in to Composio. Returns the Composio sign-in URL to open, or nothing if already signed in. */
export async function signInComposio(): Promise<{ url?: string; error?: string }> {
  const user = await caller();
  try {
    const url = await composio.signIn(user.id);
    return url ? { url } : {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function signOutComposio() {
  const user = await caller();
  await composio.signOut(user.id);
  emit({ type: "computer", data: computerInfo(user.id) });
}

/** Start connecting an app from Settings. Returns the app's sign-in URL to open. */
export async function connectApp(toolkit: string): Promise<{ url?: string; error?: string }> {
  const user = await caller();
  try {
    const r = await composio.startConnect(toolkit, user.id);
    if (r.already) return {};
    void r.wait().catch(() => {});
    return { url: r.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function refreshApps() {
  const user = await caller();
  await composio.refresh(user.id);
}

/** "I've connected" on a connect card: verify, then let the dot continue. */
export async function confirmConnectCard(messageId: string): Promise<boolean> {
  const user = await caller();
  if (repo.ownerOfMessage(messageId) !== user.id) throw new Error("Message not found.");
  const card = repo.getMessage(messageId)?.card;
  if (!card?.toolkit) return false;
  const ok = await composio.isConnected(card.toolkit, user.id).catch(() => false);
  if (ok) await runtime.resolveCard(messageId, "approve");
  return ok;
}

// ---------- voice ----------

/** Start a voice call with a dot: returns a short-lived realtime credential for the browser. */
export async function startVoiceCall(dotId: string, convId: string): Promise<{ token?: string; model?: string; error?: string }> {
  const user = await caller();
  ownDot(dotId, user.id);
  const conv = ownConversation(convId, user.id);
  if (conv.dotId !== dotId) throw new Error("Conversation not found.");
  try {
    return await voice.createVoiceSession(dotId, convId, user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/** Voice mode from a new chat: the call needs a conversation to write its transcript into. */
export async function startVoiceConversation(dotId: string): Promise<string> {
  const user = await caller();
  ownDot(dotId, user.id);
  return repo.createConversation(dotId, "Voice chat").id;
}

/** One finished line of a voice call, saved into the chat like any other message. */
export async function saveVoiceLine(dotId: string, convId: string, who: "you" | "dot", text: string) {
  if (!text.trim()) return;
  const user = await caller();
  ownDot(dotId, user.id);
  const conv = ownConversation(convId, user.id);
  if (conv.dotId !== dotId) throw new Error("Conversation not found.");
  repo.addMessage({ dotId, role: who === "you" ? "user" : "dot", text: text.trim(), from: "voice", conversationId: convId, channelId: null });
  if (who === "you" && repo.getConversation(convId)?.title === "Voice chat") void autoTitle(convId, text);
}

/** send_task from a voice call: hand the job to the dot's working self, in the same chat. */
export async function sendVoiceTask(dotId: string, convId: string, request: string) {
  const user = await caller();
  ownDot(dotId, user.id);
  const conv = ownConversation(convId, user.id);
  if (conv.dotId !== dotId) throw new Error("Conversation not found.");
  if (request.trim()) runtime.queueTask(dotId, request.trim(), convId);
}

// ---------- channels (group chats) ----------

export async function createChannel(name: string, leadId: string, memberIds: string[]): Promise<string> {
  const user = await caller();
  ownDot(leadId, user.id);
  for (const id of memberIds) ownDot(id, user.id);
  const ch = repo.createChannel(name.trim().replace(/^#/, "") || "team", leadId, memberIds, user.id);
  const lead = repo.getDot(leadId);
  repo.addMessage({
    dotId: leadId,
    role: "system",
    text: `#${ch.name} created. ${lead?.name ?? "The lead"} coordinates; mention @Name to ask someone directly.`,
    channelId: ch.id,
  });
  return ch.id;
}

export async function deleteChannel(channelId: string) {
  const user = await caller();
  if (repo.ownerOfChannel(channelId) !== user.id) throw new Error("Channel not found.");
  repo.deleteChannel(channelId);
}

export async function sendChannelMessage(channelId: string, text: string) {
  const user = await caller();
  if (repo.ownerOfChannel(channelId) !== user.id) throw new Error("Channel not found.");
  if (text.trim()) runtime.sendToChannel(channelId, text.trim());
}
