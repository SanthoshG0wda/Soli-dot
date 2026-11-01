import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSearch, FolderLock, Scale, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Soli.",
};

const HIGHLIGHTS = [
  { icon: FolderLock, title: "Matters stay compartmentalized", body: "Keep each client workspace, document, and conversation clearly separated." },
  { icon: FileSearch, title: "Research with sources", body: "Keep legal research, cited material, and working notes together." },
  { icon: ShieldCheck, title: "Confidential by design", body: "Your workspace is private to the account and firm that owns it." },
];

const ACTIVITY = [
  { time: "09:42", text: "Acme merger · diligence memo drafted" },
  { time: "09:31", text: "NDAs · 14 clauses flagged for review" },
  { time: "09:12", text: "Research · 6 authorities cited" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const { next } = await searchParams;
  return (
    <main className="min-h-screen bg-[#121212] text-[#f1efea]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1320px] lg:grid-cols-[1.08fr_0.92fr]">
        <section aria-label="About Soli" className="relative hidden overflow-hidden border-x border-white/10 bg-[#211f1c] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div aria-hidden className="dot-grid absolute inset-0 opacity-[0.08] invert" />
          <div aria-hidden className="absolute -top-32 -left-32 size-96 rounded-full bg-brand/25 blur-[110px]" />
          <div aria-hidden className="absolute -right-24 -bottom-24 size-80 rounded-full bg-brand/15 blur-[100px]" />

          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-brand text-[#211f1c]"><Scale className="size-[18px]" strokeWidth={2.25} /></span>
              <span className="font-serif text-[22px] font-medium tracking-[-0.04em]">Soli</span>
              <span className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[10px] tracking-wider text-white/55 uppercase">Legal workspace</span>
            </Link>

            <p className="mt-16 font-mono text-[11px] tracking-wider text-[#db7a5c] uppercase">Secure legal workspace</p>
            <h1 className="mt-4 max-w-lg font-serif text-[46px] leading-[1.02] font-normal tracking-[-0.045em] text-balance xl:text-[58px]">Your legal work, in one secure place.</h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/65">Return to your matters, legal research, and document work with a clear view of every next step.</p>

            <ul className="mt-9 flex flex-col gap-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.06]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/15 text-brand"><item.icon className="size-[18px]" strokeWidth={2} /></span>
                  <span>
                    <span className="block text-[14px] font-medium text-[#f1efea]">{item.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-white/55">{item.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-10">
            <div className="rounded-xl border border-white/10 bg-black/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-wider text-white/45 uppercase">Recent workspace activity</p>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-emerald-300 uppercase"><span className="live-dot size-1.5 rounded-full bg-emerald-300" /> Active</span>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {ACTIVITY.map((row) => <li key={row.time} className="flex items-baseline gap-3 font-mono text-[12px]"><span className="shrink-0 text-white/35">{row.time}</span><span className="truncate text-white/75">{row.text}</span></li>)}
              </ul>
            </div>
            <p className="mt-4 font-mono text-[11px] text-white/40">Confidential workspace · access is scoped to your account.</p>
          </div>
        </section>

        <section aria-label="Log in" className="relative flex flex-col justify-center bg-[#171717] px-5 py-10 sm:px-10 lg:px-16">
          <div aria-hidden className="dot-grid absolute inset-x-0 top-0 h-44 opacity-[0.08] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <Link href="/" className="relative mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <span className="grid size-9 place-items-center rounded-lg bg-brand text-[#211f1c]"><Scale className="size-[18px]" strokeWidth={2.25} /></span>
            <span className="font-serif text-[22px] font-medium tracking-[-0.04em]">Soli</span>
          </Link>
          <div className="relative mx-auto w-full max-w-[420px]">
            <p className="mb-5 font-mono text-[11px] tracking-wider text-[#db7a5c] uppercase">Soli legal workspace</p>
            <LoginForm next={next} />
            <p className="mt-6 text-center font-mono text-[11px] text-white/35">Protected by account-scoped sessions</p>
          </div>
        </section>
      </div>
    </main>
  );
}
