import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  effectiveRagLimits,
  LIMIT_BOUNDS,
  LIMIT_DEFAULTS,
  saveLimitOverrides,
  storedLimitOverrides,
} from "@/server/limits";

async function requireAdminRequest() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { user };
}

const numericString = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+(\.\d+)?$/, "Must be a number.")
    .refine((v) => Number(v) >= min && Number(v) <= max, `Must be between ${min} and ${max}.`);

const bodySchema = z.object({
  topK: z.union([numericString(LIMIT_BOUNDS.topK.min, LIMIT_BOUNDS.topK.max), z.null()]).optional(),
  contextMaxChars: z
    .union([numericString(LIMIT_BOUNDS.contextMaxChars.min, LIMIT_BOUNDS.contextMaxChars.max), z.null()])
    .optional(),
  chunkMaxChars: z
    .union([numericString(LIMIT_BOUNDS.chunkMaxChars.min, LIMIT_BOUNDS.chunkMaxChars.max), z.null()])
    .optional(),
  temperature: z
    .union([numericString(LIMIT_BOUNDS.temperature.min, LIMIT_BOUNDS.temperature.max), z.null()])
    .optional(),
  minScore: z
    .union([numericString(LIMIT_BOUNDS.minScore.min, LIMIT_BOUNDS.minScore.max), z.null()])
    .optional(),
});

export async function GET() {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;
  return NextResponse.json({
    effective: effectiveRagLimits(),
    stored: storedLimitOverrides(),
    bounds: LIMIT_BOUNDS,
    envDefaults: LIMIT_DEFAULTS,
  });
}

export async function POST(request: Request) {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;
  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid budgets." }, { status: 400 });
  }
  saveLimitOverrides(parsed.data);
  return NextResponse.json({
    effective: effectiveRagLimits(),
    stored: storedLimitOverrides(),
  });
}
