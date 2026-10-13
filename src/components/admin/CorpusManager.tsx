"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CORPUS_COLLECTIONS, collectionLabel } from "@/lib/corpus";
import { Empty, Section } from "@/components/SettingsKit";

export interface AdminDocument {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  pageCount: number | null;
  collection: string | null;
  status: string;
  error: string | null;
  updatedAt: string;
}

const STATUS_TONE: Record<string, string> = {
  ready: "bg-success/12 text-success",
  processing: "bg-warning/15 text-warning",
  uploading: "bg-warning/15 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Filenames arrive with underscores (IT_Act_2000.pdf); show real words. */
function prettyTitle(t: string): string {
  return t.replace(/_/g, " ");
}

export default function CorpusManager({ initial, description }: { initial: AdminDocument[]; description: string }) {
  const router = useRouter();
  const [docs, setDocs] = useState(initial);
  const [collection, setCollection] = useState<string>("");
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [pickedName, setPickedName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Chunk inspection state
  const [inspectDoc, setInspectDoc] = useState<AdminDocument | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectedChunks, setInspectedChunks] = useState<
    Array<{ id: string; chunkIndex: number; pageNumber: number | null; charCount: number; content: string }>
  >([]);
  const [chunkFilter, setChunkFilter] = useState("");

  const handleInspect = async (doc: AdminDocument) => {
    setInspectDoc(doc);
    setInspectLoading(true);
    setInspectedChunks([]);
    setChunkFilter("");
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/chunks`);
      if (res.ok) {
        const data = await res.json();
        setInspectedChunks(data.chunks || []);
      }
    } catch {
      // ignore
    } finally {
      setInspectLoading(false);
    }
  };

  const refresh = async () => {
    const res = await fetch("/api/admin/documents", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { documents: AdminDocument[] };
      setDocs(json.documents);
    }
    router.refresh();
  };

  const upload = (file: File | undefined) => {
    if (!file) return;
    setPickedName(file.name);
    setNotice(null);
    start(async () => {
      try {
        const form = new FormData();
        form.append("file", file);
        if (collection) form.append("collection", collection);
        const res = await fetch("/api/admin/documents", { method: "POST", body: form });
        const json = (await res.json().catch(() => ({}))) as { error?: string; documentId?: string; chunkCount?: number };
        if (!res.ok) {
          setNotice({ tone: "err", text: json.error ?? "Upload failed." });
          return;
        }
        setNotice({ tone: "ok", text: `Indexed ${file.name} (${json.chunkCount ?? 0} chunks).` });
        if (fileRef.current) fileRef.current.value = "";
        setPickedName(null);
        await refresh();
      } catch (err) {
        setNotice({ tone: "err", text: err instanceof Error ? err.message : "Upload failed." });
      }
    });
  };

  // ESC dismisses the chunk inspector.
  useEffect(() => {
    if (!inspectDoc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectDoc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspectDoc]);

  const remove = (id: string) => {
    setNotice(null);
    start(async () => {
      const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice({ tone: "err", text: json.error ?? "Delete failed." });
        return;
      }
      setConfirmDelete(null);
      await refresh();
    });
  };

  const filteredChunks = inspectedChunks.filter((c) =>
    chunkFilter ? c.content.toLowerCase().includes(chunkFilter.toLowerCase()) : true
  );

  return (
    <div>
      <Section
        eyebrow="Ingest"
        title="Upload a PDF"
        description={description}
      >
        <div className="surface space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="block flex-1">
              <span className="eyebrow mb-1.5 block">Collection</span>
              <select className="field" value={collection} onChange={(e) => setCollection(e.target.value)} aria-label="Collection">
                <option value="">Uncategorized</option>
                {CORPUS_COLLECTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="block flex-[2]">
              <span className="eyebrow mb-1.5 block">PDF file (max 25 MB)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary h-9 shrink-0 px-4 text-[13px]"
                  disabled={pending}
                  onClick={() => fileRef.current?.click()}
                >
                  {pending ? "Uploading…" : "Choose PDF"}
                </button>
                <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/55">
                  {pickedName ?? "No file chosen"}
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                aria-label="PDF file"
                disabled={pending}
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </div>
          </div>
          {pending && <p className="text-body-sm text-foreground/55">Working… large PDFs take a minute to embed and index.</p>}
          {notice && (
            <p className={`text-body-sm ${notice.tone === "ok" ? "text-success" : "text-destructive"}`} role="status">
              {notice.text}
            </p>
          )}
        </div>
      </Section>

      <Section
        eyebrow="Library"
        title={`Documents (${docs.length})`}
        description="Delete removes the metadata, its chunks, and its vectors — answers immediately stop citing it."
      >
        {docs.length === 0 ? (
          <Empty>No documents yet. Upload your first Bare Act above.</Empty>
        ) : (
          <div className="surface divide-y divide-black/[0.06] overflow-hidden">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium">{prettyTitle(d.title)}</span>
                    <span className={`shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase ${STATUS_TONE[d.status] ?? "bg-black/[0.06] text-foreground/60"}`}>
                      {d.status}
                    </span>
                  </span>
                  <span className="block truncate text-[12px] text-foreground/50">
                    {d.fileName} · {formatBytes(d.sizeBytes)}
                    {d.pageCount ? ` · ${d.pageCount} pages` : ""} · {collectionLabel(d.collection)}
                  </span>
                  {d.status === "failed" && d.error && (
                    <span className="block truncate text-[12px] text-destructive">{d.error}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    className="btn-quiet h-7 px-2 text-[12px] text-brand hover:underline"
                    onClick={() => handleInspect(d)}
                    title="Inspect chunk breakdown and vector boundaries"
                  >
                    View Chunks
                  </button>
                  {confirmDelete === d.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button className="btn-quiet h-7 px-2 text-[12px] text-destructive" disabled={pending} onClick={() => remove(d.id)}>
                        Delete
                      </button>
                      <button className="btn-quiet h-7 px-2 text-[12px]" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      className="btn-quiet h-7 shrink-0 px-2 text-[12px] text-foreground/50 hover:text-destructive"
                      onClick={() => setConfirmDelete(d.id)}
                      aria-label={`Delete ${d.title}`}
                    >
                      Delete
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Chunk Inspection Dialog */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="surface max-h-[85vh] w-full max-w-4xl flex flex-col rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-black/[0.08] px-6 py-4">
              <div>
                <h2 className="text-h2 text-base font-semibold">{prettyTitle(inspectDoc.title)}</h2>
                <p className="text-body-sm text-foreground/50">
                  {inspectDoc.fileName} · {inspectedChunks.length} chunks indexed in Qdrant
                </p>
              </div>
              <button
                className="btn-quiet h-8 px-3 text-xs"
                onClick={() => setInspectDoc(null)}
              >
                Close (ESC)
              </button>
            </div>

            <div className="border-b border-black/[0.08] px-6 py-3 bg-black/[0.02] flex items-center gap-3">
              <input
                type="text"
                className="field text-xs flex-1"
                placeholder="Filter chunks by text content..."
                value={chunkFilter}
                onChange={(e) => setChunkFilter(e.target.value)}
              />
              <span className="text-[12px] text-foreground/50 shrink-0">
                Showing {filteredChunks.length} of {inspectedChunks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {inspectLoading ? (
                <div className="py-12 text-center text-sm text-foreground/50">Loading chunks...</div>
              ) : filteredChunks.length === 0 ? (
                <div className="py-12 text-center text-sm text-foreground/50">
                  {inspectedChunks.length === 0
                    ? "No chunks found for this document. It may still be processing or failed."
                    : "No chunks match your search."}
                </div>
              ) : (
                filteredChunks.map((chunk) => (
                  <div key={chunk.id} className="surface border border-black/[0.08] rounded p-4 text-xs">
                    <div className="flex items-center justify-between border-b border-black/[0.06] pb-2 mb-2 font-mono text-[11px] text-foreground/60">
                      <span>Chunk #{chunk.chunkIndex}</span>
                      <span className="flex items-center gap-3">
                        {chunk.pageNumber && <span>Page {chunk.pageNumber}</span>}
                        <span>{chunk.charCount} chars</span>
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-body-sm leading-relaxed text-foreground/80 selection:bg-brand/20">
                      {chunk.content}
                    </pre>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-black/[0.08] px-6 py-3 bg-black/[0.02] flex justify-end">
              <button className="btn-secondary text-xs" onClick={() => setInspectDoc(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
