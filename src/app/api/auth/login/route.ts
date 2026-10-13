import "server-only";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, loginSchema, verifyPassword } from "@/lib/auth";
import { setUserSetting } from "@/server/db";
import { models } from "@/server/agent/client";
import {
  addMessage,
  claimUnowned,
  createConversation,
  createDot,
  listDots,
} from "@/server/repo";
import { env } from "@/env";
import { DEFAULT_LOOK } from "@/lib/look";

// In-memory rate limiter for demo (resets on server restart).
// Tracks failed logins per IP; throttles after 20 rapid bad attempts.
const failedLogins = new Map<string, { count: number; first: number }>();

function trackFailedLogin(ip: string) {
  const entry = failedLogins.get(ip) ?? { count: 0, first: Date.now() };
  entry.count++;
  if (entry.count === 1) entry.first = Date.now();
  failedLogins.set(ip, entry);
}

function isRateLimited(ip: string): boolean {
  const entry = failedLogins.get(ip);
  if (!entry) return false;
  // Throttle if 20+ failures in the last 5 minutes.
  return entry.count >= 20 && Date.now() - entry.first < 5 * 60 * 1000;
}

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  // Get client IP for rate limiting (Next.js may use proxy, fall back to remoteAddress).
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const realIp = (request as any).headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || (request as any).socket?.remoteAddress || "unknown-ip";
  /* eslint-enable @typescript-eslint/no-explicit-any */

  if (isRateLimited(realIp)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 },
    );
  }

  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Track this attempt (even if it will fail, so we don't leak whether the email exists).
  trackFailedLogin(realIp);

  const parsed = loginSchema.safeParse({
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : body.email,
    password: body.password,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid login details.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  // Generic message so callers can't probe which emails are registered.
  if (!row || !(await verifyPassword(parsed.data.password, row.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  // Reset failure count on successful login.
  failedLogins.delete(realIp);

  await createSession(row.id);
  // Mirror the Postgres role locally so sync model-resolution code can tell
  // operators apart from regular users (personal keys/defaults are operator-only).
  setUserSetting(row.id, "role", row.role === "admin" ? "admin" : "user");
  // First login after the per-user upgrade claims the previously shared data.
  claimUnowned(row.id);
  // Warm this user's model list in the background (fills the model pickers).
  void models(row.id).catch(() => {});

  // Demo seed: on first boot with DEMO_SEED=1, create a demo dot + sample
  // conversation so a fresh account can ask a question without visiting Settings.
  // Admins are skipped — they get the console, not the demo matter.
  // Uses the SQLite repo (dots live there, not in Postgres). Failures must
  // never block login.
  if (env.DEMO_SEED === "1" && row.role !== "admin") {
    try {
      if (listDots(row.id).length === 0) {
        const demoDot = createDot({
          name: "Nyaya (Demo)",
          purpose: "Demo matter for client presentation",
          instructions:
            "You are Nyaya, a legal assistant helping with a demo matter about consumer rights.",
          look: DEFAULT_LOOK,
          userId: row.id,
        });
        const demoConv = createConversation(demoDot.id, "Consumer Rights Demo");
        addMessage({
          dotId: demoDot.id,
          role: "user",
          text: "I'm looking for information about consumer rights protection for a demo case.",
          title: "Consumer Rights",
          conversationId: demoConv.id,
        });
      }
    } catch {
      // Seed is best-effort only.
    }
  }

  return NextResponse.json({
    user: { id: row.id, name: row.name, email: row.email },
  });
}
