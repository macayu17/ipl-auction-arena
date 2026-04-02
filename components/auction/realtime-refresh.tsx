"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return;
    }

    const supabase = createClient();
    const refresh = () => {
      startTransition(() => {
        router.refresh();
      });
    };

    const channel = supabase
      .channel("auction:global", {
        config: {
          private: true,
        },
      })
      .on("broadcast", { event: "INSERT" }, refresh)
      .on("broadcast", { event: "UPDATE" }, refresh)
      .on("broadcast", { event: "DELETE" }, refresh)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
