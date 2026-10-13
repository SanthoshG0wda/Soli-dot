import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { planConfigs, PlanTier, type PlanTierValue } from "@/db/schema";

export interface PlanConfigItem {
  tier: PlanTierValue;
  name: string;
  monthlyPriceUsd: number;
  monthlyTokens: number;
  maxDocuments: number;
  maxSeats: number;
  topKLimit: number;
  allowedModels: string;
  features: string[];
  updatedAt: string;
}

const DEFAULT_PLANS: Array<{
  tier: PlanTierValue;
  name: string;
  monthlyPriceUsd: number;
  monthlyTokens: number;
  maxDocuments: number;
  maxSeats: number;
  topKLimit: number;
  allowedModels: string;
  features: string[];
}> = [
  {
    tier: PlanTier.Free,
    name: "Free Trial",
    monthlyPriceUsd: 0,
    monthlyTokens: 250_000,
    maxDocuments: 10,
    maxSeats: 1,
    topKLimit: 3,
    allowedModels: "standard",
    features: [
      "250k monthly tokens",
      "10 legal matter documents",
      "Basic similarity search",
      "Community support",
    ],
  },
  {
    tier: PlanTier.Starter,
    name: "Solo Practitioner",
    monthlyPriceUsd: 49,
    monthlyTokens: 2_000_000,
    maxDocuments: 100,
    maxSeats: 2,
    topKLimit: 5,
    allowedModels: "standard",
    features: [
      "2 Million monthly tokens",
      "100 legal matter files",
      "2 team seats",
      "Top-5 verified citation receipts",
      "Standard email support",
    ],
  },
  {
    tier: PlanTier.Pro,
    name: "Law Firm Pro",
    monthlyPriceUsd: 199,
    monthlyTokens: 10_000_000,
    maxDocuments: 1_000,
    maxSeats: 10,
    topKLimit: 8,
    allowedModels: "advanced",
    features: [
      "10 Million monthly tokens",
      "1,000 legal matter files",
      "10 firm members",
      "Top-8 deep citation retrieval",
      "Advanced reasoning models",
      "Priority SLA support",
    ],
  },
  {
    tier: PlanTier.Enterprise,
    name: "Enterprise Partner",
    monthlyPriceUsd: 599,
    monthlyTokens: 50_000_000,
    maxDocuments: 10_000,
    maxSeats: 50,
    topKLimit: 12,
    allowedModels: "all",
    features: [
      "50 Million monthly tokens",
      "Unlimited matter document storage",
      "50 firm member seats",
      "Custom retrieval pipelines & rerankers",
      "Bring-Your-Own-Key (BYOK) Azure/AWS",
      "Dedicated account manager",
    ],
  },
];

export async function ensurePlanSeeds(): Promise<void> {
  const existing = await db.select({ tier: planConfigs.tier }).from(planConfigs).limit(1);
  if (existing.length === 0) {
    for (const plan of DEFAULT_PLANS) {
      await db
        .insert(planConfigs)
        .values({
          tier: plan.tier,
          name: plan.name,
          monthlyPriceUsd: plan.monthlyPriceUsd,
          monthlyTokens: plan.monthlyTokens,
          maxDocuments: plan.maxDocuments,
          maxSeats: plan.maxSeats,
          topKLimit: plan.topKLimit,
          allowedModels: plan.allowedModels,
          features: JSON.stringify(plan.features),
        })
        .onConflictDoNothing();
    }
  }
}

export async function listPlanConfigs(): Promise<PlanConfigItem[]> {
  await ensurePlanSeeds();
  const rows = await db.select().from(planConfigs).orderBy(asc(planConfigs.monthlyPriceUsd));
  return rows.map((r) => {
    let features: string[] = [];
    try {
      features = JSON.parse(r.features);
    } catch {
      features = [];
    }
    return {
      tier: r.tier as PlanTierValue,
      name: r.name,
      monthlyPriceUsd: r.monthlyPriceUsd,
      monthlyTokens: r.monthlyTokens,
      maxDocuments: r.maxDocuments,
      maxSeats: r.maxSeats,
      topKLimit: r.topKLimit,
      allowedModels: r.allowedModels,
      features,
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}

export async function updatePlanConfig(
  tier: PlanTierValue,
  updates: Partial<Omit<PlanConfigItem, "tier" | "updatedAt">>,
): Promise<void> {
  await db
    .update(planConfigs)
    .set({
      ...(updates.name ? { name: updates.name } : {}),
      ...(updates.monthlyPriceUsd !== undefined ? { monthlyPriceUsd: updates.monthlyPriceUsd } : {}),
      ...(updates.monthlyTokens !== undefined ? { monthlyTokens: updates.monthlyTokens } : {}),
      ...(updates.maxDocuments !== undefined ? { maxDocuments: updates.maxDocuments } : {}),
      ...(updates.maxSeats !== undefined ? { maxSeats: updates.maxSeats } : {}),
      ...(updates.topKLimit !== undefined ? { topKLimit: updates.topKLimit } : {}),
      ...(updates.allowedModels ? { allowedModels: updates.allowedModels } : {}),
      ...(updates.features ? { features: JSON.stringify(updates.features) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(planConfigs.tier, tier));
}
