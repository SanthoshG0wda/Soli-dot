"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Section } from "@/components/SettingsKit";
import type { RagLimits } from "@/server/limits";

type Bounds = Record<keyof RagLimits, { min: number; max: number }>;

const FIELDS: { key: keyof RagLimits; label: string; hint: string; step: string }[] = [
  { key: "topK", label: "Top K chunks", hint: "Chunks retrieved per question", step: "1" },
  { key: "contextMaxChars", label: "Context budget (chars)", hint: "Max retrieved text per answer", step: "500" },
  { key: "chunkMaxChars", label: "Chunk cap (chars)", hint: "Max chars kept per chunk", step: "100" },
  { key: "temperature", label: "Answer temperature", hint: "0 = strict, 2 = creative", step: "0.1" },
  { key: "minScore", label: "Similarity floor", hint: "Chunks below this never reach the model", step: "0.05" },
];

export default function LimitsManager({
  effective,
  stored,
  bounds,
  envDefaults,
  description,
}: {
  effective: RagLimits;
  stored: Record<keyof RagLimits, string | null>;
  bounds: Bounds;
  envDefaults: RagLimits;
  description: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<keyof RagLimits, string>>({
    topK: stored.topK ?? "",
    contextMaxChars: stored.contextMaxChars ?? "",
    chunkMaxChars: stored.chunkMaxChars ?? "",
    temperature: stored.temperature ?? "",
    minScore: stored.minScore ?? "",
  });
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    setNotice(null);
    start(async () => {
      const body: Record<string, string | null> = {};
      for (const f of FIELDS) {
        const v = values[f.key].trim();
        body[f.key] = v === "" ? null : v;
      }
      const res = await fetch("/api/admin/limits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice({ tone: "err", text: json.error ?? "Save failed." });
        return;
      }
      setNotice({ tone: "ok", text: "Budgets saved — next answer uses them." });
      router.refresh();
    });
  };

  return (
    <div>
      <Section eyebrow="Budgets" title="Retrieval & token budgets" description={description}>
        <div className="surface space-y-3 p-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="grid grid-cols-[1fr_140px] items-center gap-3">
              <span>
                <span className="block text-[14px] font-medium">{f.label}</span>
                <span className="block text-[12px] text-foreground/50">
                  {f.hint} · range {bounds[f.key].min}–{bounds[f.key].max} · env default {envDefaults[f.key]} · effective{" "}
                  {effective[f.key]}
                </span>
              </span>
              <input
                className="field font-mono"
                type="number"
                step={f.step}
                min={bounds[f.key].min}
                max={bounds[f.key].max}
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={`default ${envDefaults[f.key]}`}
                aria-label={f.label}
              />
            </label>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button className="btn-primary h-9 px-4 text-[14px]" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save budgets"}
            </button>
            {notice && (
              <p className={`text-body-sm ${notice.tone === "ok" ? "text-success" : "text-destructive"}`} role="status">
                {notice.text}
              </p>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
