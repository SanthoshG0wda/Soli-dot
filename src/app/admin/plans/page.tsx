import { requireAdmin } from "@/lib/auth";
import { listPlanConfigs } from "@/server/plans";
import PlansManager from "@/components/admin/PlansManager";

export const metadata = {
  title: "SaaS Plans & Quotas | Soli Admin",
  description: "Configure SaaS tiers, monthly token budgets, document caps, and member seat quotas.",
};

export default async function AdminPlansPage() {
  await requireAdmin();
  const plans = await listPlanConfigs();

  return <PlansManager initialPlans={plans} />;
}
