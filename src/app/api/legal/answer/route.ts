import { NextResponse } from "next/server";
import { z } from "zod";
import { answerLegalQuestion } from "@/legal";
import { getSessionUser } from "@/lib/auth";
import { VectorStoreError } from "@/lib/vector/errors";

const requestSchema = z.object({
  question: z.string().trim().min(1),
  documentIds: z.array(z.string().trim().min(1)).min(1).optional(),
  limit: z.number().int().positive().optional(),
  minScore: z.number().min(0).max(1).optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const json: unknown = await request.json();
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const result = await answerLegalQuestion({
      ...parsed.data,
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    // Infrastructure failure is an outage, not an empty library: 503 so
    // callers show "unavailable + retry" instead of a 500 or a fake refusal.
    if (error instanceof VectorStoreError) {
      return NextResponse.json(
        { error: "corpus_unavailable", code: error.code },
        { status: 503 },
      );
    }
    throw error;
  }
}
