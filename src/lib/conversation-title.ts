const LEGAL_TOPICS: Array<[RegExp, string]> = [
  [/\b(bail|anticipatory bail|regular bail)\b/i, "Bail strategy"],
  [/\b(fir|first information report)\b/i, "FIR analysis"],
  [/\b(quash|quashing)\b/i, "Quashing strategy"],
  [/\b(appeal|appellate)\b/i, "Appeal strategy"],
  [/\b(hearing|next date|ndh)\b/i, "Hearing preparation"],
  [/\b(draft|drafting|petition|application|notice)\b/i, "Legal drafting"],
  [/\b(contract|agreement|breach)\b/i, "Contract analysis"],
  [/\b(evidence|exhibit|certificate|chain of custody)\b/i, "Evidence review"],
];

export function buildConversationTitle(input: string): string {
  const clean = input.replace(/\s+/g, " ").replace(/^[/#>*\-\s]+/, "").trim();
  if (!clean) return "New consultation";
  const topic = LEGAL_TOPICS.find(([pattern]) => pattern.test(clean))?.[1];
  const words = clean.split(" ").slice(0, 8).join(" ").replace(/[.,;:!?]+$/, "");
  const summary = words.length > 56 ? `${words.slice(0, 53).trim()}…` : words;
  return topic && !summary.toLowerCase().startsWith(topic.toLowerCase()) ? `${topic}: ${summary}` : summary;
}
