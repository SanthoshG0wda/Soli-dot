"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, LockKeyhole, Search, Settings2, X } from "lucide-react";

type Connector = { slug: string; name: string; description: string; category: string; connected: boolean };
type ConnectorInput = Omit<Connector, "slug"> & { id?: string; slug?: string };
const categories = ["Email", "Calendar", "Documents & Storage", "Messaging", "e-Signature", "Meetings"];

export default function ConnectorsSettings() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [configured, setConfigured] = useState(false);
  const [tab, setTab] = useState<"connected" | "browse">("browse");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [selected, setSelected] = useState<Connector | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  const load = () => fetch("/api/backend/connectors", { cache: "no-store" }).then(async (response) => {
    const data = await response.json() as { configured?: boolean; connectors?: ConnectorInput[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load connectors.");
    setConfigured(Boolean(data.configured));
    setConnectors((data.connectors || []).map((connector): Connector => ({ ...connector, slug: connector.slug || connector.id || connector.name })));
  }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load connectors."));

  useEffect(() => { load(); }, []);
  const visible = useMemo(() => connectors.filter((connector) => {
    const matchesTab = tab === "browse" || connector.connected;
    const text = `${connector.name} ${connector.description}`.toLowerCase();
    return matchesTab && (!category || connector.category === category) && (!query || text.includes(query.toLowerCase()));
  }), [connectors, tab, category, query]);

  const connect = async (slug: string) => {
    setPending(slug); setError(null);
    try {
      const response = await fetch(`/api/backend/connectors/${slug}/connect`, { method: "POST" });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Could not start the connection.");
      window.location.assign(data.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start the connection."); setPending(null); }
  };

  const disconnect = async () => {
    if (!selected) return;
    setPending(selected.slug); setError(null);
    const response = await fetch(`/api/backend/connectors/${selected.slug}`, { method: "DELETE" });
    if (!response.ok) { setError("Could not disconnect this account."); setPending(null); return; }
    setSelected(null); setPending(null); load();
  };

  const saveKey = async () => {
    setSavingKey(true); setError(null);
    const response = await fetch("/api/backend/connectors/key", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }) });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setError(data.error || "Could not save your Composio key."); else { setApiKey(""); load(); }
    setSavingKey(false);
  };

  return <section className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10">
    <p className="text-sm text-[#db7a5c]">Settings</p>
    <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#f1efea]">Connectors</h1>
    <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground/60">Let Soli work with your email, calendar and documents. Connections are private to you.</p>
    {!configured && <div className="mt-6 rounded-xl border border-[#db7a5c]/30 bg-[#db7a5c]/10 p-4"><p className="text-sm">Add your Composio project key to connect external accounts. It is encrypted before storage.</p><div className="mt-3 flex gap-2"><input className="field flex-1" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ak_..." type="password" autoComplete="off" /><button className="rounded-lg bg-[#db7a5c] px-4 text-sm font-medium text-[#1f1f1e] disabled:opacity-50" disabled={!apiKey || savingKey} onClick={() => void saveKey()}>{savingKey ? "Saving…" : "Save key"}</button></div></div>}
    {error && <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    <div className="mt-8 flex flex-wrap items-center gap-3 border-b border-[#494843] pb-4"><div className="flex rounded-lg bg-[#292928] p-1"><button onClick={() => setTab("connected")} className={`rounded-md px-3 py-1.5 text-[13px] ${tab === "connected" ? "bg-[#353534]" : "text-foreground/55"}`}>Connected</button><button onClick={() => setTab("browse")} className={`rounded-md px-3 py-1.5 text-[13px] ${tab === "browse" ? "bg-[#353534]" : "text-foreground/55"}`}>Browse</button></div><label className="relative ml-auto min-w-[220px] flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/45" /><input className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search connectors" /></label></div>
    <div className="mt-4 flex flex-wrap gap-2">{categories.map((item) => <button key={item} onClick={() => setCategory(category === item ? null : item)} className={`rounded-full border px-3 py-1 text-[12px] ${category === item ? "border-[#db7a5c] bg-[#db7a5c]/10 text-[#f1efea]" : "border-[#494843] text-foreground/60"}`}>{item}</button>)}</div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map((connector) => <article key={connector.slug} className="rounded-xl border border-[#494843] bg-[#292928] p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[15px] font-medium">{connector.name}</h2><p className="mt-1 text-[13px] leading-relaxed text-foreground/55">{connector.description}</p></div>{connector.connected && <span className="flex items-center gap-1 text-[11px] text-emerald-400"><Check className="size-3.5" />Connected</span>}</div><button disabled={!configured || pending === connector.slug} onClick={() => connector.connected ? setSelected(connector) : void connect(connector.slug)} className="mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#494843] text-[13px] font-medium hover:border-[#db7a5c] disabled:opacity-50">{pending === connector.slug ? <LoaderCircle className="size-4 animate-spin" /> : connector.connected ? <><Settings2 className="size-4" />Configure</> : "Connect"}</button></article>)}</div>
    {!visible.length && <div className="mt-10 rounded-xl border border-dashed border-[#494843] py-12 text-center text-sm text-foreground/55">No connectors match your selection.</div>}
    {selected && <aside role="dialog" aria-modal="true" aria-label={`Configure ${selected.name}`} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[#494843] bg-[#1f1f1e] p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl">{selected.name}</h2><button className="rounded-md p-2 text-foreground/60 hover:bg-white/10" onClick={() => setSelected(null)} aria-label="Close"><X className="size-5" /></button></div><p className="mt-3 text-sm leading-relaxed text-foreground/60">This account is connected privately to you. Tool permissions will be available before any external action is enabled.</p><div className="mt-auto border-t border-[#494843] pt-5"><button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-400/40 text-[13px] text-red-200 hover:bg-red-400/10" disabled={pending === selected.slug} onClick={() => void disconnect()}>{pending === selected.slug ? <LoaderCircle className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}Disconnect</button></div></aside>}
  </section>;
}
