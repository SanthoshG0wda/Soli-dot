"use client";

import React from "react";
import { BookOpen, Calendar, Clock, Feather, FileText, Gavel, Scale, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DotStatus, Look } from "@/lib/types";

export interface CounselBadgeProps {
  look?: Look;
  status?: DotStatus;
  size?: number;
  name?: string;
  role?: string;
  className?: string;
}

interface PersonaTheme {
  primary: string;
  bgGradient: string;
  border: string;
  iconColor: string;
  badgeLabel: string;
  Icon: LucideIcon;
}

function resolvePersonaTheme(name?: string, lookColor?: string): PersonaTheme {
  const n = (name || "").toLowerCase();
  const c = (lookColor || "").toLowerCase();

  // 1. Nyaya - Senior Legal Researcher & Jurist
  if (n.includes("nyaya") || n.includes("research") || c.includes("9fcbff") || c.includes("2a6fdb")) {
    return {
      primary: "#2563EB",
      bgGradient: "from-blue-950 via-slate-900 to-indigo-950",
      border: "border-blue-500/30",
      iconColor: "#60A5FA",
      badgeLabel: "NYAYA",
      Icon: Scale,
    };
  }

  // 2. Vakil - Courtroom Drafting Counsel
  if (n.includes("vakil") || n.includes("draft") || c.includes("97e0b8") || c.includes("1f8f5f")) {
    return {
      primary: "#059669",
      bgGradient: "from-emerald-950 via-slate-900 to-teal-950",
      border: "border-emerald-500/30",
      iconColor: "#34D399",
      badgeLabel: "VAKIL",
      Icon: FileText,
    };
  }

  // 3. Pramaan - Forensic Case Scrutiny & Evidence Auditor
  if (n.includes("pramaan") || n.includes("audit") || n.includes("scrutiny") || c.includes("ffd98a") || c.includes("e0492d")) {
    return {
      primary: "#D97706",
      bgGradient: "from-amber-950 via-slate-900 to-orange-950",
      border: "border-amber-500/30",
      iconColor: "#FBBF24",
      badgeLabel: "PRAMAAN",
      Icon: ShieldCheck,
    };
  }

  // 4. Docket - Chamber Practice & Limitation Coordinator
  if (n.includes("docket") || n.includes("clerk") || n.includes("coord") || c.includes("e0b8ff") || c.includes("8a2be2")) {
    return {
      primary: "#7C3AED",
      bgGradient: "from-purple-950 via-slate-900 to-violet-950",
      border: "border-purple-500/30",
      iconColor: "#A78BFA",
      badgeLabel: "DOCKET",
      Icon: Clock,
    };
  }

  // Default: Master Chamber Lead / Soli Orchestrator
  return {
    primary: "#D4AF37", // Imperial Gold
    bgGradient: "from-slate-950 via-neutral-900 to-stone-950",
    border: "border-amber-400/40",
    iconColor: "#FDE047",
    badgeLabel: "CHAMBER",
    Icon: Sparkles,
  };
}

/**
 * Court-grade counsel insignia badge replacing toy/puffball mascot animations.
 * Provides crisp vector symbolism matching advocate chamber designations.
 */
export default function DotOrb({
  look,
  status = "idle",
  size = 36,
  name,
  className = "",
}: CounselBadgeProps) {
  const theme = resolvePersonaTheme(name, look?.color);
  const Icon = theme.Icon;
  const isWorking = status === "working";
  const isPaused = status === "paused";

  const iconSize = Math.max(12, Math.round(size * 0.52));

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${className}`}
      style={{ width: size, height: size }}
      title={name ? `${name} · Court Counsel` : "Chamber Counsel"}
    >
      {/* Outer ambient glow when actively working */}
      {isWorking && (
        <span
          className="absolute -inset-0.5 rounded-xl opacity-75 blur-xs animate-pulse"
          style={{ background: theme.primary }}
        />
      )}

      {/* Main Badge Base */}
      <span
        className={`relative flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br shadow-inner border ${theme.bgGradient} ${theme.border}`}
        style={{
          boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.15), 0 2px 4px 0 rgba(0, 0, 0, 0.4)",
          filter: isPaused ? "grayscale(0.6) opacity(0.7)" : undefined,
        }}
      >
        <Icon size={iconSize} strokeWidth={1.8} style={{ color: theme.iconColor }} />
      </span>

      {/* Status dot in corner */}
      {status !== "idle" && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background ring-1 ${
            status === "working"
              ? "bg-emerald-500 ring-emerald-400/30 animate-pulse"
              : status === "waiting"
                ? "bg-amber-400 ring-amber-300/30 animate-pulse"
                : "bg-slate-400 ring-slate-300/20"
          }`}
        />
      )}
    </span>
  );
}
