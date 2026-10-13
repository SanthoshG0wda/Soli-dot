import "server-only";

import crypto from "node:crypto";
import { env } from "@/env";

export type UserRole = "admin" | "user";

/** Emails listed in ADMIN_EMAILS are granted the admin role on signup. */
export function isAdminEmail(email: string): boolean {
  const allowlist = env.ADMIN_EMAILS.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  return allowlist.includes(email.toLowerCase());
}

function inviteCodes(): string[] {
  return env.SIGNUP_INVITE_CODES.split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function allowedDomains(): string[] {
  return env.SIGNUP_ALLOWED_DOMAINS.split(",")
    .map((entry) => entry.trim().toLowerCase().replace(/^@/, ""))
    .filter((entry) => entry.length > 0);
}

/** What the signup gate requires. Invite codes win over domain allowlists. */
export function signupPolicy(): { inviteRequired: boolean; domains: string[] } {
  const codes = inviteCodes();
  if (codes.length > 0) return { inviteRequired: true, domains: [] };
  return { inviteRequired: false, domains: allowedDomains() };
}

/** Returns an error message when signup must be refused, or null when allowed. */
export function checkSignupAccess(email: string, inviteCode: string): string | null {
  const codes = inviteCodes();
  if (codes.length > 0) {
    const ok = codes.some((code) => code.length === inviteCode.trim().length && crypto.timingSafeEqual(Buffer.from(code), Buffer.from(inviteCode.trim())));
    return ok ? null : "A valid invite code is required to create an account.";
  }
  const domains = allowedDomains();
  if (domains.length > 0) {
    const domain = email.toLowerCase().split("@")[1] ?? "";
    return domains.includes(domain) ? null : "Accounts are limited to approved firm email domains.";
  }
  return null;
}
