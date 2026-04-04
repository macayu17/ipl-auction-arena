"use client";

import { usePathname } from "next/navigation";

import { ActiveSlideOverlay } from "@/components/slides/active-slide-overlay";
import type { Slide } from "@/types/app.types";

export function TeamLayoutSlideGate({ slide }: { slide: Slide | null }) {
  const pathname = usePathname();

  if (!slide || pathname === "/team/auction") {
    return null;
  }

  return <ActiveSlideOverlay slide={slide} audienceLabel="team consoles" />;
}
