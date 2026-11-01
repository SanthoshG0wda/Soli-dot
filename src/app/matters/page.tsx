"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BriefcaseBusiness, CalendarDays, FileText, MessageSquare, Plus, Search, Users, X } from "lucide-react";
import { createMatter as createMatterAction, listMatters } from "@/app/actions";
import type { Matter } from "@/lib/types";
import { useStore } from "@/lib/store";

type MatterStatus = "Active" | "On hold" | "Closed";
const statuses: Array<"All" | MatterStatus> = ["All", "Active", "On hold", "Closed"];

export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [showForm, setShowForm] = useState(false);
  const conversations = useStore((state) => state.conversations);

  useEffect(() => { void listMatters().then(setMatters).catch(() => setMatters([])); }, []);

  const visibleMatters = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return matters.filter((matter) => (status === "All" || matter.status === status) && (!needle || [matter.title, matter.client, matter.court].some((value) => value.toLowerCase().includes(needle))));
  }, [matters, query, status]);

  async function createMatter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const matter = await createMatterAction({
      title: String(form.get("title") || "Untitled matter").trim(),
      client: String(form.get("client") || "").trim(),
      court: String(form.get("court") || "").trim(),
      nextDate: String(form.get("nextDate") || "").trim(),
      notes: String(form.get("notes") || "").trim(),
    });
    setMatters((current) => [matter, ...current]);
    setShowForm(false);
    event.currentTarget.reset();
  }

  const count = (value: MatterStatus) => matters.filter((matter) => matter.status === value).length;

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-[11px] tracking-[0.14em] text-[#db7a5c] uppercase">Workspace</p><h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#f1efea] sm:text-5xl">Cases &amp; Matters</h1><p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground/60">Keep each client matter’s research, documents, conversations, and next steps together.</p></div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary inline-flex h-10 shrink-0 items-center justify-center gap-2 px-4 text-[13px]"><Plus className="size-4" /> New matter</button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">{(["Active", "On hold", "Closed"] as MatterStatus[]).map((item) => <div key={item} className="surface flex items-center justify-between p-4"><span className="text-[13px] text-foreground/60">{item} matters</span><span className="font-serif text-2xl text-foreground">{count(item)}</span></div>)}</div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/35" /><input className="field h-10 w-full bg-card pl-9 text-[13px]" placeholder="Search matters, clients, courts" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="flex gap-1 rounded-lg border border-white/10 bg-card p-1">{statuses.map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-md px-3 py-1.5 text-[12px] transition-colors ${status === item ? "bg-foreground text-card" : "text-foreground/55 hover:text-foreground"}`}>{item}</button>)}</div></div>

      {visibleMatters.length === 0 ? <div className="surface mt-8 flex min-h-72 flex-col items-center justify-center px-6 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand"><BriefcaseBusiness className="size-6" /></span><h2 className="mt-5 font-serif text-2xl tracking-[-0.03em]">{matters.length ? "No matching matters" : "Start with your first matter"}</h2><p className="mt-2 max-w-md text-[14px] leading-relaxed text-foreground/55">{matters.length ? "Try another search or status filter." : "Create a matter to give your legal research, documents, and conversations a home."}</p>{!matters.length && <button type="button" onClick={() => setShowForm(true)} className="btn-secondary mt-5 h-9 px-4 text-[13px]">Create matter</button>}</div> : <div className="mt-8 grid gap-3 lg:grid-cols-2">{visibleMatters.map((matter) => <Link key={matter.id} href={`/matters/${encodeURIComponent(matter.id)}`} className="surface block p-5 transition-colors hover:border-brand/40"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate font-serif text-xl text-foreground">{matter.title}</p><p className="mt-1 flex items-center gap-1.5 text-[13px] text-foreground/55"><Users className="size-3.5" />{matter.client || "No client recorded"}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${matter.status === "Active" ? "bg-emerald-500/10 text-emerald-300" : matter.status === "Closed" ? "bg-white/10 text-foreground/50" : "bg-amber-500/10 text-amber-300"}`}>{matter.status}</span></div><p className="mt-4 text-[13px] text-foreground/55">{matter.court || "Court not recorded"}</p><div className="mt-5 flex flex-wrap gap-3 border-t border-white/10 pt-4 text-[12px] text-foreground/50"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{matter.nextDate ? `Next date ${matter.nextDate}` : "No next date"}</span><span className="inline-flex items-center gap-1.5"><MessageSquare className="size-3.5" />{conversations.filter((conversation) => conversation.matterId === matter.id).length} chats</span><span className="inline-flex items-center gap-1.5 text-brand"><MessageSquare className="size-3.5" />Open workspace</span><span className="inline-flex items-center gap-1.5"><FileText className="size-3.5" />Documents</span></div></Link>)}</div>}

      {showForm && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowForm(false)}><form onSubmit={createMatter} className="surface w-full max-w-lg p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="font-mono text-[11px] tracking-[0.14em] text-brand uppercase">New workspace</p><h2 className="mt-2 font-serif text-2xl">Create a matter</h2></div><button type="button" onClick={() => setShowForm(false)} className="btn-quiet size-8 p-0" aria-label="Close"><X className="size-4" /></button></div><div className="mt-6 grid gap-4"><label className="text-[12px] text-foreground/65">Matter name<input required name="title" className="field mt-1.5 h-10 w-full" placeholder="ABC Industries v. Rao" /></label><label className="text-[12px] text-foreground/65">Client<input name="client" className="field mt-1.5 h-10 w-full" placeholder="Client or firm name" /></label><label className="text-[12px] text-foreground/65">Court / forum<input name="court" className="field mt-1.5 h-10 w-full" placeholder="High Court of Karnataka" /></label><label className="text-[12px] text-foreground/65">Next date<input name="nextDate" type="date" className="field mt-1.5 h-10 w-full" /></label><label className="text-[12px] text-foreground/65">Notes<textarea name="notes" className="field mt-1.5 min-h-20 w-full py-2" placeholder="Short matter summary" /></label></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="btn-quiet h-9 px-3 text-[13px]">Cancel</button><button type="submit" className="btn-primary h-9 px-4 text-[13px]">Create matter</button></div></form></div>}
    </section>
  );
}
