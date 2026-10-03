import "server-only";
import OpenAI from "openai";
import { getSetting, setSetting } from "../db";
import { seal, unseal } from "../vault";

// NVIDIA NIM through build.nvidia.com. Off until the user adds an NVIDIA key (Settings, or NVIDIA_API_KEY).
// Dots pick these models like any other; their ids carry an "nvidia:" prefix,
// e.g. "nvidia:meta/llama-3.1-405b-instruct".
// NIM exposes an OpenAI-compatible API (including /v1/responses), so the runtime
// treats these like OpenRouter models: stateless, history kept per chat by the app.

export const NVIDIA_PREFIX = "nvidia:";
export const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const KEY_SETTING = "nvidia_key";

// Chat-capable NIM models worth offering. NIM also lists embeddings, rerankers,
// reward/guard models, ASR/TTS and vision-only variants; those stay out.
const ALLOW = [
  /^meta\/llama/,
  /^mistralai\//,
  /^deepseek-ai\//,
  /^qwen\//,
  /^google\/gemma/,
  /^microsoft\/phi/,
  /^nvidia\/.*(nemotron|llama|mistral|qwen|nv-)/,
  /^openai\/gpt-oss/,
  /^moonshotai\//,
  /^z-ai\//,
  /^nousresearch\//,
  /^arcee-ai\//,
  /^bigcode\//,
  /^upstage\//,
];
const SKIP = [
  /embed/i,
  /rerank/i,
  /reward/i,
  /guard/i,
  /safety/i,
  /moderation/i,
  /asr|whisper|parakeet|tts|kuler|voice/i,
  /diffusion|flux|sd-|stable-diffusion/i,
  /cosmos|retina|radio-detr|vita|vila|foundation-stereo/i,
  /-reward-|noreason/i,
  /:batch|:free|:online|:extended|:beta/,
];
// Best first when a NIM model has to be picked for the user. Newest first within families.
const MAIN_PREFERENCE = [
  /llama-3\.3-70b/i,
  /llama-3\.1-405b/i,
  /deepseek-v3/i,
  /qwen3.*(235b|32b)/i,
  /mistral-large/i,
  /nemotron.*70b/i,
  /gpt-oss-120b/i,
  /kimi-k/i,
  /glm-/i,
];
const SMALL_PREFERENCE = [
  /llama-3\.1-8b/i,
  /qwen3.*(\b8b\b|4b)/i,
  /mistral-small/i,
  /phi-4-mini/i,
  /gemma-3.*(4b|1b)/i,
  /gpt-oss-20b/i,
];

const g = globalThis as unknown as { __dotsNvidia?: { key: string; client: OpenAI }; __dotsNimModels?: { at: number; ids: string[] } };

function envKey(): string | null {
  return process.env.NVIDIA_API_KEY || null;
}

export function nvidiaKey(): string | null {
  if (envKey()) return envKey();
  const sealed = getSetting(KEY_SETTING);
  if (!sealed) return null;
  try {
    return unseal(sealed);
  } catch {
    return null;
  }
}

export const nvidiaSource = (): "env" | "settings" | null => (envKey() ? "env" : getSetting(KEY_SETTING) ? "settings" : null);

export const isNvidiaModel = (model: string) => model.startsWith(NVIDIA_PREFIX);
export const nvidiaId = (model: string) => model.slice(NVIDIA_PREFIX.length);

export function nvidia(): OpenAI {
  const key = nvidiaKey();
  if (!key) throw new Error("No NVIDIA key yet. Add one in Settings to use NIM models.");
  if (g.__dotsNvidia?.key !== key) g.__dotsNvidia = { key, client: new OpenAI({ apiKey: key, baseURL: NVIDIA_BASE_URL }) };
  return g.__dotsNvidia.client;
}

/** Check the key with NIM, then save it encrypted. An empty key removes it. Returns an error or null. */
export async function saveNvidiaKey(key: string): Promise<string | null> {
  if (envKey()) return "The NVIDIA key is set by NVIDIA_API_KEY.";
  if (!key) {
    setSetting(KEY_SETTING, null);
    g.__dotsNimModels = undefined;
    return null;
  }
  try {
    const res = await fetch(`${NVIDIA_BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` } });
    if (res.status === 401 || res.status === 403) return "NVIDIA didn't accept that key.";
    if (!res.ok) return `Couldn't check the key with NVIDIA (${res.status}).`;
  } catch (err) {
    return `Couldn't reach NVIDIA: ${err instanceof Error ? err.message : String(err)}`;
  }
  setSetting(KEY_SETTING, seal(key));
  g.__dotsNimModels = undefined;
  return null;
}

/** Chat-capable NIM models that can call tools, newest first, as app model ids. Cached for an hour. */
export async function nimModels(): Promise<string[]> {
  if (!nvidiaKey()) return [];
  if (g.__dotsNimModels && Date.now() - g.__dotsNimModels.at < 3_600_000) return g.__dotsNimModels.ids;
  const res = await fetch(`${NVIDIA_BASE_URL}/models`, { headers: { Authorization: `Bearer ${nvidiaKey()}` } });
  if (!res.ok) throw new Error(`NVIDIA models: ${res.status}`);
  const { data } = (await res.json()) as { data: { id: string; created?: number }[] };
  const ids = data
    .filter((m) => ALLOW.some((re) => re.test(m.id)) && !SKIP.some((re) => re.test(m.id)))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .slice(0, 40)
    .map((m) => NVIDIA_PREFIX + m.id);
  g.__dotsNimModels = { at: Date.now(), ids };
  return ids;
}

const pick = (ids: string[], prefs: RegExp[]) => prefs.map((re) => ids.find((id) => re.test(nvidiaId(id)))).find(Boolean) ?? ids[0];
export const preferredNimModel = (ids: string[]) => pick(ids, MAIN_PREFERENCE);
export const smallNimModel = (ids: string[]) => pick(ids, SMALL_PREFERENCE);
