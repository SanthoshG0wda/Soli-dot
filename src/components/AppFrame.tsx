"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Toasts from "@/components/Toasts";
import VoicePanel from "@/components/VoicePanel";
import MobileBar, { FloatingSidebarTrigger } from "@/components/MobileBar";
import AdminFrame from "@/components/AdminFrame";

const AUTH_PATHS = new Set(["/login", "/signup"]);

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const authPage = AUTH_PATHS.has(pathname);
  const isAdmin = pathname.startsWith("/admin");

  if (authPage) {
    return <main className="min-h-screen flex-1 bg-background">{children}</main>;
  }

  if (isAdmin) {
    return <AdminFrame>{children}</AdminFrame>;
  }

  return (
    <>
      <Suspense>
        <Sidebar />
      </Suspense>
      <main className="flex min-w-0 flex-1 flex-col bg-card transition-all duration-300">
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
