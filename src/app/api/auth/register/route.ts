import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  checkSignupAccess,
  createSession,
  hashPassword,
  isAdminEmail,
  signupPolicy,
  signupSchema,
} from "@/lib/auth";

interface SignupRequestBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  inviteCode?: unknown;
}

/** Public signup requirements (drives the invite-code field on the form). */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(signupPolicy());
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: SignupRequestBody;
  try {
    body = (await request.json()) as SignupRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = signupSchema.safeParse({
    name: typeof body.name === "string" ? body.name.trim() : body.name,
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : body.email,
    password: body.password,
    inviteCode: typeof body.inviteCode === "string" ? body.inviteCode : "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid signup details.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { name, email, password, inviteCode } = parsed.data;

  // Gate first: same response whether or not the email is registered.
  const gateError = checkSignupAccess(email, inviteCode);
  if (gateError) {
    return NextResponse.json({ error: gateError }, { status: 403 });
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists. Try logging in instead." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const role = isAdminEmail(email) ? "admin" : "user";
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, role })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    });
  if (!user) {
    return NextResponse.json(
      { error: "Failed to create account." },
      { status: 500 },
    );
  }

  await createSession(user.id);
  return NextResponse.json({ user }, { status: 201 });
}
