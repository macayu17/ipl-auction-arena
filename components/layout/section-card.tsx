"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  action,
  className,
  children,
}: SectionCardProps) {
  return (
    <section className={cn("surface-panel overflow-hidden", className)}>
      <div className="flex flex-col gap-3 border-b border-white/6 px-4 py-4 lg:flex-row lg:items-start lg:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold-soft)]">
            Command module
          </p>
          <h2 className="mt-2 display-font text-2xl text-white lg:text-[2rem]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-5 text-[var(--text-soft)]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">{action}</div>
      </div>

      <div className="px-4 py-4 lg:px-5 lg:py-5">{children}</div>
    </section>
  );
}
