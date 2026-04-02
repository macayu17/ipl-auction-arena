import type { ReactNode } from "react";

import { Shield } from "lucide-react";

import {
  SidebarNav,
  type NavigationItem,
} from "@/components/layout/sidebar-nav";

type ShellStat = {
  label: string;
  value: string;
};

type AppShellProps = {
  badge: string;
  title: string;
  description: string;
  navItems: NavigationItem[];
  stats: ShellStat[];
  userLabel: string;
  actions?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  badge,
  title,
  description,
  navItems,
  stats,
  userLabel,
  actions,
  banner,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen px-4 py-4 lg:px-6 lg:py-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 lg:flex-row">
        <aside className="surface-panel grid gap-6 p-5 lg:sticky lg:top-6 lg:min-h-[calc(100vh-3rem)] lg:w-[340px] lg:self-start lg:p-6">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--gold-soft)]">
              <Shield className="size-3.5" />
              {badge}
            </div>

            <div>
              <p className="display-font text-4xl leading-none text-white lg:text-5xl">
                Mock IPL Auction
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
            </div>
          </div>

          <SidebarNav items={navItems} />

          <div className="grid gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="surface-panel-muted rounded-[22px] px-4 py-3"
              >
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  {stat.label}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 space-y-6">
          <header className="surface-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold-soft)]">
                {badge}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white lg:text-4xl">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                {description}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 text-sm text-slate-300 lg:items-end">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                {userLabel}
              </div>
              {actions}
            </div>
          </header>

          {banner}

          <main className="space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
