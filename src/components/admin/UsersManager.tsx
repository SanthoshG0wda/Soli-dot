"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Empty, Section } from "@/components/SettingsKit";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
}

export default function UsersManager({
  initial,
  selfId,
  description,
}: {
  initial: AdminUser[];
  selfId: string;
  description: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initial);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const refresh = async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { users: AdminUser[] };
      setUsers(json.users);
    }
    router.refresh();
  };

  const setRole = (id: string, role: "admin" | "user") => {
    setNotice(null);
    start(async () => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice({ tone: "err", text: json.error ?? "Role change failed." });
        return;
      }
      setNotice({ tone: "ok", text: `Role updated to ${role}.` });
      await refresh();
    });
  };

  const remove = (id: string) => {
    setNotice(null);
    start(async () => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice({ tone: "err", text: json.error ?? "Delete failed." });
        return;
      }
      setConfirmDelete(null);
      setNotice({ tone: "ok", text: "Account deleted, including its dots and keys." });
      await refresh();
    });
  };

  return (
    <div>
      <Section eyebrow="Accounts" title={`Users (${users.length})`} description={description}>
        {notice && (
          <p className={`mb-3 text-body-sm ${notice.tone === "ok" ? "text-success" : "text-destructive"}`} role="status">
            {notice.text}
          </p>
        )}
        {users.length === 0 ? (
          <Empty>No accounts found.</Empty>
        ) : (
          <div className="surface divide-y divide-black/[0.06] overflow-hidden">
            {users.map((u) => {
              const self = u.id === selfId;
              return (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium">{u.name}</span>
                      <span
                        className={`shrink-0 rounded-xs px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase ${
                          u.role === "admin" ? "bg-brand/15 text-brand-readable" : "bg-black/[0.06] text-foreground/60"
                        }`}
                      >
                        {u.role}
                        {self ? " · you" : ""}
                      </span>
                    </span>
                    <span className="block truncate text-[12px] text-foreground/50">{u.email}</span>
                  </span>
                  <select
                    className="field h-8 w-auto shrink-0 py-0 text-[13px]"
                    value={u.role}
                    disabled={pending || self}
                    title={self ? "You can't change your own role." : `Change ${u.name}'s role`}
                    aria-label={`Role for ${u.email}`}
                    onChange={(e) => setRole(u.id, e.target.value as "admin" | "user")}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  {confirmDelete === u.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button className="btn-quiet h-7 px-2 text-[12px] text-destructive" disabled={pending} onClick={() => remove(u.id)}>
                        Delete
                      </button>
                      <button className="btn-quiet h-7 px-2 text-[12px]" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      className="btn-quiet h-7 shrink-0 px-2 text-[12px] text-foreground/50 hover:text-destructive disabled:opacity-40"
                      disabled={self}
                      title={self ? "You can't delete your own account." : `Delete ${u.email}`}
                      onClick={() => setConfirmDelete(u.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
