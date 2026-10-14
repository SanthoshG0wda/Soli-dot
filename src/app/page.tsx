import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import Home from "@/components/Home";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Soli — Autonomous Legal AI Operating System for Indian Advocates & Law Firms",
  description: "Research Supreme Court precedents, draft court-margin pleadings, audit case files for contradictions, and coordinate chamber practice with 4 specialized legal agents.",
};

export default async function Page() {
  const user = await getSessionUser();
  if (user) {
    return <Home />;
  }
  return <LandingPage hasUser={false} />;
}
