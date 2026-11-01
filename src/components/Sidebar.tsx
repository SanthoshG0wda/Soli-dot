"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, Boxes, ChevronDown, ChevronRight, ChevronsUpDown, Ellipsis, FolderKanban, Globe, Keyboard, LayoutGrid, Link2, LogOut, Palette, PanelLeftClose, Pencil, Pin, PinOff, Puzzle, Search, Settings, ShieldCheck, SlidersHorizontal, SquarePen, Trash2, Upload, X } from "lucide-react";
import { backfillConversationTitles, deleteConversation, listMatters, moveConversationToMatter, renameConversation } from "@/app/actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { deleteConversationLocally, markRead, renameConversationLocally, updateConversationMatterLocally, useStore } from "@/lib/store";
import { setSidebarCollapsed, setSidebarOpen, toggleSidebar, useSidebarCollapsed, useSidebarOpen } from "@/lib/ui";
import { timeAgo } from "@/lib/status";
import { stripThinkingBlocks } from "@/lib/strip-thinking";
import type { Conversation, Matter, Message } from "@/lib/types";

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-6 items-center justify-center rounded-[8px] bg-[#292928] text-[12px] font-semibold text-[#f1efea] shadow-sm">S</span>
      <span className="font-serif text-[20px] font-medium tracking-[-0.04em] text-[#f1efea]">Soli</span>
    </span>
  );
}

/** Last readable line of a conversation, for the preview under its title. */
function preview(messages: Message[], convId: string): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.conversationId !== convId) continue;
    if (m.role === "card" && m.card?.status === "pending") return `Needs you: ${m.card.title}`;
    if (m.role === "dot") {
      const text = stripThinkingBlocks(m.text).trim();
      if (text) return text.replace(/[#*_`>|[\]]/g, "").replace(/\s+/g, " ");
      continue;
    }
    if (m.role === "user" && m.text) return `You: ${m.text.replace(/[#*_`>|[\]]/g, "").replace(/\s+/g, " ")}`;
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

  // ── Conversation options menu (Rename / Pin / Share / Archive / Delete) ──
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [expandedMatterIds, setExpandedMatterIds] = useState<string[]>([]);
  const [movingId, setMovingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me").then((response) => response.ok ? response.json() : null).then((data: { user?: { name: string; email: string; role: string } } | null) => { if (active && data?.user) setUser(data.user); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const migrationKey = "soli:conversation-title-backfill-v1";
    if (localStorage.getItem(migrationKey)) return;
    void backfillConversationTitles().then((renamed) => {
      renamed.forEach(({ id, title }) => renameConversationLocally(id, title));
      localStorage.setItem(migrationKey, "done");
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    void listMatters().then((items) => {
      if (!active) return;
      setMatters(items);
      setExpandedMatterIds((current) => Array.from(new Set([...current, ...items.map((item) => item.id)])));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

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
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpenId(null);
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

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: PointerEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setProfileOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);


  const dotHref = (dotId: string, convId?: string): string => {
    const canonicalId = dotId.startsWith("dot_") ? dotId.replace(/^dot_/, "vakil_") : dotId;
    return convId ? `/vakil/${canonicalId}?c=${convId}` : `/vakil/${canonicalId}`;
  };
  const newChatHref = dots[0] ? dotHref(dots[0].id, "new") : "/";
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

  // General chat history only: matter chats live exclusively under their matter.
  // Archived chats are hidden unless "Archived" is expanded.
  const recent = useMemo(() => {
    const query = q.trim().toLowerCase();
    const generalChats = conversations.filter((c) => !c.matterId);
    const visible = showArchived ? generalChats : generalChats.filter((c) => !archivedIds.includes(c.id));
    const sorted = [...visible].sort((a, b) => {
      const ap = pinnedIds.includes(a.id) ? 0 : 1;
      const bp = pinnedIds.includes(b.id) ? 0 : 1;
      return ap - bp || b.updatedAt - a.updatedAt;
    });
    if (!query) return sorted;
    const hits = new Set(
      messages
        .filter((m) => {
          const text = m.role === "dot" ? stripThinkingBlocks(m.text) : m.text;
          return m.conversationId && text.toLowerCase().includes(query);
        })
        .map((m) => m.conversationId),
    );
    return sorted.filter((c) => c.title.toLowerCase().includes(query) || hits.has(c.id));
  }, [conversations, messages, q, pinnedIds, archivedIds, showArchived]);
  const archivedCount = useMemo(() => conversations.filter((c) => !c.matterId && archivedIds.includes(c.id)).length, [conversations, archivedIds]);

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

  const moveToMatter = (c: Conversation, matterId: string | null) =>
    start(async () => {
      updateConversationMatterLocally(c.id, matterId);
      setMovingId(null);
      try {
        await moveConversationToMatter(c.id, matterId);
      } catch {
        /* leave the row visible; the next refresh restores the server state */
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

  const closeSearch = () => (setSearching(false), setQ(""));
  const displayName = user?.name || "Soli user";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

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
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-[#141414] text-[#f1efea] shadow-2xl backdrop-blur-xl transition-[width,min-width,max-width,transform,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)] md:static md:z-auto md:bg-[#141414] md:shadow-none md:backdrop-blur-none ${
          drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          collapsed
            ? "md:w-0 md:min-w-0 md:max-w-0 md:opacity-0 md:pointer-events-none md:border-r-0"
            : "md:w-[280px] md:min-w-[280px] md:max-w-[280px] md:opacity-100 md:border-r md:border-[#302f2d]"
        } overflow-hidden w-[260px] max-w-[85vw]`}
      >
        <div className="flex h-full w-[280px] min-w-[280px] max-w-[280px] shrink-0 flex-col">
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center gap-1 px-3">
            <Link href="/" className="mr-auto pl-1">
              <Wordmark />
            </Link>
            <button
              type="button"
              className={`motion-card flex size-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground ${searching ? "bg-[#292928] text-foreground shadow-none" : ""}`}
              onClick={() => (searching ? closeSearch() : setSearching(true))}
              title="Search chats"
              aria-label="Search chats"
            >
              <Search className="size-4" strokeWidth={1.75} />
            </button>
            <Link
              href={newChatHref}
              className="motion-card flex size-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
              title="New chat"
              aria-label="New chat"
            >
              <SquarePen className="size-4" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              className="motion-card hidden size-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground md:flex"
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
                aria-label="Search chats" placeholder="Search chats"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              />
              <button className="absolute top-1/2 right-2.5 -translate-y-1/2 text-foreground/40 hover:text-foreground" onClick={closeSearch} aria-label="Close search">
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}

          <Link
            href={newChatHref}
            className="mx-2 mb-5 flex h-8 items-center gap-2 rounded-lg bg-[#353534] px-3 text-[14px] font-medium text-[#f1efea] transition-colors hover:bg-[#41403e]"
          >
            <SquarePen className="size-4" strokeWidth={1.75} />
            New chat
          </Link>

          <nav className="mx-2 mb-6 space-y-1">
            <Link
              href="/matters"
              className={`flex h-8 items-center gap-3 rounded-lg px-2 text-[14px] transition-colors ${pathname === "/matters" ? "bg-[#292928] text-[#f1efea]" : "text-foreground/80 hover:bg-white/10 hover:text-foreground"}`}
            >
              <FolderKanban className="size-4" strokeWidth={1.75} />
              Cases &amp; Matters
            </Link>
            <Link
              href="/artifacts"
              className={`flex h-8 items-center gap-3 rounded-lg px-2 text-[14px] transition-colors ${pathname === "/artifacts" ? "bg-[#292928] text-[#f1efea]" : "text-foreground/80 hover:bg-white/10 hover:text-foreground"}`}
            >
              <Boxes className="size-4" strokeWidth={1.75} />
              Artifacts
            </Link>
            <Link
              href="/customize"
              className={`flex h-8 items-center gap-3 rounded-lg px-2 text-[14px] transition-colors ${pathname === "/customize" ? "bg-[#292928] text-[#f1efea]" : "text-foreground/80 hover:bg-white/10 hover:text-foreground"}`}
            >
              <SlidersHorizontal className="size-4" strokeWidth={1.75} />
              Customize
            </Link>
            <Link
              href="/settings/connectors"
              className={`flex h-8 items-center gap-3 rounded-lg px-2 text-[14px] transition-colors ${pathname === "/settings/connectors" ? "bg-[#292928] text-[#f1efea]" : "text-foreground/80 hover:bg-white/10 hover:text-foreground"}`}
            >
              <Link2 className="size-4" strokeWidth={1.75} />
              Connections
            </Link>
            <Link
              href="/settings/plugins"
              className={`flex h-8 items-center gap-3 rounded-lg px-2 text-[14px] transition-colors ${pathname === "/settings/plugins" ? "bg-[#292928] text-[#f1efea]" : "text-foreground/80 hover:bg-white/10 hover:text-foreground"}`}
            >
              <Puzzle className="size-4" strokeWidth={1.75} />
              Plugins
            </Link>
          </nav>

          {!q && matters.length > 0 && (
            <section className="mb-5 px-2">
              <div className="flex items-center justify-between px-2 pb-2 text-[13px] font-medium text-foreground/70">
                <span>Matters</span>
                <Link href="/matters" className="text-[11px] text-foreground/40 hover:text-foreground" aria-label="View all matters">View all</Link>
              </div>
              <div className="space-y-0.5">
                {matters.map((matter) => {
                  const expanded = expandedMatterIds.includes(matter.id);
                  const matterChats = conversations.filter((conversation) => conversation.matterId === matter.id).sort((a, b) => b.updatedAt - a.updatedAt);
                  return <div key={matter.id}>
                    <div className="group flex items-center rounded-lg hover:bg-white/10">
                      <button type="button" onClick={() => setExpandedMatterIds((current) => expanded ? current.filter((id) => id !== matter.id) : [...current, matter.id])} className="flex size-7 shrink-0 items-center justify-center text-foreground/45 hover:text-foreground" aria-label={`${expanded ? "Collapse" : "Expand"} ${matter.title}`}>
                        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </button>
                      <Link href={`/matters/${encodeURIComponent(matter.id)}`} className="min-w-0 flex-1 truncate py-1.5 pr-2 text-[13px] font-medium text-foreground/80 hover:text-foreground" title={matter.title}>
                        <span className="mr-2 inline-block size-1.5 rounded-full bg-brand/70 align-middle" />{matter.title}
                      </Link>
                      <span className="pr-2 text-[10px] text-foreground/35">{matterChats.length || ""}</span>
                    </div>
                    {expanded && matterChats.length > 0 && <div className="ml-3 border-l border-white/10 pl-3">
                      {matterChats.map((chat) => <Link key={chat.id} href={`${dotHref(chat.dotId, chat.id)}&matter=${encodeURIComponent(matter.id)}`} onClick={() => markRead(chat.dotId)} className={`block truncate rounded-md px-2 py-1.5 text-[13px] ${chat.id === activeConv ? "bg-[#292928] text-foreground" : "text-foreground/60 hover:bg-white/10 hover:text-foreground"}`} title={chat.title}>
                        <span className="mr-2 text-foreground/35">◦</span>{chat.title || "Untitled chat"}
                      </Link>)}
                    </div>}
                  </div>;
                })}
              </div>
            </section>
          )}

          {/* Recent chats */}
          {q && <div className="eyebrow shrink-0 px-4 pt-2 pb-1.5">Chats matching “{q}”</div>}
          {!q && <div className="px-3 pb-2 text-[13px] text-foreground/55">Chats</div>}
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
                      ? "bg-[#292928]"
                      : "hover:bg-white/10"
                  }`}
                >
                  <Link href={dotHref(d.id, c.id)} onClick={() => markRead(d.id)} className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2">
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
                      <span className="block truncate text-[13px] text-foreground/50">{archived ? "Archived" : line}</span>
                    </span>
                  </Link>
                  {/* Kebab → conversation options */}
                  <button
                    data-conv-trigger={c.id}
                    className={`absolute top-2 right-2 z-20 flex size-6 items-center justify-center rounded text-foreground/40 hover:bg-white/10 hover:text-foreground ${
                      menuOpen ? "flex text-foreground" : "hidden group-hover:flex"
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpenId(menuOpen ? null : c.id);
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
                      className={`absolute right-1 z-50 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#1f1f1e] py-1.5 text-[#f1efea] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.65)] animate-page-rise ${
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
                        icon={<FolderKanban className="size-4" strokeWidth={1.75} />}
                        label="Move to matter"
                        onClick={() => (setMovingId(c.id), setMenuOpenId(null))}
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
                  </div>
                  )}
                </div>
              );
            })}
            {loaded && !recent.length && (
              <p className="px-3 py-6 text-center text-caption text-foreground/45">
                {q ? "No chats match." : "No chats yet. Start a new chat to begin."}
              </p>
            )}
            {archivedCount > 0 && !q && (
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="mx-2 mb-2 flex w-[calc(100%-16px)] items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground"
              >
                <Archive className="size-3.5" strokeWidth={1.75} />
                {showArchived ? "Hide archived" : `Archived · ${archivedCount}`}
              </button>
            )}
          </nav>

          {movingId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => event.target === event.currentTarget && setMovingId(null)}>
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#252524] p-4 text-[#f1efea] shadow-2xl">
                <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-medium">Move chat to matter</h2><button type="button" onClick={() => setMovingId(null)} className="text-foreground/50 hover:text-foreground" aria-label="Close">×</button></div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  <button type="button" onClick={() => { const chat = conversations.find((item) => item.id === movingId); if (chat) moveToMatter(chat, null); }} className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-foreground/65 hover:bg-white/10 hover:text-foreground">No matter</button>
                  {matters.map((matter) => <button key={matter.id} type="button" onClick={() => { const chat = conversations.find((item) => item.id === movingId); if (chat) moveToMatter(chat, matter.id); }} className="w-full truncate rounded-lg px-3 py-2 text-left text-[13px] hover:bg-white/10">{matter.title}</button>)}
                </div>
              </div>
            </div>
          )}

          <div ref={profileRef} className="relative shrink-0 border-t border-[#302f2d] p-2">
            {profileOpen && (
              <div role="menu" aria-label="Account menu" className="absolute right-2 bottom-[68px] z-50 w-[264px] overflow-hidden rounded-xl border border-white/10 bg-[#252524] py-2 text-[#f1efea] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.65)] animate-page-rise">
                <div className="px-3 py-2.5">
                  <p className="truncate text-[13px] font-medium">{displayName}</p>
                  <p className="truncate pt-0.5 text-[12px] text-foreground/55">{user?.email || "Signed in to Soli"}</p>
                </div>
                <div className="mx-3 my-1 h-px bg-white/10" />
                <Link role="menuitem" href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2 text-[14px] hover:bg-white/10"><Settings className="size-4" />Settings</Link>
                <div role="menuitem" aria-disabled="true" className="flex items-center gap-3 px-3 py-2 text-[14px] text-foreground/60"><Palette className="size-4" />Appearance <span className="ml-auto text-[12px]">Dark</span></div>
                <div role="menuitem" aria-disabled="true" className="flex items-center gap-3 px-3 py-2 text-[14px] text-foreground/60"><Globe className="size-4" />Language <span className="ml-auto text-[12px]">English</span></div>
                <div role="menuitem" aria-disabled="true" className="flex items-center gap-3 px-3 py-2 text-[14px] text-foreground/60"><Keyboard className="size-4" />Keyboard shortcuts</div>
                <Link role="menuitem" href="/privacy" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2 text-[14px] hover:bg-white/10"><ShieldCheck className="size-4" />Privacy</Link>
                <div className="mx-3 my-1 h-px bg-white/10" />
                <LogoutButton className="flex w-full items-center gap-3 px-3 py-2 text-[14px] text-foreground/80 transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-40" icon={<LogOut className="size-4" />} />
              </div>
            )}
            <button type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/10">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#353534] text-[11px] font-semibold">{initials}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{displayName}</span><span className="block truncate text-[11px] text-foreground/50">{user?.role || "Account"}</span></span>
              <ChevronsUpDown className="size-4 text-foreground/55" />
            </button>
          </div>

          {/* Legacy utility links remain available for existing routes but are superseded by the account menu. */}
          <div className="hidden shrink-0 items-center gap-2 p-3">
            <Link
              href="/apps"
              className={`hidden h-10 flex-1 items-center justify-center gap-1.5 rounded-full border text-[13px] transition-colors ${pathname === "/apps" ? "border-foreground bg-card" : "border-white/10 hover:border-white/25"}`}
            >
              <LayoutGrid className="size-3.5" strokeWidth={1.5} /> Apps
            </Link>
            <Link
              href="/landing"
              className="hidden size-10 shrink-0 items-center justify-center rounded-full border border-white/10 transition-colors hover:border-white/25 text-foreground/70 hover:text-foreground"
              title="Product Tour & Overview"
              aria-label="Product Tour"
            >
              <Globe className="size-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/settings"
              className={`relative flex size-10 items-center justify-center rounded-full border transition-colors ${pathname === "/settings" ? "border-foreground bg-card" : "border-white/10 hover:border-white/25"}`}
              title={`Settings · ${connected ? "connected" : "reconnecting"}`}
              aria-label="Settings"
            >
              <Settings className="size-4" strokeWidth={1.5} />
              <span className={`absolute top-0.5 right-0.5 size-2 rounded-full ring-2 ring-background ${connected ? "bg-success" : "bg-foreground/25"}`} />
            </Link>
            <LogoutButton
              className="flex size-10 items-center justify-center rounded-full border border-white/10 text-foreground/70 transition-colors hover:border-white/25 hover:text-foreground disabled:opacity-40"
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
