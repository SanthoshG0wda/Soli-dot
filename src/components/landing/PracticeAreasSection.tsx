"use client";

import { Briefcase, FileSignature, Gavel, ShieldAlert } from "lucide-react";

const DOMAINS = [
  {
    icon: Gavel,
    title: "Criminal Litigation & Bail Practice",
    badge: "BNSS / BNS",
    points: [
      "Regular Bail under Section 483 BNSS (Satender Kumar Antil category grounds)",
      "Anticipatory Bail under Section 482 BNSS (Arnesh Kumar & Sushila Aggarwal ratio)",
      "Statutory Default Bail under Section 187(2) BNSS (60/90-day custody calculation)",
      "PMLA Section 45 & NDPS Section 37 stringent threshold compliance analysis",
    ],
  },
  {
    icon: ShieldAlert,
    title: "FIR Quashing & Procedural Applications",
    badge: "High Court Jurisdiction",
    points: [
      "Quashing Petitions under Section 528 BNSS (Bhajan Lal non-cognizable parameters)",
      "Discharge Applications under Sections 250 & 262 BNSS for lack of prima facie case",
      "Section 94 BNSS Applications to preserve CCTV DVRs and Mobile Tower CDRs",
      "Section 531 BNSS savings clause navigation for pending FIRs under IPC/CrPC",
    ],
  },
  {
    icon: FileSignature,
    title: "Negotiable Instruments & Commercial Notices",
    badge: "NI Act, 1881",
    points: [
      "Statutory Demand Notices under Section 138 NI Act with strict 15-day pay demand",
      "Section 141 NI Act vicarious liability drafting for directors and authorized signatories",
      "Automated limitation computation: 30-day notice + 15-day cure + 30-day filing window",
      "Drafting Section 142 Complaints before Metropolitan Magistrate / JMFC courts",
    ],
  },
  {
    icon: Briefcase,
    title: "Commercial Courts & Arbitration Practice",
    badge: "A&C Act, 1996",
    points: [
      "Section 11(6) Petitions for appointment of Sole Arbitrator before High Courts",
      "Section 9 Interim Measure applications for asset preservation and security deposit",
      "Section 34 Applications for setting aside arbitral awards on patent illegality",
      "Commercial Courts Act 2015 Pre-Institution Mediation & Settlement (PIMS) vetting",
    ],
  },
];

export function PracticeAreasSection() {
  return (
    <section id="practice-areas" className="relative py-20 sm:py-28 border-t border-white/[0.08] bg-[#0c0c10]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-0.5 font-mono text-[11px] font-medium text-amber-400 uppercase tracking-widest">
            Statutory Coverage
          </div>
          <h2 className="mt-4 font-serif text-[34px] sm:text-[46px] font-normal tracking-tight text-white">
            Comprehensive coverage across Indian court practice.
          </h2>
          <p className="mt-3 text-[15px] sm:text-[17px] text-zinc-400">
            From criminal defense and bail jurisprudence to commercial recovery and arbitration, Soli is pre-trained on the procedural rules of Indian courts.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          {DOMAINS.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.title}
                className="rounded-2xl border border-white/[0.08] bg-[#121218] p-6 sm:p-7 hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full">
                      {d.badge}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[18px] font-medium text-white">
                    {d.title}
                  </h3>
                  <ul className="mt-4 space-y-2.5">
                    {d.points.map((p, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] text-zinc-300">
                        <span className="size-1.5 rounded-full bg-amber-400 shrink-0 mt-2" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
