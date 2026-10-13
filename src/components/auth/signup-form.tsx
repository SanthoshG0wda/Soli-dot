"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Ticket,
  User,
} from "lucide-react";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRequired, setInviteRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/register")
      .then((r) => r.json() as Promise<{ inviteRequired?: boolean }>)
      .then((d) => setInviteRequired(d.inviteRequired === true))
      .catch(() => {});
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteCode }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Signup failed. Please try again.");
        return;
      }
      // Full-page navigation (not router.push): guarantees the browser
      // issues a fresh top-level request carrying the newly set session
      // cookie, so proxy.ts sees the session on the first try.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload is required here; router.push can race the freshly set session cookie
      window.location.assign("/");
      return;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface shadow-elevated animate-auth-rise p-7 sm:p-8">
      <p className="eyebrow">Get started</p>
      <h2 className="text-h1 mt-2">Create your account</h2>
      <p className="text-body-sm mt-1.5 text-foreground/55">
        Join Soli to build your law firm&apos;s legal AI workspace.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label
            htmlFor="signup-name"
            className="mb-1.5 block font-sans text-[13px] font-medium text-foreground"
          >
            Full name
          </label>
          <div className="relative">
            <User
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/35"
            />
            <input
              id="signup-name"
              type="text"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ada Lovelace"
              className="field h-11 pl-9"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="signup-email"
            className="mb-1.5 block font-sans text-[13px] font-medium text-foreground"
          >
            Work email
          </label>
          <div className="relative">
            <Mail
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/35"
            />
            <input
              id="signup-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@firm.com"
              className="field h-11 pl-9"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="signup-password"
            className="mb-1.5 block font-sans text-[13px] font-medium text-foreground"
          >
            Password
          </label>
          <div className="relative">
            <Lock
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/35"
            />
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8+ characters, letters and numbers"
              aria-describedby={error ? "signup-error" : "signup-password-hint"}
              className="field h-11 pr-11 pl-9"
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
          <p
            id="signup-password-hint"
            className="mt-1.5 font-sans text-[12px] text-foreground/45"
          >
            Minimum 8 characters — mix letters and numbers.
          </p>
        </div>
        {inviteRequired && (
          <div>
            <label
              htmlFor="signup-invite"
              className="mb-1.5 block font-sans text-[13px] font-medium text-foreground"
            >
              Invite code
            </label>
            <div className="relative">
              <Ticket
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground/35"
              />
              <input
                id="signup-invite"
                type="text"
                name="inviteCode"
                autoComplete="off"
                required
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Ask your firm admin for a code"
                className="field h-11 pl-9"
              />
            </div>
          </div>
        )}
        {error && (
          <p
            id="signup-error"
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
          className="btn-brand group h-11 w-full text-[15px]"
        >
          {pending ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Sign up
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
          Have an account?
        </span>
        <span className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <Link href="/login" className="btn-secondary h-11 w-full text-[14px]">
        Log in instead
      </Link>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center font-sans text-[12px] text-foreground/50">
        <ShieldCheck aria-hidden className="size-3.5 text-success" />
        Confidential by design — matters stay private to your account.
      </p>
    </div>
  );
}
