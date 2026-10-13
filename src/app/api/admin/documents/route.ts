import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { isCorpusCollectionId } from "@/lib/corpus";
import { ingestPdfProduction, IngestError, MAX_PDF_BYTES } from "@/lib/ingest/service";

export const runtime = "nodejs";
export const maxDuration = 300;

async function requireAdminRequest() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      fileName: documents.fileName,
      sizeBytes: documents.sizeBytes,
      pageCount: documents.pageCount,
      collection: documents.collection,
      status: documents.status,
      error: documents.error,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .orderBy(desc(documents.updatedAt))
    .limit(100);
  return NextResponse.json({
    documents: rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
  });
}

export async function POST(request: Request) {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart upload." }, { status: 400 });
  }
  const file = form.get("file");
  const collectionRaw = form.get("collection");
  const collection =
    typeof collectionRaw === "string" && collectionRaw ? collectionRaw : null;
  if (collection !== null && !isCorpusCollectionId(collection)) {
    return NextResponse.json({ error: "Unknown collection." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a PDF file." }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "File must be between 1 byte and 25 MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestPdfProduction({
      buffer,
      filename: file.name || "upload.pdf",
      mimeType: "application/pdf",
      sizeBytes: file.size,
      collection,
      userId: gate.user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof IngestError ? err.message : err instanceof Error ? err.message : "Ingestion failed.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
