"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import PillNav from "./pill-nav";
import type { NavigationItem } from "./sidebar-nav"; // Keep types or define them here
import { IPL_LOGO_URL } from "@/lib/team-logos";

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
  compactHeader?: boolean;
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
  compactHeader = false,
}: AppShellProps) {
  const pathname = usePathname();

  // Convert Sidebar items to PillNav items
  const pillNavItems = navItems.map((item) => ({
    label: item.label,
    href: item.href,
  }));

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col relative">
      {/* PillNav Container */}
      <div className="w-full sticky top-0 z-[100] bg-transparent pointer-events-none px-3 pt-3 pb-2 lg:px-8 lg:pt-4">
        <div className={`flex items-center ${compactHeader ? "justify-between gap-3" : "justify-start"}`}>
          <div className="pointer-events-auto">
            <PillNav
              logo={IPL_LOGO_URL}
              logoAlt="IPL Logo"
              items={pillNavItems}
              activeHref={pathname}
              className="shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-3xl"
            />
          </div>

          {compactHeader ? (
            <div className="pointer-events-auto hidden lg:flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2 backdrop-blur-2xl">
              <div className="min-w-0 text-right">
                <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--gold)]/85">
                  {badge}
                </p>
                <p className="text-xs font-semibold text-white truncate max-w-[170px]">
                  {title}
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/60 max-w-[220px] truncate">
                {userLabel}
              </div>
              <div className="shrink-0">
                {actions}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className={`flex-1 w-full px-2.5 pb-12 ${compactHeader ? "pt-2 lg:pt-3" : "pt-4 lg:pt-10"} lg:px-6 lg:pb-16`}>
        <div className="mx-auto max-w-[1800px] space-y-2 lg:space-y-3">
          {compactHeader ? (
            <header className="glass-panel rounded-xl overflow-hidden relative lg:hidden">
              <div className="grid gap-2 px-3 py-2.5">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-wider text-[var(--gold)] bg-[var(--gold)]/10 inline-block px-2 py-0.5 rounded-full border border-[var(--gold)]/20">
                    {badge}
                  </p>
                  <h1 className="mt-1 display-font text-lg font-bold tracking-tight text-white glow-text leading-[1.1]">
                    {title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="rounded-full border border-white/5 bg-black/30 px-2.5 py-1 text-[9px] text-white/50 font-bold uppercase tracking-wider">
                    {userLabel}
                  </div>
                  {actions}
                </div>
              </div>
            </header>
          ) : (
            <header className="glass-panel rounded-xl overflow-hidden relative">
              <div className="grid gap-2 px-3 py-2.5 lg:gap-4 lg:grid-cols-[1fr_auto] lg:items-center lg:px-6 lg:py-3">
                <div>
                  <p className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--gold)] bg-[var(--gold)]/10 inline-block px-2 py-0.5 rounded-full border border-[var(--gold)]/20">
                    {badge}
                  </p>
                  <h1 className="mt-1 lg:mt-1.5 display-font text-lg lg:text-2xl font-bold tracking-tight text-white glow-text leading-[1.1]">
                    {title}
                  </h1>
                  <p className="mt-0.5 lg:mt-1 max-w-3xl text-[10px] lg:text-[11px] leading-relaxed text-[var(--text-soft)] hidden lg:block">
                    {description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:gap-3 text-xs lg:justify-end">
                  <div className="rounded-full border border-white/5 bg-black/30 px-2.5 py-1 lg:px-3 lg:py-1.5 text-[9px] lg:text-[10px] text-white/50 font-bold uppercase tracking-wider">
                    {userLabel}
                  </div>
                  {actions}
                </div>
              </div>

              {/* Optional Stats Banner row added below header content to preserve data */}
              {stats.length > 0 && (
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-0 border-t border-white/5 bg-black/20 divide-x divide-white/5">
                  {stats.map((stat) => (
                    <div key={stat.label} className="flex-1 px-3 py-2 lg:px-4 lg:py-3 min-w-[110px] lg:min-w-[140px] text-center sm:text-left">
                      <div className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        {stat.label}
                      </div>
                      <div className="mt-0.5 text-xs lg:text-sm font-semibold text-white font-mono">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </header>
          )}

          {banner}

          <main className={compactHeader ? "space-y-2 lg:space-y-2" : "space-y-2 lg:space-y-3"}>{children}</main>
        </div>
      </div>
    </div>
  );
}
