import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { listPlanConfigs, updatePlanConfig } from "@/server/plans";
import { PlanTier, type PlanTierValue } from "@/db/schema";

export const runtime = "nodejs";

const updatePlanSchema = z.object({
  tier: z.enum([PlanTier.Free, PlanTier.Starter, PlanTier.Pro, PlanTier.Enterprise]),
  name: z.string().trim().min(1).optional(),
  monthlyPriceUsd: z.number().int().min(0).optional(),
  monthlyTokens: z.number().int().min(10000).optional(),
  maxDocuments: z.number().int().min(1).optional(),
  maxSeats: z.number().int().min(1).optional(),
  topKLimit: z.number().int().min(1).max(20).optional(),
  allowedModels: z.string().optional(),
});

export async function GET() {
  const user = await requireAdmin().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await listPlanConfigs();
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const user = await requireAdmin().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = updatePlanSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid plan update data" },
      { status: 400 },
    );
  }

  const { tier, ...updates } = parsed.data;
  await updatePlanConfig(tier as PlanTierValue, updates);
  const updatedPlans = await listPlanConfigs();
  return NextResponse.json({ plans: updatedPlans, success: true });
}
