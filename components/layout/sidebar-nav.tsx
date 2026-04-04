"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavigationItem = {
  href: string;
  label: string;
  caption?: string;
  shortLabel?: string;
};

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1.5">
      {items.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);
        const shorthand = (item.shortLabel ?? item.label)
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-lg border px-3 py-3 transition",
              isActive
                ? "border-white/10 bg-white/5 text-white shadow-sm"
                : "border-white/10 bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/4 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border text-[10px] font-black tracking-normal",
                  isActive
                    ? "border-white/10 bg-white/5 text-white font-medium"
                    : "border-white/10 bg-white/4 text-[var(--text-soft)]"
                )}
              >
                {shorthand}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-wide">{item.label}</div>
                {item.caption ? (
                  <div className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
                    {item.caption}
                  </div>
                ) : null}
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-white/5 px-2 py-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2">
        {items.slice(0, 4).map((item) => {
          const isActive = isActiveRoute(pathname, item.href);
          const shorthand = (item.shortLabel ?? item.label)
            .slice(0, 2)
            .toUpperCase();

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-center transition",
                isActive
                  ? "bg-white/5 text-white font-medium"
                  : "text-[var(--text-soft)] hover:bg-white/4 hover:text-white"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border text-[9px] font-black tracking-normal",
                  isActive
                    ? "border-white/10 bg-white/5"
                    : "border-white/10 bg-white/4"
                )}
              >
                {shorthand}
              </span>
              <span className="text-[10px] font-semibold tracking-normal">
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
