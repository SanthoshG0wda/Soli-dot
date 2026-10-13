"use client";

import { useState } from "react";
import type { PlanConfigItem } from "@/server/plans";
import type { PlanTierValue } from "@/db/schema";

interface Props {
  initialPlans: PlanConfigItem[];
}

export default function PlansManager({ initialPlans }: Props) {
  const [plans, setPlans] = useState<PlanConfigItem[]>(initialPlans);
  const [editingTier, setEditingTier] = useState<PlanTierValue | null>(null);

  // Edit form state
  const [name, setName] = useState("");
  const [monthlyPriceUsd, setMonthlyPriceUsd] = useState(0);
  const [monthlyTokens, setMonthlyTokens] = useState(0);
  const [maxDocuments, setMaxDocuments] = useState(0);
  const [maxSeats, setMaxSeats] = useState(0);
  const [topKLimit, setTopKLimit] = useState(5);
  const [allowedModels, setAllowedModels] = useState("standard");
  const [saving, setSaving] = useState(false);

  const startEdit = (plan: PlanConfigItem) => {
    setEditingTier(plan.tier);
    setName(plan.name);
    setMonthlyPriceUsd(plan.monthlyPriceUsd);
    setMonthlyTokens(plan.monthlyTokens);
    setMaxDocuments(plan.maxDocuments);
    setMaxSeats(plan.maxSeats);
    setTopKLimit(plan.topKLimit);
    setAllowedModels(plan.allowedModels);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: editingTier,
          name,
          monthlyPriceUsd,
          monthlyTokens,
          maxDocuments,
          maxSeats,
          topKLimit,
          allowedModels,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
        setEditingTier(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update plan");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-black/[0.08] bg-black/[0.02] p-5">
        <h2 className="text-h2 font-semibold">SaaS Plans, Quotas & Token Limits</h2>
        <p className="mt-1 text-body-sm text-foreground/60">
          Configure subscription tier allowances, monthly token quotas, document limits, team seats, and model access levels for customers.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <div
            key={p.tier}
            className="flex flex-col justify-between rounded-xl border border-black/[0.08] bg-background p-5 shadow-sm transition hover:border-black/25"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded bg-black/[0.06] px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-foreground/75">
                  {p.tier}
                </span>
                <span className="text-lg font-bold">
                  {p.monthlyPriceUsd === 0 ? "Free" : `$${p.monthlyPriceUsd}/mo`}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground">{p.name}</h3>

              <div className="mt-4 space-y-2 border-t border-black/[0.06] pt-3 text-xs text-foreground/70">
                <div className="flex justify-between">
                  <span className="text-foreground/50">Token Budget:</span>
                  <span className="font-medium text-foreground">
                    {(p.monthlyTokens / 1_000_000).toFixed(1)}M tokens/mo
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50">Max Documents:</span>
                  <span className="font-medium text-foreground">{p.maxDocuments} files</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50">Team Seats:</span>
                  <span className="font-medium text-foreground">{p.maxSeats} seat{p.maxSeats > 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50">Top-K Retrieval:</span>
                  <span className="font-medium text-foreground">Top {p.topKLimit} chunks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/50">Model Class:</span>
                  <span className="font-medium uppercase text-foreground">{p.allowedModels}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => startEdit(p)}
              className="mt-5 w-full rounded-lg border border-black/10 py-1.5 text-xs font-medium transition hover:bg-black/[0.04]"
            >
              Configure Limits
            </button>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-black/10 bg-background p-6 shadow-xl">
            <h3 className="text-h3 font-semibold">Edit {editingTier.toUpperCase()} Plan Limits</h3>
            <p className="mt-1 text-xs text-foreground/60">
              Changes take effect immediately for all organizations on this subscription tier.
            </p>

            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground/70">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground/70">Price ($/month)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={monthlyPriceUsd}
                    onChange={(e) => setMonthlyPriceUsd(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/70">Monthly Token Allowance</label>
                  <input
                    type="number"
                    step={50000}
                    min={10000}
                    required
                    value={monthlyTokens}
                    onChange={(e) => setMonthlyTokens(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground/70">Max Legal Documents</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={maxDocuments}
                    onChange={(e) => setMaxDocuments(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/70">Max Team Seats</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={maxSeats}
                    onChange={(e) => setMaxSeats(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground/70">Top-K Retrieval Limit</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={topKLimit}
                    onChange={(e) => setTopKLimit(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/70">Model Class Access</label>
                  <select
                    value={allowedModels}
                    onChange={(e) => setAllowedModels(e.target.value)}
                    className="mt-1 w-full rounded-md border border-black/15 bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                  >
                    <option value="standard">Standard (Nemotron/Llama)</option>
                    <option value="advanced">Advanced (GPT-4o/Claude)</option>
                    <option value="all">All Models + BYOK</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Limits"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
