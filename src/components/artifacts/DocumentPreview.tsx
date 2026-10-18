"use client";

import { useState, type ComponentPropsWithoutRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, Printer, FileText, Scale, BookOpen } from "lucide-react";
import type { DocumentArtifact } from "@/lib/types";

export type PreviewMode = "court_paper" | "markdown" | "pdf_view";

/* eslint-disable @typescript-eslint/no-unused-vars */
const markdownComponents = {
  table: ({ node, ...props }: ComponentPropsWithoutRef<"table"> & { node?: unknown }) => (
    <div className="my-4 w-full overflow-x-auto rounded-xl border border-black/10 bg-black/[0.01]">
      <table className="w-full min-w-[520px] border-collapse text-left text-[13px]" {...props} />
    </div>
  ),
  th: ({ node, ...props }: ComponentPropsWithoutRef<"th"> & { node?: unknown }) => (
    <th className="border-b border-black/10 bg-black/[0.03] px-3.5 py-2.5 font-semibold text-foreground/85 text-[12px] uppercase tracking-wider whitespace-nowrap" {...props} />
  ),
  td: ({ node, ...props }: ComponentPropsWithoutRef<"td"> & { node?: unknown }) => (
    <td className="border-b border-black/[0.06] px-3.5 py-2.5 text-foreground/90 align-top text-[13px] leading-relaxed" {...props} />
  ),
  pre: ({ node, ...props }: ComponentPropsWithoutRef<"pre"> & { node?: unknown }) => (
    <div className="my-3 w-full overflow-x-auto rounded-lg bg-black/[0.04] p-3 text-[12px]">
      <pre className="whitespace-pre-wrap break-words" {...props} />
    </div>
  ),
};
/* eslint-enable @typescript-eslint/no-unused-vars */

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
      <div className="flex shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-black/[0.08] bg-card px-3 sm:px-4 py-2 min-w-0 scrollbar-none">
        <div className="flex items-center gap-1 rounded-lg border border-black/[0.08] bg-black/[0.03] p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setMode("court_paper")}
            className={`flex items-center gap-1.5 rounded-md px-2 sm:px-2.5 py-1 text-[12px] font-medium transition-colors ${
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
            className={`flex items-center gap-1.5 rounded-md px-2 sm:px-2.5 py-1 text-[12px] font-medium transition-colors ${
              mode === "markdown"
                ? "bg-card text-foreground shadow-xs"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <BookOpen className="size-3.5" />
            <span>Prose</span>
          </button>

          {artifact.pdfFileId && (
            <button
              type="button"
              onClick={() => setMode("pdf_view")}
              className={`flex items-center gap-1.5 rounded-md px-2 sm:px-2.5 py-1 text-[12px] font-medium transition-colors ${
                mode === "pdf_view"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" />
              <span>PDF</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8 min-w-0">
        {mode === "pdf_view" && artifact.pdfFileId ? (
          <div className="h-full min-h-[480px] w-full overflow-hidden rounded-xl border border-black/10 bg-card shadow-sm">
            <iframe
              src={`/api/files/${artifact.pdfFileId}#toolbar=0`}
              title={artifact.title}
              className="h-full w-full border-0"
            />
          </div>
        ) : mode === "court_paper" ? (
          <div className="mx-auto w-full max-w-[760px] rounded-xl border border-black/10 bg-[#fdfcf9] px-4 py-6 sm:px-10 sm:py-12 text-[#1a1a1a] shadow-md font-serif overflow-hidden">
            {/* Legal paper watermark / stamp bar */}
            <div className="mb-6 flex items-center justify-between gap-2 border-b border-black/10 pb-3 font-mono text-[11px] text-foreground/40 uppercase min-w-0">
              <span className="shrink-0">SOLI COURT DRAFT</span>
              <span className="truncate text-right">{artifact.metadata?.act as string || "INDIAN STATUTORY JURISDICTION"}</span>
            </div>

            {/* Document body rendered with court formatting */}
            <div className="court-paper-prose space-y-4 text-[14px] leading-[1.8] text-[#1c1c1c] overflow-hidden break-words">
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {artifact.content}
              </Markdown>
            </div>

            {/* Court Footer Rule */}
            <div className="mt-12 border-t border-black/10 pt-4 text-center font-mono text-[10px] text-foreground/40 uppercase tracking-widest">
              — End of Petition / Drafted with Soli Legal Intelligence —
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[760px] rounded-xl border border-black/10 bg-card p-4 sm:p-8 shadow-sm overflow-hidden">
            <div className="dot-prose overflow-hidden break-words">
              <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {artifact.content}
              </Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
