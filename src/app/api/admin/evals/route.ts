import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { ragEvals } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { listEvalTestCases } from "@/server/evals";

export const runtime = "nodejs";

const createEvalSchema = z.object({
  title: z.string().trim().min(3),
  query: z.string().trim().min(5),
  expectedAnswer: z.string().trim().min(10),
  category: z.string().trim().default("general"),
  expectedDocTitle: z.string().trim().optional(),
});

export async function GET() {
  const user = await requireAdmin().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const testCases = await listEvalTestCases();
  return NextResponse.json({ testCases });
}

export async function POST(request: Request) {
  const user = await requireAdmin().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = createEvalSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid eval schema" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(ragEvals)
    .values({
      title: parsed.data.title,
      query: parsed.data.query,
      expectedAnswer: parsed.data.expectedAnswer,
      category: parsed.data.category,
      expectedDocTitle: parsed.data.expectedDocTitle ?? null,
    })
    .returning();

  return NextResponse.json({ testCase: created }, { status: 201 });
}
