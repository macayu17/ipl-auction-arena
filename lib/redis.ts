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

export async function publishAuctionEvent(event: {
  type: string;
  source: string;
  at?: string;
}) {
  if (!hasRedisEnv()) {
    return;
  }

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
}
