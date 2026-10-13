"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Empty, Section } from "@/components/SettingsKit";

export default function ModelsManager({
  initial,
  available,
  env,
  description,
}: {
  initial: { main: string | null; review: string | null };
  available: string[];
  env: { main: string | null; review: string | null };
  description: string;
}) {
  const router = useRouter();
  const [main, setMain] = useState(initial.main ?? "");
  const [review, setReview] = useState(initial.review ?? "");
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () => {
    setNotice(null);
    start(async () => {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ main: main.trim() || null, review: review.trim() || null }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice({ tone: "err", text: json.error ?? "Save failed." });
        return;
      }
      setNotice({ tone: "ok", text: "Deployment defaults saved." });
      router.refresh();
    });
  };

  return (
    <div>
      <Section eyebrow="Defaults" title="Deployment model defaults" description={description}>
        <div className="surface space-y-3 p-4">
          <label className="block">
            <span className="eyebrow mb-1.5 block">Main default {env.main ? `(env: ${env.main})` : "(no env override)"}</span>
            <input
              className="field font-mono"
              list="admin-models"
              value={main}
              onChange={(e) => setMain(e.target.value)}
              placeholder="e.g. groq:llama-3.3-70b-versatile — empty clears"
              aria-label="Global main model default"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block">Review default {env.review ? `(env: ${env.review})` : "(no env override)"}</span>
            <input
              className="field font-mono"
              list="admin-models"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="e.g. groq:llama-3.1-8b-instant — empty clears"
              aria-label="Global review model default"
            />
          </label>
          <datalist id="admin-models">
            {available.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <div className="flex items-center gap-2">
            <button className="btn-primary h-9 px-4 text-[14px]" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save defaults"}
            </button>
            {notice && (
              <p className={`text-body-sm ${notice.tone === "ok" ? "text-success" : "text-destructive"}`} role="status">
                {notice.text}
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Catalog"
        title={`Available models (${available.length})`}
        description="Resolved with your admin keys right now. Dots on other users' keys may see a different set."
      >
        {available.length === 0 ? (
          <Empty>No models resolved. Add a provider key in Settings first.</Empty>
        ) : (
          <div className="surface max-h-96 divide-y divide-black/[0.06] overflow-y-auto">
            {available.map((m) => (
              <div key={m} className="flex items-center gap-2 px-3 py-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{m}</code>
                <button
                  className="btn-quiet h-7 shrink-0 px-2 text-[12px]"
                  onClick={() => setMain(m)}
                  title={`Use ${m} as the global main default`}
                >
                  Use as main
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
