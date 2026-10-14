"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Gavel, Search, ShieldCheck } from "lucide-react";
import { LEGAL_PERSONAS } from "@/lib/personas";

export function PersonaShowcase() {
  const [selectedId, setSelectedId] = useState<string>("nyaya");

  const persona = LEGAL_PERSONAS.find((p) => p.id === selectedId) || LEGAL_PERSONAS[0];

  return (
    <section id="personas" className="py-20 sm:py-28 border-b border-white/10 bg-[#0d0c0a] text-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="max-w-3xl animate-landing-reveal">
          <div className="font-mono text-[11px] font-semibold tracking-widest text-[#ffd98a] uppercase">
            Chamber Architecture
          </div>
          <h2 className="mt-3 font-serif text-[32px] sm:text-[44px] font-normal tracking-tight text-white">
            Four specialized agents, not generic conversationalists.
          </h2>
          <p className="mt-3 text-[15px] sm:text-[17px] text-white/62 leading-relaxed">
            Legal practice requires distinct mindsets. Research is deliberate; courtroom drafting is formal; evidentiary audit is skeptical; docketing is procedural.
          </p>
        </div>

        {/* Persona Selector Tabs - Clean Minimalist Segment */}
        <div className="landing-stagger mt-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {LEGAL_PERSONAS.map((p) => {
            const isSelected = p.id === selectedId;
            const Icon = p.id === "nyaya" ? Search : p.id === "vakil" ? Gavel : p.id === "pramaan" ? ShieldCheck : Clock;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#d9a441]/30 bg-white/10 text-white shadow-xs"
                    : "border-white/10 bg-white/[0.04] text-white/55 hover:text-white hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`size-4 ${isSelected ? "text-[#ffd98a]" : "text-white/35"}`} />
                  <span className="font-mono text-[10px] text-white/45 uppercase">
                    Agent 0{p.id === "nyaya" ? 1 : p.id === "vakil" ? 2 : p.id === "pramaan" ? 3 : 4}
                  </span>
                </div>
                <div className="mt-3 font-serif text-[17px] font-medium text-white">{p.name}</div>
                <div className="mt-0.5 text-[11.5px] font-mono text-white/55">{p.role}</div>
              </button>
            );
          })}
        </div>

        {/* Agent Dossier Container */}
        <div className="animate-landing-reveal mt-6 rounded-2xl border border-white/12 bg-[#151313] p-6 sm:p-8 shadow-[0_30px_100px_-48px_rgba(0,0,0,0.95)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Role Details */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-serif text-[26px] font-normal text-white">{persona.name}</span>
                  <span className="font-mono text-[10px] text-[#ffd98a] bg-[#d9a441]/10 border border-[#d9a441]/20 px-2 py-0.5 rounded">
                    {persona.role}
                  </span>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/66">
                  {persona.purpose}
                </p>
              </div>

              {/* Courtroom Capabilities */}
              <div className="space-y-2.5 pt-4 border-t border-white/10">
                <div className="font-mono text-[11px] text-white/45 uppercase tracking-wider">
                  Mandatory Competencies
                </div>
                {persona.id === "nyaya" && (
                  <ul className="space-y-2 text-[12.5px] text-white/66">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Extracts binding <b>Ratio Decidendi</b> vs non-binding <i>Obiter Dicta</i>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Comparative concordances: <b>IPC 1860 vs BNS 2023</b> & <b>CrPC 1973 vs BNSS 2023</b>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Zero hallucination policy: cites verified Indian reporters (SCC, AIR, SCR).</span>
                    </li>
                  </ul>
                )}

                {persona.id === "vakil" && (
                  <ul className="space-y-2 text-[12.5px] text-white/66">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Compiles High Court Cause Titles, Memo of Parties, and verification clauses.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Bail under <b>Section 483 BNSS</b> framed under <i>Satender Kumar Antil</i> rules.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Section 528 BNSS quashing matching <i>State of Haryana v. Bhajan Lal</i> tests.</span>
                    </li>
                  </ul>
                )}

                {persona.id === "pramaan" && (
                  <ul className="space-y-2 text-[12.5px] text-white/66">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Chronological timeline extraction across multi-thousand page case bundles.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Isolates discrepancies between FIR allegations and <b>Section 180 BNSS</b> statements.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Validates electronic records under <b>Section 63 BSA 2023</b> criteria.</span>
                    </li>
                  </ul>
                )}

                {persona.id === "docket" && (
                  <ul className="space-y-2 text-[12.5px] text-white/66">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Generates Next Date of Hearing (NDH) sheets with Bench Coram & Item No.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Computes statutory limitation windows (Sec 138 NI Act, Default Bail).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 text-[10px] mt-0.5">›</span>
                      <span>Condenses 500-page paper-books into 2-page Senior Counsel arguing notes.</span>
                    </li>
                  </ul>
                )}
              </div>

              <div className="pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#ffd98a] hover:text-white transition-colors"
                >
                  <span>Open chamber session with {persona.name}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Right: Live Prompt Templates */}
            <div className="lg:col-span-7 bg-white/[0.045] rounded-xl border border-white/10 p-5 space-y-3">
              <div className="flex items-center justify-between font-mono text-[11px] text-white/45 uppercase">
                <span>Standard Chamber Templates for {persona.name}</span>
                <span>Ready to execute</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {persona.suggestions.map((s, idx) => (
                  <div
                    key={s.id}
                    className="motion-card rounded-lg border border-white/10 bg-black/20 p-3 text-left hover:border-[#d9a441]/24 transition-colors"
                  >
                    <div className="font-mono text-[10px] text-white/45">0{idx + 1}</div>
                    <div className="mt-1 text-[13px] font-medium text-white">
                      {s.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/50 line-clamp-1">
                      {s.subtitle}
                    </div>
                    <div className="mt-2 text-[10.5px] font-mono text-white/55 line-clamp-2 bg-black/25 p-1.5 rounded-sm">
                      {s.template}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
