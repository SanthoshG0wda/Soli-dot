"use client";

import { Download, FileText, Scale } from "lucide-react";
import { setActiveArtifact, useStore } from "@/lib/store";

export function ArtifactCard({ artifactId }: { artifactId: string }) {
  const artifacts = useStore((s) => s.artifacts);
  const artifact = artifacts.find((a) => a.id === artifactId);
  const activeId = useStore((s) => s.activeArtifactId);

  if (!artifact) return null;

  const isLegal = artifact.kind === "legal_paper" || artifact.kind === "contract";
  const Icon = isLegal ? Scale : FileText;

  const openBoard = () => {
    setActiveArtifact(artifact.id);
  };

  const isSelected = activeId === artifact.id;

  // Format subtitle badge just like Claude: "Document · PDF" or "Document · PDF · Word"
  const formats: string[] = [];
  if (artifact.pdfFileId) formats.push("PDF");
  if (artifact.docxFileId) formats.push("Word");
  if (!formats.length) formats.push(isLegal ? "Legal Paper" : "Markdown");
  const subtitle = `Document · ${formats.join(" · ")}`;

  // Primary download target (prefer PDF if available, otherwise docx or fileId)
  const primaryDownloadId = artifact.pdfFileId || artifact.docxFileId || artifact.fileId;

  return (
    <div
      onClick={openBoard}
      className={`group my-3 flex items-center justify-between gap-3.5 rounded-2xl border p-3 sm:px-4 sm:py-3.5 transition-all cursor-pointer ${
        isSelected
          ? "border-brand bg-brand/[0.04] ring-1 ring-brand/30 shadow-xs"
          : "border-black/10 bg-card hover:border-black/20 hover:bg-popover/80 hover:shadow-xs"
      }`}
      title="Click to view document in Artifact Board"
    >
      {/* Left Icon Square */}
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-black/[0.03] text-foreground/70 transition-colors group-hover:border-black/15 group-hover:bg-black/[0.05] group-hover:text-foreground">
        <Icon className="size-5" strokeWidth={1.5} />
      </div>

      {/* Center Title and Subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-[14px] sm:text-[15px] font-medium tracking-tight text-foreground transition-colors group-hover:text-foreground">
            {artifact.title}
          </h4>
          {isSelected && (
            <span className="shrink-0 rounded-xs bg-brand/15 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-brand-readable uppercase">
              Open
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-foreground/50">
          {subtitle}
        </p>
      </div>

      {/* Right Action Button(s) */}
      <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {primaryDownloadId && (
          <a
            href={`/api/files/${primaryDownloadId}?download=1`}
            download
            className="btn-secondary h-8 px-3.5 text-[12px] sm:text-[13px] font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs"
            title={artifact.pdfFileId ? "Download PDF" : "Download File"}
          >
            <Download className="size-3.5 text-foreground/60" />
            <span>Download</span>
          </a>
        )}

        {/* If DOCX is also present alongside PDF, provide quick Word download */}
        {artifact.pdfFileId && artifact.docxFileId && (
          <a
            href={`/api/files/${artifact.docxFileId}?download=1`}
            download
            className="btn-secondary h-8 px-2.5 text-[12px] font-normal rounded-lg inline-flex items-center gap-1 text-foreground/60 hover:text-foreground transition-colors"
            title="Download Word (.docx)"
          >
            <span>Word</span>
          </a>
        )}
      </div>
    </div>
  );
}
