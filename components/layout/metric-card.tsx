import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: MetricCardProps) {
  return (
    <article className="surface-panel-muted rounded-[24px] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
            {label}
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-[var(--gold-soft)]">
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{hint}</p>
    </article>
  );
}
