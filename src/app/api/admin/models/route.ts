import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/server/db";
import { models, resetModels } from "@/server/agent/client";

async function requireAdminRequest() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { user };
}

const modelId = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9:._\/-]+$/, "Use a plain model id (letters, digits, : . _ / -).");

const bodySchema = z.object({
  main: modelId.nullable().optional(),
  review: modelId.nullable().optional(),
});

export async function GET() {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;
  const available = await models(gate.user.id)
    .then((m) => m.available)
    .catch(() => [] as string[]);
  return NextResponse.json({
    defaults: { main: getSetting("default_model"), review: getSetting("review_model") },
    available,
    env: { main: process.env.DOTS_MODEL ?? null, review: process.env.DOTS_REVIEW_MODEL ?? null },
  });
}

export async function POST(request: Request) {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;
  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid model defaults." }, { status: 400 });
  }
  if (parsed.data.main !== undefined) setSetting("default_model", parsed.data.main);
  if (parsed.data.review !== undefined) setSetting("review_model", parsed.data.review);
  // Model pickers everywhere recompute on next read.
  resetModels();
  return NextResponse.json({
    defaults: { main: getSetting("default_model"), review: getSetting("review_model") },
  });
}
