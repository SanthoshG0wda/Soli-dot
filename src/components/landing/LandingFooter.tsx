"use client";

import Link from "next/link";
import { ArrowRight, Scale } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#090806] text-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="animate-landing-reveal relative overflow-hidden rounded-2xl border border-white/12 bg-[#151313] p-8 sm:p-12 lg:p-16 text-center shadow-[0_34px_120px_-48px_rgba(0,0,0,0.96)]">
          <h2 className="font-serif text-[32px] sm:text-[46px] font-normal tracking-tight text-white max-w-2xl mx-auto">
            Ready to accelerate your chamber practice?
          </h2>
          <p className="mt-4 text-[15px] sm:text-[17px] text-white/62 max-w-xl mx-auto">
            Experience court-margin drafting, precedent extraction, and evidentiary scrutiny tailored for the Supreme Court, High Courts, and District Courts of India.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/signup"
              className="motion-card group inline-flex h-11 items-center gap-2 rounded-md bg-[#d9a441] px-6 text-[14px] font-semibold text-[#17100a] hover:bg-[#f0c36b] transition-all"
            >
              <span>Launch Chamber Free</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="motion-card inline-flex h-11 items-center px-5 text-[14px] font-medium text-white/70 hover:text-white rounded-md border border-white/12 hover:border-white/24 transition-colors"
            >
              Sign In to Existing Chamber
            </Link>
          </div>
        </div>

        {/* Links Grid */}
        <div className="landing-stagger mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-white/10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-[#d9a441]/15 text-[#ffd98a] border border-[#d9a441]/25">
                <Scale className="size-3.5" />
              </div>
              <span className="font-serif text-[16px] font-semibold text-white">Soli</span>
            </div>
            <p className="text-[12px] leading-relaxed text-white/50">
              The autonomous AI legal operating system for Indian advocates, chambers, and law firms.
            </p>
            {/* OpenCode Live Status Indicator */}
            <div className="flex items-center gap-2 font-mono text-[11px] text-white/55 pt-1">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Corpus v2026.4 Active</span>
            </div>
          </div>

          <div>
            <h4 className="font-mono text-[11px] font-semibold text-white/72 uppercase tracking-wider">Agents</h4>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li><a href="#personas" className="hover:text-white transition-colors">Nyaya (Legal Research)</a></li>
              <li><a href="#personas" className="hover:text-white transition-colors">Vakil (Court Drafting)</a></li>
              <li><a href="#personas" className="hover:text-white transition-colors">Pramaan (Evidence Audit)</a></li>
              <li><a href="#personas" className="hover:text-white transition-colors">Docket (Chamber Practice)</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] font-semibold text-white/72 uppercase tracking-wider">Statutory Coverage</h4>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li><a href="#what-is-soli" className="hover:text-white transition-colors">Bharatiya Nyaya Sanhita (BNS)</a></li>
              <li><a href="#what-is-soli" className="hover:text-white transition-colors">Nagarik Suraksha Sanhita (BNSS)</a></li>
              <li><a href="#what-is-soli" className="hover:text-white transition-colors">Sakshya Adhiniyam (BSA)</a></li>
              <li><a href="#what-is-soli" className="hover:text-white transition-colors">Section 138 NI Act Practice</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] font-semibold text-white/72 uppercase tracking-wider">Governance</h4>
            <ul className="mt-3 space-y-2 text-[13px]">
              <li><a href="#privacy" className="hover:text-white transition-colors">Advocate-Client Privilege</a></li>
              <li><a href="#privacy" className="hover:text-white transition-colors">Zero Model Training Policy</a></li>
              <li><a href="#privacy" className="hover:text-white transition-colors">Private Vector Vaults</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Chamber Access Portal</Link></li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer & Copyright */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-white/45">
          <p className="max-w-2xl text-justify">
            Disclaimer: Soli is an artificial intelligence legal operating system built to assist advocates, solicitors, law firms, and legal researchers. Soli does not provide formal legal advice, establish attorney-client relationships, or substitute for the professional judgment of qualified advocates registered with the Bar Council of India.
          </p>
          <p className="shrink-0 font-mono">
            &copy; 2026 Soli Legal OS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
