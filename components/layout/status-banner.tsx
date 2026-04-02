import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusBannerProps = {
  title: string;
  description: string;
  tone?: "amber" | "blue" | "emerald";
  children?: ReactNode;
};

const toneClasses = {
  amber: "border-amber-400/30 bg-amber-500/10 text-amber-50",
  blue: "border-sky-400/30 bg-sky-500/10 text-sky-50",
  emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-50",
} as const;

export function StatusBanner({
  title,
  description,
  tone = "amber",
  children,
}: StatusBannerProps) {
  return (
    <section className={cn("surface-panel overflow-hidden", toneClasses[tone])}>
      <div className="border-b border-current/10 px-4 py-3 lg:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-current/80">
          System notice
        </p>
        <h2 className="mt-2 display-font text-2xl text-current">{title}</h2>
      </div>
      <div className="px-4 py-4 lg:px-5">
        <p className="max-w-3xl text-sm leading-6 text-current/90">
          {description}
        </p>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </section>
  );
}
