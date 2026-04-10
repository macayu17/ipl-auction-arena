import "server-only";

import { createClient } from "@supabase/supabase-js";

let _broadcastClient: ReturnType<typeof createClient> | null = null;
let _broadcastChannel:
  | ReturnType<ReturnType<typeof createClient>["channel"]>
  | null = null;

function getBroadcastClient() {
  if (_broadcastClient) return _broadcastClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for Realtime broadcast."
    );
  }

  _broadcastClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _broadcastClient;
}

function getBroadcastChannel() {
  if (_broadcastChannel) return _broadcastChannel;

  _broadcastChannel = getBroadcastClient().channel("auction-sync");
  return _broadcastChannel;
}

/**
 * Broadcast a message to all connected auction clients.
 * Uses Supabase Realtime Broadcast (WebSocket push).
 *
 * This is fire-and-forget — never blocks the server action.
 */
export async function broadcastAuctionUpdate(payload?: any) {
  try {
    const channel = getBroadcastChannel();
    const result = await channel.httpSend(
      "auction-update",
      payload ? { ...payload, at: Date.now() } : { at: Date.now() },
      { timeout: 800 }
    );

    if (!result.success) {
      throw new Error(
        `Broadcast REST failed (${result.status}): ${result.error}`
      );
    }
  } catch (error) {
    // Non-fatal: clients will fall back to 3s polling
    console.error("Broadcast failed (non-fatal):", error);
  }
}
