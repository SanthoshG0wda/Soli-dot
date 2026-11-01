"use client";

import React from "react";
import DotOrb from "./DotOrb";
import type { DotStatus, Look } from "@/lib/types";

type Props = {
  look?: Look;
  status?: DotStatus;
  size?: number;
  stage?: boolean;
  name?: string;
  className?: string;
};

/**
 * Court Chamber Emblem displaying dignified persona iconography.
 * Completely replaces the resource-heavy Three.js 3D toy puffball mascot.
 */
export default function Dot3DLazy({
  look,
  status = "idle",
  size = 160,
  stage = false,
  name,
  className = "",
}: Props) {
  const badgeSize = Math.round(size * 0.72);

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${stage ? "py-4" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background ambient dais / podium glow */}
      {stage && (
        <div
          className="absolute inset-0 rounded-full bg-radial from-brand/10 to-transparent blur-md pointer-events-none"
        />
      )}

      {/* Modern High-End Counsel Badge */}
      <DotOrb
        look={look}
        status={status}
        size={badgeSize}
        name={name}
        className="shadow-xl"
      />
    </div>
  );
}
