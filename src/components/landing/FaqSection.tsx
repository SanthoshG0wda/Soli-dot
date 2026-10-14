"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "How does Soli prevent hallucinations in Supreme Court and High Court citations?",
    answer: "Every cited precedent, bench strength, and ratio decidendi is retrieved directly from our curated Qdrant vector corpus containing 5.2M+ verified judgments across the Supreme Court of India, 25 High Courts, and Central Tribunals. If a case name or section does not exist with mathematical certainty in the verified legal corpus, the agents explicitly decline to cite it rather than fabricating citations.",
  },
  {
    question: "Are drafted pleadings compliant with specific High Court and Supreme Court e-filing rules?",
    answer: "Yes. Soli formats output documents directly onto our Live Artifact Board using strict court-margin rules: 1.75-inch (4.5 cm) left margin for court binding, 1.25-inch top/bottom/right margins, double line-spacing, formal cause titles, memo of parties, prayer clause formatting, and advocate verification blocks compliant with Supreme Court and High Court Practice Directions.",
  },
  {
    question: "How does the engine resolve offences occurring before July 1, 2024 (IPC vs BNS)?",
    answer: "Soli incorporates automated statutory transitional logic. Under Section 531 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023, offenses committed prior to July 1, 2024, must be charged and tried under the Indian Penal Code (IPC) and Code of Criminal Procedure (CrPC). Soli automatically flags temporal jurisdiction and prevents advocates from citing invalid sections.",
  },
  {
    question: "Can multiple advocates, partners, and junior associates collaborate on the same matter?",
    answer: "Yes. Chamber workspaces support multi-advocate collaboration, shared matter briefs, and multi-agent coordination. For instance, Docket can track court listings while Nyaya performs precedent research, Vakil drafts the rejoinder, and senior advocates review diffs with instant version control.",
  },
  {
    question: "Can our chamber connect our own LLM API keys or run on-premise models?",
    answer: "Yes. Soli provides out-of-the-box cloud access with Claude 3.7 Sonnet, GPT-4o, and Gemini 2.5 Flash, or you can supply your own API keys. For sensitive corporate litigation and sovereign chamber deployments, you can also connect local legal models running on private hardware via Ollama or vLLM.",
  },
  {
    question: "How does the Live Artifact Board differ from standard chat windows like ChatGPT?",
    answer: "Standard chat windows dump raw text into a message bubble that loses formatting and requires manual cleanup. Soli's Artifact Board renders documents side-by-side in real time with zoom, print margins, citation tags, and direct one-click export to signed PDF and editable Microsoft Word (.docx) files.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-20 sm:py-28 border-t border-[#4a2b15]/12 bg-[#f4ead7] text-[#17100a]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center animate-landing-reveal">
          <h2 className="font-serif text-[32px] sm:text-[44px] font-normal tracking-tight text-[#17100a]">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-[15px] sm:text-[17px] text-[#3c2d1f]/62">
            Technical architecture, evidentiary compliance, and court-margin operations.
          </p>
        </div>

        {/* Collapsible FAQ List - OpenCode Style */}
        <div className="landing-stagger mt-12 space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="motion-card overflow-hidden rounded-xl border border-[#4a2b15]/10 bg-[#fffaf0] shadow-[0_18px_58px_-44px_rgba(74,43,21,0.58)] transition-colors hover:border-[#9a5f22]/30"
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between p-5 text-left transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] sm:text-[16px] font-semibold text-[#17100a] pr-4">
                    {faq.question}
                  </span>
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#4a2b15]/12 bg-[#f0dfc2] text-[#3c2d1f]/60">
                    {isOpen ? (
                      <Minus className="size-4 text-amber-400" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-[#4a2b15]/10 px-5 pt-3 pb-5 text-[14px] leading-relaxed text-[#3c2d1f]/72 bg-[#f7ecd8]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
