"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, Printer, FileText, Scale, BookOpen } from "lucide-react";
import type { DocumentArtifact } from "@/lib/types";

export type PreviewMode = "court_paper" | "markdown" | "pdf_view";

export function DocumentPreview({ artifact }: { artifact: DocumentArtifact }) {
  const isLegal = artifact.kind === "legal_paper" || artifact.kind === "contract";
  const [mode, setMode] = useState<PreviewMode>(isLegal ? "court_paper" : "markdown");
  const [copied, setCopied] = useState(false);

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* Top control bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-black/[0.08] bg-card px-4 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-black/[0.08] bg-black/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => setMode("court_paper")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              mode === "court_paper"
                ? "bg-card text-foreground shadow-xs"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <Scale className="size-3.5" />
            <span>Court Paper</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("markdown")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              mode === "markdown"
                ? "bg-card text-foreground shadow-xs"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <BookOpen className="size-3.5" />
            <span>Formatted Prose</span>
          </button>

          {artifact.pdfFileId && (
            <button
              type="button"
              onClick={() => setMode("pdf_view")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                mode === "pdf_view"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" />
              <span>Native PDF</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyContent}
            className="btn-quiet h-7 gap-1 px-2 text-[12px]"
            title="Copy document text"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={printDocument}
            className="btn-quiet h-7 gap-1 px-2 text-[12px]"
            title="Print court paper"
          >
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* View area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {mode === "pdf_view" && artifact.pdfFileId ? (
          <div className="h-full min-h-[600px] w-full overflow-hidden rounded-xl border border-black/10 bg-card shadow-sm">
            <iframe
              src={`/api/files/${artifact.pdfFileId}#toolbar=0`}
              title={artifact.title}
              className="h-full w-full border-0"
            />
          </div>
        ) : mode === "court_paper" ? (
          <div className="mx-auto max-w-[720px] rounded-xl border border-black/10 bg-[#fdfcf9] px-8 py-10 text-[#1a1a1a] shadow-md sm:px-12 sm:py-14 font-serif">
            {/* Legal paper watermark / stamp bar */}
            <div className="mb-6 flex items-center justify-between border-b border-black/10 pb-3 font-mono text-[11px] text-foreground/40 uppercase">
              <span>SOLI COURT DRAFT</span>
              <span>{artifact.metadata?.act as string || "INDIAN STATUTORY JURISDICTION"}</span>
            </div>

            {/* Document body rendered with court formatting */}
            <div className="court-paper-prose space-y-4 text-[14px] leading-[1.8] text-[#1c1c1c]">
              <Markdown remarkPlugins={[remarkGfm]}>{artifact.content}</Markdown>
            </div>

            {/* Court Footer Rule */}
            <div className="mt-12 border-t border-black/10 pt-4 text-center font-mono text-[10px] text-foreground/40 uppercase tracking-widest">
              — End of Petition / Drafted with Soli Legal Intelligence —
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-[720px] rounded-xl border border-black/10 bg-card p-6 shadow-sm sm:p-10">
            <div className="dot-prose">
              <Markdown remarkPlugins={[remarkGfm]}>{artifact.content}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
