"use client";

import Image from "next/image";
import { getTeamLogoUrl } from "@/lib/team-logos";

type TeamLogoProps = {
  shortCode: string;
  size?: number;
  className?: string;
};

/**
 * Renders the official IPL team logo from iplt20.com CDN.
 * Falls back to a styled text badge if the logo URL is not found.
 */
export function TeamLogo({ shortCode, size = 32, className = "" }: TeamLogoProps) {
  const logoUrl = getTeamLogoUrl(shortCode);

  if (!logoUrl) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-lg bg-black/40 border border-white/10 text-[11px] uppercase tracking-wider text-white font-bold ${className}`}
        style={{ width: size, height: size }}
      >
        {shortCode}
      </div>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={`${shortCode} logo`}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      unoptimized
    />
  );
}
