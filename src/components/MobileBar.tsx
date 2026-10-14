"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftOpen, SquarePen } from "lucide-react";
import { setSidebarOpen, setSidebarCollapsed, useSidebarCollapsed } from "@/lib/ui";
import { Wordmark } from "./Sidebar";

/** Opens the sidebar drawer on small screens, or expands collapsed sidebar on desktop. */
export function MenuButton() {
  const collapsed = useSidebarCollapsed();
  return (
    <>
      <button
        type="button"
        className="btn-quiet size-9 shrink-0 p-0 md:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </button>
      {collapsed && (
        <button
          type="button"
          className="btn-quiet hidden size-8 shrink-0 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-black/[0.05] hover:text-foreground md:flex"
          onClick={() => setSidebarCollapsed(false)}
          title="Open sidebar (Ctrl+B)"
          aria-label="Open sidebar"
        >
          <PanelLeftOpen className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </>
  );
}

/** Floating top-left trigger button for pages when desktop sidebar is collapsed (Claude style). */
export function FloatingSidebarTrigger() {
  const collapsed = useSidebarCollapsed();
  const pathname = usePathname();
  if (!collapsed || pathname.startsWith("/dots/") || pathname.startsWith("/vakil/")) return null;

  return (
    <div className="fixed top-3 left-3 z-30 hidden items-center gap-1 md:flex">
      <button
        type="button"
        onClick={() => setSidebarCollapsed(false)}
        className="flex size-8 items-center justify-center rounded-lg border border-black/10 bg-card/90 text-foreground/70 shadow-xs backdrop-blur-xs transition-all hover:border-black/25 hover:bg-card hover:text-foreground hover:shadow-sm"
        title="Open sidebar (Ctrl+B)"
        aria-label="Open sidebar"
      >
        <PanelLeftOpen className="size-4" strokeWidth={1.75} />
      </button>
      <Link
        href="/"
        className="flex size-8 items-center justify-center rounded-lg border border-black/10 bg-card/90 text-foreground/70 shadow-xs backdrop-blur-xs transition-all hover:border-black/25 hover:bg-card hover:text-foreground hover:shadow-sm"
        title="New chat"
        aria-label="New chat"
      >
        <SquarePen className="size-4" strokeWidth={1.75} />
      </Link>
    </div>
  );
}

/** Top bar for small screens on pages without their own header (dot pages have one). */
export default function MobileBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/dots/") || pathname.startsWith("/vakil/")) return null;
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-black/[0.06] px-2 md:hidden">
      <MenuButton />
      <Link href="/" className="mr-auto">
        <Wordmark />
      </Link>
      <Link href="/" className="btn-quiet size-9 p-0" aria-label="New chat">
        <SquarePen className="size-4" strokeWidth={1.75} />
      </Link>
    </div>
  );
}
