import "server-only";

import { env } from "@/env";
import { getSetting, setSetting } from "./db";

export interface RagLimits {
  topK: number;
  contextMaxChars: number;
  chunkMaxChars: number;
  temperature: number;
  minScore: number;
}

export const LIMIT_DEFAULTS: RagLimits = {
  topK: env.TOP_K,
  contextMaxChars: env.RAG_CONTEXT_MAX_CHARS,
  chunkMaxChars: env.RAG_CHUNK_MAX_CHARS,
  temperature: env.RAG_TEMPERATURE,
  minScore: env.RAG_MIN_SCORE,
};

export const LIMIT_BOUNDS = {
  topK: { min: 1, max: 20 },
  contextMaxChars: { min: 1000, max: 60000 },
  chunkMaxChars: { min: 500, max: 12000 },
  temperature: { min: 0, max: 2 },
  minScore: { min: 0, max: 0.9 },
} as const;

const SETTING_KEYS = {
  topK: "limits_rag_top_k",
  contextMaxChars: "limits_rag_context_max_chars",
  chunkMaxChars: "limits_rag_chunk_max_chars",
  temperature: "limits_rag_temperature",
  minScore: "limits_rag_min_score",
} as const;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampFloat(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Effective RAG limits: admin overrides stored as deployment-global SQLite
 * settings, falling back to env defaults. Always clamped to sane bounds so
 * a bad stored value can never break retrieval.
 */
export function effectiveRagLimits(): RagLimits {
  return {
    topK: clampInt(getSetting(SETTING_KEYS.topK), LIMIT_DEFAULTS.topK, LIMIT_BOUNDS.topK.min, LIMIT_BOUNDS.topK.max),
    contextMaxChars: clampInt(
      getSetting(SETTING_KEYS.contextMaxChars),
      LIMIT_DEFAULTS.contextMaxChars,
      LIMIT_BOUNDS.contextMaxChars.min,
      LIMIT_BOUNDS.contextMaxChars.max,
    ),
    chunkMaxChars: clampInt(
      getSetting(SETTING_KEYS.chunkMaxChars),
      LIMIT_DEFAULTS.chunkMaxChars,
      LIMIT_BOUNDS.chunkMaxChars.min,
      LIMIT_BOUNDS.chunkMaxChars.max,
    ),
    temperature: clampFloat(
      getSetting(SETTING_KEYS.temperature),
      LIMIT_DEFAULTS.temperature,
      LIMIT_BOUNDS.temperature.min,
      LIMIT_BOUNDS.temperature.max,
    ),
    minScore: clampFloat(
      getSetting(SETTING_KEYS.minScore),
      LIMIT_DEFAULTS.minScore,
      LIMIT_BOUNDS.minScore.min,
      LIMIT_BOUNDS.minScore.max,
    ),
  };
}

/** Raw stored overrides (null = env default in effect), for the admin UI. */
export function storedLimitOverrides(): Record<keyof RagLimits, string | null> {
  return {
    topK: getSetting(SETTING_KEYS.topK),
    contextMaxChars: getSetting(SETTING_KEYS.contextMaxChars),
    chunkMaxChars: getSetting(SETTING_KEYS.chunkMaxChars),
    temperature: getSetting(SETTING_KEYS.temperature),
    minScore: getSetting(SETTING_KEYS.minScore),
  };
}

export function saveLimitOverrides(input: Partial<Record<keyof RagLimits, string | null>>) {
  if (input.topK !== undefined) setSetting(SETTING_KEYS.topK, input.topK);
  if (input.contextMaxChars !== undefined) setSetting(SETTING_KEYS.contextMaxChars, input.contextMaxChars);
  if (input.chunkMaxChars !== undefined) setSetting(SETTING_KEYS.chunkMaxChars, input.chunkMaxChars);
  if (input.temperature !== undefined) setSetting(SETTING_KEYS.temperature, input.temperature);
  if (input.minScore !== undefined) setSetting(SETTING_KEYS.minScore, input.minScore);
}
