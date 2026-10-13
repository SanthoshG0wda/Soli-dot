import "server-only";
import crypto from "node:crypto";
import { Composio } from "@composio/core";
import { getSetting, getUserSetting, setSetting, setUserSetting } from "./db";
import { seal, unseal } from "./vault";
import * as repo from "./repo";
import { runTrigger } from "./agent/runtime";
import type { TriggerApp, TriggerType } from "@/lib/types";

// Triggers: a dot runs an instruction when something happens in one of the user's apps (a new email, a Slack
// message, a GitHub issue). Off until the user adds a Composio API key (platform.composio.dev) — Composio For You,
// which the dots use for app tools, has no trigger events. Apps used by triggers are connected in that project.
// Events come in over Composio's live subscription, so the app needs no public URL.

const KEY_SETTING = "composio_api_key";
const USER_SETTING = "composio_trigger_user";

// Apps offered for triggers (plus anything already connected in the Composio project).
const TRIGGER_APPS: Record<string, string> = {
  gmail: "Gmail",
  googlecalendar: "Google Calendar",
  slack: "Slack",
  github: "GitHub",
  notion: "Notion",
  outlook: "Outlook",
  linear: "Linear",
  jira: "Jira",
  hubspot: "HubSpot",
  discord: "Discord",
  asana: "Asana",
  googledrive: "Google Drive",
};


const g = globalThis as unknown as { __dotsTriggerClient?: { key: string; client: Composio }; __dotsTriggerSubs?: Map<string, string> };

function envKey(): string | null {
  return process.env.COMPOSIO_API_KEY || null;
}

function apiKey(userId?: string): string | null {
  if (envKey()) return envKey();
  if (!userId) return null;
  const sealed = getUserSetting(userId, KEY_SETTING);
  if (!sealed) return null;
  try {
    return unseal(sealed);
  } catch {
    return null;
  }
}

export const triggersKeySource = (userId?: string): "env" | "settings" | null =>
  (envKey() ? "env" : userId && getUserSetting(userId, KEY_SETTING) ? "settings" : null);

function client(userId?: string): Composio {
  const key = apiKey(userId);
  if (!key) throw new Error("Add a Composio API key in Settings to use triggers.");
  if (g.__dotsTriggerClient?.key !== key) g.__dotsTriggerClient = { key, client: new Composio({ apiKey: key }) };
  return g.__dotsTriggerClient.client;
}

/** This user's identity in the Composio project (stable, so its connections and triggers stay together). */
function namespaceFor(userId: string): string {
  // No login (background boot): fall back to the legacy shared namespace.
  if (!userId) {
    let legacy = getSetting(USER_SETTING);
    if (!legacy) {
      legacy = `soli-${crypto.randomUUID()}`;
      setSetting(USER_SETTING, legacy);
    }
    return legacy;
  }
  let id = getUserSetting(userId, USER_SETTING);
  if (!id) {
    id = `soli-${crypto.randomUUID()}`;
    setUserSetting(userId, USER_SETTING, id);
  }
  return id;
}

/** Check the key with Composio, then save it encrypted and start listening. Empty removes it. */
export async function saveComposioKey(key: string, userId: string): Promise<string | null> {
  if (envKey()) return "The Composio API key is set by COMPOSIO_API_KEY.";
  if (!key) {
    await stopEvents(userId);
    setUserSetting(userId, KEY_SETTING, null);
    return null;
  }
  try {
    await new Composio({ apiKey: key }).triggers.listTypes({ limit: 1 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return /401|403|unauthori|invalid/i.test(msg) ? "Composio didn't accept that API key." : `Couldn't check the key with Composio: ${msg}`;
  }
  setUserSetting(userId, KEY_SETTING, seal(key));
  await stopEvents(userId);
  await startEvents(userId);
  return null;
}

/** Which trigger apps are connected in the Composio project. */
export async function triggerApps(userId: string): Promise<TriggerApp[]> {
  const res = await client(userId).connectedAccounts.list({ userIds: [namespaceFor(userId)], statuses: ["ACTIVE"], limit: 100 });
  const connected = new Set(res.items.map((a) => a.toolkit.slug));
  const slugs = [...new Set([...Object.keys(TRIGGER_APPS), ...connected])];
  const name = (slug: string) => TRIGGER_APPS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  return slugs.map((slug) => ({ slug, name: name(slug), connected: connected.has(slug) })).sort((a, b) => Number(b.connected) - Number(a.connected));
}

/** Link to connect an app for triggers (opens in the user's browser). */
export async function connectTriggerApp(toolkit: string, userId: string): Promise<string> {
  const c = client(userId);
  // The app's auth config in this project, or Composio's managed OAuth if the project has none yet.
  const authConfigId =
    (await c.authConfigs.list({ toolkit })).items[0]?.id ?? (await c.authConfigs.create(toolkit, { type: "use_composio_managed_auth", name: `${toolkit} (Soli)` })).id;
  const req = await c.connectedAccounts.link(namespaceFor(userId), authConfigId);
  if (!req.redirectUrl) throw new Error(`${toolkit} is already connected, or doesn't need a sign-in.`);
  return req.redirectUrl;
}

type Schema = { properties?: Record<string, { type?: string; title?: string; description?: string; enum?: string[]; default?: unknown; items?: { type?: string } }>; required?: string[] };

/** The events an app can trigger on, with the settings each one takes. */
export async function triggerTypes(toolkit: string, userId: string): Promise<TriggerType[]> {
  const res = await client(userId).triggers.listTypes({ toolkits: [toolkit], limit: 50 });
  return res.items.map((t) => {
    const schema = (t.config ?? {}) as Schema;
    const required = new Set(schema.required ?? []);
    const fields = Object.entries(schema.properties ?? {}).map(([name, p]) => ({
      name,
      type: p.type === "array" ? `array:${p.items?.type ?? "string"}` : (p.type ?? "string"),
      title: p.title ?? name.replace(/_/g, " "),
      description: p.description ?? "",
      required: required.has(name),
      ...(p.enum ? { enum: p.enum } : {}),
      ...(p.default !== undefined ? { default: p.default } : {}),
    }));
    return { slug: t.slug, name: t.name, description: t.description, fields };
  });
}

/** Create the trigger in Composio and remember which dot it wakes. */
export async function addTrigger(dotId: string, toolkit: string, slug: string, config: Record<string, unknown>, instruction: string, userId: string) {
  const type = (await triggerTypes(toolkit, userId)).find((t) => t.slug === slug);
  const res = await client(userId).triggers.create(namespaceFor(userId), slug, { triggerConfig: config });
  const t = repo.addTrigger({ dotId, composioId: res.triggerId, slug, toolkit, name: type?.name ?? slug, config, instruction });
  await startEvents(userId);
  return t;
}

export async function setTriggerEnabled(triggerId: string, enabled: boolean, userId: string) {
  const t = repo.getTrigger(triggerId);
  if (!t) return;
  const c = client(userId);
  await (enabled ? c.triggers.enable(t.composioId) : c.triggers.disable(t.composioId));
  repo.updateTrigger(triggerId, { enabled, lastError: null });
}

export async function removeTrigger(triggerId: string, userId?: string) {
  const t = repo.getTrigger(triggerId);
  if (!t) return;
  await client(userId).triggers
    .delete(t.composioId)
    .catch(() => {}); // already gone on Composio's side is fine
  repo.deleteTrigger(triggerId);
}

/** A dot was deleted: remove its triggers from Composio too. */
export async function removeTriggersFor(dotId: string) {
  const userId = repo.ownerOfDot(dotId) || undefined;
  for (const t of repo.listTriggers(userId ?? "", dotId)) await removeTrigger(t.id, userId).catch(() => {});
}

// ---------- events ----------

type Incoming = { id?: string; metadata?: { id?: string; uuid?: string; triggerSlug?: string }; triggerSlug?: string; userId?: string; payload?: Record<string, unknown>; originalPayload?: Record<string, unknown> };

function onEvent(e: Incoming) {
  const t = [e.metadata?.id, e.metadata?.uuid, e.id].filter(Boolean).map((id) => repo.triggerByComposioId(id!)).find(Boolean);
  if (!t) return;
  if (!t.enabled) return;
  repo.updateTrigger(t.id, { lastFiredAt: Date.now(), lastError: null });
  runTrigger(t, e.payload ?? e.originalPayload ?? {});
}

/** Listen for trigger events (idempotent per key; call at boot and after the key changes). */
export async function startEvents(userId?: string) {
  const key = apiKey(userId);
  if (!key) return;
  const subs = (g.__dotsTriggerSubs ??= new Map());
  const ns = namespaceFor(userId ?? "");
  const subKey = `${key}:${ns}`;
  if ([...subs.values()].includes(subKey)) return;
  try {
    await client(userId).triggers.subscribe((e) => onEvent(e as Incoming), { userId: ns }, (err) => console.warn("[dots] trigger subscription:", JSON.stringify(err).slice(0, 300)));
    subs.set(userId ?? "", subKey);
  } catch (err) {
    console.warn("[dots] couldn't listen for triggers:", err instanceof Error ? err.message : err);
  }
}

async function stopEvents(userId?: string) {
  const subs = g.__dotsTriggerSubs;
  if (!subs || subs.size === 0) return;
  if (userId !== undefined) subs.delete(userId);
  else subs.clear();
  await g.__dotsTriggerClient?.client.triggers.unsubscribe().catch(() => {});
}
