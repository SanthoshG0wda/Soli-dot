"use client";

import { useState } from "react";
import { FileText, Layers, Play, Scale, Search, Shield, ZoomIn, ZoomOut } from "lucide-react";

type MockDocTab = "bail" | "contradiction" | "precedents";

interface PleadingData {
  title: string;
  filename: string;
  prompt: string;
  agent: string;
  agentRole: string;
  agentInitial: string;
  reasoning: string[];
  responseSummary: string;
  courtTitle: string;
  matterNumber: string;
  causeTitle: {
    applicant: string;
    respondent: string;
    firInfo: string;
  };
  bodyParagraphs: string[];
  prayerClause: string;
  statutoryBadges: string[];
  textPayload: string;
}

const TAB_DATA: Record<MockDocTab, PleadingData> = {
  bail: {
    title: "Regular Bail Petition",
    filename: "Bail application preview",
    prompt: "Draft an urgent Regular Bail application under Section 483 BNSS in FIR No. 142/2026 with Satender Kumar Antil Category 'A' grounds for non-custodial bail.",
    agent: "Vakil",
    agentRole: "Courtroom Drafter",
    agentInitial: "V",
    reasoning: [
      "Jurisdiction: Section 483 Bharatiya Nagarik Suraksha Sanhita, 2023",
      "Offence: Section 318(4) BNS (Max imprisonment: 7 years)",
      "Binding Precedent: Satender Kumar Antil v. CBI (2022) 10 SCC 51 (Category A)",
      "Applying Delhi High Court Practice Directions: 1.75\" Left Binding Margin",
    ],
    responseSummary: "I have prepared the court-margin Regular Bail Application under Section 483 BNSS. Because the alleged offences carry imprisonment up to 7 years, the applicant qualifies for non-custodial bail under Category 'A' of Satender Kumar Antil. Memo of parties, grounds, prayer, and verification are rendered on the artifact board.",
    courtTitle: "IN THE COURT OF THE PRINCIPAL DISTRICT & SESSIONS JUDGE AT NEW DELHI",
    matterNumber: "CRIMINAL MISCELLANEOUS BAIL APPLICATION NO. _____ OF 2026",
    causeTitle: {
      applicant: "RAJESH KUMAR S/O SHRI RAMESH KUMAR",
      respondent: "STATE (NCT OF DELHI)",
      firInfo: "FIR NO.: 142/2026 | POLICE STATION: CONNAUGHT PLACE\nUNDER SECTIONS: 318(4), 61(2) BHARATIYA NYAYA SANHITA (BNS), 2023",
    },
    bodyParagraphs: [
      "1. That the Applicant is a permanent resident of New Delhi with deep roots in society and has never previously been implicated in any cognizable criminal proceedings.",
      "2. That the offences alleged against the Applicant under Section 318(4) BNS prescribe a maximum sentence of seven years. In terms of the authoritative directions of the Hon'ble Supreme Court in Satender Kumar Antil v. CBI (2022) 10 SCC 51, the present matter falls squarely within Category 'A', wherein custody is the exception and bail is the statutory norm.",
      "3. That the Applicant has fully complied with all notices issued under Section 35(3) BNSS and joined the investigation whenever summoned by the Investigating Officer.",
      "4. That all documentary evidence in the present commercial dispute has already been seized by the prosecution, eliminating any possibility of tampering with court evidence.",
    ],
    prayerClause: "WHEREFORE, it is most respectfully prayed that this Hon'ble Court may be pleased to enlarge the Applicant on regular bail in FIR No. 142/2026 on such terms and conditions as this Hon'ble Court may deem fit and proper in the interest of justice.",
    statutoryBadges: ["BNSS § 483", "BNS § 318(4)", "(2022) 10 SCC 51", "Delhi HC Margin Rules"],
    textPayload: `IN THE COURT OF THE PRINCIPAL DISTRICT & SESSIONS JUDGE AT NEW DELHI
CRIMINAL MISCELLANEOUS BAIL APPLICATION NO. _____ OF 2026

IN THE MATTER OF:
RAJESH KUMAR S/O SHRI RAMESH KUMAR            ... APPLICANT
VERSUS
STATE (NCT OF DELHI)                         ... RESPONDENT

FIR NO.: 142/2026 | POLICE STATION: CONNAUGHT PLACE
UNDER SECTIONS: 318(4), 61(2) BHARATIYA NYAYA SANHITA (BNS), 2023

APPLICATION FOR REGULAR BAIL UNDER SECTION 483 OF BNSS, 2023

MOST RESPECTFULLY SHOWETH:
1. That the Applicant is a permanent resident of New Delhi with deep roots in society.
2. That the offences alleged under Section 318(4) BNS carry sentences under 7 years. In terms of Satender Kumar Antil v. CBI (2022) 10 SCC 51, custody is unwarranted.
3. That the Applicant has joined investigation under Section 35(3) BNSS.
4. That investigation is documentary and no custodial interrogation is required.

PRAYER:
Wherefore, it is prayed that this Hon'ble Court may enlarge the Applicant on regular bail.

FILED BY:
SOLI CHAMBER PRACTICE
Advocates for Applicant
New Delhi`,
  },
  contradiction: {
    title: "FIR & Deposition Audit",
    filename: "Contradiction matrix preview",
    prompt: "Compare FIR 142/2026 with the complainant's subsequent statement recorded under Section 180 BNSS. Tabulate all material omissions and timing discrepancies.",
    agent: "Pramaan",
    agentRole: "Evidence Auditor",
    agentInitial: "P",
    reasoning: [
      "Cross-Auditing: FIR No. 142/2026 GD No. 12A vs. Statement u/s 180 BNSS",
      "Statutory Check: Section 23 & 63 Bharatiya Sakshya Adhiniyam, 2023 (BSA)",
      "Found: 4-hour temporal divergence in incident time",
      "Found: Absence of mandatory 63 BSA certificate for CCTV digital extraction",
    ],
    responseSummary: "Pramaan has cross-audited the initial FIR against the Section 180 BNSS deposition. Critical evidentiary contradictions were uncovered: the stated occurrence time shifted by 4 hours 45 minutes, and the purported electronic CCTV seizure lacks Section 63 BSA certification, rendering it prima facie inadmissible.",
    courtTitle: "CHAMBER SCRUTINY & DEFENCE EVIDENTIARY AUDIT",
    matterNumber: "DEFENCE BRIEF: STATE V. RAJESH KUMAR (FIR 142/2026)",
    causeTitle: {
      applicant: "DEFENCE CROSS-EXAMINATION AID",
      respondent: "PROSECUTION EVIDENCE INCONSISTENCIES",
      firInfo: "BENCH: SPECIAL MM COURT, PATIALA HOUSE COURTS\nSTATUTORY CODE: SECTION 180 BNSS / SECTION 23 BSA",
    },
    bodyParagraphs: [
      "DISCREPANCY 1 (TEMPORAL ALIBI): In the original handwritten FIR GD No. 12A, the complainant stated the incident occurred at 04:30 PM. In the Section 180 BNSS deposition, the witness altered the timeline to 09:15 PM.",
      "DISCREPANCY 2 (RECOVERY DISPUTE): The FIR alleges cash of ₹5,00,000 was delivered in person. In contrast, the panchnama memo records no cash recovery from the applicant's premises.",
      "DISCREPANCY 3 (ELECTRONIC EVIDENCE FAILURE): The CCTV hard drive relied upon by the IO lacks the mandatory certificate under Section 63 BSA (formerly Section 65B IEA). In terms of Arjun Panditrao (2020) 7 SCC 1, electronic evidence without contemporaneous certification cannot be read in evidence.",
    ],
    prayerClause: "TACTICAL RECOMMENDATION: Move an application for production of original GD entry logs and raise Section 63 BSA threshold objection at charge framing stage.",
    statutoryBadges: ["BNSS § 180", "BSA § 63", "(2020) 7 SCC 1", "Arjun Panditrao Rule"],
    textPayload: `CHAMBER SCRUTINY & DEFENCE EVIDENTIARY AUDIT
DEFENCE BRIEF: STATE V. RAJESH KUMAR (FIR 142/2026)

TABLE OF MATERIAL CONTRADICTIONS:
1. Incident Time: FIR states 04:30 PM vs 09:15 PM in Sec 180 BNSS statement. (Material discrepancy).
2. Cash Seizure: FIR asserts ₹5,00,000 handed over; Panchnama records zero recovery.
3. Electronic Certificate: No Sec 63 BSA certificate for CCTV footage (Inadmissible per Arjun Panditrao).

PREPARED BY:
Pramaan Evidence Scrutiny Agent`,
  },
  precedents: {
    title: "Supreme Court Precedent Note",
    filename: "Precedent note preview",
    prompt: "What is the binding ratio on anticipatory bail under Section 482 BNSS? Contrast the 5-judge Constitution Bench in Sushila Aggarwal with Gurbaksh Sibbia.",
    agent: "Nyaya",
    agentRole: "Legal Researcher",
    agentInitial: "N",
    reasoning: [
      "Corpus: Supreme Court of India 1950–2026 (Qdrant Vector Engine)",
      "Found: Sushila Aggarwal v. State (NCT of Delhi) (2020) 5 SCC 1 (5-Judge Bench)",
      "Found: Gurbaksh Singh Sibbia v. State of Punjab (1980) 2 SCC 565 (5-Judge Bench)",
      "Binding Ratio: Section 482 BNSS retains identical constitutional scope under Article 21",
    ],
    responseSummary: "Nyaya has extracted the definitive Constitution Bench ratio. The 5-judge bench in Sushila Aggarwal holds that pre-arrest bail under Section 482 BNSS should not be artificially capped to a fixed period, affirming that liberty under Article 21 cannot be narrowed without explicit statutory warrant.",
    courtTitle: "MEMORANDUM OF BINDING PRECEDENT & BENCH STRENGTH",
    matterNumber: "CONSTITUTIONAL BENCH JURISPRUDENCE ON SECTION 482 BNSS",
    causeTitle: {
      applicant: "SUSHILA AGGARWAL V. STATE (NCT OF DELHI) — (2020) 5 SCC 1",
      respondent: "GURBAKSH SINGH SIBBIA V. STATE OF PUNJAB — (1980) 2 SCC 565",
      firInfo: "BENCH COMPOSITION: 5-JUDGE CONSTITUTION BENCH (UNANIMOUS)\nRATIO DECIDENDI CITATION VERIFIED VIA QDRANT INDEX",
    },
    bodyParagraphs: [
      "RATIO 1: Anticipatory bail should not ordinarily be limited to a fixed duration or terminate automatically upon the filing of a charge sheet. Personal liberty is protected until trial conclusion unless extraordinary circumstances arise.",
      "RATIO 2: Section 482 BNSS is the direct legislative successor to Section 438 CrPC. The constitutional interpretations settled by Constitution Benches remain authoritative and binding across all High Courts under Article 141.",
      "RATIO 3: Conditions imposed under Section 482(2) BNSS must be proportional and directly relevant to the investigation, not punitive or impossible to perform.",
    ],
    prayerClause: "AUTHORITY STATUS: Good Law. Followed in 218 subsequent High Court orders across Delhi, Bombay, and Allahabad High Courts.",
    statutoryBadges: ["BNSS § 482", "5-Judge Bench", "(2020) 5 SCC 1", "Article 141 Binding"],
    textPayload: `MEMORANDUM OF BINDING PRECEDENT
TOPIC: SECTION 482 BNSS (ANTICIPATORY BAIL)

1. Sushila Aggarwal v. State (NCT of Delhi) (2020) 5 SCC 1 [5-Judge Bench]
   Ratio: Pre-arrest bail should not be limited to a fixed time horizon.
2. Gurbaksh Singh Sibbia v. State of Punjab (1980) 2 SCC 565 [5-Judge Bench]
   Ratio: Extraordinary jurisdiction to be exercised with constitutional breadth.

STATUS: Verified Good Law across 218 subsequent High Court orders.`,
  },
};

export function InteractiveProductMockup() {
  const [activeTab, setActiveTab] = useState<MockDocTab>("bail");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(4);
  const [zoomLevel, setZoomLevel] = useState(100);

  const current = TAB_DATA[activeTab];

  const runSimulation = () => {
    setIsSimulating(true);
    setSimulationStep(0);

    const timer1 = setTimeout(() => setSimulationStep(1), 400);
    const timer2 = setTimeout(() => setSimulationStep(2), 900);
    const timer3 = setTimeout(() => setSimulationStep(3), 1400);
    const timer4 = setTimeout(() => {
      setSimulationStep(4);
      setIsSimulating(false);
    }, 1900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  };

  return (
    <section id="live-preview" className="relative overflow-hidden py-16 sm:py-24 border-t border-white/10 bg-[#10100d] text-white">
      <div aria-hidden className="landing-grid-motion absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading - OpenCode Style */}
        <div className="landing-stagger flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-widest text-[#ffd98a] uppercase">
              <span>● Live Chamber Console</span>
              <span className="text-white/30">/</span>
              <span className="text-white/45">Side-by-side artifact board</span>
            </div>
            <h2 className="mt-3 font-serif text-[32px] sm:text-[44px] font-normal tracking-tight text-white">
              Documents generate beside the brief, ready to file.
            </h2>
            <p className="mt-3 text-[15px] sm:text-[16px] text-white/62 leading-relaxed">
              No copying or reformatting out of chat windows. Soli outputs pleadings directly onto your Artifact Board with official High Court margins, line numbers, cause titles, and instant exports.
            </p>
          </div>

          {/* Quick Action Simulation Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={runSimulation}
              disabled={isSimulating}
              className="motion-card group inline-flex h-9.5 items-center gap-2 rounded-md border border-[#d9a441]/25 bg-[#d9a441]/10 px-4 text-[13px] font-medium text-[#ffd98a] hover:bg-[#d9a441]/16 transition-all active:scale-95 disabled:opacity-50"
            >
              <Play className="size-3.5 fill-current transition-transform group-hover:scale-110" />
              <span>{isSimulating ? "Synthesizing Brief..." : "Replay Agent Drafting"}</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
          {(["bail", "contradiction", "precedents"] as MockDocTab[]).map((tab) => {
            const data = TAB_DATA[tab];
            const isActive = activeTab === tab;
            const Icon = tab === "bail" ? Scale : tab === "contradiction" ? Shield : Search;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSimulationStep(4);
                }}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white shadow-xs border border-[#d9a441]/25"
                    : "text-white/55 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <Icon className={`size-3.5 ${isActive ? "text-[#ffd98a]" : "text-white/35"}`} />
                <span>{data.title}</span>
                <span className="font-mono text-[10px] text-white/50 uppercase bg-black/25 px-1.5 py-0.5 rounded">
                  {data.agent}
                </span>
              </button>
            );
          })}
        </div>

        {/* macOS Desktop Window Chrome */}
        <div className="animate-landing-reveal mt-6 rounded-2xl border border-white/12 bg-[#151313] shadow-[0_34px_120px_-46px_rgba(0,0,0,0.95)] overflow-hidden">
          {/* Top Window Bar */}
          <div className="flex h-10 items-center justify-between border-b border-white/10 bg-[#0d0c0a] px-4">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#b86645]" />
              <span className="size-2.5 rounded-full bg-[#c9a86a]" />
              <span className="size-2.5 rounded-full bg-[#7a8a52]" />
              <span className="ml-3 font-mono text-[11px] text-white/55 hidden sm:inline">
                soli / chamber / State v. Rajesh Kumar (FIR 142/2026)
              </span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="font-mono text-[11px] text-[#9ff1bd] bg-[#7ee2a8]/10 px-2 py-0.5 rounded border border-[#7ee2a8]/20">
                Sample preview
              </span>
            </div>
          </div>

          {/* Split Screen Workspace */}
          <div className="sample-scroll-stage grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
            {/* Left Pane: Conversation Thread (5 cols) */}
            <div className="sample-scroll-chat lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between bg-[#101015]">
              <div className="space-y-4">
                {/* User Prompt */}
                <div className="flex justify-end">
                  <div className="rounded-xl rounded-tr-xs bg-amber-500/10 border border-amber-500/25 px-4 py-2.5 max-w-[94%] text-[13px] leading-relaxed text-amber-100">
                    <div className="font-mono text-[10px] text-amber-400/70 mb-1 uppercase tracking-wider">
                      Advocate Prompt
                    </div>
                    {current.prompt}
                  </div>
                </div>

                {/* Agent Response */}
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 font-serif font-bold text-amber-300 text-[13px]">
                    {current.agentInitial}
                  </div>
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-white">{current.agent}</span>
                      <span className="rounded-xs bg-white/5 border border-white/10 px-1.5 py-0.2 font-mono text-[9px] text-zinc-400 uppercase">
                        {current.agentRole}
                      </span>
                    </div>

                    {/* Reasoning Stream Chips */}
                    <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-[#0c0c10] p-3">
                      <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Draft preparation steps</span>
                      </div>
                      {current.reasoning.map((step, idx) => {
                        const isDone = simulationStep >= idx + 1;
                        return (
                          <div
                            key={step}
                            className={`flex items-center gap-2 font-mono text-[11px] transition-opacity ${
                              isDone ? "text-zinc-300 opacity-100" : "text-zinc-600 opacity-40"
                            }`}
                            style={{ transitionDelay: `${idx * 90}ms` }}
                          >
                            <span className="text-amber-400 text-[10px]">›</span>
                            <span>{step}</span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[13px] leading-relaxed text-zinc-300">
                      {current.responseSummary}
                    </p>

                    {/* Preview banner */}
                    <div className="rounded-xl border border-white/10 bg-[#14141c] p-3 flex items-center justify-between gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-amber-400 shrink-0">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-[12px] font-medium text-white">
                          {current.filename}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          Public sample · exports available after sign in
                        </div>
                      </div>
                      <span className="inline-flex h-7.5 items-center rounded-md border border-white/10 bg-white/[0.04] px-3 text-[11px] font-medium text-zinc-400 shrink-0">
                        Preview only
                      </span>
                    </div>

                    <p className="pt-1 font-mono text-[10px] leading-relaxed text-zinc-500">
                      This sample is illustrative. Real documents and downloads are created inside a signed-in chamber workspace.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-white/[0.06] font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                Sample draft workspace
              </div>
            </div>

            {/* Right Pane: Live Artifact Paper Board (7 cols) */}
            <div className="sample-scroll-board lg:col-span-7 bg-[#171720] flex flex-col justify-between">
              {/* Board Control Header */}
              <div className="flex h-10 items-center justify-between border-b border-white/[0.08] bg-[#121217] px-4">
                <div className="flex items-center gap-2">
                  <Layers className="size-3.5 text-amber-400" />
                  <span className="font-mono text-[12px] font-medium text-zinc-200">
                    {current.filename}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(z - 10, 80))}
                    className="p-1 text-zinc-400 hover:text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="size-3.5" />
                  </button>
                  <span className="font-mono text-[10px] text-zinc-500">{zoomLevel}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(z + 10, 120))}
                    className="p-1 text-zinc-400 hover:text-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Legal Document Paper Page */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-[#101016]">
                <div
                  className="landing-scan-panel w-full max-w-[620px] rounded-sm bg-[#faf8f4] text-[#1c1813] shadow-2xl p-6 sm:p-8 font-serif text-[12.5px] leading-[1.65] border border-amber-900/10 min-h-[520px] relative transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                >
                  {/* Left Margin Ruler / Binding Gutter Guideline */}
                  <div className="absolute top-0 bottom-0 left-[38px] w-[1px] border-r border-dashed border-red-400/40 pointer-events-none" />
                  <div className="absolute top-2 left-1 font-mono text-[8px] text-red-500/50 uppercase tracking-tighter select-none rotate-90 origin-top-left">
                    1.75&quot; Binding Gutter
                  </div>

                  {/* Header Title */}
                  <div className="text-center font-bold tracking-wide text-[11px] sm:text-[12px] leading-tight uppercase border-b border-black/15 pb-3">
                    {current.courtTitle}
                    <div className="text-[10px] font-normal mt-1">{current.matterNumber}</div>
                  </div>

                  {/* Memo of Parties */}
                  <div className="mt-4 text-[11px] sm:text-[12px] space-y-1">
                    <div className="font-bold">IN THE MATTER OF:</div>
                    <div className="flex justify-between font-semibold">
                      <span>{current.causeTitle.applicant}</span>
                      <span>... APPLICANT</span>
                    </div>
                    <div className="text-center font-bold my-1 text-[10px]">VERSUS</div>
                    <div className="flex justify-between font-semibold">
                      <span>{current.causeTitle.respondent}</span>
                      <span>... RESPONDENT</span>
                    </div>
                  </div>

                  {/* FIR & Statute Block */}
                  <div className="mt-3 p-2 bg-black/[0.04] rounded-sm text-[10px] font-mono leading-relaxed">
                    {current.causeTitle.firInfo}
                  </div>

                  {/* Body Paragraphs */}
                  <div className="mt-4 space-y-2 text-justify">
                    <div className="font-bold text-[11px] uppercase">MOST RESPECTFULLY SHOWETH:</div>
                    {current.bodyParagraphs.map((para) => (
                      <p key={para.slice(0, 30)} className="text-[12px] leading-relaxed">
                        {para}
                      </p>
                    ))}
                  </div>

                  {/* Prayer Clause */}
                  <div className="mt-5 border-t border-black/15 pt-3 font-bold text-[11px]">
                    <div className="uppercase">PRAYER:</div>
                    <p className="mt-1 font-normal text-[11.5px] leading-relaxed text-justify">
                      {current.prayerClause}
                    </p>
                  </div>

                  {/* Advocate Signature Block */}
                  <div className="mt-6 pt-3 flex justify-end text-[10px] font-mono text-right">
                    <div>
                      <div className="font-bold">FILED BY:</div>
                      <div>ADVOCATE ON RECORD</div>
                      <div>DELHI HIGH COURT / SUPREME COURT</div>
                      <div>CHAMBER NO. 14, LAWYERS CHAMBERS</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Info */}
              <div className="h-8 border-t border-white/[0.08] bg-[#121217] px-4 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>Public preview · no files generated</span>
                <span>Sign in to create exports</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
