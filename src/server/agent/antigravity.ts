import "server-only";
import OpenAI from "openai";
import { getUserSetting, isOperator, setUserSetting } from "../db";
import { seal, unseal } from "../vault";

// Google Antigravity models via the Gemini API's OpenAI-compatible endpoint.
// Off until the user adds a Gemini key (Settings, or GEMINI_API_KEY /
// ANTIGRAVITY_API_KEY). Dots pick these models like any other; their ids carry
// an "antigravity:" prefix, e.g. "antigravity:gemini-2.5-flash".
// The Gemini OpenAI endpoint only supports /v1/chat/completions (no /v1/responses),
// so the runtime treats these like NIM models: stateless, history kept per chat
// by the app, driven through chat/completions.
//
// Power users running a local Antigravity gateway/proxy (OpenAI-compatible,
// e.g. http://localhost:8080/v1) can point ANTIGRAVITY_BASE_URL at it instead.

export const ANTIGRAVITY_PREFIX = "antigravity:";
export const ANTIGRAVITY_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const KEY_SETTING = "antigravity_key";
const URL_SETTING = "antigravity_base_url";

// Chat-capable Gemini / Antigravity models worth offering. Embeddings, TTS,
// image/video and moderation variants stay out.
const ALLOW = [
  /^gemini-/,
  /^gemini\//,
  /^antigravity/,
  /^gemma-/,
  /^gemma\//,
];
const SKIP = [
  /embed/i,
  /aqa/i,
  /tts/i,
  /image/i,
  /video/i,
  /audio/i,
  /moderation/i,
  /safety/i,
  /vision-only/i,
];
// Best first when an Antigravity model has to be picked for the user.
const MAIN_PREFERENCE = [
  /antigravity-preview/i,
  /gemini-3.*flash/i,
  /gemini-2\.5-pro/i,
  /gemini-2\.5-flash/i,
  /gemini-2\.0-flash/i,
  /gemma-3.*27b/i,
];
const SMALL_PREFERENCE = [
  /gemini-2\.5-flash-lite/i,
  /gemini-2\.0-flash-lite/i,
  /gemini-2\.5-flash/i,
  /gemma-3.*(4b|1b)/i,
];

const g = globalThis as unknown as { __dotsAntigravity?: { key: string; baseURL: string; client: OpenAI }; __dotsAntigravityModels?: { key: string; baseURL: string; at: number; ids: string[] } };

function envKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.ANTIGRAVITY_API_KEY || null;
}

export function antigravityBaseURL(userId?: string): string {
  const fromSettings = userId && isOperator(userId) ? getUserSetting(userId, URL_SETTING) : null;
  const base = process.env.ANTIGRAVITY_BASE_URL || (typeof fromSettings === "string" ? fromSettings : null) || ANTIGRAVITY_DEFAULT_BASE_URL;
  return base.endsWith("/") ? base : `${base}/`;
}

export function antigravityKey(userId?: string): string | null {
  if (envKey()) return envKey();
  if (!userId || !isOperator(userId)) return null;
  const sealed = getUserSetting(userId, KEY_SETTING);
  if (!sealed) return null;
  try {
    return unseal(sealed);
  } catch {
    return null;
  }
}

export const antigravitySource = (userId?: string): "env" | "settings" | null =>
  envKey() ? "env" : userId && isOperator(userId) && getUserSetting(userId, KEY_SETTING) ? "settings" : null;

export const isAntigravityModel = (model: string) => model.startsWith(ANTIGRAVITY_PREFIX);
export const antigravityId = (model: string) => model.slice(ANTIGRAVITY_PREFIX.length);

export function antigravity(userId?: string): OpenAI {
  const key = antigravityKey(userId);
  if (!key) throw new Error("The assistant isn't configured yet. Please contact your administrator.");
  const baseURL = antigravityBaseURL(userId);
  if (g.__dotsAntigravity?.key !== key || g.__dotsAntigravity?.baseURL !== baseURL) {
    g.__dotsAntigravity = { key, baseURL, client: new OpenAI({ apiKey: key, baseURL }) };
  }
  return g.__dotsAntigravity.client;
}

/** Check the key, then save it encrypted. An empty key removes it. Returns an error or null. */
export async function saveAntigravityKey(key: string, userId: string): Promise<string | null> {
  if (envKey()) return "The Antigravity key is set by GEMINI_API_KEY / ANTIGRAVITY_API_KEY.";
  if (!key) {
    setUserSetting(userId, KEY_SETTING, null);
    g.__dotsAntigravityModels = undefined;
    return null;
  }
  try {
    const res = await fetch(`${antigravityBaseURL(userId)}models`, { headers: { Authorization: `Bearer ${key}` } });
    if (res.status === 401 || res.status === 403) return "Google didn't accept that key.";
    if (!res.ok) return `Couldn't check the key with Google (${res.status}).`;
  } catch (err) {
    return `Couldn't reach Google: ${err instanceof Error ? err.message : String(err)}`;
  }
  setUserSetting(userId, KEY_SETTING, seal(key));
  g.__dotsAntigravityModels = undefined;
  return null;
}

/** Chat-capable Antigravity models that can call tools, as app model ids. Cached for an hour. */
export async function antigravityModels(userId?: string): Promise<string[]> {
  const key = antigravityKey(userId);
  if (!key) return [];
  const baseURL = antigravityBaseURL(userId);
  if (g.__dotsAntigravityModels && g.__dotsAntigravityModels.key === key && g.__dotsAntigravityModels.baseURL === baseURL && Date.now() - g.__dotsAntigravityModels.at < 3_600_000) return g.__dotsAntigravityModels.ids;
  const res = await fetch(`${baseURL}models`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Antigravity models: ${res.status}`);
  const { data } = (await res.json()) as { data: { id: string; created?: number }[] };
  const ids = data
    .filter((m) => ALLOW.some((re) => re.test(m.id)) && !SKIP.some((re) => re.test(m.id)))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .slice(0, 40)
    .map((m) => ANTIGRAVITY_PREFIX + m.id);
  g.__dotsAntigravityModels = { key, baseURL, at: Date.now(), ids };
  return ids;
}

const pick = (ids: string[], prefs: RegExp[]) => prefs.map((re) => ids.find((id) => re.test(antigravityId(id)))).find(Boolean) ?? ids[0];
export const preferredAntigravityModel = (ids: string[]) => pick(ids, MAIN_PREFERENCE);
export const smallAntigravityModel = (ids: string[]) => pick(ids, SMALL_PREFERENCE);
