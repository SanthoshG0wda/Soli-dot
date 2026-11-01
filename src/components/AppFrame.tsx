"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Toasts from "@/components/Toasts";
import MobileBar, { FloatingSidebarTrigger } from "@/components/MobileBar";

const AUTH_PATHS = new Set(["/login", "/signup", "/landing", "/security", "/survey", "/privacy", "/terms"]);

export default function AppFrame({
  children,
  hasUser,
}: {
  children: ReactNode;
  hasUser?: boolean;
}) {
  const pathname = usePathname();
  const isLanding = (pathname === "/" && !hasUser) || pathname === "/landing";
  const authPage = AUTH_PATHS.has(pathname) || isLanding;

  if (authPage) {
    return (
      <main
        className={`min-h-screen w-full flex-1 overflow-y-auto ${
          isLanding ? "landing-scrollbar bg-[#f7f3ea]" : "bg-background"
        }`}
      >
        {children}
      </main>
    );
  }

  return (
    <>
      <Suspense>
        <Sidebar />
      </Suspense>
      <main className="app-shell flex min-w-0 flex-1 flex-col bg-[#1f1f1e] text-[#f1efea] transition-all duration-300">
        <Suspense>
          <MobileBar />
          <FloatingSidebarTrigger />
        </Suspense>
        {children}
      </main>
      <Toasts />
    </>
  );
}
