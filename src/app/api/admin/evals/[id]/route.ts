import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ragEvals } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAdmin().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await db.delete(ragEvals).where(eq(ragEvals.id, id));
  return NextResponse.json({ success: true });
}
