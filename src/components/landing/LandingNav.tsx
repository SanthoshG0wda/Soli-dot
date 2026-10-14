"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, Scale, X } from "lucide-react";

const LINKS = [
  { href: "#what-is-soli", label: "Overview" },
  { href: "#live-preview", label: "Sample draft" },
  { href: "#personas", label: "Agents" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav({ hasUser }: { hasUser?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0b0907]/88 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg border border-[#d9a441]/35 bg-[#d9a441]/15 text-[#ffd98a] shadow-[0_0_28px_rgba(217,164,65,0.16)]">
            <Scale className="size-4" strokeWidth={2} />
          </span>
          <span className="font-serif text-[20px] font-semibold tracking-tight">
            Soli
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-white/58 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {hasUser ? (
            <Link
              href="/"
              className="btn-brand h-9 px-4 text-[13px]"
            >
              <span>Open workspace</span>
              <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center px-3.5 text-[13px] font-medium text-white/62 transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link href="/signup" className="inline-flex h-9 items-center justify-center rounded-md bg-[#d9a441] px-4 text-[13px] font-semibold text-[#17100a] shadow-[0_12px_28px_-18px_rgba(217,164,65,0.9)] transition-all hover:bg-[#f0c36b] hover:shadow-[0_16px_36px_-18px_rgba(217,164,65,1)]">
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex size-9 items-center justify-center rounded-lg border border-white/12 text-white/70 hover:text-white md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#0f0c09] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-2 py-2 text-[14px] text-white/70 hover:bg-white/8 hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <Link
              href="/login"
              className="btn-secondary h-10 text-[14px]"
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-brand h-10 text-[14px]">
              Start free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
