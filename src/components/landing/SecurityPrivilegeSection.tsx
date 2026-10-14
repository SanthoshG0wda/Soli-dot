"use client";

import { Check, Database, EyeOff, Lock } from "lucide-react";

export function SecurityPrivilegeSection() {
  return (
    <section id="security" className="relative py-20 sm:py-28 border-t border-white/[0.08] bg-[#09090d]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-0.5 font-mono text-[11px] font-medium text-amber-400 uppercase tracking-widest">
            Privilege & Governance
          </div>
          <h2 className="mt-4 font-serif text-[34px] sm:text-[46px] font-normal tracking-tight text-white">
            Advocate-client privilege, preserved by design.
          </h2>
          <p className="mt-3 text-[15px] sm:text-[17px] text-zinc-400">
            Confidentiality is not an afterthought in legal practice—it is statutory law under Section 132 & 134 of the Bharatiya Sakshya Adhiniyam, 2023.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-7 flex flex-col justify-between">
            <div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <EyeOff className="size-5" />
              </div>
              <h3 className="mt-5 text-[18px] font-medium text-white">
                Zero Model Training Guarantee
              </h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-400">
                Your firm&apos;s briefs, evidence PDFs, strategy notes, and draft petitions are strictly processed statelessly. They are never retained or used to fine-tune third-party LLMs.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[12px] font-mono text-amber-400/90">
              <Check className="size-3.5 text-amber-400" />
              <span>Contractual Zero-Retention</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-7 flex flex-col justify-between">
            <div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Database className="size-5" />
              </div>
              <h3 className="mt-5 text-[18px] font-medium text-white">
                Isolated Matter Vector Vaults
              </h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-400">
                Client files are partitioned into cryptographically isolated Qdrant vector collections. Matters never cross-contaminate and search queries are constrained strictly to the active case.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[12px] font-mono text-amber-400/90">
              <Check className="size-3.5 text-amber-400" />
              <span>Dedicated Collection Siloing</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#111116] p-7 flex flex-col justify-between">
            <div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Lock className="size-5" />
              </div>
              <h3 className="mt-5 text-[18px] font-medium text-white">
                End-to-End Enterprise Vaulting
              </h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-400">
                AES-256 data encryption at rest with local key vaulting (`vault.key`), TLS 1.3 transit encryption, and optional on-premise model execution via private endpoints.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[12px] font-mono text-amber-400/90">
              <Check className="size-3.5 text-amber-400" />
              <span>Local Encryption Vault</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
