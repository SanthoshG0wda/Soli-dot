export const marketing = {
  name: "Soli",
  tagline: "Counsel, meet your tireless paralegal.",
  contactEmail: "hello@soli.legal",
  navigation: [
    { href: "#product", label: "Product" },
    { href: "#knowledge", label: "Knowledge base" },
    { href: "#security", label: "Security" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ],
  pricing: [
    { name: "Solo Advocate", detail: "For individual litigation practices", price: "Early-access pricing", items: ["Private workspace", "Matter-based research", "Cited answers", "Personal document library", "Draft-ready research"] },
    { name: "Chambers / Firm", detail: "For practice groups and growing firms", price: "Early-access pricing", items: ["Shared knowledge library", "Private lawyer workspaces", "Matter and storage controls", "Shared source context", "Firm library controls", "Team onboarding"] },
    { name: "Enterprise", detail: "For larger legal teams", price: "Early-access pricing", items: ["Custom rollout", "Administrative controls", "Dedicated onboarding", "Structured knowledge migration", "Workspace support"] },
  ],
} as const;
