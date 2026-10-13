import { requireAdmin } from "@/lib/auth";
import { effectiveRagLimits, LIMIT_BOUNDS, LIMIT_DEFAULTS, storedLimitOverrides } from "@/server/limits";
import LimitsManager from "@/components/admin/LimitsManager";

export default async function LimitsPage() {
  await requireAdmin();
  return (
    <LimitsManager
      effective={effectiveRagLimits()}
      stored={storedLimitOverrides()}
      bounds={LIMIT_BOUNDS}
      envDefaults={LIMIT_DEFAULTS}
      description="Budgets apply deployment-wide to every legal answer. Clearing a field restores its env default. Values clamp to the shown ranges so a typo can't break retrieval."
    />
  );
}
