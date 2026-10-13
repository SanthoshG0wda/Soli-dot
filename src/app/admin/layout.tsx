import Link from "next/link";
import { headers } from "next/headers";
import { BookOpen, Cpu, CreditCard, FileCheck2, SlidersHorizontal, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

const TABS = [
  { href: "/admin/corpus", id: "corpus", label: "Corpus & Ingestion", icon: BookOpen, desc: "PDF ingestion, Bare Acts & chunk inspector" },
  { href: "/admin/evals", id: "evals", label: "RAG Evals", icon: FileCheck2, desc: "Benchmark tests, recall, grounding & citations" },
  { href: "/admin/models", id: "models", label: "Model Providers", icon: Cpu, desc: "Global LLM defaults & BYOK settings" },
  { href: "/admin/plans", id: "plans", label: "Plans & Quotas", icon: CreditCard, desc: "SaaS tiers, token budgets & seat caps" },
  { href: "/admin/limits", id: "limits", label: "Retrieval Budgets", icon: SlidersHorizontal, desc: "Top-k bounds & vector context caps" },
  { href: "/admin/users", id: "users", label: "Users & Teams", icon: Users, desc: "Firm member roster & admin privileges" },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The single top bar (wordmark, identity, back, logout) lives in AdminFrame;
  // this layout only guards + renders the section tabs.
  await requireAdmin();
  const area = (await headers()).get("x-admin-area") ?? "corpus";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground antialiased">
      {/* Sub-header Navigation Tabs */}
      <nav className="shrink-0 border-b border-border bg-card/30 px-6" aria-label="Admin control plane sections">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = area === t.id;
            return (
              <Link
                key={t.id}
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 border-b-2 px-3.5 py-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-brand text-brand font-semibold"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <Icon className={`size-3.5 ${isActive ? "text-brand" : "text-muted-foreground"}`} />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Admin Scrollable Canvas */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
