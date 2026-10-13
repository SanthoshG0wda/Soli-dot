import { desc } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import CorpusManager, { type AdminDocument } from "@/components/admin/CorpusManager";

export default async function CorpusPage() {
  await requireAdmin();
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

  const initial: AdminDocument[] = rows.map((r) => ({
    ...r,
    pageCount: r.pageCount,
    collection: r.collection,
    error: r.error,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <CorpusManager
      initial={initial}
      description="Upload Bare Acts and commentary as PDFs. Each file is chunked, embedded, and indexed into Qdrant; status moves uploading → processing → ready (or failed with the reason)."
    />
  );
}
