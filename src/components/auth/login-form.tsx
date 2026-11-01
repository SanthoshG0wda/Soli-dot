"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";

function safeNext(value: string | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/";
}

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Login failed. Please try again.");
        return;
      }
      // Full-page navigation (not router.push): guarantees the browser
      // issues a fresh top-level request carrying the newly set session
      // cookie, so proxy.ts sees the session on the first try.
      window.location.assign(safeNext(next));
      return;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="animate-auth-rise rounded-2xl border border-white/10 bg-[#222220] p-7 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.8)] sm:p-8">
      <p className="font-mono text-[11px] tracking-wider text-[#db7a5c] uppercase">Welcome back</p>
      <h2 className="mt-3 font-serif text-[32px] leading-none tracking-[-0.04em] text-[#f1efea]">Log in to Soli</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-white/55">
        Access your matters, research, and legal documents.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate={false}>
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block font-sans text-[13px] font-medium text-white/85"
          >
            Work email
          </label>
          <div className="relative">
            <Mail
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/35"
            />
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@firm.com"
              aria-invalid={error ? true : undefined}
              className="field auth-field h-11 border-white/10 bg-[#1c1c1b] pl-9"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label
              htmlFor="login-password"
              className="block font-sans text-[13px] font-medium text-white/85"
            >
              Password
            </label>
            <span className="font-sans text-[12px] text-foreground/45">
              Case-sensitive
            </span>
          </div>
          <div className="relative">
            <Lock
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/35"
            />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="field auth-field h-11 border-white/10 bg-[#1c1c1b] pr-11 pl-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-md text-foreground/45 transition-colors hover:bg-black/[0.04] hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p
            id="login-error"
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/[0.07] px-3 py-2.5 font-sans text-[13px] leading-snug text-destructive"
          >
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-brand group h-11 w-full text-[15px] shadow-[0_12px_28px_-12px_rgba(219,122,92,0.8)]"
        >
          {pending ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Logging in…
            </>
          ) : (
            <>
              Log in
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-black/[0.08]" />
        <span className="font-mono text-[11px] tracking-wider text-foreground/40 uppercase">
          New to Soli?
        </span>
        <span className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <Link href="/signup" className="btn-secondary h-11 w-full text-[14px]">
        Create an account
      </Link>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center font-sans text-[12px] text-foreground/50">
        <ShieldCheck aria-hidden className="size-3.5 text-success" />
        Confidential by design — matters stay private to your account.
      </p>
    </div>
  );
}
