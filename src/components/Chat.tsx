"use client";

import { Suspense, use, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AppWindow, ArrowUp, AudioLines, Plus, Brain, Download,
  ExternalLink, FileText, Paperclip, Plug, Check, Clock, Globe, KeyRound,
  Laptop, MessageSquare, MonitorSmartphone, Search, ShieldAlert, Sparkles,
  Terminal, X, Scale, Copy, ThumbsUp, ThumbsDown, RotateCcw,
} from "lucide-react";
import { confirmConnectCard, resolveCard, resumeDot, sendMessage, startConversation, startVoiceConversation } from "@/app/actions";
import {
  addArtifactLocally,
  addConversationLocally,
  addMessageLocally,
  mergeMessages,
  removeMessageLocally,
  setActiveArtifact,
  useStore,
} from "@/lib/store";
import { startCall } from "@/lib/voiceCall";
import DotOrb from "./DotOrb";
import { ArtifactBoard, ArtifactCard } from "./artifacts";
import { detectLegalDocument } from "@/lib/artifacts/detector";
import { getPersonaByName, getSuggestionsForDot } from "@/lib/personas";
import { parseToolCalls, toolIcon } from "@/lib/tool-calls";
import type { Attachment, Dot, Message } from "@/lib/types";

// ── History loader ───────────────────────────────────────────────────────────
const historyLoads = new Map<string, Promise<true>>();
function loadHistory(convId: string) {
  let p = historyLoads.get(convId);
  if (!p) {
    p = fetch(`/api/conversations/${convId}`)
      .then((r) => r.json() as Promise<{ messages: Message[] }>)
      .then((r) => (mergeMessages(r.messages), true as const))
      .catch(() => true as const);
    historyLoads.set(convId, p);
  }
  return p;
}
function HistoryLoader({ convId }: { convId: string }) {
  use(loadHistory(convId));
  return null;
}

// ── Chat max-width: matches ChatGPT / Claude centered column ─────────────────
const COL = "mx-auto w-full max-w-[768px]";

/** `conversation`: a conversation id, "new" for a fresh chat, or undefined for the dot's latest chat. */
export default function Chat({ dot, conversation }: { dot: Dot; conversation?: string }) {
  const router = useRouter();
  const all = useStore((s) => s.messages);
  const conversations = useStore((s) => s.conversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const mine = useMemo(
    () =>
      conversations
        .filter(
          (c) =>
            c.dotId === dot.id ||
            (dot.id.startsWith("vakil_") && c.dotId === dot.id.replace(/^vakil_/, "dot_")) ||
            (dot.id.startsWith("dot_") && c.dotId === dot.id.replace(/^dot_/, "vakil_")),
        )
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)),
    [conversations, dot.id],
  );

  const convId =
    conversation === "new"
      ? activeConvId
      : conversation ?? activeConvId ?? mine[0]?.id ?? null;

  // Belt and braces: never render content-less dot rows (blank streaming
  // placeholders). The server no longer persists them; this hides stragglers.
  const messages = useMemo(() => {
    if (!convId) return [];
    const filtered = all.filter(
      (m) =>
        (m.conversationId === convId ||
          (!m.conversationId && (m.dotId === dot.id || m.dotId === dot.id.replace(/^vakil_/, "dot_")))) &&
        !m.channelId &&
        (m.role !== "dot" || m.title || m.attachments?.length || (m.text.trim() !== "" && m.text.trim() !== "…")),
    );

    // Deduplicate consecutive identical user messages (e.g. from rapid double-submits)
    const deduped: Message[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const cur = filtered[i];
      const prev = deduped[deduped.length - 1];
      if (
        prev &&
        prev.role === "user" &&
        cur.role === "user" &&
        prev.text.trim() === cur.text.trim() &&
        Math.abs(cur.createdAt - prev.createdAt) < 120_000
      ) {
        continue;
      }
      deduped.push(cur);
    }
    return deduped;
  }, [all, convId, dot.id]);
  const activeArtifactId = useStore((s) => s.activeArtifactId);
  const artifacts = useStore((s) => s.artifacts);
  const convArtifacts = useMemo(
    () => (convId ? artifacts.filter((a) => a.conversationId === convId) : artifacts),
    [artifacts, convId],
  );
  const hasKey = useStore((s) => s.computer.hasKey || s.computer.openRouter !== null || s.computer.nvidia !== null || s.computer.groq !== null || s.computer.antigravity !== null);
  const [, start] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Suggestion cards fill the composer (ChatGPT-style) instead of sending.
  const [draft, setDraft] = useState<{ text: string; nonce: number } | null>(null);
  const fillComposer = (text: string) => setDraft({ text, nonce: Date.now() });

  const fresh = !messages.some((m) => m.role === "user" || m.from === "voice");
  const shown = fresh && messages[0]?.role === "dot" ? messages.slice(1) : messages;
  const hasActiveDotOutput =
    messages[messages.length - 1]?.role === "dot" &&
    (messages[messages.length - 1]?.text || "").trim().length > 0;
  const workingHere =
    (submitting || (dot.status === "working" && (convId === mine[0]?.id || !convId))) &&
    !hasActiveDotOutput;

  const send = (text: string, attachments: Attachment[] = []) => {
    if (submitting) return;
    setSendError(null);
    setSubmitting(true);

    const isFresh = !convId;
    const targetConvId = convId ?? `conv_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    if (isFresh) {
      setActiveConvId(targetConvId);
      addConversationLocally({
        id: targetConvId,
        dotId: dot.id,
        title: text.slice(0, 40) || "New consultation",
        userId: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // 1. Immediately inject user message using its deterministic message id
    const userMsgId = `msg-${crypto.randomUUID()}`;
    const userMsg: Message = {
      id: userMsgId,
      dotId: dot.id,
      conversationId: targetConvId,
      role: "user",
      text,
      attachments,
      createdAt: Date.now(),
    };
    addMessageLocally(userMsg);

    start(async () => {
      try {
        let result:
          | { userMessage?: Message; assistantMessage?: Message; conversationId?: string }
          | undefined;

        if (convId) {
          result = await sendMessage(dot.id, text, attachments, targetConvId, userMsgId);
        } else {
          const canonicalId = dot.id.startsWith("dot_") ? dot.id.replace(/^dot_/, "vakil_") : dot.id;
          const startRes = await startConversation(dot.id, text, attachments, targetConvId, userMsgId);
          result = startRes;
          router.replace(`/vakil/${canonicalId}?c=${targetConvId}`);
        }

        if (result?.assistantMessage) {
          addMessageLocally({ ...result.assistantMessage, conversationId: targetConvId });
        }
      } catch (err) {
        console.error("Failed to send message:", err);
        removeMessageLocally(userMsgId);
        const raw = err instanceof Error ? err.message : "";
        const isNetworkErr = /connection|fetch|failed to fetch|econnrefused|network|abort/i.test(raw);
        setSendError(
          isNetworkErr
            ? "The legal intelligence service is momentarily reconnecting. Please try again in a few moments."
            : "Unable to send your message. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    });
  };

  const voice = async () => {
    const canonicalId = dot.id.startsWith("dot_") ? dot.id.replace(/^dot_/, "vakil_") : dot.id;
    const id = convId ?? (await startVoiceConversation(dot.id));
    if (!convId) router.replace(`/vakil/${canonicalId}?c=${id}`);
    void startCall(dot.id, id);
  };
  // ── Resizable split pane between Chat area and Document Preview area ───────
  const [boardWidth, setBoardWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("soli_artifact_board_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 280 && parsed <= 2400) return parsed;
      }
      return Math.round(Math.max(480, window.innerWidth * 0.5));
    }
    return 640;
  });
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    const updateW = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.getBoundingClientRect().width);
      } else {
        setContainerWidth(window.innerWidth);
      }
    };
    updateW();
    window.addEventListener("resize", updateW);
    return () => window.removeEventListener("resize", updateW);
  }, []);

  const handleSplitterPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = boardWidth;
    const totalW = containerRef.current?.getBoundingClientRect().width ?? window.innerWidth;

    setIsResizingSplit(true);

    const onPointerMove = (ev: PointerEvent) => {
      // Dragging left (ev.clientX < startX) -> delta is positive -> boardWidth grows; chat shrinks
      // Dragging right (ev.clientX > startX) -> delta is negative -> boardWidth shrinks; chat expands
      const deltaX = startX - ev.clientX;
      const minBoard = 280; // minimum document preview width
      const maxBoard = Math.max(minBoard, totalW - 280); // leaves at least 280px for chat

      const next = Math.max(minBoard, Math.min(maxBoard, startWidth + deltaX));
      setBoardWidth(next);
    };

    const onPointerUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      setIsResizingSplit(false);

      const deltaX = startX - ev.clientX;
      const curTotalW = containerRef.current?.getBoundingClientRect().width ?? window.innerWidth;
      const minBoard = 280;
      const maxBoard = Math.max(minBoard, curTotalW - 280);
      const finalW = Math.max(minBoard, Math.min(maxBoard, startWidth + deltaX));
      try {
        localStorage.setItem("soli_artifact_board_width", String(Math.round(finalW)));
      } catch {}
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  const handleResetSplit = () => {
    const totalW = containerRef.current?.getBoundingClientRect().width ?? window.innerWidth;
    const half = Math.round(totalW * 0.5);
    setBoardWidth(half);
    try {
      localStorage.setItem("soli_artifact_board_width", String(half));
    } catch {}
  };

  const minChatWidth = 320;
  const maxBoard = Math.max(280, containerWidth - minChatWidth - 10);
  const effectiveBoardWidth = Math.min(boardWidth, maxBoard);

  return (
    <div ref={containerRef} className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden animate-page-rise">
      {/* Global drag shield to catch all mouse events smoothly over iframes & selection */}
      {isResizingSplit && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none" />
      )}

      {/* Chat conversation column */}
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
          activeArtifactId ? "hidden lg:flex" : ""
        } ${
          isResizingSplit
            ? "transition-none select-none pointer-events-none"
            : "transition-all duration-150"
        }`}
      >
        {convId && (
          <Suspense fallback={null}>
            <HistoryLoader convId={convId} />
          </Suspense>
        )}

        {/* Top Session Artifacts Indicator */}
        {convArtifacts.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 border-b border-black/[0.06] bg-card/60 px-4 py-2 backdrop-blur-xs">
            <span className="flex size-5 items-center justify-center rounded-md bg-brand/10 text-brand-readable">
              <Scale className="size-3" />
            </span>
            <span className="text-[12px] font-medium text-foreground/75">
              {convArtifacts.length} Legal Document{convArtifacts.length > 1 ? "s" : ""} in this session
            </span>
          </div>
        )}

        {/* Scrollable message column — threads pin to newest via column-reverse.
            Fresh chats have nothing to pin, and reversing there anchors the
            scroll to the wrong end (clipping the welcome heading), so they
            lay out normally and scroll from the top. */}
        <div
          className={`flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden ${
            fresh ? "" : "flex-col-reverse"
          }`}
        >
          <div className={`flex min-h-full min-w-0 shrink-0 flex-col px-4 sm:px-6 ${fresh ? "justify-center" : ""}`}>
            {!fresh && <div className="flex-1" />}
            {fresh && <div className="min-h-6 flex-1" />}

            {/* Welcome screen on fresh chat */}
            {fresh && (
              <div className={COL}>
                <Welcome dot={dot} onSuggest={fillComposer} />
              </div>
            )}

            {/* Message list */}
            <div className={`${COL} pt-6 pb-8 space-y-6`}>
              {shown.map((m, i) => (
                <div key={m.id} className="animate-message-rise">
                  {(i === 0 || m.createdAt - shown[i - 1].createdAt > 60 * 60_000) && (
                    <DateSeparator ts={m.createdAt} />
                  )}
                  <MessageRow
                    m={m}
                    dot={dot}
                    isStreaming={
                      m.role === "dot" &&
                      i === shown.length - 1 &&
                      (submitting || dot.status === "working")
                    }
                  />
                </div>
              ))}

              {/* Thinking indicator — matches dot avatar alignment */}
              {workingHere && (
                <div className="motion-line flex items-center gap-3 rounded-full border border-brand/10 bg-card/70 px-3 py-2 pt-2 shadow-sm backdrop-blur">
                  <div className="shrink-0">
                    <DotOrb look={dot.look} status="working" size={28} />
                  </div>
                  <span className="shimmer-text text-[15px]">{dot.activity ?? `${dot.name} is thinking`}…</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Composer — same max-width column, pinned to bottom */}
        <div className="w-full min-w-0 px-4 pb-4 sm:px-6 sm:pb-6">
          {sendError && (
            <div className={`${COL} mb-2`}>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.08] px-3.5 py-2 text-[13px] text-destructive">
                <span>{sendError}</span>
                <button onClick={() => setSendError(null)} className="text-xs hover:underline">Dismiss</button>
              </div>
            </div>
          )}
          {!hasKey && (
            <div className={`${COL} mb-2`}>
              <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/[0.08] px-3.5 py-2 text-[13px]">
                <ShieldAlert className="size-4 shrink-0 text-warning" strokeWidth={1.75} />
                <span>The assistant isn&apos;t configured yet. Please contact your administrator.</span>
              </div>
            </div>
          )}
          <div className={COL}>
            <Composer key={convId ?? "new"} dot={dot} onSend={send} onVoice={voice} submitting={submitting} draft={draft} />
          </div>
        </div>
      </div>

      {/* Artifact Board side panel with resizable split divider */}
      {activeArtifactId && (
        <>
          <PaneSplitter
            onPointerDown={handleSplitterPointerDown}
            onDoubleClick={handleResetSplit}
            isDragging={isResizingSplit}
            chatPercent={Math.max(10, Math.min(90, Math.round(((containerWidth - effectiveBoardWidth) / (containerWidth || 1)) * 100)))}
            boardPercent={Math.max(10, Math.min(90, Math.round((effectiveBoardWidth / (containerWidth || 1)) * 100)))}
          />
          <ArtifactBoard
            conversationId={convId}
            onClose={() => setActiveArtifact(null)}
            width={effectiveBoardWidth}
            isDragging={isResizingSplit}
            onResetWidth={handleResetSplit}
          />
        </>
      )}
    </div>
  );
}

// ── Two-Way Split Pane Divider ──────────────────────────────────────────────
function PaneSplitter({
  onPointerDown,
  onDoubleClick,
  isDragging,
  chatPercent,
  boardPercent,
}: {
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  isDragging: boolean;
  chatPercent: number;
  boardPercent: number;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      title="Drag left/right to resize Chat & Document Preview · Double-click for 50/50 split"
      className="group relative z-40 hidden lg:flex w-2.5 shrink-0 cursor-col-resize select-none touch-none items-center justify-center transition-colors hover:bg-brand/10"
    >
      {/* Hairline guide */}
      <div
        className={`h-full w-px transition-colors duration-150 ${
          isDragging ? "w-[2px] bg-brand" : "bg-black/10 group-hover:bg-brand/60"
        }`}
      />

      {/* Center grip handle with grab dots */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border border-black/10 bg-card py-2.5 px-1 shadow-sm transition-all duration-150 ${
          isDragging
            ? "border-brand ring-2 ring-brand/30 scale-105 opacity-100"
            : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <div className="flex flex-col items-center gap-1 text-foreground/45">
          <span className="size-1 rounded-full bg-current" />
          <span className="size-1 rounded-full bg-current" />
          <span className="size-1 rounded-full bg-current" />
        </div>
      </div>

      {/* Floating ratio indicator pill while dragging */}
      {isDragging && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-brand/20 bg-card/95 px-3 py-1 font-mono text-[11px] font-semibold text-foreground shadow-md backdrop-blur-xs">
          <span className="text-foreground/60">Chat {chatPercent}%</span>
          <span className="text-brand">·</span>
          <span className="text-brand">Doc {boardPercent}%</span>
        </div>
      )}
    </div>
  );
}

// ── Welcome screen — ChatGPT / Claude / Gemini hybrid ──────────────────────
// Centered greeting with 2x2 suggestion cards. Clicking a card fills the
// composer below (ChatGPT-style) — nothing is sent until the user hits Send.
function Welcome({ dot, onSuggest }: { dot: Dot; onSuggest: (text: string) => void }) {
  const hour = new Date().getHours();
  const daypart = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const persona = getPersonaByName(dot.name);
  const suggestions = getSuggestionsForDot(dot);

  return (
    <div className="flex flex-col items-center px-2 pt-10 pb-4 text-center sm:pt-16 animate-page-rise">
      <div className="relative">
        <span className="absolute inset-0 rounded-full border border-brand/20 animate-[pulse-ring_1.8s_ease-out_infinite]" />
        <DotOrb look={dot.look} status={dot.status} size={44} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <p className="font-mono text-[11px] tracking-widest text-foreground/40 uppercase">
          {daypart} · {dot.name}
        </p>
        {persona?.role && (
          <span className="rounded-xs bg-brand/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-brand-readable uppercase">
            {persona.role}
          </span>
        )}
      </div>
      <h1 className="mt-2 max-w-[540px] font-serif text-[34px] leading-[1.18] font-normal tracking-[-0.02em] text-balance sm:text-[44px]">
        What can I help with?
      </h1>
      {dot.purpose ? (
        <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-foreground/55">
          {dot.purpose.length > 140 ? `${dot.purpose.slice(0, 140)}…` : dot.purpose}
        </p>
      ) : (
        <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-foreground/55">
          Research, drafting and matter work with cited sources from your library.
        </p>
      )}

      <div className="motion-stagger mt-8 grid w-full grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
        {suggestions.map((s, idx) => {
          const isBail = s.id.includes("bail") || idx === 0;
          const isNotice = s.id.includes("notice") || idx === 1;
          const isAudit = s.id.includes("preserve") || s.id.includes("pramaan") || s.id.includes("audit");
          const Icon = isBail ? Scale : isNotice ? FileText : isAudit ? Sparkles : Search;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSuggest(s.template)}
              className="motion-card group flex items-start gap-3 rounded-2xl border border-black/[0.08] bg-card px-4 py-3.5 text-left transition-all hover:border-black/20 hover:bg-popover hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-readable">
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-medium">{s.title}</span>
                <span className="block truncate text-[13px] text-foreground/50">{s.subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── File upload helpers ──────────────────────────────────────────────────────
type Upload = { key: string; name: string; state: "uploading" | "done" | "error"; file?: Attachment; error?: string };

async function uploadFiles(dotId: string, list: File[]): Promise<{ files?: Attachment[]; error?: string }> {
  const form = new FormData();
  for (const f of list) form.append("file", f);
  const r = await fetch(`/api/dots/${dotId}/files`, { method: "POST", body: form });
  return r.json();
}

// ── Composer ─────────────────────────────────────────────────────────────────
function Composer({ dot, onSend, onVoice, submitting = false, draft = null }: { dot: Dot; onSend: (text: string, attachments: Attachment[]) => void; onVoice: () => void; submitting?: boolean; draft?: { text: string; nonce: number } | null }) {
  const [text, setText] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ready = uploads.filter((u) => u.state === "done" && u.file).map((u) => u.file!);
  const busy = uploads.some((u) => u.state === "uploading");

  // A suggestion card fills the input and focuses it; the user reviews and sends.
  useEffect(() => {
    if (!draft) return;
    const id = requestAnimationFrame(() => {
      setText(draft.text);
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(draft.text.length, draft.text.length);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [draft]);

  const addFiles = (list: File[]) => {
    if (!list.length) return;
    const batch = list.map((f) => ({ key: `${f.name}-${f.size}-${Math.random()}`, name: f.name, state: "uploading" as const }));
    setUploads((u) => [...u, ...batch]);
    void uploadFiles(dot.id, list).then((r) =>
      setUploads((u) =>
        u.map((x) => {
          const i = batch.findIndex((b) => b.key === x.key);
          if (i === -1) return x;
          return r.files?.[i] ? { ...x, state: "done", file: r.files[i] } : { ...x, state: "error", error: r.error ?? "Upload failed" };
        }),
      ),
    );
  };

  const submit = () => {
    const value = text.trim();
    if ((!value && !ready.length) || busy || submitting || pending) return;
    setText("");
    setUploads([]);
    onSend(value, ready);
  };

  if (dot.status === "paused") {
    return (
      <div className="surface flex items-center justify-between gap-4 px-4 py-3 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.15)]">
        <span className="text-[13px] text-foreground/60">
          {dot.name} is paused. Any ongoing work was stopped, and it won&apos;t message you until you resume it.
        </span>
        <button className="btn-primary h-8 shrink-0 px-3 text-[13px]" onClick={() => start(() => resumeDot(dot.id))}>
          Resume
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles([...e.dataTransfer.files]); }}
    >
      <div
        className={`composer-shell rounded-[28px] border bg-card/95 px-4 pt-3 pb-2 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur transition-[box-shadow,border-color] focus-within:border-black/20 focus-within:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] ${dragging ? "border-brand border-dashed" : "border-black/10"}`}
      >
        {uploads.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5 px-1 pt-1">
            {uploads.map((u) => (
              <span
                key={u.key}
                className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] ${u.state === "error" ? "border-destructive/40 text-destructive" : "border-black/10 bg-popover text-foreground/70"}`}
                title={u.error}
              >
                <Paperclip className="size-3" strokeWidth={1.75} />
                <span className="max-w-40 truncate">{u.name}</span>
                {u.state === "uploading" && <span className="font-mono text-[10px] text-foreground/40">…</span>}
                <button onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))} aria-label={`Remove ${u.name}`} className="text-foreground/35 hover:text-foreground">
                  <X className="size-3" strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          autoFocus
          aria-label={`Message ${dot.name}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => { const pasted = [...e.clipboardData.files]; if (pasted.length) { e.preventDefault(); addFiles(pasted); } }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
          placeholder={dragging ? "Drop files to attach" : `Message ${dot.name}…`}
          className="max-h-52 min-h-[44px] w-full resize-none bg-transparent px-1 py-2 text-[16px] leading-[1.5] tracking-default outline-none [field-sizing:content] placeholder:text-foreground/35"
        />

        <div className="flex items-center gap-1 pb-1">
          <label
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-black/[0.05] hover:text-foreground"
            title="Attach files"
          >
            <Plus className="size-[18px]" strokeWidth={1.75} />
            <input type="file" multiple className="hidden" onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
          </label>
          <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-black/[0.08] bg-popover px-2.5 py-1 text-[12px] text-foreground/55 sm:flex">
            <Scale className="size-3 text-brand" />
            Legal research
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="motion-card flex size-9 shrink-0 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-black/[0.05] hover:text-foreground"
              onClick={onVoice}
              aria-label={`Voice mode with ${dot.name}`}
              title="Voice mode"
            >
              <AudioLines className="size-[18px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              className="motion-card flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-card transition-all hover:opacity-85 disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-foreground/30"
              disabled={submitting || pending || busy || (!text.trim() && !ready.length)}
              onClick={submit}
              aria-label="Send"
              title="Send (Enter)"
            >
              <ArrowUp className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[12px] text-foreground/35">
        {dot.name} can make mistakes. Check important info.
      </p>
    </div>
  );
}

// ── Attachments ──────────────────────────────────────────────────────────────
function Attachments({ items, align = "start" }: { items: Attachment[]; align?: "start" | "end" }) {
  const images = items.filter((a) => /^image\/(png|jpeg|gif|webp)$/.test(a.mime));
  const others = items.filter((a) => !images.includes(a));
  const size = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  return (
    <div className={`mt-2 flex flex-wrap gap-2 ${align === "end" ? "justify-end" : ""}`}>
      {images.map((a) => (
        <a key={a.id} href={`/api/files/${a.id}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-black/[0.06] bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/${a.id}`} alt={a.name} className="max-h-64 max-w-[340px] object-contain" />
        </a>
      ))}
      {others.map((a) => (
        <a
          key={a.id}
          href={`/api/files/${a.id}${a.mime === "application/pdf" ? "" : "?download=1"}`}
          target="_blank"
          rel="noreferrer"
          className="surface flex items-center gap-2.5 px-3 py-2 transition-colors hover:border-black/15"
        >
          <FileText className="size-4 shrink-0 text-foreground/45" strokeWidth={1.5} />
          <span className="min-w-0">
            <span className="block max-w-56 truncate text-[13px]">{a.name}</span>
            <span className="block font-mono text-[10px] text-foreground/40 uppercase">{size(a.size)}</span>
          </span>
          <Download className="size-3.5 text-foreground/35" strokeWidth={1.75} />
        </a>
      ))}
    </div>
  );
}

// ── Activity icon map ────────────────────────────────────────────────────────
const ACTIVITY_ICON: [RegExp, typeof Globe][] = [
  [/^Searched|^Searching/, Search],
  [/^Browsing|^Reading the web/, Globe],
  [/^Using its computer/, MonitorSmartphone],
  [/^Running commands|^Reading a file|^Writing a file/, Terminal],
  [/^Signing in/, KeyRound],
  [/^On your computer/, Laptop],
  [/^Remember|^Updating memory/, Brain],
  [/^Setting up a routine|^Updating routines/, Clock],
  [/^Messaging/, MessageSquare],
  [/^Learning a skill|^Using a skill/, Sparkles],
  [/^Finding app tools|^Using an app|^Connecting an app/, AppWindow],
  [/^Blocked/, X],
];

// ── MessageRow ───────────────────────────────────────────────────────────────
/** One chat line. In channels, `showName` labels which dot wrote it. */
export function MessageRow({
  m,
  dot,
  showName = false,
  isStreaming = false,
}: {
  m: Message;
  dot: Dot;
  showName?: boolean;
  isStreaming?: boolean;
}) {
  const artifacts = useStore((s) => s.artifacts);

  // ── User bubble (right-aligned, pill shape, dark background) ────────────
  if (m.role === "user") {
    return (
      <div className="flex justify-end animate-message-rise">
        <div className="flex max-w-[85%] flex-col items-end sm:max-w-[75%]">
          {m.from && (
            <span className="mb-1 font-mono text-[10px] tracking-wider text-foreground/40 uppercase">
              {m.from.replace(/^dot:/, "From ").replace(/^routine:/, "Routine · ")}
            </span>
          )}
          {m.text && (
            <div className="motion-card rounded-2xl rounded-br-sm bg-foreground px-4 py-3 text-[15px] leading-[1.55] tracking-default whitespace-pre-wrap text-card shadow-[0_10px_24px_-16px_rgba(0,0,0,0.55)]">
              {m.text}
            </div>
          )}
          {!!m.attachments?.length && <Attachments items={m.attachments} align="end" />}
        </div>
      </div>
    );
  }

  // ── Activity pill (tool use status) ─────────────────────────────────────
  if (m.role === "activity") {
    const [label, ...rest] = m.text.split(" · ");
    const Icon = ACTIVITY_ICON.find(([re]) => re.test(label))?.[1] ?? Sparkles;
    return (
      <div className="motion-line flex min-w-0 items-center gap-2 rounded-full bg-card/55 px-2.5 py-1 text-foreground/40">
        <Icon className="size-3.5 shrink-0" strokeWidth={1.5} />
        {showName && <span className="shrink-0 text-[12px] text-foreground/55">{dot.name}</span>}
        <span className="shrink-0 font-mono text-[11px] tracking-wide whitespace-nowrap uppercase">{label}</span>
        {rest.length > 0 && <span className="truncate font-mono text-[11px] text-foreground/30">{rest.join(" · ")}</span>}
      </div>
    );
  }

  // ── System message (centered hairline) ──────────────────────────────────
  if (m.role === "system") {
    return (
      <div className="flex items-center gap-3 py-2 animate-message-rise">
        <span className="h-px flex-1 bg-black/[0.06]" />
        <span className="text-[11px] text-foreground/40">{m.text}</span>
        <span className="h-px flex-1 bg-black/[0.06]" />
      </div>
    );
  }

  // ── Approval / question card ─────────────────────────────────────────────
  if (m.role === "card" && m.card) return <CardRow m={m} />;

  // ── Dot reply (left-aligned, no bubble — Claude style) ──────────────────
  const matchedArtifactId =
    m.artifactId ||
    artifacts.find((a) =>
      m.attachments?.some((att) => att.id === a.fileId || att.id === a.pdfFileId || att.id === a.docxFileId),
    )?.id;

  const detectedDoc =
    !matchedArtifactId && m.role === "dot" && m.text ? detectLegalDocument(m.text) : null;

  const artifactObj = matchedArtifactId ? artifacts.find((a) => a.id === matchedArtifactId) : null;
  const nonArtifactAttachments = m.attachments?.filter(
    (att) => !artifactObj || (att.id !== artifactObj.fileId && att.id !== artifactObj.pdfFileId && att.id !== artifactObj.docxFileId),
  ) ?? [];

  // Raw `TOOL <name> {json}` dumps arrive as plain text — pull them out and
  // render as quiet chips so the answer reads as prose, not a stack trace.
  const { prose, tools } = useMemo(
    () => (m.role === "dot" && m.text ? parseToolCalls(m.text) : { prose: m.text || "", tools: [] as ReturnType<typeof parseToolCalls>["tools"] }),
    [m.role, m.text],
  );
  const hasProse = prose.replace(/[…\s]/g, "") !== "";

  return (
    <div className="flex gap-3 animate-message-rise">
      {/* Avatar: always shown in direct chats too, matches Claude's layout */}
      <div className="mt-0.5 shrink-0">
        <DotOrb look={dot.look} status="idle" size={28} />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        {showName && (
          <div className="mb-1 text-[13px] font-medium text-foreground/70">{dot.name}</div>
        )}
        {m.title && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-sm bg-highlight px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-highlight-foreground uppercase">
            <Sparkles className="size-3" strokeWidth={2} />
            {m.title}
          </div>
        )}

        {!!tools.length && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {tools.map((t, i) => {
              const Icon = toolIcon(t.tool);
              return (
                <span
                  key={`${t.tool}-${i}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-black/10 bg-popover px-2.5 py-1 text-[12px] text-foreground/60"
                  title={t.detail ? `${t.label} — ${t.detail}` : t.label}
                >
                  <Icon className="size-3.5 shrink-0 text-brand" strokeWidth={2} />
                  <span className="truncate">{t.label}</span>
                  {t.detail && (
                    <span className="max-w-[16ch] truncate font-mono text-[11px] text-foreground/40">{t.detail}</span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {hasProse && (
          <div className="dot-prose">
            <Markdown remarkPlugins={[remarkGfm]}>{prose}</Markdown>
            {isStreaming && (
              <span className="ml-1 inline-block h-3.5 w-1.5 rounded-xs bg-brand animate-pulse align-middle" />
            )}
          </div>
        )}
        {!hasProse && !tools.length && (
          <div className="dot-prose">
            <Markdown remarkPlugins={[remarkGfm]}>{m.text || "…"}</Markdown>
            {isStreaming && (
              <span className="ml-1 inline-block h-3.5 w-1.5 rounded-xs bg-brand animate-pulse align-middle" />
            )}
          </div>
        )}

        {matchedArtifactId ? (
          <ArtifactCard artifactId={matchedArtifactId} />
        ) : detectedDoc ? (
          <DetectedDocCard message={m} dot={dot} detected={detectedDoc} />
        ) : null}

        {!!nonArtifactAttachments.length && <Attachments items={nonArtifactAttachments} />}

        {/* Message action icons below the document card (Claude style) */}
        <MessageActions text={m.text} />
      </div>
    </div>
  );
}

function MessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="mt-2.5 flex items-center gap-0.5 text-foreground/40 opacity-70 transition-opacity hover:opacity-100">
      <button
        type="button"
        onClick={copyText}
        className="btn-quiet size-7 p-0 rounded-md hover:text-foreground"
        title={copied ? "Copied" : "Copy to clipboard"}
        aria-label="Copy message"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => setVote(vote === "up" ? null : "up")}
        className={`btn-quiet size-7 p-0 rounded-md hover:text-foreground ${vote === "up" ? "text-foreground bg-black/[0.05]" : ""}`}
        title="Good response"
        aria-label="Good response"
      >
        <ThumbsUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setVote(vote === "down" ? null : "down")}
        className={`btn-quiet size-7 p-0 rounded-md hover:text-foreground ${vote === "down" ? "text-foreground bg-black/[0.05]" : ""}`}
        title="Bad response"
        aria-label="Bad response"
      >
        <ThumbsDown className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {}}
        className="btn-quiet size-7 p-0 rounded-md hover:text-foreground"
        title="Regenerate"
        aria-label="Regenerate response"
      >
        <RotateCcw className="size-3.5" />
      </button>
    </div>
  );
}

function DetectedDocCard({
  message,
  dot,
  detected,
}: {
  message: Message;
  dot: Dot;
  detected: { isLegalDoc: boolean; title: string; kind: string; content?: string };
}) {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dotId: dot.id,
          conversationId: message.conversationId,
          messageId: message.id,
          title: detected.title,
          content: detected.content || message.text,
          kind: detected.kind,
          summary: `Court document: ${detected.title}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.artifact) {
          addArtifactLocally(data.artifact);
        } else if (data.artifact?.id) {
          setActiveArtifact(data.artifact.id);
        }
      }
    } catch (err) {
      console.error("Failed to generate preview for detected document:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dotId: dot.id,
          conversationId: message.conversationId,
          messageId: message.id,
          title: detected.title,
          content: detected.content || message.text,
          kind: detected.kind,
          summary: `Court document: ${detected.title}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const downloadId = data.artifact?.pdfFileId || data.artifact?.fileId;
        if (downloadId) {
          const a = document.createElement("a");
          a.href = `/api/files/${downloadId}?download=1`;
          a.download = "";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }
    } catch (err) {
      console.error("Failed to generate and download document:", err);
    } finally {
      setLoading(false);
    }
  };

  const Icon = detected.isLegalDoc ? Scale : FileText;

  return (
    <div
      onClick={handleOpen}
      className="group my-3 flex items-center justify-between gap-3.5 rounded-2xl border border-black/10 bg-card p-3 sm:px-4 sm:py-3.5 transition-all hover:border-black/20 hover:bg-popover/80 hover:shadow-xs cursor-pointer"
      title="Click to view document in Artifact Board"
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-black/[0.03] text-foreground/70 transition-colors group-hover:border-black/15 group-hover:bg-black/[0.05] group-hover:text-foreground">
        <Icon className="size-5" strokeWidth={1.5} />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[14px] sm:text-[15px] font-medium tracking-tight text-foreground transition-colors group-hover:text-foreground">
          {detected.title}
        </h4>
        <p className="mt-0.5 truncate text-[12px] text-foreground/50">
          Document · PDF
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="btn-secondary h-8 px-3.5 text-[12px] sm:text-[13px] font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs"
          title="Download Document"
        >
          <Download className="size-3.5 text-foreground/60" />
          <span>{loading ? "Preparing…" : "Download"}</span>
        </button>
      </div>
    </div>
  );
}

// ── CardRow ──────────────────────────────────────────────────────────────────
function CardRow({ m }: { m: Message }) {
  const card = m.card!;
  const [answer, setAnswer] = useState("");
  const [pending, start] = useTransition();
  const open = card.status === "pending";
  const act = (choice: "approve" | "deny" | "always" | "answer", value?: string) => start(() => resolveCard(m.id, choice, value));

  if (!open) {
    const tone = card.status === "approved" || card.status === "answered" ? "text-success" : card.status === "denied" ? "text-destructive" : "text-foreground/40";
    const Icon = card.status === "denied" ? X : card.status === "expired" ? Clock : Check;
    return (
      <div className="ml-[40px] flex max-w-[520px] items-center gap-2.5 rounded-lg border border-black/[0.06] bg-card/60 px-3 py-2">
        <Icon className={`size-3.5 shrink-0 ${tone}`} strokeWidth={2} />
        <span className="truncate text-[13px] text-foreground/60">{card.title}</span>
        <span className={`ml-auto shrink-0 font-mono text-[10px] tracking-wider uppercase ${tone}`}>
          {card.status === "answered" ? `Answered · ${card.answer}` : card.kind === "connect" && card.status === "approved" ? "Connected" : card.status}
        </span>
      </div>
    );
  }

  return (
    <div className="ml-[40px] surface max-w-[520px] overflow-hidden shadow-elevated">
      <div className="flex items-center gap-2 border-b border-black/[0.06] bg-popover px-4 py-2">
        <span className="size-1.5 rounded-full bg-warning" />
        <span className="eyebrow">{card.kind === "question" ? "Question for you" : card.kind === "connect" ? "Connect an app" : "Needs your approval"}</span>
      </div>
      <div className="p-4">
        <div className="text-[15px] font-medium leading-snug">{card.title}</div>
        {card.detail && <div className="mt-1.5 text-[13px] whitespace-pre-wrap text-foreground/60">{card.detail}</div>}

        {card.kind === "connect" && <ConnectActions m={m} />}

        {card.kind === "approval" && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="btn-primary h-8 px-3 text-[13px]" disabled={pending} onClick={() => act("approve")}>
              Approve
            </button>
            <button className="btn-secondary h-8 px-3 text-[13px]" disabled={pending} onClick={() => act("deny")}>
              Deny
            </button>
            {card.ruleAction && (
              <button className="btn-quiet ml-auto" disabled={pending} onClick={() => act("always")} title={`Adds a rule: always allow when it wants to ${card.ruleAction}`}>
                Always allow
              </button>
            )}
          </div>
        )}

        {card.kind === "question" && (
          <div className="mt-4 space-y-2.5">
            {!!card.options?.length && (
              <div className="flex flex-wrap gap-2">
                {card.options.map((o) => (
                  <button key={o} className="btn-secondary h-8 px-3 text-[13px]" disabled={pending} onClick={() => act("answer", o)}>
                    {o}
                  </button>
                ))}
              </div>
            )}
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (answer.trim()) act("answer", answer.trim()); }}>
              <input className="field h-8" placeholder="Type your own answer" aria-label="Type your own answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <button className="btn-primary h-8 px-3 text-[13px]" disabled={pending || !answer.trim()}>
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ConnectActions ────────────────────────────────────────────────────────────
function ConnectActions({ m }: { m: Message }) {
  const card = m.card!;
  const [pending, start] = useTransition();
  const [notYet, setNotYet] = useState(false);
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <a
        className="btn-primary h-8 px-3 text-[13px] leading-8"
        href={card.url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!card.url}
        onClick={(e) => { if (!card.url) e.preventDefault(); }}
      >
        <Plug className="size-3.5" strokeWidth={1.75} /> {card.title}
        <ExternalLink className="size-3 opacity-60" strokeWidth={1.75} />
      </a>
      <button
        className="btn-secondary h-8 px-3 text-[13px]"
        disabled={pending}
        onClick={() => start(async () => setNotYet(!(await confirmConnectCard(m.id))))}
      >
        I&apos;ve connected
      </button>
      <button className="btn-quiet" disabled={pending} onClick={() => start(() => resolveCard(m.id, "deny"))}>
        Not now
      </button>
      {notYet && <span className="text-[11px] text-foreground/50">Not connected yet. Finish signing in, then try again.</span>}
    </div>
  );
}

// ── Dividers ─────────────────────────────────────────────────────────────────

function DateSeparator({ ts }: { ts: number }) {
  const d = new Date(ts);
  const label = d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return <div className="py-4 text-center font-mono text-[10px] tracking-wider text-foreground/30 uppercase">{label}</div>;
}
