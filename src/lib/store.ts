"use client";

import { useSyncExternalStore } from "react";
import type { DocumentArtifact, Message, ServerEvent, Snapshot } from "./types";

// One client-side store fed by the server's event stream. Components read it with
// useSyncExternalStore; the EventSource opens on first subscription. No effects needed.

export type Toast = { id: number; dotId: string; title: string; body: string };

export type State = Snapshot & {
  loaded: boolean;
  connected: boolean;
  screens: Record<string, number>; // dotId -> timestamp of latest screenshot
  urls: Record<string, string>; // dotId -> page its browser is on
  lastRead: Record<string, number>;
  toasts: Toast[];
  activeArtifactId: string | null;
};

const EMPTY: State = {
  dots: [], messages: [], artifacts: [], routines: [], triggers: [], rules: [], memories: [], skills: [], passwords: [],
  computer: { mode: "local", docker: false, image: "", model: "", models: [], computerTool: "", hasKey: true, keySource: null, cloudKey: null, openRouter: null, nvidia: null, groq: null, antigravity: null, triggersKey: null, sky: false, composio: false },
  apps: [],
  channels: [],
  conversations: [],
  loaded: false, connected: false, screens: {}, urls: {}, lastRead: {}, toasts: [],
  activeArtifactId: null,
};

let state: State = EMPTY;
const listeners = new Set<() => void>();
let source: EventSource | null = null;
let toastSeq = 0;
const messageListeners = new Set<(m: Message) => void>();

/** Listen for message updates outside React (e.g. a live voice call waiting for work to land). */
export function onMessage(listener: (m: Message) => void): () => void {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

const upsert = <T extends { id: string }>(list: T[], item: T): T[] => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
};
const without = <T extends { id: string }>(list: T[], id: string) => list.filter((x) => x.id !== id);

export function activeDotId(): string | null {
  if (typeof window === "undefined") return null;
  const id = window.location.pathname.match(/^\/(?:dots|vakil)\/([^/?#]+)/)?.[1];
  return id ? (id.startsWith("dot_") ? id.replace(/^dot_/, "vakil_") : id) : null;
}

function loadLastRead(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem("dots.lastRead") ?? "{}");
  } catch {
    return {};
  }
}

export function markRead(dotId: string) {
  const lastRead = { ...state.lastRead, [dotId]: Date.now() };
  try {
    localStorage.setItem("dots.lastRead", JSON.stringify(lastRead));
  } catch {}
  set({ lastRead });
}

export function dismissToast(id: number) {
  set({ toasts: state.toasts.filter((t) => t.id !== id) });
}

export function setActiveArtifact(id: string | null) {
  set({ activeArtifactId: id });
}

export function addArtifactLocally(artifact: DocumentArtifact) {
  set({
    artifacts: upsert(state.artifacts, artifact),
    activeArtifactId: artifact.id,
  });
}

export function deleteConversationLocally(id: string) {
  set({
    conversations: without(state.conversations, id),
    messages: state.messages.filter((m) => m.conversationId !== id),
  });
}

export function renameConversationLocally(id: string, title: string) {
  set({
    conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
  });
}

export function updateConversationMatterLocally(id: string, matterId: string | null) {
  set({ conversations: state.conversations.map((c) => (c.id === id ? { ...c, matterId } : c)) });
}

export function moveConversationLocally(id: string, dotId: string) {
  set({
    conversations: state.conversations.map((c) => (c.id === id ? { ...c, dotId } : c)),
    messages: state.messages.map((m) => (m.conversationId === id ? { ...m, dotId } : m)),
  });
}

export function addMessageLocally(message: Message) {
  set({ messages: upsert(state.messages, message) });
  for (const l of messageListeners) l(message);
}

export function removeMessageLocally(id: string) {
  set({ messages: without(state.messages, id) });
}

export function addConversationLocally(conversation: any) {
  set({ conversations: upsert(state.conversations, conversation) });
}

function apply(ev: ServerEvent) {
  switch (ev.type) {
    case "snapshot": {
      const stored = loadLastRead();
      const lastRead = { ...stored };
      for (const d of ev.data.dots) lastRead[d.id] ??= Date.now();
      set({ ...ev.data, loaded: true, connected: true, lastRead });
      return;
    }
    case "dot":
      return set({ dots: upsert(state.dots, ev.data) });
    case "dot_deleted":
      return set({ dots: without(state.dots, ev.id), messages: state.messages.filter((m) => m.dotId !== ev.id) });
    case "message": {
      set({ messages: upsert(state.messages, ev.data) });
      for (const l of messageListeners) l(ev.data);
      if (ev.data.dotId === activeDotId() && document.visibilityState === "visible") markRead(ev.data.dotId);
      return;
    }
    case "message_delta":
      return set({ messages: state.messages.map((m): Message => (m.id === ev.id ? { ...m, text: m.text + ev.delta } : m)) });
    case "artifact":
      return set({
        artifacts: upsert(state.artifacts, ev.data),
        activeArtifactId: ev.data.id,
      });
    case "artifact_deleted":
      return set({
        artifacts: without(state.artifacts, ev.id),
        activeArtifactId: state.activeArtifactId === ev.id ? null : state.activeArtifactId,
      });
    case "routine":
      return set({ routines: upsert(state.routines, ev.data) });
    case "routine_deleted":
      return set({ routines: without(state.routines, ev.id) });
    case "trigger":
      return set({ triggers: upsert(state.triggers, ev.data) });
    case "trigger_deleted":
      return set({ triggers: without(state.triggers, ev.id) });
    case "rule":
      return set({ rules: upsert(state.rules, ev.data) });
    case "rule_deleted":
      return set({ rules: without(state.rules, ev.id) });
    case "memory":
      return set({ memories: upsert(state.memories, ev.data) });
    case "memory_deleted":
      return set({ memories: without(state.memories, ev.id) });
    case "skill":
      return set({ skills: upsert(state.skills, ev.data) });
    case "skill_deleted":
      return set({ skills: without(state.skills, ev.id) });
    case "password":
      return set({ passwords: upsert(state.passwords, ev.data) });
    case "password_deleted":
      return set({ passwords: without(state.passwords, ev.id) });
    case "screen":
      return set({ screens: { ...state.screens, [ev.dotId]: ev.at } });
    case "browser_url":
      return set({ urls: { ...state.urls, [ev.dotId]: ev.url } });
    case "notify":
      return notify(ev.dotId, ev.title, ev.body);
    case "computer":
      return set({ computer: ev.data });
    case "composio":
      return set({ apps: ev.data });
    case "channel":
      return set({ channels: upsert(state.channels, ev.data) });
    case "conversation":
      return set({ conversations: upsert(state.conversations, ev.data) });
    case "conversation_deleted":
      return set({ conversations: without(state.conversations, ev.id), messages: state.messages.filter((m) => m.conversationId !== ev.id) });
    case "channel_deleted":
      return set({ channels: without(state.channels, ev.id), messages: state.messages.filter((m) => m.channelId !== ev.id) });
  }
}

function notify(dotId: string, title: string, body: string) {
  const watching = activeDotId() === dotId && document.visibilityState === "visible" && document.hasFocus();
  if (watching) return;
  if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
    const n = new Notification(title, { body, tag: dotId });
    n.onclick = () => {
      window.focus();
      // Native notification click runs outside React, so there is no router here.
      const canonicalId = dotId.startsWith("dot_") ? dotId.replace(/^dot_/, "vakil_") : dotId;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/vakil/${canonicalId}`;
    };
  }
  const toast = { id: ++toastSeq, dotId, title, body };
  set({ toasts: [...state.toasts.slice(-3), toast] });
  setTimeout(() => dismissToast(toast.id), 7000);
}

function connect() {
  source = new EventSource("/api/events");
  source.onmessage = (e) => {
    if (!e.data || e.data.startsWith(":") || e.data.trim() === "ping") return;
    try {
      apply(JSON.parse(e.data) as ServerEvent);
    } catch {
      // Ignore keep-alive or malformed frames gracefully
    }
  };
  source.onerror = () => set({ connected: false }); // EventSource reconnects and receives a fresh snapshot
}

function disconnect() {
  source?.close();
  source = null;
}

/**
 * Log the client out locally: close the event stream, drop every cached dot,
 * chat, and config, and forget read receipts — so the next account to sign in
 * on this browser starts from zero and never sees the previous user's data.
 */
export function resetStore() {
  disconnect();
  try {
    localStorage.removeItem("dots.lastRead");
  } catch {}
  state = EMPTY;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!source) connect();
  return () => listeners.delete(listener);
}

/** Merge older messages (e.g. a conversation's full history, loaded on open) into the store. */
export function mergeMessages(list: Message[]) {
  if (!list.length) return;
  const known = new Set(state.messages.map((m) => m.id));
  const extra = list.filter((m) => !known.has(m.id));
  if (extra.length) set({ messages: [...extra, ...state.messages].sort((a, b) => a.createdAt - b.createdAt) });
}

/** Current state, for code outside React. */
export function getState(): State {
  return state;
}

/** Select a slice of state. Return existing references (not new arrays) to avoid re-render loops. */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(EMPTY));
}
