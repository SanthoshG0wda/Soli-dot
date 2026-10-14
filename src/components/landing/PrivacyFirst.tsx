"use client";

import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

export function PrivacyFirst() {
  return (
    <section id="privacy" className="relative py-16 sm:py-24 border-t border-white/10 bg-[#0d0c0a] text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="animate-landing-reveal rounded-2xl border border-white/12 bg-[#151313] p-8 sm:p-12 relative overflow-hidden shadow-[0_30px_100px_-48px_rgba(0,0,0,0.95)]">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[#ffd98a] font-mono text-[12px] uppercase tracking-wider">
              <Lock className="size-3.5" />
              <span>Section 126 IEA / Section 132 BSA Privileged</span>
            </div>
            <h2 className="mt-3 font-serif text-[30px] sm:text-[40px] font-normal tracking-tight text-white">
              Built for client-advocate privilege first
            </h2>
            <div className="mt-4 flex items-start gap-3">
              <span className="font-mono text-[13px] text-amber-400 select-none mt-0.5">
                [*]
              </span>
              <p className="text-[15px] sm:text-[17px] text-white/64 leading-relaxed">
                Soli enforces strict zero-retention architectures. We do not store, log, or train foundational models on your case briefs, witness depositions, client communications, or confidential chamber files. Your legal workspace operates in an isolated enclave with optional local on-premise inference.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/docs#security"
                className="motion-card group inline-flex items-center gap-2 rounded-md border border-[#d9a441]/25 bg-[#d9a441]/10 px-4 py-2 text-[13px] font-medium text-[#ffd98a] hover:bg-[#d9a441]/16 transition-all"
              >
                <span>Read Privilege & Compliance Architecture</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="font-mono text-[12px] text-white/45">
                SOC-2 Type II · ISO 27001 · India DPDP Act 2023 Compliant
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
