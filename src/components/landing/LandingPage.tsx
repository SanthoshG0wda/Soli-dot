"use client";

import MarketingSite from "@/components/marketing/MarketingSite";

export default function LandingPage({ hasUser }: { hasUser?: boolean }) {
  void hasUser;
  return <MarketingSite />;
}
