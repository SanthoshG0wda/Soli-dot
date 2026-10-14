"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CAPABILITIES = [
  {
    title: "Supreme Court & High Court RAG",
    description: "Semantic retrieval across 5,200,000+ judgments (1950–2026) with verified AIR, SCC, and SCR citation accuracy.",
  },
  {
    title: "Multi-agent chamber collaboration",
    description: "4 specialized agents (Nyaya, Vakil, Pramaan, Docket) execute research, drafting, and docketing concurrently.",
  },
  {
    title: "Court-margin document synthesis",
    description: "Automatic 1.75\" left binding gutter, line numbering, High Court cause titles, and instant Word (.docx) export.",
  },
  {
    title: "Evidentiary contradiction matrix",
    description: "Audits witness depositions under Section 180 BNSS against initial FIR GD logs to isolate cross-examination traps.",
  },
  {
    title: "Section 531 BNSS transitional logic",
    description: "Automated savings-clause resolution ensures pre-July 2024 acts are charged under IPC/CrPC and new matters under BNS.",
  },
  {
    title: "Any model provider",
    description: "Supports Claude 3.7 Sonnet, GPT-4o, Gemini 2.5 Flash, or local offline sovereign LLMs running via Ollama.",
  },
  {
    title: "Isolated virtual sandboxes",
    description: "Each chamber instance runs in an isolated E2B micro-computer with headless Playwright for live e-Courts scraping.",
  },
  {
    title: "Any interface",
    description: "Available as a Web Chamber Studio, lightweight CLI (soli), and native desktop application.",
  },
];

export function WhatIsSoli() {
  return (
    <section id="what-is-soli" className="py-20 sm:py-28 border-b border-[#4a2b15]/15 bg-[#f4ead7] text-[#17100a]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl animate-landing-reveal">
          <div className="font-mono text-[11px] font-semibold tracking-widest text-[#9a5f22] uppercase">Legal OS, not a chatbot skin</div>
          <h2 className="mt-3 font-serif text-[32px] sm:text-[44px] font-normal tracking-tight text-[#17100a]">
            What is Soli?
          </h2>
          <p className="mt-3 text-[16px] sm:text-[18px] text-[#3c2d1f]/72 leading-relaxed">
            Soli is an autonomous legal operating system that helps advocates, chamber partners, and litigators research precedents, draft pleadings, and manage court dockets.
          </p>
        </div>

        <div className="landing-stagger mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAPABILITIES.map((item) => (
            <div key={item.title} className="motion-card flex items-start gap-3 rounded-xl border border-[#4a2b15]/10 bg-[#fffaf0] p-4 shadow-[0_18px_52px_-38px_rgba(74,43,21,0.55)]">
              <span className="font-mono text-[13px] text-[#b47728] select-none shrink-0 mt-0.5">
                [*]
              </span>
              <div className="text-[14px] leading-relaxed text-[#3c2d1f]/72">
                <strong className="text-[#17100a] font-semibold mr-2">
                  {item.title}
                </strong>
                <span>{item.description}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[#4a2b15]/12 flex items-center justify-between flex-wrap gap-4">
          <Link
            href="/docs"
            className="group inline-flex items-center gap-2 text-[14px] font-semibold text-[#9a5f22] hover:text-[#17100a] transition-colors"
          >
            <span>Read architectural whitepaper & court benchmarks</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
          <span className="font-mono text-[11px] text-[#3c2d1f]/48">
            Supreme Court of India e-Filing Practice Directions (2026) Compliant
          </span>
        </div>
      </div>
    </section>
  );
}
