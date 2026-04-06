"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type RoleName = "admin" | "team";

type AuctionEvent = {
  type?: string;
  delta?: Record<string, unknown>;
};

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
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Apply a Supabase Realtime `auction_state` row update directly to local state.
 */
function applyRealtimeRow<T>(
  currentData: T | null,
  newRow: Record<string, unknown>
): T | null {
  if (!currentData) return null;

  try {
    const dataObj = currentData as Record<string, unknown>;
    const existingAuctionState = (dataObj.auctionState ?? {}) as Record<string, unknown>;

    return {
      ...dataObj,
      auctionState: {
        ...existingAuctionState,
        ...newRow,
      },
    } as T;
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

    /* ---------------------------------------------------------------
     * PRIMARY: Supabase Realtime — subscribe to auction_state changes
     * --------------------------------------------------------------- */
    const supabase = createClient();
    const realtimeChannel = supabase
      .channel("auction-live", { config: { broadcast: { self: true } } })
      .on(
        "postgres_changes" as "system",
        {
          event: "UPDATE",
          schema: "public",
          table: "auction_state",
          filter: "id=eq.1",
        } as Record<string, unknown>,
        (payload: { new?: Record<string, unknown> }) => {
          if (stopped || !payload.new) return;
          const patched = applyRealtimeRow(dataRef.current, payload.new);
          if (patched) {
            setData(patched);
          } else {
            void refreshSnapshot();
          }
        }
      )
      // Also listen for any table changes that signal a full refresh
      .on(
        "postgres_changes" as "system",
        {
          event: "*",
          schema: "public",
          table: "bids",
        } as Record<string, unknown>,
        () => {
          if (!stopped) void refreshSnapshot();
        }
      )
      .on(
        "postgres_changes" as "system",
        {
          event: "*",
          schema: "public",
          table: "players",
        } as Record<string, unknown>,
        () => {
          if (!stopped) void refreshSnapshot();
        }
      )
      .on(
        "postgres_changes" as "system",
        {
          event: "*",
          schema: "public",
          table: "teams",
        } as Record<string, unknown>,
        () => {
          if (!stopped) void refreshSnapshot();
        }
      )
      .subscribe();

    /* ---------------------------------------------------------------
     * SECONDARY: Redis SSE — fast delta patches (parallel channel)
     * --------------------------------------------------------------- */
    const handleSSEEvent = (rawData: string) => {
      if (stopped) return;

      try {
        const event = JSON.parse(rawData) as AuctionEvent;
        const patched = tryApplyDelta(dataRef.current, event);

        if (patched) {
          setData(patched);
          return;
        }
      } catch {
        // Not valid JSON → full refresh
      }

      void refreshSnapshot();
    };

    const startRedisStream = async () => {
      try {
        const tokenResponse = await fetch("/api/auth/auction-token", {
          cache: "no-store",
        });

        if (!tokenResponse.ok) return;

        const { token } = (await tokenResponse.json()) as { token?: string };

        if (!token || stopped) return;

        eventSource = new EventSource(
          `/api/auction/events?token=${encodeURIComponent(token)}`
        );

        eventSource.onmessage = (messageEvent) => {
          handleSSEEvent(messageEvent.data ?? "");
        };

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;

          if (stopped) return;

          reconnectTimeout = window.setTimeout(() => {
            void startRedisStream();
          }, 500);
        };
      } catch {
        // Redis unavailable — Supabase Realtime will handle it
      }
    };

    void startRedisStream();

    if (initialData === null) {
      void refreshSnapshot();
    }

    return () => {
      stopped = true;
      eventSource?.close();
      void supabase.removeChannel(realtimeChannel);

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
