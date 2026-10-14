import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Scale } from "lucide-react";

const MATTER_POINTS = [
  "BNSS 483 bail draft with binding-margin layout",
  "FIR and Section 180 statement contradictions flagged",
  "Supreme Court ratios checked against bench strength",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#090806] text-white">
      <div
        aria-hidden
        className="landing-grid-motion absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:30px_30px]"
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#3b2413]/50 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#10100d] to-transparent" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:min-h-[735px] lg:grid-cols-[1fr_0.98fr] lg:px-8 lg:py-24">
        <div className="landing-stagger flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d9a441]/25 bg-[#d9a441]/10 px-3 py-1 font-mono text-[11px] font-semibold tracking-widest text-[#ffd98a] uppercase shadow-[0_0_42px_rgba(217,164,65,0.12)]">
            <Scale className="size-3.5" />
            <span>Built for Indian chamber practice</span>
          </div>
          <h1 className="mt-6 max-w-4xl font-serif text-[44px] font-normal leading-[1.02] tracking-tight text-white sm:text-[62px] lg:text-[76px]">
            Draft filings from evidence, precedent, and court rules.
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.75] text-white/68 sm:text-[18px]">
            Soli helps advocates research precedent, test contradictions, and
            produce court-ready pleadings with Indian statutes, cause titles,
            margins, and export formats already in place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="motion-card inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#d9a441] px-5 text-[14px] font-semibold text-[#17100a] shadow-[0_18px_48px_-20px_rgba(217,164,65,0.95)] transition-all hover:bg-[#f0c36b]">
              <span>Start a chamber file</span>
              <ArrowRight className="size-4" />
            </Link>
            <a href="#live-preview" className="motion-card inline-flex h-11 items-center justify-center rounded-md border border-white/14 bg-white/[0.06] px-5 text-[14px] font-medium text-white/82 backdrop-blur transition-all hover:border-white/24 hover:bg-white/[0.1] hover:text-white">
              Review sample draft
            </a>
          </div>
          <div className="mt-8 grid gap-3 text-[14px] text-white/66 sm:grid-cols-3">
            {MATTER_POINTS.map((point) => (
              <div key={point} className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/[0.035] p-3 backdrop-blur">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#7ee2a8]" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center lg:justify-end">
          <div className="animate-landing-panel w-full max-w-[590px] overflow-hidden rounded-2xl border border-white/12 bg-[#13110e]/92 shadow-[0_34px_120px_-40px_rgba(0,0,0,0.95),0_0_80px_-34px_rgba(217,164,65,0.75)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.035] px-5 py-4">
              <div>
                <div className="font-mono text-[11px] tracking-widest text-[#ffd98a]/80 uppercase">Matter desk</div>
                <div className="mt-1 font-serif text-[22px] text-white">
                  State v. Rajesh Kumar
                </div>
              </div>
              <div className="rounded-md border border-[#d9a441]/22 bg-[#d9a441]/10 px-3 py-1.5 font-mono text-[11px] text-[#ffd98a]">
                FIR 142/2026
              </div>
            </div>
            <div className="grid gap-0 divide-y divide-white/10">
              {[
                ["Research", "Satender Kumar Antil category check", "3 authorities"],
                ["Evidence", "FIR vs statement timing variance", "4h 45m gap"],
                ["Draft", "Regular bail under Section 483 BNSS", "ready"],
              ].map(([label, title, status], index) => (
                <div
                  key={label}
                  className="grid grid-cols-[88px_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.035] animate-landing-reveal"
                  style={{ animationDelay: `${0.22 + index * 0.13}s` }}
                >
                  <span className="font-mono text-[11px] uppercase tracking-wider text-white/38">
                    {label}
                  </span>
                  <span className="text-[14px] leading-snug text-white/82">
                    {title}
                  </span>
                  <span className="rounded-sm bg-[#7ee2a8]/12 px-2 py-1 font-mono text-[10px] text-[#9ff1bd] ring-1 ring-[#7ee2a8]/20">
                    {status}
                  </span>
                </div>
              ))}
            </div>
            <div className="landing-scan-panel m-5 rounded-xl border border-[#d9a441]/18 bg-[#f8f1df] p-5 text-[#17100a] shadow-[0_24px_80px_-44px_rgba(217,164,65,0.9)]">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#8d551d]">
                <FileText className="size-3.5" />
                <span>Generated filing preview</span>
              </div>
              <div className="mt-4 space-y-2 font-serif text-[13px] leading-relaxed text-[#251d14]/82">
                <p className="text-center font-semibold uppercase">
                  In the Court of the Principal District & Sessions Judge at New Delhi
                </p>
                <p>
                  Application for regular bail under Section 483 of the Bharatiya
                  Nagarik Suraksha Sanhita, 2023.
                </p>
                <p>
                  The alleged offence carries a sentence below seven years; custody
                  is not warranted under the Category A directions in Satender
                  Kumar Antil.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 font-mono text-[10px] text-white/42">
              <span className="landing-status-sweep flex items-center gap-2 rounded-full pr-2"><span className="size-1.5 rounded-full bg-[#7ee2a8] shadow-[0_0_16px_rgba(126,226,168,0.9)]" /> Citation vault online</span>
              <span>PDF / DOCX / Court margins</span>
            </div>
          </div>
        </div>
      </div>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-[8%] bottom-8 hidden h-32 w-[460px] text-[#d9a441]/45 lg:block"
        viewBox="0 0 460 128"
        fill="none"
      >
        <path className="workflow-line" d="M8 66 C 92 10, 144 114, 228 60 S 366 38, 452 88" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        {[8, 148, 302, 452].map((x, i) => (
          <g key={x} className="workflow-node" style={{ animationDelay: `${i * 0.35}s` }}>
            <circle cx={x} cy={i === 0 ? 66 : i === 1 ? 88 : i === 2 ? 48 : 88} r="5" fill="#d9a441" />
            <circle cx={x} cy={i === 0 ? 66 : i === 1 ? 88 : i === 2 ? 48 : 88} r="11" stroke="#d9a441" strokeOpacity="0.22" />
          </g>
        ))}
      </svg>
    </section>
  );
}
