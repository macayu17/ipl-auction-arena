import type { ReactNode } from "react";

import { Shield } from "lucide-react";

import {
  BottomNav,
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
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/6 bg-[rgba(19,19,24,0.92)] backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between gap-4 px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--gold)]/20 bg-[rgba(245,166,35,0.08)] text-[var(--gold-soft)]">
              <Shield className="size-4" />
            </div>

            <div className="min-w-0">
              <p className="display-font truncate text-xl text-[var(--gold-soft)]">
                Auction Command Center
              </p>
              <div className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)] sm:flex">
                <span className="signal-dot" />
                {badge}
              </div>
            </div>
          </div>

          <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 lg:block">
            {userLabel}
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-[280px] flex-col border-r border-white/6 bg-[rgba(27,27,32,0.96)] px-4 py-5 shadow-2xl backdrop-blur lg:flex">
        <div className="rounded-[22px] border border-white/8 bg-[rgba(14,14,19,0.65)] p-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/25 bg-[rgba(245,166,35,0.1)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">
            <Shield className="size-3.5" />
            {badge}
          </div>

          <div className="mt-4">
            <p className="display-font text-3xl leading-none text-white">
              {title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto pr-1">
          <SidebarNav items={navItems} />
        </div>

        {stats.length > 0 ? (
          <div className="mt-5 grid gap-2.5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="surface-panel-muted rounded-[18px] px-4 py-3"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                  {stat.label}
                </div>
                <div className="mt-1.5 text-sm font-semibold text-white">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </aside>

      <div className="px-3 pb-24 pt-[4.5rem] lg:pl-[304px] lg:pr-5 lg:pt-[5.25rem]">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <header className="surface-panel overflow-hidden">
            <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center lg:px-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold-soft)]">
                  {badge}
                </p>
                <h1 className="mt-2 display-font text-3xl text-white lg:text-[3rem]">
                  {title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-soft)]">
                  {description}
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 text-sm text-slate-300 lg:items-end">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {userLabel}
                </div>
                {actions}
              </div>
            </div>
          </header>

          {banner}

          <main className="space-y-4">{children}</main>
        </div>
      </div>

      <BottomNav items={navItems} />
    </div>
  );
}
