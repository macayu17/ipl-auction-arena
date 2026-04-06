"use client";

import { startTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

/**
 * Pages that use useLiveAuctionSync handle their own refresh.
 * This component handles refresh for all OTHER admin/team pages.
 */
const CLIENT_SYNC_PATHS = new Set(["/admin/auction", "/team/auction"]);

export function RealtimeRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (CLIENT_SYNC_PATHS.has(pathname)) {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel("auction-sync-nav")
      .on("broadcast", { event: "auction-update" }, () => {
        startTransition(() => {
          router.refresh();
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pathname, router]);

  return null;
}
