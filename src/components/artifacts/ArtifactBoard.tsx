"use client";

import { useEffect, useState } from "react";
import {
  Download,
  FileText,
  Maximize2,
  Minimize2,
  Scale,
  X,
  ChevronDown,
  Columns2,
} from "lucide-react";
import { setActiveArtifact, useStore } from "@/lib/store";
import { DocumentPreview } from "./DocumentPreview";

export function ArtifactBoard({
  conversationId,
  onClose,
  width: propWidth,
  isDragging: propIsDragging,
  onResetWidth,
}: {
  conversationId?: string | null;
  onClose?: () => void;
  width?: number;
  isDragging?: boolean;
  onResetWidth?: () => void;
}) {
  const activeId = useStore((s) => s.activeArtifactId);
  const artifacts = useStore((s) => s.artifacts);
  const [fullscreen, setFullscreen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Resizable width state with localStorage persistence (fallback when standalone)
  const [internalWidth, setInternalWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("soli_artifact_board_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 280 && parsed <= 2400) {
          return parsed;
        }
      }
    }
    return 640;
  });
  const [internalDragging, setInternalDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const width = propWidth ?? internalWidth;
  const isDragging = propIsDragging ?? internalDragging;

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Filter artifacts for current conversation if available, or all artifacts
  const convArtifacts = conversationId
    ? artifacts.filter((a) => a.conversationId === conversationId)
    : artifacts;

  const current = convArtifacts.find((a) => a.id === activeId) || convArtifacts[0];

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = width;
    const maxWidth = Math.max(380, window.innerWidth - 260);
    const minWidth = 280;

    setInternalDragging(true);

    const onPointerMove = (ev: PointerEvent) => {
      const deltaX = startX - ev.clientX;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
      setInternalWidth(nextWidth);
    };

    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      setInternalDragging(false);

      const deltaX = startX - ev.clientX;
      const finalWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
      try {
        localStorage.setItem("soli_artifact_board_width", String(Math.round(finalWidth)));
      } catch {}
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleDoubleClick = () => {
    if (onResetWidth) {
      onResetWidth();
    } else {
      const defaultWidth = Math.round(window.innerWidth * 0.5);
      setInternalWidth(defaultWidth);
      try {
        localStorage.setItem("soli_artifact_board_width", String(defaultWidth));
      } catch {}
    }
  };

  if (!current) return null;

  const handleClose = () => {
    setActiveArtifact(null);
    onClose?.();
  };

  const isLegal = current.kind === "legal_paper" || current.kind === "contract";
  const Icon = isLegal ? Scale : FileText;

  return (
    <div
      style={!fullscreen && isDesktop ? { width: `${width}px`, maxWidth: "calc(100% - 320px)" } : undefined}
      className={`relative flex min-w-0 flex-col border-l border-black/10 bg-background shrink-0 overflow-hidden ${
        fullscreen
          ? "fixed inset-0 z-50 bg-background"
          : "h-full w-full lg:max-w-[85vw]"
      } ${isDragging ? "transition-none select-none" : "transition-[width] duration-150"}`}
    >
      {/* Active dragging transparent overlay when standalone */}
      {internalDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none" />
      )}

      {/* Resize Handle Gutter (used when Chat doesn't manage external splitter) */}
      {!propWidth && !fullscreen && isDesktop && (
        <div
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          title="Drag left/right to resize · Double-click for 50/50"
          className="group absolute -left-1.5 top-0 bottom-0 z-40 flex w-3 cursor-col-resize select-none touch-none items-center justify-center"
        >
          {/* Visible line highlight */}
          <div
            className={`h-full w-[2px] transition-colors duration-150 ${
              isDragging ? "w-[3px] bg-brand" : "bg-transparent group-hover:bg-brand/60"
            }`}
          />
          {/* Center Grip Pill */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 flex h-8 w-3.5 flex-col items-center justify-center gap-1 rounded-full border border-black/10 bg-card shadow-xs transition-opacity duration-150 ${
              isDragging
                ? "border-brand ring-2 ring-brand/30 opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <span className="h-2.5 w-0.5 rounded-full bg-foreground/40" />
          </div>
        </div>
      )}
      {/* Board Header */}
      <header className="relative flex h-14 shrink-0 items-center justify-between gap-2 border-b border-black/10 bg-card px-3 sm:px-4 min-w-0 overflow-hidden">
        {/* Document Switcher / Title */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-readable">
            <Icon className="size-4" strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            {convArtifacts.length > 1 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-black/[0.05]"
                >
                  <span className="truncate text-[13px] sm:text-[14px] font-semibold text-foreground">
                    {current.title}
                  </span>
                  <ChevronDown className="size-3.5 shrink-0 text-foreground/45" />
                </button>

                {showDropdown && (
                  <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-xl border border-black/10 bg-card p-1 shadow-elevated">
                    <div className="px-2 py-1 text-[11px] font-mono uppercase text-foreground/45">
                      Session Documents ({convArtifacts.length})
                    </div>
                    {convArtifacts.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setActiveArtifact(a.id);
                          setShowDropdown(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                          a.id === current.id
                            ? "bg-brand/10 font-medium text-brand-readable"
                            : "hover:bg-black/[0.04]"
                        }`}
                      >
                        {a.kind === "legal_paper" ? (
                          <Scale className="size-3.5 shrink-0" />
                        ) : (
                          <FileText className="size-3.5 shrink-0" />
                        )}
                        <span className="truncate">{a.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <h3 className="truncate text-[13px] sm:text-[14px] font-semibold text-foreground">
                {current.title}
              </h3>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-foreground/45">
              <span className="font-mono uppercase">{current.kind.replace("_", " ")}</span>
              <span>·</span>
              <span>{new Date(current.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Download dropdown or direct download buttons */}
          {current.pdfFileId && (
            <a
              href={`/api/files/${current.pdfFileId}?download=1`}
              download
              className="btn-secondary h-8 px-2 sm:px-2.5 text-[12px] inline-flex items-center gap-1.5 shrink-0"
              title="Download PDF"
            >
              <Download className="size-3.5" />
              <span className="hidden md:inline">PDF</span>
            </a>
          )}

          {current.docxFileId && (
            <a
              href={`/api/files/${current.docxFileId}?download=1`}
              download
              className="btn-secondary h-8 px-2 sm:px-2.5 text-[12px] inline-flex items-center gap-1.5 shrink-0"
              title="Download Word (.docx)"
            >
              <Download className="size-3.5" />
              <span className="hidden md:inline">Word</span>
            </a>
          )}

          {onResetWidth && !fullscreen && isDesktop && (
            <button
              type="button"
              onClick={onResetWidth}
              className="btn-quiet size-8 p-0 shrink-0"
              title="Reset split view to 50/50"
              aria-label="50/50 split"
            >
              <Columns2 className="size-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setFullscreen(!fullscreen)}
            className="btn-quiet size-8 p-0 shrink-0"
            title={fullscreen ? "Restore split view" : "Maximize board"}
            aria-label="Maximize"
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          <button
            type="button"
            onClick={handleClose}
            className="btn-quiet size-8 p-0 shrink-0 hover:bg-black/[0.06]"
            title="Close Artifact Board"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* Main Document Content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <DocumentPreview artifact={current} />
      </div>
    </div>
  );
}
