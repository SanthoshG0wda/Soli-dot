"use client";

import { Download, Layers, Lock, ShieldCheck, Terminal, Users } from "lucide-react";

const FEATURES = [
  {
    icon: Download,
    title: "Direct Court-Margin PDF & DOCX Export",
    description: "Every drafted pleading, notice, or bail petition outputs with strict High Court cause titles, memo of parties, prayer clauses, and formal verifications. Ready to print, sign, and e-file.",
  },
  {
    icon: Lock,
    title: "Mandatory Human-in-the-Loop Approval Gates",
    description: "Low-stakes research runs autonomously. Irreversible actions—like transmitting emails, filing petitions, or client communications—strictly require explicit advocate approval before execution.",
  },
  {
    icon: Terminal,
    title: "Isolated Virtual Computers & Sandbox Browsers",
    description: "Each agent runs inside its own isolated E2B virtual computer with shell access and headless Playwright browser to inspect e-Courts status, scrape daily cause lists, and download official orders.",
  },
  {
    icon: Users,
    title: "Multi-Agent Delegation & Chamber Coordination",
    description: "Agents collaborate: Docket can orchestrate a matter by delegating precedent research to Nyaya, petition drafting to Vakil, and document contradiction auditing to Pramaan.",
  },
  {
    icon: Layers,
    title: "BNS, BNSS & BSA Transitional Logic",
    description: "Explicitly resolves Section 531 BNSS repeal and savings clauses, ensuring pre-July 2024 offences are charged under IPC/CrPC while new matters comply strictly with the Sanhita codes.",
  },
  {
    icon: ShieldCheck,
    title: "Zero Hallucination Verification Engine",
    description: "Statutory provisions and Supreme Court citations are grounded directly in your Qdrant vector corpus. The system refuses to invent case names, bench strengths, or non-existent subsections.",
  },
];

export function CourtEngineFeatures() {
  return (
    <section id="court-engine" className="relative py-20 sm:py-28 border-t border-white/[0.08] bg-[#09090c]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-0.5 font-mono text-[11px] font-medium text-amber-400 uppercase tracking-widest">
            Court Engine Capabilities
          </div>
          <h2 className="mt-4 font-serif text-[34px] sm:text-[46px] font-normal tracking-tight text-white">
            Built from the ground up for active litigation.
          </h2>
          <p className="mt-3 text-[15px] sm:text-[17px] text-zinc-400">
            A specialized operating system combining sovereign legal RAG, court-formatted document synthesis, and sandboxed browser autonomy.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-white/[0.08] bg-[#111116] p-6 hover:border-amber-500/30 hover:bg-[#14141c] transition-all group"
              >
                <div className="flex size-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-[16px] font-medium text-white group-hover:text-amber-200 transition-colors">
                  {f.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
