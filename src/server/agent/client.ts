import "server-only";
import OpenAI from "openai";
import { getSetting, getUserSetting, isOperator, setUserSetting } from "../db";
import { seal, unseal } from "../vault";
import { isOpenRouterModel, openModels, openRouterId, openRouterKey, openrouter, preferredOpenModel, smallOpenModel } from "./openrouter";
import { isNvidiaModel, nimModels, nvidia, nvidiaId, nvidiaKey, preferredNimModel, smallNimModel } from "./nvidia";
import { isGroqModel, groqModels, groq, groqId, groqKey, preferredGroqModel, smallGroqModel } from "./groq";
import { isAntigravityModel, antigravityModels, antigravity, antigravityId, antigravityKey, preferredAntigravityModel, smallAntigravityModel } from "./antigravity";

// Models are chosen from what the API key can actually use. Operators pick per
// dot / per user / deployment-global; regular users always run on the admin
// deployment-global default (or env/best-available fallback).
const MAIN_PREFERENCE = ["gpt-5.5", "gpt-5.4", "gpt-5.2", "gpt-5.1", "gpt-5"];
const REVIEW_PREFERENCE = ["gpt-5.4-mini", "gpt-5-mini", "gpt-5.4-nano", "gpt-5-nano", "gpt-4.1-mini"];

// Hot-path fallbacks used before remote model discovery finishes. The full
// Settings/model picker still calls `models()` and replaces these with the
// best available model once provider lists are cached.
const QUICK_PROVIDER_MAIN = {
  groq: "groq:llama-3.3-70b-versatile",
  // Verified working on this deployment's NVIDIA account (gemma-3-4b-it 404s here).
  nvidia: "nvidia:nvidia/nemotron-3.5-lightning-30b-a3b",
  antigravity: "antigravity:gemini-2.5-flash",
  openrouter: "openrouter:openai/gpt-oss-120b",
} as const;

const g = globalThis as unknown as {
  __dotsOpenAI?: { key: string; client: OpenAI };
  __dotsModels?: Map<string, Promise<{ main: string; review: string; available: string[] }>>;
  __dotsResolved?: Map<string, { main: string; review: string; available: string[] }>;
};

// The key comes from OPENAI_API_KEY (deployment-wide) or from the user's own
// Settings, sealed with the vault key. userId undefined = deployment scope (env only).
const KEY_SETTING = "openai_key";

function apiKey(userId?: string): string | null {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  if (!userId || !isOperator(userId)) return null;
  const sealed = getUserSetting(userId, KEY_SETTING);
  if (!sealed) return null;
  try {
    return unseal(sealed);
  } catch {
    return null;
  }
}

export function hasKey(userId?: string): boolean {
  return Boolean(apiKey(userId));
}

/** Where the key came from, for Settings. */
export function keySource(userId?: string): "env" | "settings" | null {
  return process.env.OPENAI_API_KEY
    ? "env"
    : userId && isOperator(userId) && getUserSetting(userId, KEY_SETTING)
      ? "settings"
      : null;
}

export function openai(userId?: string): OpenAI {
  const key = apiKey(userId);
  if (!key) throw new Error("The assistant isn't configured yet. Please contact your administrator.");
  if (!g.__dotsOpenAI || g.__dotsOpenAI.key !== key) {
    g.__dotsOpenAI = { key, client: new OpenAI({ apiKey: key }) };
  }
  return g.__dotsOpenAI.client;
}

/** Check the key works, then save it (encrypted) and re-pick models for it. Returns an error message or null. */
export async function saveApiKey(key: string, userId: string): Promise<string | null> {
  try {
    await new OpenAI({ apiKey: key }).models.list();
  } catch (err) {
    return err instanceof Error && /401|Incorrect API key|invalid/i.test(err.message) ? "OpenAI didn't accept that key." : `Couldn't check the key: ${err instanceof Error ? err.message : String(err)}`;
  }
  setUserSetting(userId, KEY_SETTING, seal(key));
  resetModels(userId);
  return null;
}

/** Chat-capable models worth offering in a picker (no audio/image/embedding/realtime variants). */
function isAgentModel(id: string): boolean {
  if (!/^(gpt-[4-9]|o[1-9])/.test(id)) return false;
  if (/audio|realtime|transcribe|tts|image|embedding|search|instruct|moderation|chat-latest|-\d{4}-\d{2}-\d{2}$|0613|0314|1106|0125|preview/.test(id)) return false;
  return !/^gpt-4(-|$)|gpt-4o|gpt-4-turbo|gpt-3/.test(id);
}

function rank(id: string): number {
  const m = id.match(/^gpt-(\d+)(?:\.(\d+))?/);
  const version = m ? Number(m[1]) * 100 + Number(m[2] ?? 0) : id.startsWith("o") ? 400 : 0;
  const tier = /-(pro)/.test(id) ? 0.5 : /-(mini)/.test(id) ? -0.3 : /-(nano)/.test(id) ? -0.6 : 0;
  return version + tier;
}

async function resolveOpenAI(userId?: string): Promise<{ main: string; review: string; available: string[] } | null> {
  if (!apiKey(userId)) return null;
  let ids: string[] = [];
  try {
    for await (const m of openai(userId).models.list()) ids.push(m.id);
  } catch (err) {
    console.warn("[dots] couldn't list models, using defaults:", err instanceof Error ? err.message : err);
    ids = [];
  }
  const set = new Set(ids);
  const pick = (envVar: string | undefined, prefs: string[]) => envVar || prefs.find((id) => set.has(id)) || prefs[0];
  const available = ids.filter(isAgentModel).sort((a, b) => rank(b) - rank(a) || a.localeCompare(b));
  return {
    main: pick(process.env.DOTS_MODEL, MAIN_PREFERENCE),
    review: pick(process.env.DOTS_REVIEW_MODEL, REVIEW_PREFERENCE),
    available: available.length ? available : MAIN_PREFERENCE,
  };
}

/** NVIDIA NIM / Groq / Antigravity / OpenRouter first, then OpenAI. These are the main providers. */
async function resolve(userId?: string) {
  const [oa, open, nim, groqList, ag] = await Promise.all([
    resolveOpenAI(userId),
    openModels(userId).catch((err) => {
      console.warn("[dots] couldn't list OpenRouter models:", err instanceof Error ? err.message : err);
      return [] as string[];
    }),
    nimModels(userId).catch((err) => {
      console.warn("[dots] couldn't list NVIDIA models:", err instanceof Error ? err.message : err);
      return [] as string[];
    }),
    groqModels(userId).catch((err) => {
      console.warn("[dots] couldn't list Groq models:", err instanceof Error ? err.message : err);
      return [] as string[];
    }),
    antigravityModels(userId).catch((err) => {
      console.warn("[dots] couldn't list Antigravity models:", err instanceof Error ? err.message : err);
      return [] as string[];
    }),
  ]);
  const mainFallback =
    (groqList.length ? preferredGroqModel(groqList) : null) ??
    (nim.length ? preferredNimModel(nim) : null) ??
    (ag.length ? preferredAntigravityModel(ag) : null) ??
    (open.length ? preferredOpenModel(open) : null) ??
    oa?.main ??
    process.env.DOTS_MODEL ??
    MAIN_PREFERENCE[0];
  const smallFallback =
    (groqList.length ? smallGroqModel(groqList) : null) ??
    (nim.length ? smallNimModel(nim) : null) ??
    (ag.length ? smallAntigravityModel(ag) : null) ??
    (open.length ? smallOpenModel(open) : null) ??
    oa?.review ??
    process.env.DOTS_REVIEW_MODEL ??
    REVIEW_PREFERENCE[0];
  const resolved = {
    main: process.env.DOTS_MODEL || getSetting("default_model") || mainFallback,
    review: process.env.DOTS_REVIEW_MODEL || getSetting("review_model") || smallFallback,
    available: [...groqList, ...nim, ...ag, ...open, ...(oa?.available ?? [])],
  };
  (g.__dotsResolved ??= new Map()).set(userId ?? "", resolved);
  console.log(`[dots] default ${resolved.main} (agent), ${resolved.review} (rule review); ${resolved.available.length} models available`);
  return resolved;
}

function quickMainModel(userId?: string): string {
  if (process.env.DOTS_MODEL) return process.env.DOTS_MODEL;
  if (groqKey(userId)) return QUICK_PROVIDER_MAIN.groq;
  if (nvidiaKey(userId)) return QUICK_PROVIDER_MAIN.nvidia;
  if (antigravityKey(userId)) return QUICK_PROVIDER_MAIN.antigravity;
  if (openRouterKey(userId)) return QUICK_PROVIDER_MAIN.openrouter;
  if (g.__dotsResolved?.get(userId ?? "")?.main) return g.__dotsResolved.get(userId ?? "")!.main;
  return MAIN_PREFERENCE[0];
}

/** Forget the resolved model list (a key was added or removed). */
export function resetModels(userId?: string) {
  if (userId === undefined) {
    g.__dotsModels = undefined;
    g.__dotsResolved = undefined;
  } else {
    g.__dotsModels?.delete(userId);
    g.__dotsResolved?.delete(userId);
  }
}

/** The API client for a model, the model id that API expects, and whether it keeps conversation state.
 *  `useCompletionsAPI` is true for providers (e.g. NVIDIA NIM) that expose only /v1/chat/completions,
 *  not the newer /v1/responses endpoint. */
export function clientFor(model: string, userId?: string): { client: OpenAI; model: string; stateless: boolean; useCompletionsAPI: boolean } {
  if (isOpenRouterModel(model)) return { client: openrouter(userId), model: openRouterId(model), stateless: true, useCompletionsAPI: false };
  if (isGroqModel(model)) return { client: groq(userId), model: groqId(model), stateless: true, useCompletionsAPI: true };
  if (isAntigravityModel(model)) return { client: antigravity(userId), model: antigravityId(model), stateless: true, useCompletionsAPI: true };
  if (isNvidiaModel(model)) return { client: nvidia(userId), model: nvidiaId(model), stateless: true, useCompletionsAPI: true };
  return { client: openai(userId), model, stateless: false, useCompletionsAPI: false };
}

/** True when any model provider is set up (Groq, NVIDIA NIM, Antigravity, OpenRouter, or OpenAI). */
export function canThink(userId?: string): boolean {
  return hasKey(userId) || Boolean(nvidiaKey(userId)) || Boolean(groqKey(userId)) || Boolean(antigravityKey(userId)) || Boolean(openRouterKey(userId));
}

/** One-shot text completion that works on every provider.
 *  Responses-API models use responses.create; chat-completions-only providers
 *  (NVIDIA NIM, Groq, Antigravity) use chat.completions.create. */
export async function completeText(appModelId: string, instructions: string, input: string, userId?: string): Promise<string> {
  const { client, model, stateless, useCompletionsAPI } = clientFor(appModelId, userId);
  if (useCompletionsAPI) {
    const r = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: input },
      ],
    });
    return r.choices[0]?.message?.content ?? "";
  }
  const r = await client.responses.create({
    model,
    ...(stateless ? { store: false } : {}),
    instructions,
    input,
  });
  return r.output_text;
}

export function models(userId?: string): Promise<{ main: string; review: string; available: string[] }> {
  const key = userId ?? "";
  const cache = (g.__dotsModels ??= new Map());
  let p = cache.get(key);
  if (!p) {
    p = resolve(userId).catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, p);
  }
  return p;
}

/**
 * Model precedence. Operators (admins): the dot's own choice → the user's
 * Settings default → the admin deployment-global default → env → best
 * available. Regular users: the admin deployment-global default → env/best —
 * personal defaults from before operator control are ignored so only Soli
 * decides what models users run on.
 */
export async function modelFor(dotModel: string | null, userId?: string): Promise<string> {
  const operator = !!userId && isOperator(userId);
  if (dotModel && operator) return dotModel;
  const userDefault = userId ? getUserSetting(userId, "default_model") : null;
  const picked = operator
    ? (userDefault ?? getSetting("default_model") ?? quickMainModel(userId))
    : (getSetting("default_model") ?? quickMainModel(userId));
  if (!g.__dotsResolved?.get(userId ?? "")) void models(userId).catch(() => {});
  return picked;
}

/** Best-known model info for display, without blocking. */
export function knownModels(userId?: string): { main: string; review: string; available: string[]; defaultModel: string } {
  const operator = !!userId && isOperator(userId);
  const userDefault = userId ? getUserSetting(userId, "default_model") : null;
  const r = g.__dotsResolved?.get(userId ?? "") ?? {
    main: quickMainModel(userId),
    review: process.env.DOTS_REVIEW_MODEL || getSetting("review_model") || REVIEW_PREFERENCE[0],
    available: [],
  };
  return {
    ...r,
    review: process.env.DOTS_REVIEW_MODEL || getSetting("review_model") || r.review || REVIEW_PREFERENCE[0],
    defaultModel: operator ? (userDefault ?? getSetting("default_model") ?? r.main) : (getSetting("default_model") ?? r.main),
  };
}

/** gpt-5.x / gpt-6 / o-series accept `reasoning`; gpt-4.1 and friends reject it. Chat-completions providers never take it. */
export function isReasoningModel(model: string): boolean {
  return !isOpenRouterModel(model) && !isNvidiaModel(model) && !isGroqModel(model) && !isAntigravityModel(model) && /^(gpt-[5-9]|o[1-9])/.test(model) && !/chat/.test(model);
}

/** Whether a stateless (third-party) model gets a server-side web-search tool. Only OpenRouter has one. */
export function statelessSearchTool(model: string): "openrouter" | null {
  return isOpenRouterModel(model) ? "openrouter" : null;
}

/** OpenAI's GA computer tool needs a recent model; older ones get the page-reading tools only. */
export function supportsComputerTool(model: string): boolean {
  return /^gpt-5\.[4-9]|^gpt-[6-9]|computer-use/.test(model);
}
