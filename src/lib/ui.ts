"use client";

import { useSyncExternalStore } from "react";

// Tiny UI state shared across the layout:
// 1. Mobile drawer open state (phones / narrow screens)
let drawerOpen = false;
// 2. Desktop sidebar collapsed state (Claude-style shrink & expand)
let desktopCollapsed = false;

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("soli:sidebar-collapsed");
    if (saved !== null) {
      desktopCollapsed = saved === "true";
    }
  } catch {}
}

const drawerListeners = new Set<() => void>();
const desktopListeners = new Set<() => void>();

export function setSidebarOpen(value: boolean) {
  if (drawerOpen === value) return;
  drawerOpen = value;
  for (const l of drawerListeners) l();
}

export function useSidebarOpen(): boolean {
  return useSyncExternalStore(
    (l) => (drawerListeners.add(l), () => drawerListeners.delete(l)),
    () => drawerOpen,
    () => false,
  );
}

export function setSidebarCollapsed(value: boolean) {
  if (desktopCollapsed === value) return;
  desktopCollapsed = value;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("soli:sidebar-collapsed", String(value));
    } catch {}
  }
  for (const l of desktopListeners) l();
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(
    (l) => (desktopListeners.add(l), () => desktopListeners.delete(l)),
    () => desktopCollapsed,
    () => false,
  );
}

export function toggleSidebar() {
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    setSidebarOpen(!drawerOpen);
  } else {
    setSidebarCollapsed(!desktopCollapsed);
  }
}

/** True while the media query matches. Server render assumes a wide screen. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (l) => {
      const m = matchMedia(query);
      m.addEventListener("change", l);
      return () => m.removeEventListener("change", l);
    },
    () => matchMedia(query).matches,
    () => true,
  );
}
