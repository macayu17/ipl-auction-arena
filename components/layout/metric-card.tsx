import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: MetricCardProps) {
  return (
    <article className="surface-panel-muted relative overflow-hidden rounded-[20px] p-4">
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-[20px]"
        style={{ backgroundColor: "var(--gold)" }}
      />
      <div className="flex items-start justify-between gap-4 pl-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">
            {label}
          </div>
          <div className="mt-2 display-font text-3xl text-white lg:text-[2.4rem]">
            {value}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[rgba(245,166,35,0.08)] p-2.5 text-[var(--gold-soft)]">
          <Icon className="size-4" />
        </div>
      </div>
      {hint ? (
        <p className="mt-3 pl-2 text-xs leading-5 text-[var(--text-soft)]">{hint}</p>
      ) : null}
    </article>
  );
}
