"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Clock, FileText, Scale, Search, ShieldCheck, Sparkles } from "lucide-react";
import { startConversation } from "@/app/actions";
import { markRead, useStore } from "@/lib/store";
import { DEFAULT_LOOK } from "@/lib/look";
import { type SuggestionDef } from "@/lib/suggestions";
import { getPersonaByName, getSuggestionsForDot } from "@/lib/personas";
import Dot3DLazy from "./Dot3DLazy";
import DotOrb from "./DotOrb";

function resolveSuggestionIcon(id: string, index: number) {
  if (id.includes("bail") || id.includes("vakil-1")) return Scale;
  if (id.includes("notice") || id.includes("vakil-2") || id.includes("docket-1") || id.includes("docket-4")) return FileText;
  if (id.includes("preserve") || id.includes("pramaan") || id.includes("audit")) return ShieldCheck;
  if (id.includes("research") || id.includes("nyaya")) return Search;
  if (id.includes("limitation") || id.includes("docket-2")) return Clock;
  const defaults = [Scale, FileText, Search, Sparkles];
  return defaults[index % defaults.length];
}

export default function Home() {
  const router = useRouter();
  const dots = useStore((s) => s.dots);
  const loaded = useStore((s) => s.loaded);
  const [picked, setPicked] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  if (loaded && !dots.length) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="rails mx-auto flex min-h-full max-w-[880px] flex-col items-center justify-center px-4 sm:px-8 py-16 text-center">
          <div className="dot-grid rounded-full">
            <Dot3DLazy look={DEFAULT_LOOK} size={240} stage />
          </div>
          <div className="eyebrow mt-6 text-brand-readable/80">Personal agents</div>
          <h1 className="text-display mt-3">Meet your dots</h1>
          <p className="text-body-lg mt-4 max-w-[520px] text-foreground/60">
            Dots work on their own. Each one has its own computer and browser, remembers what matters, runs routines on a schedule, and knows when to ask for your approval.
          </p>
          <Link href="/new" className="btn-primary mt-8 h-10 px-5 text-[15px]">
            Create your first dot
          </Link>
        </div>
      </div>
    );
  }

  const target = dots.find((d) => d.id === picked) ?? dots[0];
  const targetPersona = getPersonaByName(target?.name);
  const targetSuggestions = getSuggestionsForDot(target);

  /** Cards fill the input (ChatGPT-style) — the user edits, then sends. */
  const pickSuggestion = (s: SuggestionDef) => {
    if (!target) return;
    const t = s.template;
    setText(t);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(t.length, t.length);
      }
    });
  };

  const submit = () => {
    const value = text.trim();
    if (!value || !target) return;
    setText("");
    start(async () => {
      const convId = await startConversation(target.id, value);
      markRead(target.id);
      router.push(`/dots/${target.id}?c=${convId}`);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="rails mx-auto min-h-full max-w-[880px] px-4 sm:px-8 pb-16">
        <section className="flex flex-col items-center pt-12 pb-8 text-center sm:pt-16">
          {target && <DotOrb look={target.look} status={target.status} size={44} />}
          {targetPersona && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-brand-readable uppercase">
              {targetPersona.role}
            </div>
          )}
          <h1 className="mt-2 max-w-[560px] font-serif text-[34px] leading-[1.18] font-normal tracking-[-0.02em] text-balance sm:text-[44px]">
            What can I help with?
          </h1>
          <p className="mt-3 max-w-[480px] text-[15px] leading-relaxed text-foreground/55">
            {target ? (target.purpose || `Ask ${target.name} to research, draft, or review — with cited sources.`) : "Your legal AI teammate with cited sources."}
          </p>

          {/* Dot picker — ChatGPT-style model pills */}
          {dots.length > 1 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
              {dots.map((d) => {
                const p = getPersonaByName(d.name);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setPicked(d.id)}
                    className={`flex h-8 items-center gap-1.5 rounded-full border pr-3 pl-1.5 text-[13px] transition-colors ${d.id === target?.id ? "border-foreground bg-foreground text-card" : "border-black/10 bg-card text-foreground/60 hover:border-black/20 hover:text-foreground"}`}
                  >
                    <DotOrb look={d.look} status={d.status} size={20} />
                    <span className="font-medium">{d.name}</span>
                    {p && (
                      <span className={`text-[11px] ${d.id === target?.id ? "text-card/75" : "text-foreground/40"}`}>
                        · {p.name}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-5 w-full max-w-[680px] text-left">
            <div className="rounded-[28px] border border-black/10 bg-card px-4 pt-3 pb-2 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.15)] transition-shadow focus-within:border-black/20 focus-within:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.2)]">
              <textarea
                ref={inputRef}
                autoFocus
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={target ? `Message ${target.name}…` : "Loading…"}
                className="max-h-60 min-h-[48px] w-full resize-none bg-transparent px-1 py-2 text-[16px] leading-[1.5] tracking-default outline-none [field-sizing:content] placeholder:text-foreground/35"
              />
              <div className="flex items-center gap-2 pb-1">
                <span className="ml-1 hidden items-center gap-1.5 text-[12px] text-foreground/40 sm:flex">
                  <DotOrb look={target?.look ?? DEFAULT_LOOK} size={16} />
                  {target?.name ?? "Loading…"} will work on its own
                </span>
                <button
                  className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-card transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-foreground/30"
                  disabled={pending || !text.trim()}
                  onClick={submit}
                  aria-label="Send"
                >
                  <ArrowUp className="size-4" strokeWidth={2.25} />
                </button>
              </div>
            </div>

            {/* Persona-specific suggestion cards */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {targetSuggestions.map((s, idx) => {
                const Icon = resolveSuggestionIcon(s.id, idx);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    disabled={pending || !target}
                    className="group flex items-start gap-3 rounded-2xl border border-black/[0.08] bg-card px-4 py-3 text-left transition-all hover:border-black/20 hover:bg-popover hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] disabled:opacity-50"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-readable">
                      <Icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium">{s.title}</span>
                      <span className="block truncate text-[12px] text-foreground/50">{s.subtitle}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
