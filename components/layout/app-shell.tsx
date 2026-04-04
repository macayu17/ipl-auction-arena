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
  const pathname = usePathname();

  // Convert Sidebar items to PillNav items
  const pillNavItems = navItems.map((item) => ({
    label: item.label,
    href: item.href,
  }));

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col relative">
      {/* PillNav Container */}
      <div className="w-full flex justify-start pl-4 lg:pl-8 sticky top-0 z-[100] bg-transparent pointer-events-none pt-4 pb-2">
        <div className="pointer-events-auto">
          <PillNav
            logo={IPL_LOGO_URL}
            logoAlt="IPL Logo"
            items={pillNavItems}
            activeHref={pathname}
            className="shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-3xl"
          />
        </div>
      </div>

      <div className="flex-1 w-full px-4 pb-16 pt-8 lg:px-6 lg:pt-10">
        <div className="mx-auto max-w-[1800px] space-y-3">
          <header className="glass-panel rounded-xl overflow-hidden relative">
            
            <div className="grid gap-4 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center lg:px-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--gold)] bg-[var(--gold)]/10 inline-block px-2 py-0.5 rounded-full border border-[var(--gold)]/20">
                  {badge}
                </p>
                <h1 className="mt-1.5 display-font text-xl font-bold tracking-tight text-white lg:text-2xl glow-text leading-[1.1]">
                  {title}
                </h1>
                <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-[var(--text-soft)]">
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs lg:justify-end">
                <div className="rounded-full border border-white/5 bg-black/30 px-3 py-1.5 text-[10px] text-white/50 font-bold uppercase tracking-wider">
                  {userLabel}
                </div>
                {actions}
              </div>
            </div>
            
            {/* Optional Stats Banner row added below header content to preserve data */}
            {stats.length > 0 && (
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-0 border-t border-white/5 bg-black/20 divide-x divide-white/5">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex-1 px-4 py-3 min-w-[140px] text-center sm:text-left">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {stat.label}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-white font-mono">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </header>

          {banner}

          <main className="space-y-3">{children}</main>
        </div>
      </div>
    </div>
  );
}
