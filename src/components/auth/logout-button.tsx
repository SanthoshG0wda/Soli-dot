"use client";

import { useState, type ReactNode } from "react";
import { resetStore } from "@/lib/store";

export function LogoutButton({
  className,
  icon,
}: {
  className?: string;
  icon?: ReactNode;
}) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie cleanup is best-effort; still navigate to the login page.
    } finally {
      // Wipe cached dots/chats/configs first, then hard-navigate: the next
      // account must never see the previous user's data.
      resetStore();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload required; router.push can keep stale caches
      window.location.assign("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={className ?? "btn-quiet"}
      title="Log out"
      aria-label="Log out"
    >
      {icon ?? (pending ? "Logging out..." : "Log out")}
    </button>
  );
}
