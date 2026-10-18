"use server";

import { getSessionUser, requireUser } from "@/lib/auth";
import type { Attachment, Dot, Look, RuleDecision, TriggerApp, TriggerType } from "@/lib/types";
import {
  BACKEND_URL,
  backendFetch,
  createBackendConversation,
  createBackendDot,
  deleteBackendDot,
  sendAgentMessage,
  abortAgent,
} from "@/lib/backend-client";

async function caller() {
  return requireUser();
}

async function callerAdmin() {
  const user = await getSessionUser();
  if (!user) throw new Error("Sign in required.");
  if (user.role !== "admin") throw new Error("Only admins can change engine settings.");
  return user;
}

// ---------- Dots ----------

export async function createDot(input: {
  name: string;
  purpose: string;
  instructions?: string;
  look: Look;
}): Promise<string> {
  const user = await caller();
  const name = input.name.trim() || "Dot";
  const { getPersonaByName } = await import("@/lib/personas");
  const defaultInstructions = getPersonaByName(name)?.instructions ?? "";
  const instructions = input.instructions?.trim() || defaultInstructions;

  const dot = await createBackendDot({
    name,
    purpose: input.purpose.trim(),
    instructions,
    look: input.look,
    userId: user.id,
  });

  return dot.id;
}

export async function updateDot(
  dotId: string,
  patch: Partial<Pick<Dot, "name" | "purpose" | "instructions" | "look">>
) {
  const user = await caller();
  await backendFetch(`/api/dots/${dotId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...patch, userId: user.id }),
  });
}

export async function deleteDot(dotId: string) {
  await caller();
  await deleteBackendDot(dotId);
}

// ---------- Chat & Agent Execution ----------

export async function sendMessage(
  dotId: string,
  text: string,
  attachments: Attachment[] = [],
  conversationId?: string,
  messageId?: string
) {
  if (!text.trim() && !attachments.length) return;
  const user = await caller();

  const res = await sendAgentMessage(dotId, text.trim(), user.id, conversationId, messageId);
  return {
    userMessage: res?.userMessage,
    assistantMessage: res?.assistantMessage,
    conversationId: res?.userMessage?.conversationId || conversationId,
  };
}

export async function startConversation(
  dotId: string,
  text: string,
  attachments: Attachment[] = [],
  customConvId?: string,
  messageId?: string
) {
  const user = await caller();
  const conv = await createBackendConversation(
    dotId,
    text.trim().slice(0, 40) || "New consultation",
    user.id,
    customConvId
  );
  const res = await sendAgentMessage(dotId, text.trim(), user.id, conv.id, messageId);
  return {
    conversationId: conv.id,
    conversation: conv,
    userMessage: res?.userMessage,
    assistantMessage: res?.assistantMessage,
  };
}

export async function renameConversation(convId: string, title: string) {
  const user = await caller();
  await backendFetch(`/api/conversations/${convId}`, {
    method: "PATCH",
    body: JSON.stringify({ title: title.trim(), userId: user.id }),
  });
}

export async function deleteConversation(convId: string) {
  const user = await caller();
  await backendFetch(`/api/conversations/${convId}`, {
    method: "DELETE",
    body: JSON.stringify({ userId: user.id }),
  });
}

export async function moveConversation(convId: string, targetDotId: string) {
  const user = await caller();
  await backendFetch(`/api/conversations/${convId}/move`, {
    method: "POST",
    body: JSON.stringify({ targetDotId, userId: user.id }),
  });
}

export async function stopDot(dotId: string) {
  await caller();
  await abortAgent(dotId);
}

export async function pauseDot(dotId: string) {
  await caller();
  await abortAgent(dotId);
}

export async function resumeDot(dotId: string) {
  await caller();
  await backendFetch(`/api/dots/${dotId}/resume`, { method: "POST" });
}

export async function resolveCard(
  messageId: string,
  choice: "approve" | "deny" | "always" | "answer",
  answer?: string
) {
  const user = await caller();
  await backendFetch("/api/agent/card-respond", {
    method: "POST",
    body: JSON.stringify({ messageId, choice, answer, userId: user.id }),
  });
}

export async function setLocalAccess(dotId: string, allowed: boolean) {
  const user = await caller();
  await backendFetch(`/api/dots/${dotId}/access`, {
    method: "POST",
    body: JSON.stringify({ allowed, userId: user.id }),
  });
}

// ---------- Rules, Memories, Skills ----------

export async function addRule(dotId: string | null, action: string, decision: RuleDecision) {
  const user = await caller();
  await backendFetch("/api/rules", {
    method: "POST",
    body: JSON.stringify({ dotId, action, decision, userId: user.id }),
  });
}

export async function deleteRule(ruleId: string) {
  await caller();
  await backendFetch(`/api/rules/${ruleId}`, { method: "DELETE" });
}

export async function addMemory(dotId: string, text: string) {
  const user = await caller();
  await backendFetch("/api/memories", {
    method: "POST",
    body: JSON.stringify({ dotId, text, userId: user.id }),
  });
}

export async function deleteMemory(memoryId: string) {
  await caller();
  await backendFetch(`/api/memories/${memoryId}`, { method: "DELETE" });
}

export async function saveSkill(dotId: string, name: string, description: string, body: string) {
  const user = await caller();
  await backendFetch("/api/skills", {
    method: "POST",
    body: JSON.stringify({ dotId, name, description, body, userId: user.id }),
  });
}

export async function deleteSkill(skillId: string) {
  await caller();
  await backendFetch(`/api/skills/${skillId}`, { method: "DELETE" });
}

export async function addRoutine(
  dotId: string,
  name: string,
  instruction: string,
  schedule: string
): Promise<string | null> {
  const user = await caller();
  try {
    await backendFetch("/api/routines", {
      method: "POST",
      body: JSON.stringify({ dotId, name, instruction, schedule, userId: user.id }),
    });
    return null;
  } catch (err: any) {
    return err.message || "Failed to add routine";
  }
}

export async function toggleRoutine(routineId: string, enabled: boolean) {
  await caller();
  await backendFetch(`/api/routines/${routineId}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export async function runRoutineNow(routineId: string) {
  await caller();
  await backendFetch(`/api/routines/${routineId}/run`, { method: "POST" });
}

export async function deleteRoutine(routineId: string) {
  await caller();
  await backendFetch(`/api/routines/${routineId}`, { method: "DELETE" });
}

export async function savePassword(site: string, username: string, password: string): Promise<string | null> {
  const user = await caller();
  try {
    await backendFetch("/api/passwords", {
      method: "POST",
      body: JSON.stringify({ site, username, password, userId: user.id }),
    });
    return null;
  } catch (err: any) {
    return err.message;
  }
}

export async function deletePassword(passwordId: string) {
  await caller();
  await backendFetch(`/api/passwords/${passwordId}`, { method: "DELETE" });
}

// ---------- Sandboxes & Settings ----------

export async function takeOverComputer(dotId: string): Promise<{ url: string | null; error?: string }> {
  await caller();
  return { url: `${BACKEND_URL}/api/dots/${dotId}/screen` };
}

export async function wakeComputer(dotId: string) {
  await caller();
}

export async function handBackComputer(dotId: string) {
  await caller();
}

export async function resetComputer(dotId: string) {
  await caller();
  await abortAgent(dotId);
}

export async function setDotModel(dotId: string, model: string | null) {
  await callerAdmin();
  await backendFetch(`/api/dots/${dotId}/model`, {
    method: "POST",
    body: JSON.stringify({ model }),
  });
}

export async function setOpenAIKey(key: string): Promise<string | null> {
  await callerAdmin();
  return null;
}

export async function setOpenRouterKey(key: string): Promise<string | null> {
  await callerAdmin();
  return null;
}

export async function setNvidiaKey(key: string): Promise<string | null> {
  await callerAdmin();
  return null;
}

export async function setGroqKey(key: string): Promise<string | null> {
  await callerAdmin();
  return null;
}

export async function setAntigravityKey(key: string): Promise<string | null> {
  await callerAdmin();
  return null;
}

export async function setComposioKey(key: string): Promise<string | null> {
  await caller();
  return null;
}

export async function listTriggerApps(): Promise<{ apps?: TriggerApp[]; error?: string }> {
  await caller();
  return { apps: [] };
}

export async function connectTriggerApp(toolkit: string): Promise<{ url?: string; error?: string }> {
  await caller();
  return {};
}

export async function listTriggerTypes(toolkit: string): Promise<{ types?: TriggerType[]; error?: string }> {
  await caller();
  return { types: [] };
}

export async function addTrigger(
  dotId: string,
  toolkit: string,
  slug: string,
  config: Record<string, unknown>,
  instruction: string
): Promise<string | null> {
  await caller();
  return null;
}

export async function toggleTrigger(triggerId: string, enabled: boolean): Promise<string | null> {
  await caller();
  return null;
}

export async function deleteTrigger(triggerId: string) {
  await caller();
}

export async function setCloudKey(key: string): Promise<string | null> {
  await callerAdmin();
  return null;
}

export async function setDefaultModel(model: string | null) {
  await callerAdmin();
}

export async function signInComposio(): Promise<{ url?: string; error?: string }> {
  await caller();
  return {};
}

export async function signOutComposio() {
  await caller();
}

export async function connectApp(toolkit: string): Promise<{ url?: string; error?: string }> {
  await caller();
  return {};
}

export async function refreshApps() {
  await caller();
}

export async function confirmConnectCard(messageId: string): Promise<boolean> {
  await caller();
  return true;
}

// ---------- Voice ----------

export async function startVoiceCall(dotId: string, convId: string): Promise<{ token?: string; model?: string; error?: string }> {
  await caller();
  return { error: "Voice call is handled by dedicated media backend" };
}

export async function startVoiceConversation(dotId: string): Promise<string> {
  const user = await caller();
  const conv = await createBackendConversation(dotId, "Voice Consultation", user.id);
  return conv.id;
}

export async function saveVoiceLine(dotId: string, convId: string, who: "you" | "dot", text: string) {
  if (!text.trim()) return;
  const user = await caller();
  await sendAgentMessage(dotId, text.trim(), user.id);
}

export async function sendVoiceTask(dotId: string, convId: string, request: string) {
  const user = await caller();
  if (request.trim()) await sendAgentMessage(dotId, request.trim(), user.id);
}

// ---------- Channels ----------

export async function createChannel(name: string, leadId: string, memberIds: string[]): Promise<string> {
  await caller();
  return `ch_${Date.now()}`;
}

export async function deleteChannel(channelId: string) {
  await caller();
}

export async function sendChannelMessage(channelId: string, text: string) {
  await caller();
}
