import "server-only";

type RedisCommand = Array<string>;

type RedisPipelineResponse = Array<{
  result?: unknown;
  error?: string;
}>;

const AUCTION_EVENT_CHANNEL = "auction:global";

function getRedisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for auction Redis events."
    );
  }

  return {
    url: url.replace(/\/+$/, ""),
    token,
  };
}

export function hasRedisEnv() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function getRedisSubscribeUrl(channel = AUCTION_EVENT_CHANNEL) {
  const { url } = getRedisEnv();
  return `${url}/subscribe/${encodeURIComponent(channel)}`;
}

export function getRedisAuthHeader() {
  return `Bearer ${getRedisEnv().token}`;
}

async function executeRedisPipeline(commands: RedisCommand[]) {
  const { url, token } = getRedisEnv();
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis pipeline failed with status ${response.status}.`);
  }

  const result = (await response.json()) as RedisPipelineResponse;
  const failure = result.find((item) => item.error);

  if (failure?.error) {
    throw new Error(failure.error);
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Generic key/value cache operations                                 */
/* ------------------------------------------------------------------ */

async function executeRedisCommand(command: string[]) {
  const { url, token } = getRedisEnv();
  const path = command.map((c) => encodeURIComponent(c)).join("/");
  const response = await fetch(`${url}/${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis command failed (${response.status}): ${command[0]}`);
  }

  return (await response.json()) as { result: unknown };
}

/** Read a cached JSON value. Returns `null` if key is missing. */
export async function getRedisValue<T = unknown>(
  key: string
): Promise<T | null> {
  if (!hasRedisEnv()) return null;

  try {
    const { result } = await executeRedisCommand(["GET", key]);
    if (result === null || result === undefined) return null;
    return JSON.parse(String(result)) as T;
  } catch {
    return null;
  }
}

/** Write a JSON value with an optional TTL in seconds. */
export async function setRedisValue(
  key: string,
  value: unknown,
  ttlSeconds = 60
): Promise<void> {
  if (!hasRedisEnv()) return;

  await executeRedisPipeline([
    ["SET", key, JSON.stringify(value), "EX", String(ttlSeconds)],
  ]);
}

/** Delete one or more cache keys. */
export async function deleteRedisKeys(...keys: string[]): Promise<void> {
  if (!hasRedisEnv() || keys.length === 0) return;
  await executeRedisPipeline([["DEL", ...keys]]);
}

/* ------------------------------------------------------------------ */
/*  Pub/Sub event publishing                                           */
/* ------------------------------------------------------------------ */

import { broadcastAuctionUpdate } from "@/lib/auction-broadcast";

export type AuctionEventPayload = {
  type: string;
  source: string;
  at?: string;
  /** Optional delta data the client can apply without a full snapshot fetch. */
  delta?: Record<string, unknown>;
};

export async function publishAuctionEvent(event: AuctionEventPayload) {
  // PRIMARY: Supabase Realtime Broadcast (WebSocket, ~30-50ms)
  // Fire-and-forget — never blocks the action
  void broadcastAuctionUpdate().catch(() => {});

  // LEGACY: Redis PUBLISH (optional, used by SSE proxy)
  if (!hasRedisEnv()) {
    return;
  }

  try {
    await executeRedisPipeline([
      [
        "PUBLISH",
        AUCTION_EVENT_CHANNEL,
        JSON.stringify({
          ...event,
          at: event.at ?? new Date().toISOString(),
        }),
      ],
    ]);
  } catch {
    // Redis failure is non-fatal — broadcast already sent
  }
}

