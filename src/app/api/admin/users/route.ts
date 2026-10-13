import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

async function requireAdminRequest() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt))
    .limit(200);
  return NextResponse.json({
    users: rows.map((r) => ({
      ...r,
      role: r.role === "admin" ? "admin" : "user",
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
