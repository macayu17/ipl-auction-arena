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
    <section className={cn("glass-panel-elevated rounded-2xl overflow-hidden relative", className)}>
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="flex flex-col gap-2 border-b border-white/5 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">
            Command module
          </p>
          <h2 className="mt-0.5 display-font text-lg font-bold tracking-tight text-white">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-white/50">
              {description}
            </p>
          ) : null}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="px-4 py-4 lg:px-5">{children}</div>
    </section>
  );
}
