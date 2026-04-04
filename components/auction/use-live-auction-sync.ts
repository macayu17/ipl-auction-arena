"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type RoleName = "admin" | "team";

type AuctionEvent = {
  type?: string;
  delta?: Record<string, unknown>;
};

function isSupabaseClientConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Try to apply a delta patch from an SSE event directly to the local state.
 * Returns the patched data or `null` if a full refresh is required.
 */
function tryApplyDelta<T>(
  currentData: T | null,
  event: AuctionEvent
): T | null {
  if (!currentData || !event.delta || !event.type) return null;

  const data = currentData as Record<string, unknown>;
  const auctionState = data.auctionState as Record<string, unknown> | undefined;

  if (!auctionState) return null;

  try {
    switch (event.type) {
      case "bid_placed": {
        const d = event.delta;
        return {
          ...currentData,
          auctionState: {
            ...auctionState,
            current_bid_amount: d.currentBidAmount,
            current_bid_team_id: d.currentBidTeamId,
            timer_seconds: d.timerSeconds ?? 30,
            timer_active: d.timerActive ?? true,
          },
        } as T;
      }

      case "timer_state_changed": {
        const d = event.delta;
        return {
          ...currentData,
          auctionState: {
            ...auctionState,
            timer_seconds: d.timerSeconds,
            timer_active: d.timerActive,
          },
        } as T;
      }

      case "auction_phase_changed": {
        const d = event.delta;
        return {
          ...currentData,
          auctionState: {
            ...auctionState,
            phase: d.phase,
            timer_active: d.timerActive ?? auctionState.timer_active,
          },
        } as T;
      }

      case "bid_increment_changed": {
        const d = event.delta;
        return {
          ...currentData,
          auctionState: {
            ...auctionState,
            bid_increment: d.bidIncrement,
          },
        } as T;
      }

      default:
        // Unknown event type → requires full snapshot
        return null;
    }
  } catch {
    return null;
  }
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
  const dataRef = useRef(data);

  // Keep a live ref of the latest data for delta patching
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const refreshSnapshot = useCallback(async () => {
    if (fetchInFlightRef.current) return;

    fetchInFlightRef.current = true;
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/auction/live-snapshot", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const payload = (await response.json()) as {
        role?: RoleName;
        data?: T;
      };

      if (payload.role === expectedRole && payload.data) {
        setData(payload.data);
      }
    } finally {
      fetchInFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [expectedRole]);

  useEffect(() => {
    let stopped = false;
    let reconnectTimeout: number | null = null;
    let eventSource: EventSource | null = null;
    let supabaseCleanup: (() => void) | null = null;

    const handleEvent = (rawData: string) => {
      if (stopped) return;

      // Try to parse the event and apply a delta patch
      try {
        const event = JSON.parse(rawData) as AuctionEvent;
        const patched = tryApplyDelta(dataRef.current, event);

        if (patched) {
          setData(patched);
          // Still refresh in background for full consistency after a short delay
          setTimeout(() => {
            if (!stopped) void refreshSnapshot();
          }, 800);
          return;
        }
      } catch {
        // Not valid JSON or parse error → full refresh
      }

      void refreshSnapshot();
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

        eventSource.onmessage = (messageEvent) => {
          handleEvent(messageEvent.data ?? "");
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
  }, [expectedRole, initialData, refreshSnapshot]);

  return {
    data,
    isRefreshing,
  };
}
