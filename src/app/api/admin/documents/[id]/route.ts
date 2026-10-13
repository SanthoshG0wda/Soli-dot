import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chunks, documents } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { vectorStore } from "@/lib/vector";

export const runtime = "nodejs";

async function requireAdminRequest() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { user };
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;
  const { id } = await params;

  const [row] = await db.select({ id: documents.id }).from(documents).where(eq(documents.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  // Remove vectors first so a failed SQL delete can't leave orphaned chunks
  // that answers would keep citing; vector cleanup is best-effort.
  try {
    await vectorStore.deleteDocumentChunks(id);
  } catch (err) {
    console.warn("[admin] vector cleanup failed for document", id, err instanceof Error ? err.message : err);
  }
  await db.delete(chunks).where(eq(chunks.documentId, id));
  await db.delete(documents).where(eq(documents.id, id));
  return NextResponse.json({ deleted: id });
}
