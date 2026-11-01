import type { Metadata } from "next";
import { Fraunces, Inter, Source_Serif_4 } from "next/font/google";
import localFont from "next/font/local";
import { getSessionUser } from "@/lib/auth";
import AppFrame from "@/components/AppFrame";
import "./globals.css";

// Typography stack: Geist Sans + Claude literary serif (Newsreader) + JetBrains Mono.
const geistSans = localFont({ src: "../fonts/Geist-Variable.woff2", weight: "100 900", variable: "--font-geist-sans" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], weight: ["400"], display: "swap" });

export const metadata: Metadata = {
  title: "Soli — AI legal work for Indian litigation teams",
  description: "Soli researches Indian law, reads case files, and answers with pinpoint citations for legal professionals.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#183250",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable} ${inter.variable} ${sourceSerif.variable} h-full`}>
      <body className="flex h-full overflow-hidden">
        <AppFrame hasUser={Boolean(user)}>{children}</AppFrame>
      </body>
    </html>
  );
}
