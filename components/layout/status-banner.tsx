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
    <section className={cn("surface-panel p-5", toneClasses[tone])}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-current/90">
        {description}
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
