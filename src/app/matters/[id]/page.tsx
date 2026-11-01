"use client";

import Link from "next/link";
import { Archive, ArrowLeft, FolderKanban, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createMatterChat, deleteConversation, listMatterConversations, listMatters, moveConversationToMatter } from "@/app/actions";
import type { Conversation, Matter } from "@/lib/types";
import { deleteConversationLocally, updateConversationMatterLocally, useStore } from "@/lib/store";

export default function MatterWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const [matterId, setMatterId] = useState("");
  const [matter, setMatter] = useState<Matter | null>(null);
  const [allMatters, setAllMatters] = useState<Matter[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [creating, setCreating] = useState(false);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [movingId, setMovingId] = useState<string | null>(null);
  const firstDot = useStore((state) => state.dots[0]);

  useEffect(() => {
    void params.then(({ id }) => {
      setMatterId(id);
      void Promise.all([listMatters(), listMatterConversations(id)]).then(([matters, chats]) => {
        setAllMatters(matters);
        setMatter(matters.find((item) => item.id === id) || null);
        setConversations(chats);
      });
      try {
        const raw = localStorage.getItem("soli:archived");
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setArchivedIds(parsed.filter((item): item is string => typeof item === "string"));
      } catch { /* private mode */ }
    });
  }, [params]);

  async function newChat() {
    if (!matterId || !firstDot || creating) return;
    setCreating(true);
    const conversation = await createMatterChat(matterId, firstDot.id);
    window.location.href = `/vakil/${firstDot.id}?c=${encodeURIComponent(conversation.id)}&matter=${encodeURIComponent(matterId)}`;
  }

  function toggleArchive(id: string) {
    const next = archivedIds.includes(id) ? archivedIds.filter((item) => item !== id) : [...archivedIds, id];
    setArchivedIds(next);
    localStorage.setItem("soli:archived", JSON.stringify(next));
  }

  async function removeChat(conversation: Conversation) {
    if (!window.confirm(`Delete “${conversation.title || "Untitled chat"}”?`)) return;
    await deleteConversation(conversation.id);
    deleteConversationLocally(conversation.id);
    setConversations((current) => current.filter((item) => item.id !== conversation.id));
  }

  async function moveChat(conversation: Conversation, targetMatterId: string | null) {
    await moveConversationToMatter(conversation.id, targetMatterId);
    updateConversationMatterLocally(conversation.id, targetMatterId);
    setMovingId(null);
    if (targetMatterId !== matterId) setConversations((current) => current.filter((item) => item.id !== conversation.id));
  }

  if (!matter) return <main className="mx-auto max-w-5xl px-5 py-12 text-foreground/60">Loading matter workspace…</main>;

  return <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
    <Link href="/matters" className="inline-flex items-center gap-2 text-[13px] text-foreground/55 hover:text-foreground"><ArrowLeft className="size-4" />All matters</Link>
    <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-[11px] tracking-[0.14em] text-brand uppercase">Matter workspace</p><h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-foreground">{matter.title}</h1><p className="mt-2 text-[14px] text-foreground/55">{matter.client || "No client recorded"} · {matter.court || "Court not recorded"}</p></div><button type="button" onClick={() => void newChat()} disabled={!firstDot || creating} className="btn-primary inline-flex h-10 items-center justify-center gap-2 px-4 text-[13px]"><Plus className="size-4" />{creating ? "Creating…" : "New chat"}</button></div>
    <section className="mt-10"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl">Chats in this matter</h2><span className="text-[12px] text-foreground/45">{conversations.length} {conversations.length === 1 ? "chat" : "chats"}</span></div>
      {conversations.length === 0 ? <div className="surface mt-5 flex min-h-52 flex-col items-center justify-center px-6 text-center"><MessageSquare className="size-6 text-brand" /><p className="mt-4 font-serif text-xl">Start the first matter chat</p><p className="mt-2 text-[13px] text-foreground/50">Keep research, drafting, and follow-up conversations together here.</p><button type="button" onClick={() => void newChat()} className="btn-secondary mt-5 h-9 px-4 text-[13px]">Create chat</button></div> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{conversations.map((conversation) => <article key={conversation.id} className="surface p-5 transition-colors hover:border-brand/40"><Link href={`/vakil/${conversation.dotId}?c=${encodeURIComponent(conversation.id)}&matter=${encodeURIComponent(matter.id)}`} className="block"><div className="flex items-start justify-between gap-3"><p className="font-serif text-lg text-foreground">{conversation.title || "Untitled chat"}</p><MessageSquare className="size-4 shrink-0 text-brand" /></div><p className="mt-3 text-[12px] text-foreground/45">Updated {new Date(conversation.updatedAt).toLocaleString()}</p></Link><div className="mt-4 flex items-center gap-1 border-t border-white/10 pt-3"><button type="button" onClick={() => toggleArchive(conversation.id)} className="btn-quiet inline-flex h-8 items-center gap-1.5 px-2 text-[12px]" title={archivedIds.includes(conversation.id) ? "Unarchive" : "Archive"}><Archive className="size-3.5" />{archivedIds.includes(conversation.id) ? "Unarchive" : "Archive"}</button><button type="button" onClick={() => setMovingId(conversation.id)} className="btn-quiet inline-flex h-8 items-center gap-1.5 px-2 text-[12px]" title="Move to another matter"><FolderKanban className="size-3.5" />Move</button><button type="button" onClick={() => void removeChat(conversation)} className="btn-quiet ml-auto inline-flex h-8 items-center gap-1.5 px-2 text-[12px] text-red-300 hover:text-red-200" title="Delete chat"><Trash2 className="size-3.5" />Delete</button></div></article>)}</div>}
    </section>
    {movingId && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && setMovingId(null)}><div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#252524] p-4 shadow-2xl"><h2 className="font-serif text-xl">Move chat to matter</h2><div className="mt-4 space-y-1">{allMatters.filter((item) => item.id !== matterId).map((item) => <button key={item.id} type="button" onClick={() => { const chat = conversations.find((conversation) => conversation.id === movingId); if (chat) void moveChat(chat, item.id); }} className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-white/10">{item.title}</button>)}<button type="button" onClick={() => { const chat = conversations.find((conversation) => conversation.id === movingId); if (chat) void moveChat(chat, null); }} className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-foreground/60 hover:bg-white/10">Remove from matter</button></div></div></div>}
  </main>;
}
