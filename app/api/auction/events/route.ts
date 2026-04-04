import { getRedisAuthHeader, getRedisSubscribeUrl, hasRedisEnv } from "@/lib/redis";
import { verifyAuctionStreamToken } from "@/lib/auction-stream-token";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasRedisEnv()) {
    return new Response("Redis event transport is not configured.", {
      status: 503,
    });
  }

  const token = new URL(request.url).searchParams.get("token");

  if (!token || !verifyAuctionStreamToken(token)) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const abortController = new AbortController();
  const upstream = await fetch(getRedisSubscribeUrl(), {
    method: "POST",
    headers: {
      Authorization: getRedisAuthHeader(),
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    signal: abortController.signal,
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("Unable to connect to Redis stream.", {
      status: 502,
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode(": connected\n\n"));

      request.signal.addEventListener("abort", () => {
        abortController.abort();
        void reader.cancel();
      });

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          if (value) {
            controller.enqueue(value);
          }
        }
      } catch {
        // Closing the client request or upstream stream is expected during reconnects.
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
