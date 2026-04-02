"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type NavigationItem = {
  href: string;
  label: string;
  caption: string;
};

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {items.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-3xl border px-4 py-3 transition",
              isActive
                ? "border-[var(--gold)]/40 bg-[rgba(240,165,0,0.12)] text-white shadow-[0_10px_30px_rgba(240,165,0,0.12)]"
                : "border-white/8 bg-white/4 text-slate-300 hover:border-white/15 hover:bg-white/6 hover:text-white"
            )}
          >
            <div className="text-sm font-semibold">{item.label}</div>
            <div className="mt-1 text-xs text-slate-400">{item.caption}</div>
          </Link>
        );
      })}
    </nav>
  );
}
