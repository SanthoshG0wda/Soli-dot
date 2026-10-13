import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { runEvalSuite } from "@/server/evals";

export const runtime = "nodejs";
export const maxDuration = 300;

const runSchema = z.object({
  evalIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const user = await requireAdmin().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => ({}));
  const parsed = runSchema.safeParse(json);
  const evalIds = parsed.success ? parsed.data.evalIds : undefined;

  const report = await runEvalSuite(evalIds);
  return NextResponse.json(report);
}
