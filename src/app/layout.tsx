import type { Metadata } from "next";
import { JetBrains_Mono, Newsreader } from "next/font/google";
import localFont from "next/font/local";
import { getSessionUser } from "@/lib/auth";
import AppFrame from "@/components/AppFrame";
import "./globals.css";

// Typography stack: Geist Sans + Claude literary serif (Newsreader) + JetBrains Mono.
const geistSans = localFont({ src: "../fonts/Geist-Variable.woff2", weight: "100 900", variable: "--font-geist-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-claude-serif",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Soli — Autonomous Legal AI for Indian Advocates & Law Firms",
  description: "Research Supreme Court precedents, draft court-margin pleadings, audit case files for contradictions, and coordinate chamber practice with 4 specialized legal agents.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#09090c",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="en" className={`${geistSans.variable} ${jetbrainsMono.variable} ${newsreader.variable} h-full`}>
      <body className="flex h-full overflow-hidden">
        <AppFrame hasUser={Boolean(user)}>{children}</AppFrame>
      </body>
    </html>
  );
}
