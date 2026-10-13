import "server-only";
import OpenAI from "openai";
import { getUserSetting, isOperator, setUserSetting } from "../db";
import { seal, unseal } from "../vault";

// Groq fast inference through an OpenAI-compatible API. Off until the user adds a
// Groq key (Settings, or GROQ_API_KEY). Dots pick these models like any other;
// their ids carry a "groq:" prefix, e.g. "groq:llama-3.3-70b-versatile".
// Groq exposes /v1/chat/completions (and /v1/responses), but the runtime treats
// these like NIM models: stateless, history kept per chat by the app, driven
// through chat/completions.

export const GROQ_PREFIX = "groq:";
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const KEY_SETTING = "groq_key";

// Chat-capable Groq models worth offering. Groq also lists Whisper, TTS,
// guard and moderation variants; those stay out.
const ALLOW = [
  /^llama-3\.\d/,
  /^llama-3\//,
  /^meta-llama\//,
  /^openai\/gpt-oss/,
  /^qwen\//,
  /^deepseek\//,
  /^mistralai\//,
  /^moonshotai\//,
  /^microsoft\/phi/,
  /^nvidia\//,
  /^groq\/compound/,
];
const SKIP = [
  /whisper/i,
  /tts/i,
  /guard/i,
  /moderation/i,
  /safety/i,
  /embed/i,
  /rerank/i,
  /vision-only/i,
  /:batch|:free|:online|:extended|:beta/,
];
// Best first when a Groq model has to be picked for the user.
const MAIN_PREFERENCE = [
  /llama-3\.3-70b/i,
  /gpt-oss-120b/i,
  /qwen3.*32b/i,
  /llama-3\.1-8b/i,
  /gpt-oss-20b/i,
  /compound/i,
];
const SMALL_PREFERENCE = [
  /llama-3\.1-8b/i,
  /gpt-oss-20b/i,
  /qwen3.*(8b|4b|1b)/i,
  /llama-3\.2-(3b|1b)/i,
];

const g = globalThis as unknown as { __dotsGroq?: { key: string; client: OpenAI }; __dotsGroqModels?: { key: string; at: number; ids: string[] } };

function envKey(): string | null {
  return process.env.GROQ_API_KEY || null;
}

export function groqKey(userId?: string): string | null {
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

export const groqSource = (userId?: string): "env" | "settings" | null =>
  envKey() ? "env" : userId && isOperator(userId) && getUserSetting(userId, KEY_SETTING) ? "settings" : null;

export const isGroqModel = (model: string) => model.startsWith(GROQ_PREFIX);
export const groqId = (model: string) => model.slice(GROQ_PREFIX.length);

export function groq(userId?: string): OpenAI {
  const key = groqKey(userId);
  if (!key) throw new Error("The assistant isn't configured yet. Please contact your administrator.");
  if (g.__dotsGroq?.key !== key) g.__dotsGroq = { key, client: new OpenAI({ apiKey: key, baseURL: GROQ_BASE_URL }) };
  return g.__dotsGroq.client;
}

/** Check the key with Groq, then save it encrypted. An empty key removes it. Returns an error or null. */
export async function saveGroqKey(key: string, userId: string): Promise<string | null> {
  if (envKey()) return "The Groq key is set by GROQ_API_KEY.";
  if (!key) {
    setUserSetting(userId, KEY_SETTING, null);
    g.__dotsGroqModels = undefined;
    return null;
  }
  try {
    const res = await fetch(`${GROQ_BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` } });
    if (res.status === 401 || res.status === 403) return "Groq didn't accept that key.";
    if (!res.ok) return `Couldn't check the key with Groq (${res.status}).`;
  } catch (err) {
    return `Couldn't reach Groq: ${err instanceof Error ? err.message : String(err)}`;
  }
  setUserSetting(userId, KEY_SETTING, seal(key));
  g.__dotsGroqModels = undefined;
  return null;
}

/** Chat-capable Groq models that can call tools, as app model ids. Cached for an hour. */
export async function groqModels(userId?: string): Promise<string[]> {
  const key = groqKey(userId);
  if (!key) return [];
  if (g.__dotsGroqModels && g.__dotsGroqModels.key === key && Date.now() - g.__dotsGroqModels.at < 3_600_000) return g.__dotsGroqModels.ids;
  const res = await fetch(`${GROQ_BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Groq models: ${res.status}`);
  const { data } = (await res.json()) as { data: { id: string; created?: number }[] };
  const ids = data
    .filter((m) => ALLOW.some((re) => re.test(m.id)) && !SKIP.some((re) => re.test(m.id)))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .slice(0, 40)
    .map((m) => GROQ_PREFIX + m.id);
  g.__dotsGroqModels = { key, at: Date.now(), ids };
  return ids;
}

const pick = (ids: string[], prefs: RegExp[]) => prefs.map((re) => ids.find((id) => re.test(groqId(id)))).find(Boolean) ?? ids[0];
export const preferredGroqModel = (ids: string[]) => pick(ids, MAIN_PREFERENCE);
export const smallGroqModel = (ids: string[]) => pick(ids, SMALL_PREFERENCE);
