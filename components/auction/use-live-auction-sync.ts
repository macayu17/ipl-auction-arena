"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type RoleName = "admin" | "team";

/**
 * Auction live-sync hook — v3 (Supabase Broadcast + fast polling).
 *
 * Architecture:
 *  1. Initial load → fetch /api/auction/live-snapshot
 *  2. PRIMARY: Supabase Realtime Broadcast channel "auction-sync"
 *     - Server actions broadcast a thin "refresh" signal after every mutation
 *     - Client receives it via WebSocket (~30-50ms) and triggers snapshot fetch
 *  3. SAFETY NET: 3-second polling interval
 *     - Catches any missed broadcasts (reconnections, network blips)
 *     - Does NOT fetch if data arrived via broadcast within the last 2s
 *  4. NO more Redis SSE, NO more postgres_changes
 */
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
  const lastFetchTimeRef = useRef(0);

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
        lastFetchTimeRef.current = Date.now();
      }
    } finally {
      fetchInFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [expectedRole]);

  useEffect(() => {
    let stopped = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    /* ---------------------------------------------------------------
     * PRIMARY: Supabase Realtime Broadcast
     * Server actions send { type: "broadcast", event: "auction-update" }
     * on channel "auction-sync". This arrives via WebSocket (~30-50ms).
     * --------------------------------------------------------------- */
    const supabase = createClient();
    const channel = supabase
      .channel("auction-sync")
      .on("broadcast", { event: "auction-update" }, (message) => {
        if (stopped) return;

        const eventPayload = message.payload;
        
        // Optimistic UI for high-frequency bids
        if (eventPayload && eventPayload.type === "bid_placed" && eventPayload.delta) {
          const d = eventPayload.delta as Record<string, any>;
          setData((prev: any) => {
            if (!prev || !prev.auctionState) return prev;

            const newBid = {
              id: "opt-" + Date.now(),
              amount: d.currentBidAmount,
              team_id: d.currentBidTeamId,
              timestamp: new Date().toISOString(),
              team: { short_code: d.currentBidTeamCode, name: d.currentBidTeamCode },
            };

            return {
              ...prev,
              auctionState: {
                ...prev.auctionState,
                current_bid_amount: d.currentBidAmount,
                current_bid_team_id: d.currentBidTeamId,
                timer_seconds: d.timerSeconds,
                timer_active: d.timerActive,
              },
              bidHistory: prev.bidHistory ? [newBid, ...prev.bidHistory] : prev.bidHistory,
            };
          });
        }

        void refreshSnapshot();
      })
      .subscribe();

    /* ---------------------------------------------------------------
     * SAFETY NET: Poll every 3 seconds
     * Skip if a broadcast-triggered fetch happened within the last 2s.
     * --------------------------------------------------------------- */
    pollInterval = setInterval(() => {
      if (stopped) return;
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch > 2000) {
        void refreshSnapshot();
      }
    }, 3000);

    /* Initial fetch */
    void refreshSnapshot();

    return () => {
      stopped = true;
      void supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [expectedRole, refreshSnapshot]);

  return {
    data,
    isRefreshing,
  };
}
