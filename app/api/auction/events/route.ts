import { getRedisAuthHeader, getRedisSubscribeUrl, hasRedisEnv } from "@/lib/redis";
import { verifyAuctionStreamToken } from "@/lib/auction-stream-token";

export const dynamic = "force-dynamic";

function isAbortError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { name?: string; code?: number };
  return maybeError.name === "AbortError" || maybeError.code === 20;
}

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
      let closed = false;

      const closeController = () => {
        if (closed) {
          return;
        }

        closed = true;
        try {
          controller.close();
        } catch {
          // Ignore close races during reconnect/disconnect churn.
        }
      };

      const cancelReader = () => {
        void reader.cancel().catch(() => {
          // Reader cancel can reject when already closed; treat as expected.
        });
      };

      const abortUpstream = () => {
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
      };

      controller.enqueue(encoder.encode(": connected\n\n"));

      // Heartbeat: send a comment every 15s to detect dead connections
      const heartbeat = setInterval(() => {
        try {
          if (!closed) {
            controller.enqueue(
              encoder.encode(`: heartbeat ${Date.now()}\n\n`)
            );
          }
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      const onAbort = () => {
        clearInterval(heartbeat);
        abortUpstream();
        cancelReader();
        closeController();
      };

      if (request.signal.aborted) {
        onAbort();
        return;
      }

      request.signal.addEventListener("abort", onAbort, { once: true });

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
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("Auction SSE stream read failed", error);
        }
      } finally {
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", onAbort);
        abortUpstream();
        cancelReader();
        closeController();
      }
    },
    cancel() {
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
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
