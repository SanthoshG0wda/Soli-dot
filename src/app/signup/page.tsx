import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSearch, FolderLock, Scale, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Soli account.",
};

const HIGHLIGHTS = [
  {
    icon: FolderLock,
    title: "Matters stay siloed",
    body: "Every client workspace keeps its own files, threads, and memory.",
  },
  {
    icon: FileSearch,
    title: "Research with receipts",
    body: "Answers cite the statutes, filings, and docs they came from.",
  },
  {
    icon: ShieldCheck,
    title: "Confidential by design",
    body: "Your matters are private to your account. Nothing trains on them.",
  },
];

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[1.05fr_1fr]">
        {/* ── Brand panel ─────────────────────────────────────────── */}
        <section
          aria-label="About Soli"
          className="relative hidden overflow-hidden border-x border-black/[0.06] bg-foreground text-card lg:flex lg:flex-col lg:justify-between lg:p-10"
        >
          <div
            aria-hidden
            className="dot-grid absolute inset-0 opacity-[0.16] invert"
          />
          <div
            aria-hidden
            className="absolute -top-32 -left-32 size-96 rounded-full bg-brand/30 blur-[110px]"
          />
          <div
            aria-hidden
            className="absolute -right-24 -bottom-24 size-80 rounded-full bg-brand/20 blur-[100px]"
          />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-brand text-card">
                <Scale className="size-[18px]" strokeWidth={2.25} />
              </span>
              <span className="font-sans text-[17px] font-medium tracking-tight">
                Soli
              </span>
              <span className="rounded-full border border-card/20 px-2 py-0.5 font-mono text-[10px] tracking-wider text-card/60 uppercase">
                Legal AI
              </span>
            </Link>

            <p className="mt-10 font-mono text-[11px] tracking-wider text-card/50 uppercase">
              Matters · Research · Assistants
            </p>
            <h1 className="mt-3 max-w-md font-sans text-4xl leading-[1.05] font-normal tracking-tight text-balance xl:text-[44px]">
              Set up your firm&apos;s legal AI workspace.
            </h1>
            <p className="mt-4 max-w-md font-sans text-[15px] leading-relaxed text-card/65">
              One account, every matter — memos, diligence, and research that
              cites its sources.
            </p>

            <ul className="mt-8 flex flex-col gap-2.5">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-card/10 bg-card/[0.04] p-3.5 backdrop-blur-sm"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand">
                    <item.icon className="size-[18px]" strokeWidth={2} />
                  </span>
                  <span>
                    <span className="block font-sans text-[14px] font-medium text-card">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block font-sans text-[13px] leading-relaxed text-card/60">
                      {item.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative mt-10 font-mono text-[11px] text-card/40">
            Attorney work product — kept private to your account.
          </p>
        </section>

        {/* ── Form column ─────────────────────────────────────────── */}
        <section
          aria-label="Sign up"
          className="relative flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14"
        >
          <div
            aria-hidden
            className="dot-grid absolute inset-x-0 top-0 h-44 [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
          <Link
            href="/"
            className="relative mb-8 inline-flex items-center gap-2.5 lg:hidden"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-foreground text-card">
              <Scale className="size-[18px]" strokeWidth={2.25} />
            </span>
            <span className="font-sans text-[17px] font-medium tracking-tight">
              Soli
            </span>
          </Link>

          <div className="relative mx-auto w-full max-w-[420px]">
            <SignupForm />
            <p className="mt-6 text-center font-mono text-[11px] text-foreground/40">
              Protected by account-scoped sessions · SOC 2 practices
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
