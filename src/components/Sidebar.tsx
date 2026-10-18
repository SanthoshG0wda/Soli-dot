"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, ChevronRight, Ellipsis, FolderInput, Globe, LayoutGrid, LogOut, PanelLeftClose, Pencil, Pin, PinOff, Plus, Search, Settings, SquarePen, Trash2, Upload, X } from "lucide-react";
import { deleteConversation, moveConversation, renameConversation } from "@/app/actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { deleteConversationLocally, markRead, moveConversationLocally, renameConversationLocally, useStore } from "@/lib/store";
import { setSidebarCollapsed, setSidebarOpen, toggleSidebar, useSidebarCollapsed, useSidebarOpen } from "@/lib/ui";
import { statusDot, timeAgo } from "@/lib/status";
import DotOrb from "./DotOrb";
import type { Conversation, Message } from "@/lib/types";

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-1">
        <span className="size-3 rounded-full bg-foreground ring-2 ring-card" />
        <span className="size-3 rounded-full bg-brand ring-2 ring-card" />
        <span className="size-3 rounded-full bg-highlight ring-2 ring-card" />
      </span>
      <span className="text-[15px] font-medium tracking-tight">Soli</span>
    </span>
  );
}

/** Last readable line of a conversation, for the preview under its title. */
function preview(messages: Message[], convId: string): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.conversationId !== convId) continue;
    if (m.role === "card" && m.card?.status === "pending") return `Needs you: ${m.card.title}`;
    if ((m.role === "dot" || m.role === "user") && m.text) return (m.role === "user" ? "You: " : "") + m.text.replace(/[#*_`>|[\]]/g, "").replace(/\s+/g, " ");
  }
  return "";
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeConv = useSearchParams().get("c");
  const dots = useStore((s) => s.dots);
  const messages = useStore((s) => s.messages);
  const lastRead = useStore((s) => s.lastRead);
  const conversations = useStore((s) => s.conversations);
  const loaded = useStore((s) => s.loaded);
  const connected = useStore((s) => s.connected);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [, start] = useTransition();

  // ── Conversation options menu (Rename / Pin / Share / Archive / Delete / Move) ──
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const readIds = (key: string): string[] => {
    try {
      const raw = localStorage.getItem(key);
      const arr: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readIds("soli:pinned"));
  const [archivedIds, setArchivedIds] = useState<string[]>(() => readIds("soli:archived"));
  const toggleId = (ids: string[], key: string, id: string, set: (v: string[]) => void) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    set(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* private mode — in-memory only */
    }
  };

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpenId) return;
    const onDown = (e: PointerEvent) => {
      // If clicking a kebab trigger button, allow its own onClick to toggle
      if ((e.target as HTMLElement)?.closest?.("[data-conv-trigger]")) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
        setMoveOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpenId(null);
        setMoveOpen(false);
        setRenamingId(null);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpenId]);


  const dotHref = (dotId: string, convId?: string): string => {
    const canonicalId = dotId.startsWith("dot_") ? dotId.replace(/^dot_/, "vakil_") : dotId;
    return convId ? `/vakil/${canonicalId}?c=${convId}` : `/vakil/${canonicalId}`;
  };

  const rawActive = pathname.match(/^\/(?:dots|vakil)\/([^/]+)/)?.[1];
  const activeDot = rawActive?.startsWith("dot_") ? rawActive.replace(/^dot_/, "vakil_") : rawActive;
  const drawerOpen = useSidebarOpen();
  const collapsed = useSidebarCollapsed();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "b" || e.key === "B" || e.key === "[" || e.key === "\\")) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA") && e.key !== "b" && e.key !== "B") {
          return;
        }
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const dotById = useMemo(() => new Map(dots.map((d) => [d.id, d])), [dots]);

  // Chat history across every dot: pinned first, then newest. Archived chats are
  // hidden unless "Archived" is expanded. Search matches titles, dot names, text.
  const recent = useMemo(() => {
    const query = q.trim().toLowerCase();
    const visible = showArchived ? conversations : conversations.filter((c) => !archivedIds.includes(c.id));
    const sorted = [...visible].sort((a, b) => {
      const ap = pinnedIds.includes(a.id) ? 0 : 1;
      const bp = pinnedIds.includes(b.id) ? 0 : 1;
      return ap - bp || b.updatedAt - a.updatedAt;
    });
    if (!query) return sorted;
    const hits = new Set(messages.filter((m) => m.conversationId && m.text.toLowerCase().includes(query)).map((m) => m.conversationId));
    return sorted.filter((c) => c.title.toLowerCase().includes(query) || hits.has(c.id) || dotById.get(c.dotId)?.name.toLowerCase().includes(query));
  }, [conversations, messages, q, dotById, pinnedIds, archivedIds, showArchived]);
  const archivedCount = useMemo(() => conversations.filter((c) => archivedIds.includes(c.id)).length, [conversations, archivedIds]);

  const unread = (c: Conversation) => {
    const since = lastRead[c.dotId];
    return since !== undefined && c.updatedAt > since && messages.some((m) => m.conversationId === c.id && m.role === "dot" && m.createdAt > since);
  };

  const remove = (c: Conversation) =>
    start(async () => {
      // Optimistically remove from local store so UI updates immediately without refreshing:
      deleteConversationLocally(c.id);
      setConfirming(null);
      setMenuOpenId(null);
      if (c.id === activeConv) router.push(dotHref(c.dotId));
      try {
        await deleteConversation(c.id);
      } catch {
        /* already deleted elsewhere — just clear the confirm row */
      }
    });

  const saveRename = (c: Conversation) =>
    start(async () => {
      const title = draft.trim().slice(0, 80);
      setRenamingId(null);
      if (title && title !== c.title) {
        renameConversationLocally(c.id, title);
        try {
          await renameConversation(c.id, title);
        } catch {
          /* stale row — ignore */
        }
      }
    });

  const share = async (c: Conversation) => {
    const url = `${window.location.origin}${dotHref(c.dotId, c.id)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setSharedId(c.id);
    setMenuOpenId(null);
    window.setTimeout(() => setSharedId((v) => (v === c.id ? null : v)), 2000);
  };

  const move = (c: Conversation, targetDotId: string) =>
    start(async () => {
      setMenuOpenId(null);
      setMoveOpen(false);
      if (targetDotId === c.dotId) return;
      moveConversationLocally(c.id, targetDotId);
      try {
        await moveConversation(c.id, targetDotId);
      } catch {
        /* stale row — ignore */
      }
      if (c.id === activeConv) router.push(dotHref(targetDotId, c.id));
    });

  const closeSearch = () => (setSearching(false), setQ(""));

  return (
    <>
      {/* Phones / narrow windows: the sidebar is a drawer over a dimmed backdrop */}
      {drawerOpen && <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] animate-page-rise md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside
        // Picking anything in the drawer closes it on mobile.
        onClickCapture={(e) => {
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            if ((e.target as HTMLElement).closest("a")) {
              setSidebarOpen(false);
            }
          }
        }}
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-background/95 shadow-2xl backdrop-blur-xl transition-[width,min-width,max-width,transform,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)] md:static md:z-auto md:bg-background md:shadow-none md:backdrop-blur-none ${
          drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          collapsed
            ? "md:w-0 md:min-w-0 md:max-w-0 md:opacity-0 md:pointer-events-none md:border-r-0"
            : "md:w-[280px] md:min-w-[280px] md:max-w-[280px] md:opacity-100 md:border-r md:border-black/[0.06]"
        } overflow-hidden w-[280px] max-w-[85vw]`}
      >
        <div className="flex h-full w-[280px] min-w-[280px] max-w-[280px] shrink-0 flex-col">
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center gap-1 px-3">
            <Link href="/" className="mr-auto pl-1">
              <Wordmark />
            </Link>
            <button
              type="button"
              className={`motion-card flex size-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-black/[0.05] hover:text-foreground ${searching ? "bg-card text-foreground shadow-sm" : ""}`}
              onClick={() => (searching ? closeSearch() : setSearching(true))}
              title="Search chats"
              aria-label="Search chats"
            >
              <Search className="size-4" strokeWidth={1.75} />
            </button>
            <Link
              href="/"
              className="motion-card flex size-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-black/[0.05] hover:text-foreground"
              title="New chat"
              aria-label="New chat"
            >
              <SquarePen className="size-4" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              className="motion-card hidden size-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-black/[0.05] hover:text-foreground md:flex"
              onClick={() => setSidebarCollapsed(true)}
              title="Close sidebar (Ctrl+B)"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="size-4" strokeWidth={1.75} />
            </button>
          </div>

          {searching && (
            <div className="relative mx-3 mb-2 animate-page-rise">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-foreground/35" strokeWidth={1.75} />
              <input
                autoFocus
                className="field h-9 bg-popover pr-8 pl-8"
                aria-label="Search chats and counsel" placeholder="Search chats and counsel"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              />
              <button className="absolute top-1/2 right-2.5 -translate-y-1/2 text-foreground/40 hover:text-foreground" onClick={closeSearch} aria-label="Close search">
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}

          {/* Your dots: a horizontal row of characters */}
          {!q && (
            <div className="shrink-0 pb-1">
              <div className="motion-stagger flex gap-0.5 overflow-x-auto px-2.5 pb-1 [scrollbar-width:none]">
                {dots.map((d) => (
                  <Link
                    key={d.id}
                    href={dotHref(d.id)}
                    onClick={() => markRead(d.id)}
                    className={`motion-card flex w-[54px] shrink-0 flex-col items-center gap-1 rounded-lg py-1.5 transition-colors ${activeDot === d.id || activeDot === d.id.replace(/^dot_/, "vakil_") ? "bg-black/[0.05] shadow-sm" : "hover:bg-black/[0.03]"}`}
                    title={`${d.name}${d.purpose ? ` · ${d.purpose}` : ""}`}
                  >
                    <span className="relative">
                      <DotOrb look={d.look} status={d.status} size={40} />
                      {d.status !== "idle" && <span className={`absolute right-0 bottom-0.5 size-2.5 rounded-full ring-2 ring-card ${statusDot(d)}`} />}
                    </span>
                    <span className="w-full truncate text-center text-[11px] text-foreground/70">{d.name}</span>
                  </Link>
                ))}
                <Link href="/new" className="motion-card flex w-[54px] shrink-0 flex-col items-center gap-1 rounded-lg py-1.5 text-foreground/45 hover:bg-black/[0.03] hover:text-foreground" title="New counsel">
                  <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-black/20">
                    <Plus className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-[11px]">New</span>
                </Link>
              </div>
            </div>
          )}

          {/* Recent chats */}
          {q && <div className="eyebrow shrink-0 px-4 pt-2 pb-1.5">Chats matching “{q}”</div>}
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {!loaded && <div className="px-2 py-2 text-body-sm text-foreground/45">Connecting…</div>}
            {recent.map((c, index) => {
              const d = dotById.get(c.dotId);
              if (!d) return null;
              if (confirming === c.id) {
                return (
                  <div key={c.id} className="my-0.5 flex items-center gap-2 rounded-lg bg-destructive/[0.06] px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-destructive">Delete “{c.title}”?</span>
                    <button className="btn-quiet h-7 px-2 text-[12px] text-destructive" onClick={() => remove(c)}>
                      Delete
                    </button>
                    <button className="btn-quiet size-7 p-0" onClick={() => setConfirming(null)} aria-label="Cancel">
                      <X className="size-3.5" strokeWidth={2} />
                    </button>
                  </div>
                );
              }
              const line = preview(messages, c.id);
              const pinned = pinnedIds.includes(c.id);
              const archived = archivedIds.includes(c.id);
              const menuOpen = menuOpenId === c.id;
              const renaming = renamingId === c.id;
              const openUpwards = index >= recent.length - 2 && recent.length > 2;
              return (
                <div
                  key={c.id}
                  className={`group relative flex items-center rounded-xl transition-colors ${
                    menuOpen ? "z-40" : "z-0 hover:z-10"
                  } ${
                    c.id === activeConv
                      ? "bg-card shadow-sm ring-1 ring-black/[0.04]"
                      : "hover:bg-black/[0.03]"
                  }`}
                >
                  <Link href={dotHref(d.id, c.id)} onClick={() => markRead(d.id)} className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2.5">
                    <DotOrb look={d.look} status={d.status} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        {renaming ? (
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onClick={(e) => e.preventDefault()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename(c);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={() => saveRename(c)}
                            aria-label="Rename chat"
                            className="min-w-0 flex-1 rounded-md border border-brand/50 bg-card px-1.5 py-0.5 text-[15px] font-medium outline-none"
                          />
                        ) : (
                          <span className="truncate text-[15px] font-medium">{c.title}</span>
                        )}
                        {pinned && !renaming && <Pin className="size-3 shrink-0 text-foreground/40" strokeWidth={2} />}
                        {unread(c) && <span className="size-2 shrink-0 self-center rounded-full bg-brand" />}
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-foreground/35 group-hover:invisible">
                          {sharedId === c.id ? "Copied" : timeAgo(c.updatedAt).replace(" ago", "")}
                        </span>
                      </span>
                      <span className="block truncate text-[13px] text-foreground/50">
                        <span className="text-foreground/65">{d.name}</span>
                        {archived ? " · Archived" : line ? ` · ${line}` : ""}
                      </span>
                    </span>
                  </Link>
                  {/* Kebab → conversation options */}
                  <button
                    data-conv-trigger={c.id}
                    className={`absolute top-2 right-2 z-20 flex size-6 items-center justify-center rounded text-foreground/40 hover:bg-black/[0.05] hover:text-foreground ${
                      menuOpen ? "flex text-foreground" : "hidden group-hover:flex"
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpenId(menuOpen ? null : c.id);
                      setMoveOpen(false);
                    }}
                    aria-label={`Options for ${c.title}`}
                    aria-expanded={menuOpen}
                    title="Options"
                  >
                    <Ellipsis className="size-4" strokeWidth={1.75} />
                  </button>
                  {menuOpen && (
                    <div
                      ref={menuRef}
                      data-conv-menu
                      className={`absolute right-1 z-50 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#212121] py-1.5 text-[#ececec] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.65)] animate-page-rise ${
                        openUpwards ? "bottom-8" : "top-9"
                      }`}
                    >
                      <MenuItem
                        icon={<Pencil className="size-4" strokeWidth={1.75} />}
                        label="Rename"
                        onClick={() => (setDraft(c.title), setRenamingId(c.id), setMenuOpenId(null))}
                      />
                      <MenuItem
                        icon={pinned ? <PinOff className="size-4" strokeWidth={1.75} /> : <Pin className="size-4" strokeWidth={1.75} />}
                        label={pinned ? "Unpin" : "Pin"}
                        onClick={() => (toggleId(pinnedIds, "soli:pinned", c.id, setPinnedIds), setMenuOpenId(null))}
                      />
                      <div className="mx-3 my-1.5 h-px bg-white/10" />
                      <MenuItem
                        icon={<Upload className="size-4" strokeWidth={1.75} />}
                        label="Share"
                        onClick={() => void share(c)}
                      />
                      <MenuItem
                        icon={archived ? <ArchiveRestore className="size-4" strokeWidth={1.75} /> : <Archive className="size-4" strokeWidth={1.75} />}
                        label={archived ? "Unarchive" : "Archive"}
                        onClick={() => (toggleId(archivedIds, "soli:archived", c.id, setArchivedIds), setMenuOpenId(null))}
                      />
                      <MenuItem
                        icon={<Trash2 className="size-4 text-[#f87171]" strokeWidth={1.75} />}
                        label="Delete"
                        danger
                        onClick={() => (setMenuOpenId(null), setConfirming(c.id))}
                      />
                      <div className="mx-3 my-1.5 h-px bg-white/10" />
                      <div className="relative">
                        <MenuItem
                          icon={<FolderInput className="size-4" strokeWidth={1.75} />}
                          label="Move to counsel"
                          trailing={<ChevronRight className="size-3.5 opacity-60" strokeWidth={2} />}
                          onClick={() => setMoveOpen((v) => !v)}
                        />
                        {moveOpen && (
                          <div className="max-h-44 overflow-y-auto border-t border-white/10 py-1">
                            {dots
                              .filter((x) => x.id !== c.dotId)
                              .map((x) => (
                                <button
                                  key={x.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    move(c, x.id);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13.5px] transition-colors hover:bg-white/10"
                                >
                                  <DotOrb look={x.look} status={x.status} size={20} />
                                  <span className="min-w-0 flex-1 truncate">{x.name}</span>
                                </button>
                              ))}
                            {dots.filter((x) => x.id !== c.dotId).length === 0 && (
                              <p className="px-4 py-2 text-[12px] text-white/50">Only one counsel — create another to move chats.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {loaded && !recent.length && (
              <p className="px-3 py-6 text-center text-caption text-foreground/45">
                {q ? "No chats match." : dots.length ? "No chats yet. Pick Vakil or another counsel above to start one." : "Create your first counsel to start chatting."}
              </p>
            )}
            {archivedCount > 0 && !q && (
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="mx-2 mb-2 flex w-[calc(100%-16px)] items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-foreground/50 transition-colors hover:bg-black/[0.03] hover:text-foreground"
              >
                <Archive className="size-3.5" strokeWidth={1.75} />
                {showArchived ? "Hide archived" : `Archived · ${archivedCount}`}
              </button>
            )}
          </nav>

          {/* Bottom */}
          <div className="flex shrink-0 items-center gap-2 p-3">
            <Link
              href="/apps"
              className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border text-[13px] transition-colors ${pathname === "/apps" ? "border-foreground bg-card" : "border-black/10 hover:border-black/25"}`}
            >
              <LayoutGrid className="size-3.5" strokeWidth={1.5} /> Apps
            </Link>
            <Link
              href="/landing"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 transition-colors hover:border-black/25 text-foreground/70 hover:text-foreground"
              title="Product Tour & Overview"
              aria-label="Product Tour"
            >
              <Globe className="size-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/settings"
              className={`relative flex size-10 items-center justify-center rounded-full border transition-colors ${pathname === "/settings" ? "border-foreground bg-card" : "border-black/10 hover:border-black/25"}`}
              title={`Settings · ${connected ? "connected" : "reconnecting"}`}
              aria-label="Settings"
            >
              <Settings className="size-4" strokeWidth={1.5} />
              <span className={`absolute top-0.5 right-0.5 size-2 rounded-full ring-2 ring-background ${connected ? "bg-success" : "bg-foreground/25"}`} />
            </Link>
            <LogoutButton
              className="flex size-10 items-center justify-center rounded-full border border-black/10 text-foreground/70 transition-colors hover:border-black/25 hover:text-foreground disabled:opacity-40"
              icon={<LogOut className="size-4" strokeWidth={1.5} />}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

/** One row in the dark conversation options menu (matches the reference). */
function MenuItem({ icon, label, onClick, danger = false, trailing }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; trailing?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13.5px] transition-colors hover:bg-white/10 ${danger ? "text-[#f87171]" : ""}`}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}
