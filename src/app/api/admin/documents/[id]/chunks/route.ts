import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chunks, documents } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAdmin().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: documentId } = await context.params;

  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      fileName: documents.fileName,
      pageCount: documents.pageCount,
      collection: documents.collection,
      status: documents.status,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const docChunks = await db
    .select({
      id: chunks.id,
      chunkIndex: chunks.chunkIndex,
      pageNumber: chunks.pageNumber,
      charCount: chunks.charCount,
      content: chunks.content,
    })
    .from(chunks)
    .where(eq(chunks.documentId, documentId))
    .orderBy(asc(chunks.chunkIndex));

  return NextResponse.json({
    document: doc,
    chunks: docChunks,
  });
}
