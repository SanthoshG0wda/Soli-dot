import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Soli — Autonomous Legal AI for Indian Advocates & Law Firms",
  description: "Research Supreme Court precedents, draft court-margin pleadings, audit case files for contradictions, and coordinate chamber practice with 4 specialized legal agents.",
};

export default async function Page() {
  const user = await getSessionUser();
  return <LandingPage hasUser={Boolean(user)} />;
}
