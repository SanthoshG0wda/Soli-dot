import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import UsersManager, { type AdminUser } from "@/components/admin/UsersManager";

export default async function UsersPage() {
  const admin = await requireAdmin();
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

  const initial: AdminUser[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role === "admin" ? "admin" : "user",
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <UsersManager
      initial={initial}
      selfId={admin.id}
      description="Admins can reach every section of this console. Never demote or delete your own account — the API refuses both."
    />
  );
}
