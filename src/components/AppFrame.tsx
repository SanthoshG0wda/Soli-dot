"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Toasts from "@/components/Toasts";
import VoicePanel from "@/components/VoicePanel";
import MobileBar, { FloatingSidebarTrigger } from "@/components/MobileBar";
import AdminFrame from "@/components/AdminFrame";

const AUTH_PATHS = new Set(["/login", "/signup", "/landing"]);

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
  const isAdmin = pathname.startsWith("/admin");

  if (authPage) {
    return <main className="min-h-screen w-full flex-1 overflow-y-auto bg-background">{children}</main>;
  }

  if (isAdmin) {
    return <AdminFrame>{children}</AdminFrame>;
  }

  return (
    <>
      <Suspense>
        <Sidebar />
      </Suspense>
      <main className="app-shell flex min-w-0 flex-1 flex-col bg-card transition-all duration-300">
        <Suspense>
          <MobileBar />
          <FloatingSidebarTrigger />
        </Suspense>
        {children}
      </main>
      <Toasts />
      <VoicePanel />
    </>
  );
}
