import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { db as sqlite, setUserSetting } from "@/server/db";

async function requireAdminRequest() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { user };
}

const roleSchema = z.object({ role: z.enum(["admin", "user"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;
  const { id } = await params;

  const json: unknown = await request.json().catch(() => null);
  const parsed = roleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Role must be admin or user." }, { status: 400 });
  }
  if (id === gate.user.id && parsed.data.role !== "admin") {
    return NextResponse.json({ error: "You can't demote your own account." }, { status: 400 });
  }

  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (parsed.data.role !== "admin") {
    const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), ne(users.id, id))).limit(1);
    if (admins.length === 0) {
      return NextResponse.json({ error: "Refusing to demote the last admin." }, { status: 400 });
    }
  }

  await db.update(users).set({ role: parsed.data.role }).where(eq(users.id, id));
  // Keep the local role mirror in sync (drives operator-only keys/defaults).
  try {
    setUserSetting(id, "role", parsed.data.role);
  } catch (err) {
    console.warn("[admin] role mirror failed for user", id, err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ id, role: parsed.data.role });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminRequest();
  if ("error" in gate) return gate.error;
  const { id } = await params;

  if (id === gate.user.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }
  const [row] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (row.role === "admin") {
    const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), ne(users.id, id))).limit(1);
    if (admins.length === 0) {
      return NextResponse.json({ error: "Refusing to delete the last admin." }, { status: 400 });
    }
  }

  // Revoke sessions, drop the Postgres account, then scrub its SQLite data
  // (dots, chats, memories, keys) so nothing orphaned survives.
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.delete(users).where(eq(users.id, id));
  try {
    const s = sqlite();
    for (const t of ["dots", "conversations", "memories", "rules", "skills", "routines", "triggers", "files", "channels", "passwords"]) {
      s.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(id);
    }
    s.prepare("DELETE FROM messages WHERE conversation_id NOT IN (SELECT id FROM conversations)").run();
    s.prepare("DELETE FROM settings WHERE user_id = ?").run(id);
  } catch (err) {
    console.warn("[admin] sqlite cleanup failed for user", id, err instanceof Error ? err.message : err);
  }
  return NextResponse.json({ deleted: id });
}
