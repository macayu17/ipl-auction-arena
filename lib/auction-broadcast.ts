import "server-only";

import { createClient } from "@supabase/supabase-js";

let _broadcastClient: ReturnType<typeof createClient> | null = null;

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

/**
 * Broadcast a message to all connected auction clients.
 * Uses Supabase Realtime Broadcast (WebSocket push).
 *
 * This is fire-and-forget — never blocks the server action.
 */
export async function broadcastAuctionUpdate(payload?: any) {
  try {
    const client = getBroadcastClient();

    const channel = client.channel("auction-sync");
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "auction-update",
      payload: payload ? { ...payload, at: Date.now() } : { at: Date.now() },
    });
    await client.removeChannel(channel);
  } catch (error) {
    // Non-fatal: clients will fall back to 3s polling
    console.error("Broadcast failed (non-fatal):", error);
  }
}
