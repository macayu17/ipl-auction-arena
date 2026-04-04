"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type RoleName = "admin" | "team";

function isSupabaseClientConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function useLiveAuctionSync<T>({
  initialData,
  expectedRole,
}: {
  initialData: T | null;
  expectedRole: RoleName;
}) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchInFlightRef = useRef(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    let stopped = false;
    let reconnectTimeout: number | null = null;
    let eventSource: EventSource | null = null;
    let supabaseCleanup: (() => void) | null = null;

    const refreshSnapshot = async () => {
      if (fetchInFlightRef.current) {
        return;
      }

      fetchInFlightRef.current = true;
      setIsRefreshing(true);

      try {
        const response = await fetch("/api/auction/live-snapshot", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          role?: RoleName;
          data?: T;
        };

        if (!stopped && payload.role === expectedRole && payload.data) {
          setData(payload.data);
        }
      } finally {
        fetchInFlightRef.current = false;
        if (!stopped) {
          setIsRefreshing(false);
        }
      }
    };

    const startSupabaseFallback = () => {
      if (!isSupabaseClientConfigured() || supabaseCleanup) {
        return;
      }

      const supabase = createClient();
      const channel = supabase
        .channel("auction:global", {
          config: {
            private: true,
          },
        })
        .on("broadcast", { event: "INSERT" }, () => {
          void refreshSnapshot();
        })
        .on("broadcast", { event: "UPDATE" }, () => {
          void refreshSnapshot();
        })
        .on("broadcast", { event: "DELETE" }, () => {
          void refreshSnapshot();
        })
        .subscribe();

      supabaseCleanup = () => {
        void supabase.removeChannel(channel);
      };
    };

    const startRedisStream = async () => {
      try {
        const tokenResponse = await fetch("/api/auth/auction-token", {
          cache: "no-store",
        });

        if (!tokenResponse.ok) {
          startSupabaseFallback();
          return;
        }

        const { token } = (await tokenResponse.json()) as {
          token?: string;
        };

        if (!token || stopped) {
          startSupabaseFallback();
          return;
        }

        eventSource = new EventSource(
          `/api/auction/events?token=${encodeURIComponent(token)}`
        );

        eventSource.onmessage = () => {
          void refreshSnapshot();
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;

          if (stopped) {
            return;
          }

          reconnectTimeout = window.setTimeout(() => {
            void startRedisStream();
          }, 1500);
        };
      } catch {
        startSupabaseFallback();
      }
    };

    void startRedisStream();
    if (initialData === null) {
      void refreshSnapshot();
    }

    return () => {
      stopped = true;
      eventSource?.close();
      supabaseCleanup?.();

      if (reconnectTimeout) {
        window.clearTimeout(reconnectTimeout);
      }
    };
  }, [expectedRole, initialData]);

  return {
    data,
    isRefreshing,
  };
}
