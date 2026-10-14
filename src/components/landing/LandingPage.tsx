"use client";

import { LandingNav } from "./LandingNav";
import { HeroSection } from "./HeroSection";
import { InteractiveProductMockup } from "./InteractiveProductMockup";
import { WhatIsSoli } from "./WhatIsSoli";
import { PersonaShowcase } from "./PersonaShowcase";
import { GrowthStats } from "./GrowthStats";
import { PrivacyFirst } from "./PrivacyFirst";
import { FaqSection } from "./FaqSection";
import { LandingFooter } from "./LandingFooter";

export default function LandingPage({ hasUser }: { hasUser?: boolean }) {
  return (
    <div className="min-h-screen w-full bg-[#090806] text-white selection:bg-[#d9a441]/30 selection:text-white">
      <LandingNav hasUser={hasUser} />
      <main>
        <HeroSection />
        <InteractiveProductMockup />
        <WhatIsSoli />
        <PersonaShowcase />
        <GrowthStats />
        <PrivacyFirst />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
