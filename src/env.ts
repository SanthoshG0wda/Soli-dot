import "server-only";

import { z } from "zod";
import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_MIN_SCORE,
  DEFAULT_RAG_CHUNK_MAX_CHARS,
  DEFAULT_RAG_CONTEXT_MAX_CHARS,
  DEFAULT_RAG_TEMPERATURE,
  DEFAULT_TOP_K,
} from "@/config";

const DEV_SESSION_SECRET =
  "development-only-soli-session-secret-change-before-production";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z
      .string()
      .optional()
      .default("postgres://postgres:postgres@localhost:5432/soli"),
    SESSION_SECRET: z
      .string()
      .optional()
      .default(DEV_SESSION_SECRET),
    SESSION_MAX_AGE_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(7 * 24 * 60 * 60),
    ADMIN_EMAILS: z.string().optional().default(""),
    SIGNUP_INVITE_CODES: z.string().optional().default(""),
    SIGNUP_ALLOWED_DOMAINS: z.string().optional().default(""),
    DEMO_SEED: z.string().optional().default(""),
    NIM_BASE_URL: z
      .string()
      .url("NIM_BASE_URL must be a valid URL")
      .default("https://integrate.api.nvidia.com/v1"),
    NVIDIA_API_KEY: z
      .string()
      .optional()
      .default(""),
    NIM_LLM_MODEL: z
      .string()
      .min(1, "NIM_LLM_MODEL is required")
      .default("nvidia/nvidia-nemotron-nano-9b-v2"),
    NIM_EMBEDDING_MODEL: z
      .string()
      .min(1, "NIM_EMBEDDING_MODEL is required")
      .default("nvidia/nvidia-embed-qa-4"),
    EMBEDDING_DIMENSIONS: z.coerce
      .number()
      .int()
      .positive()
      .default(DEFAULT_EMBEDDING_DIMENSIONS),
    QDRANT_URL: z
      .string()
      .optional()
      .default(""),
    QDRANT_API_KEY: z.string().optional().default(""),
    QDRANT_COLLECTION: z.string().min(1).default("soli_chunks"),
    CHUNK_SIZE: z.coerce.number().int().positive().default(DEFAULT_CHUNK_SIZE),
    CHUNK_OVERLAP: z.coerce
      .number()
      .int()
      .min(0)
      .default(DEFAULT_CHUNK_OVERLAP),
    TOP_K: z.coerce.number().int().positive().default(DEFAULT_TOP_K),
    RAG_MIN_SCORE: z.coerce.number().min(0).max(1).default(DEFAULT_MIN_SCORE),
    RAG_CONTEXT_MAX_CHARS: z.coerce
      .number()
      .int()
      .positive()
      .default(DEFAULT_RAG_CONTEXT_MAX_CHARS),
    RAG_CHUNK_MAX_CHARS: z.coerce
      .number()
      .int()
      .positive()
      .default(DEFAULT_RAG_CHUNK_MAX_CHARS),
    RAG_TEMPERATURE: z.coerce
      .number()
      .min(0)
      .max(2)
      .default(DEFAULT_RAG_TEMPERATURE),
  })
  .superRefine((value, ctx) => {
    if (
      value.NODE_ENV === "production" &&
      value.SESSION_SECRET === DEV_SESSION_SECRET
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["SESSION_SECRET"],
        message: "SESSION_SECRET is required in production",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n  ");
  throw new Error(`Invalid Soli environment variables:\n  ${details}`);
}

export const env = parsed.data;
