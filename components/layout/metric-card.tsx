"use client";

import {
  BarChart3,
  CircleDollarSign,
  Clock3,
  Database,
  FileUp,
  Filter,
  Gavel,
  ImageIcon,
  KeyRound,
  ListChecks,
  MonitorUp,
  Radio,
  RadioTower,
  Shield,
  ShieldCheck,
  TimerReset,
  Trophy,
  Users,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type MetricCardIconName =
  | "bar-chart-3"
  | "circle-dollar-sign"
  | "clock-3"
  | "database"
  | "file-up"
  | "filter"
  | "gavel"
  | "image-icon"
  | "key-round"
  | "list-checks"
  | "monitor-up"
  | "radio"
  | "radio-tower"
  | "shield"
  | "shield-check"
  | "timer-reset"
  | "trophy"
  | "users"
  | "users-2"
  | "wallet";

const iconMap: Record<MetricCardIconName, LucideIcon> = {
  "bar-chart-3": BarChart3,
  "circle-dollar-sign": CircleDollarSign,
  "clock-3": Clock3,
  database: Database,
  "file-up": FileUp,
  filter: Filter,
  gavel: Gavel,
  "image-icon": ImageIcon,
  "key-round": KeyRound,
  "list-checks": ListChecks,
  "monitor-up": MonitorUp,
  radio: Radio,
  "radio-tower": RadioTower,
  shield: Shield,
  "shield-check": ShieldCheck,
  "timer-reset": TimerReset,
  trophy: Trophy,
  users: Users,
  "users-2": Users2,
  wallet: Wallet,
};

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  iconName?: MetricCardIconName;
};

export function MetricCard({
  label,
  value,
  hint,
  icon,
  iconName,
}: MetricCardProps) {
  const Icon = icon ?? (iconName ? iconMap[iconName] : BarChart3);

  return (
    <article className="glass-panel overflow-hidden rounded-xl p-3.5 relative group border border-white/5 bg-black/20 hover:bg-black/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">
            {label}
          </div>
          <div className="mt-1.5 display-font text-2xl leading-none text-white font-bold tracking-tight">
            {value}
          </div>
        </div>
        <div className="rounded-md border border-[var(--gold)]/20 bg-[var(--gold)]/10 p-2 text-[var(--gold)]">
          <Icon className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      {hint ? (
        <p className="mt-2.5 text-[11px] leading-4 text-white/50">{hint}</p>
      ) : null}
    </article>
  );
}
