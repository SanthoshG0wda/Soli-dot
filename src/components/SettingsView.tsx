"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Bell } from "lucide-react";
import { setAntigravityKey, setCloudKey, setDefaultModel, setGroqKey, setNvidiaKey, setOpenAIKey, setOpenRouterKey } from "@/app/actions";
import { useStore } from "@/lib/store";
import { PageHeader, RuleEditor, Section } from "./SettingsKit";
import ModelPicker from "./ModelPicker";

const noop = () => () => {};
const notificationPermission = () => ("Notification" in window ? Notification.permission : "unsupported");

export default function SettingsView() {
  const computer = useStore((s) => s.computer);
  const permission = useSyncExternalStore(noop, notificationPermission, () => "default");
  const [, force] = useState(0);
  const [pending, start] = useTransition();
  // Engine (provider keys, model defaults) is operator-only: regular users
  // never see it — Soli decides what models they run on.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => {
        if ((j as { user?: { role?: unknown } } | null)?.user?.role === "admin") setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="rails mx-auto min-h-full max-w-[1080px] px-4 sm:px-8 pb-16">
        <PageHeader
          eyebrow="Settings"
          title="Settings"
          description={
            isAdmin
              ? "Rules that apply to all counsel, notifications, and engine models."
              : "Rules that apply to all counsel, and notification preferences."
          }
        />

        <Section eyebrow="Approvals" title="Rules for all counsel" description="These guidelines and approval gates apply across all legal personas.">
          <RuleEditor dotId={null} name="a counsel" />
        </Section>

        <Section eyebrow="Notifications" title="Desktop notifications" description={'Get notified when legal research or document generation finishes, like "Your petition draft is ready".'}>
          <div className="surface flex items-center gap-3 p-4">
            <Bell className="size-4 text-foreground/50" strokeWidth={1.5} />
            <span className="flex-1 text-body-sm">
              {permission === "granted"
                ? "Notifications are on."
                : permission === "denied"
                  ? "Notifications are blocked in your browser settings for this site."
                  : permission === "unsupported"
                    ? "This browser doesn't support notifications."
                    : "Notifications are off."}
            </span>
            {permission === "default" && (
              <button className="btn-primary h-8 px-3 text-[13px]" onClick={() => Notification.requestPermission().then(() => force((n) => n + 1))}>
                Turn on
              </button>
            )}
            {permission === "granted" && <span className="rounded-xs bg-success/12 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-success uppercase">On</span>}
          </div>
        </Section>

        {isAdmin && (
          <Section eyebrow="Engine" title="Models & Inference" description="Operator-only: provider keys and the deployment model default live here. Regular counsel never see this section.">
            <ApiKey />
            <GroqKey />
            <NvidiaKey />
            <AntigravityKey />
            <OpenModelsKey />
            <CloudKey />
            <div className="surface mb-3 flex items-center gap-3 p-4">
              <div className="flex-1">
                <div className="text-[14px]">Default model</div>
                <div className="text-body-sm text-foreground/55">Your chamber fallback default model.</div>
              </div>
              <ModelPicker allowDefault={false} value={computer.model || null} onChange={(m) => start(() => setDefaultModel(m))} />
            </div>
            <dl className="surface divide-y divide-black/[0.06]">
              {[
                ["Models on your key", computer.models.length ? `${computer.models.length} available` : "Loading…", true],
              ].map(([k, v, ok]) => (
                <div key={String(k)} className="flex items-center gap-4 px-4 py-2.5">
                  <dt className="eyebrow w-36 shrink-0">{k}</dt>
                  <dd className={`flex-1 text-body-sm ${ok ? "" : "text-warning"}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
      </div>
    </div>
  );
}

/** The OpenAI key: paste it here (stored encrypted), unless it comes from OPENAI_API_KEY. */
function ApiKey() {
  const computer = useStore((s) => s.computer);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const open = editing || !computer.hasKey;

  return (
    <div id="api-key" className="surface mb-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[14px]">OpenAI API key</div>
          <div className={`text-body-sm ${computer.hasKey ? "text-foreground/55" : "text-warning"}`}>
            {computer.keySource === "env"
              ? "Connected from OPENAI_API_KEY."
              : computer.hasKey
                ? "Connected. Stored encrypted on this computer."
                : "Optional — only needed for OpenAI models and computer-use. Voice calls work on any provider (browser voice); OpenAI adds realtime voice."}
          </div>
        </div>
        {computer.hasKey && computer.keySource !== "env" && !editing && (
          <button className="btn-secondary h-8 px-3 text-[13px]" onClick={() => setEditing(true)}>
            Change
          </button>
        )}
      </div>
      {open && computer.keySource !== "env" && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const err = await setOpenAIKey(key);
              setError(err);
              if (!err) { setKey(""); setEditing(false); }
            });
          }}
        >
          <input className="field font-mono text-[13px]" type="password" aria-label="sk-..." placeholder="sk-..." value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <button className="btn-primary shrink-0" disabled={pending || !key.trim()}>
            {pending ? "Checking…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-caption text-destructive">{error}</p>}
    </div>
  );
}

/** Optional E2B key: each dot gets a cloud computer that keeps working while this Mac sleeps. */
function CloudKey() {
  const computer = useStore((s) => s.computer);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const saved = computer.cloudKey !== null;
  const save = (value: string) =>
    start(async () => {
      const err = await setCloudKey(value);
      setError(err);
      if (!err) { setKey(""); setEditing(false); }
    });

  return (
    <div id="cloud-key" className="surface mb-3 scroll-mt-6 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[14px]">
            Cloud computers <span className="text-foreground/40">· optional</span>
          </div>
          <div className="text-body-sm text-foreground/55">
            {computer.cloudKey === "env"
              ? "Connected from E2B_API_KEY."
              : saved
                ? "Connected. Each dot gets its own E2B cloud computer that keeps working while your Mac sleeps."
                : "Paste an E2B API key (from e2b.dev) to give each dot a cloud computer that keeps working while your Mac sleeps."}
          </div>
        </div>
        {computer.cloudKey === "settings" && !editing && (
          <>
            <button className="btn-quiet h-8 px-3 text-[13px]" disabled={pending} onClick={() => save("")}>
              Remove
            </button>
            <button className="btn-secondary h-8 px-3 text-[13px]" onClick={() => setEditing(true)}>
              Change
            </button>
          </>
        )}
      </div>
      {(editing || !saved) && computer.cloudKey !== "env" && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(key);
          }}
        >
          <input className="field font-mono text-[13px]" type="password" aria-label="e2b_..." placeholder="e2b_..." value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <button className="btn-primary shrink-0" disabled={pending || !key.trim()}>
            {pending ? "Checking…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-caption text-destructive">{error}</p>}
    </div>
  );
}

/** Optional NVIDIA key: adds NIM models (Llama, Mistral, DeepSeek, Qwen, Nemotron, gpt-oss…) to every model picker. */
function NvidiaKey() {
  const computer = useStore((s) => s.computer);
  const nimCount = computer.models.filter((m) => m.startsWith("nvidia:")).length;
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const saved = computer.nvidia !== null;
  const save = (value: string) =>
    start(async () => {
      const err = await setNvidiaKey(value);
      setError(err);
      if (!err) { setKey(""); setEditing(false); }
    });

  return (
    <div id="nvidia-models" className="surface mb-3 scroll-mt-6 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[14px]">
            NVIDIA NIM <span className="text-foreground/40">· optional</span>
          </div>
          <div className="text-body-sm text-foreground/55">
            {computer.nvidia === "env"
              ? `Connected from NVIDIA_API_KEY${nimCount ? ` · ${nimCount} NIM models in the model picker` : ""}.`
              : saved
                ? `Connected${nimCount ? ` · ${nimCount} NIM models in the model picker` : ""}. Voice calls still use OpenAI.`
                : "Paste an NVIDIA key (from build.nvidia.com) to run dots on NIM models like Llama, Mistral, DeepSeek, Qwen and Nemotron."}
          </div>
        </div>
        {computer.nvidia === "settings" && !editing && (
          <>
            <button className="btn-quiet h-8 px-3 text-[13px]" disabled={pending} onClick={() => save("")}>
              Remove
            </button>
            <button className="btn-secondary h-8 px-3 text-[13px]" onClick={() => setEditing(true)}>
              Change
            </button>
          </>
        )}
      </div>
      {(editing || !saved) && computer.nvidia !== "env" && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(key);
          }}
        >
          <input className="field font-mono text-[13px]" type="password" aria-label="NVIDIA API key" placeholder="nvapi-..." value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <button className="btn-primary shrink-0" disabled={pending || !key.trim()}>
            {pending ? "Checking…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-caption text-destructive">{error}</p>}
    </div>
  );
}

/** Optional OpenRouter key: adds open models (Qwen, DeepSeek, Kimi, GLM, Llama, gpt-oss…) to every model picker. */
function OpenModelsKey() {
  const computer = useStore((s) => s.computer);
  const openCount = computer.models.filter((m) => m.startsWith("openrouter:")).length;
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const saved = computer.openRouter !== null;
  const save = (value: string) =>
    start(async () => {
      const err = await setOpenRouterKey(value);
      setError(err);
      if (!err) { setKey(""); setEditing(false); }
    });

  return (
    <div id="open-models" className="surface mb-3 scroll-mt-6 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[14px]">
            Open models <span className="text-foreground/40">· optional</span>
          </div>
          <div className="text-body-sm text-foreground/55">
            {computer.openRouter === "env"
              ? `Connected from OPENROUTER_API_KEY${openCount ? ` · ${openCount} open models in the model picker` : ""}.`
              : saved
                ? `Connected${openCount ? ` · ${openCount} open models in the model picker` : ""}. Voice calls still use OpenAI.`
                : "Paste an OpenRouter key (from openrouter.ai) to run dots on open models like Qwen, DeepSeek, Kimi, GLM and Llama."}
          </div>
        </div>
        {computer.openRouter === "settings" && !editing && (
          <>
            <button className="btn-quiet h-8 px-3 text-[13px]" disabled={pending} onClick={() => save("")}>
              Remove
            </button>
            <button className="btn-secondary h-8 px-3 text-[13px]" onClick={() => setEditing(true)}>
              Change
            </button>
          </>
        )}
      </div>
      {(editing || !saved) && computer.openRouter !== "env" && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(key);
          }}
        >
          <input className="field font-mono text-[13px]" type="password" aria-label="sk-or-..." placeholder="sk-or-..." value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <button className="btn-primary shrink-0" disabled={pending || !key.trim()}>
            {pending ? "Checking…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-caption text-destructive">{error}</p>}
    </div>
  );
}

/** Main provider: Groq fast inference (Llama, gpt-oss, Qwen…). */
function GroqKey() {
  const computer = useStore((s) => s.computer);
  const count = computer.models.filter((m) => m.startsWith("groq:")).length;
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const saved = computer.groq !== null;
  const save = (value: string) =>
    start(async () => {
      const err = await setGroqKey(value);
      setError(err);
      if (!err) { setKey(""); setEditing(false); }
    });

  return (
    <div id="groq-models" className="surface mb-3 scroll-mt-6 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[14px]">
            Groq <span className="text-foreground/40">· main provider</span>
          </div>
          <div className="text-body-sm text-foreground/55">
            {computer.groq === "env"
              ? `Connected from GROQ_API_KEY${count ? ` · ${count} Groq models in the model picker` : ""}.`
              : saved
                ? `Connected${count ? ` · ${count} Groq models in the model picker` : ""}. Voice calls still use OpenAI.`
                : "Paste a Groq key (from console.groq.com/keys) to run dots on fast models like Llama 3.3 70B and gpt-oss."}
          </div>
        </div>
        {computer.groq === "settings" && !editing && (
          <>
            <button className="btn-quiet h-8 px-3 text-[13px]" disabled={pending} onClick={() => save("")}>
              Remove
            </button>
            <button className="btn-secondary h-8 px-3 text-[13px]" onClick={() => setEditing(true)}>
              Change
            </button>
          </>
        )}
      </div>
      {(editing || !saved) && computer.groq !== "env" && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(key);
          }}
        >
          <input className="field font-mono text-[13px]" type="password" aria-label="gsk-..." placeholder="gsk-..." value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <button className="btn-primary shrink-0" disabled={pending || !key.trim()}>
            {pending ? "Checking…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-caption text-destructive">{error}</p>}
    </div>
  );
}

/** Main provider: Antigravity via Gemini API (Gemini / Antigravity models). */
function AntigravityKey() {
  const computer = useStore((s) => s.computer);
  const count = computer.models.filter((m) => m.startsWith("antigravity:")).length;
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const saved = computer.antigravity !== null;
  const save = (value: string) =>
    start(async () => {
      const err = await setAntigravityKey(value);
      setError(err);
      if (!err) { setKey(""); setEditing(false); }
    });

  return (
    <div id="antigravity-models" className="surface mb-3 scroll-mt-6 p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[14px]">
            Antigravity <span className="text-foreground/40">· main provider</span>
          </div>
          <div className="text-body-sm text-foreground/55">
            {computer.antigravity === "env"
              ? `Connected from GEMINI_API_KEY${count ? ` · ${count} Antigravity models in the model picker` : ""}.`
              : saved
                ? `Connected${count ? ` · ${count} Antigravity models in the model picker` : ""}. Voice calls still use OpenAI.`
                : "Paste a Gemini key (from AI Studio) to run dots on Antigravity / Gemini models."}
          </div>
        </div>
        {computer.antigravity === "settings" && !editing && (
          <>
            <button className="btn-quiet h-8 px-3 text-[13px]" disabled={pending} onClick={() => save("")}>
              Remove
            </button>
            <button className="btn-secondary h-8 px-3 text-[13px]" onClick={() => setEditing(true)}>
              Change
            </button>
          </>
        )}
      </div>
      {(editing || !saved) && computer.antigravity !== "env" && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(key);
          }}
        >
          <input className="field font-mono text-[13px]" type="password" aria-label="Gemini API key" placeholder="AIza-..." value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
          <button className="btn-primary shrink-0" disabled={pending || !key.trim()}>
            {pending ? "Checking…" : "Save"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-caption text-destructive">{error}</p>}
    </div>
  );
}
