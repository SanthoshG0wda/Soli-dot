import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import Home from "@/components/Home";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Soli — Counsel, meet your tireless paralegal",
  description: "Soli researches Indian law, reads your case files, and answers with pinpoint citations.",
};

export default async function Page() {
  const user = await getSessionUser();
  if (user) {
    return <Home />;
  }
  return <LandingPage hasUser={false} />;
}
