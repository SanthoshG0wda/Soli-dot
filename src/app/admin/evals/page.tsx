import { requireAdmin } from "@/lib/auth";
import { listEvalTestCases } from "@/server/evals";
import EvalsManager from "@/components/admin/EvalsManager";

export const metadata = {
  title: "RAG Evals & Benchmarks | Soli Admin",
  description: "Test and benchmark RAG generation groundedness, citations, and recall across legal queries.",
};

export default async function AdminEvalsPage() {
  await requireAdmin();
  const testCases = await listEvalTestCases();

  return <EvalsManager initialTests={testCases} />;
}
