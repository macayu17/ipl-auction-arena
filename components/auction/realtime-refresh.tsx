"use client";

import { startTransition, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Pages that use useLiveAuctionSync handle their own refresh.
 * This component handles refresh for all OTHER admin/team pages.
 */
const CLIENT_SYNC_PATHS = new Set(["/admin/auction", "/team/auction"]);
const MAX_FRONTEND_REFRESH_DELAY_MS = 200;

export function RealtimeRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const lastRefreshAtRef = useRef(0);
  const scheduledRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (CLIENT_SYNC_PATHS.has(pathname)) {
      return;
    }

    const runRefresh = () => {
      lastRefreshAtRef.current = Date.now();
      startTransition(() => {
        router.refresh();
      });
    };

    const scheduleRefresh = () => {
      const now = Date.now();
      const elapsed = now - lastRefreshAtRef.current;

      if (elapsed >= MAX_FRONTEND_REFRESH_DELAY_MS) {
        runRefresh();
        return;
      }

      if (scheduledRefreshRef.current) {
        return;
      }

      scheduledRefreshRef.current = setTimeout(() => {
        scheduledRefreshRef.current = null;
        runRefresh();
      }, MAX_FRONTEND_REFRESH_DELAY_MS - elapsed);
    };

    const supabase = createClient();
    const channel = supabase
      .channel("auction-sync-nav")
      .on("broadcast", { event: "auction-update" }, () => {
        scheduleRefresh();
      })
      .subscribe();

    return () => {
      if (scheduledRefreshRef.current) {
        clearTimeout(scheduledRefreshRef.current);
        scheduledRefreshRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [pathname, router]);

  return null;
}
