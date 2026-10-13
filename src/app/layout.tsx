import type { Metadata } from "next";
import { JetBrains_Mono, Newsreader } from "next/font/google";
import localFont from "next/font/local";
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
  title: "Soli",
  description: "Personal AI agents that work on their own, on their own computers",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#faf7f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${jetbrainsMono.variable} ${newsreader.variable} h-full`}>
      <body className="flex h-full overflow-hidden">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
