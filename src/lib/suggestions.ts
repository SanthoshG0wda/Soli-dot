/** Shared suggestion cards for the new-chat surfaces (Home + dot welcome).
 *
 *  Clicking a card fills the composer with the template (ChatGPT-style) —
 *  nothing is sent until the user reviews, edits the `[ ]` blanks, and hits
 *  Send themselves.
 */

export interface SuggestionDef {
  id: string;
  title: string;
  subtitle: string;
  template: string;
}

export const SUGGESTION_DEFS: SuggestionDef[] = [
  {
    id: "bail",
    title: "Regular Bail",
    subtitle: "Draft 483 BNSS application",
    template:
      "Draft an application for Regular Bail under Section 483 BNSS in FIR No. [ ] with Satender Antil grounds",
  },
  {
    id: "notice",
    title: "Section 138 Notice",
    subtitle: "Cheque dishonour demand",
    template:
      "Draft a statutory demand notice under Section 138 of the Negotiable Instruments Act for cheque dishonour of ₹[ ]",
  },
  {
    id: "preserve",
    title: "Preserve Evidence",
    subtitle: "CCTV footage & CDRs",
    template:
      "Draft an application under Section 94 BNSS to preserve CCTV footage and mobile tower CDRs",
  },
  {
    id: "research",
    title: "Case Research",
    subtitle: "Find judgments with citations",
    template:
      "What are the landmark Supreme Court judgments on anticipatory bail under Section 482 BNSS? Cite sources.",
  },
];
