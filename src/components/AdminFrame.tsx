"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Dedicated admin shell. Deliberately separate from the user product: no dots
 * sidebar, no chats, no mobile bar, no voice panel, no dot toasts. Just the
 * firm-administration sections (corpus, evals, models, plans, limits, users).
 */
export default function AdminFrame({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => {
        const mail = (j as { user?: { email?: unknown } } | null)?.user?.email;
        if (typeof mail === "string") setEmail(mail);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/[0.08] px-4 sm:px-6">
        <span className="flex items-center gap-2">
          <span className="flex -space-x-1" aria-hidden>
            <span className="size-3 rounded-full bg-foreground ring-2 ring-background" />
            <span className="size-3 rounded-full bg-brand ring-2 ring-background" />
            <span className="size-3 rounded-full bg-highlight ring-2 ring-background" />
          </span>
          <span className="text-[15px] font-medium tracking-tight">Soli</span>
          <span className="rounded-xs bg-foreground px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-background uppercase">
            Admin
          </span>
        </span>
        {email && (
          <span className="hidden font-mono text-[12px] text-foreground/50 md:inline">{email}</span>
        )}
        <Link
          href="/"
          className="ml-auto flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] text-foreground/65 transition-colors hover:bg-black/[0.05] hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          Back to app
        </Link>
        <LogoutButton className="flex h-8 items-center rounded-full px-3 text-[13px] text-foreground/65 transition-colors hover:bg-black/[0.05] hover:text-foreground disabled:opacity-40" />
      </header>
      <main className="flex min-h-0 flex-1 flex-col bg-card">{children}</main>
    </div>
  );
}
