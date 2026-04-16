import "server-only";

import { request as httpRequest, type IncomingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";

const FALLBACK_TIMEOUT_MS = 30_000;
const FALLBACK_MAX_ATTEMPTS = 3;
const FALLBACK_RETRY_BASE_DELAY_MS = 250;

function isUndiciFetchFailure(error: unknown) {
  return (
    error instanceof TypeError &&
    error.message.toLowerCase().includes("fetch failed")
  );
}

function toNodeHeaders(headers: Headers): Record<string, string> {
  const normalized: Record<string, string> = {};

  headers.forEach((value, key) => {
    normalized[key] = value;
  });

  return normalized;
}

function toWebHeaders(headers: IncomingHttpHeaders): Headers {
  const normalized = new Headers();

  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === "undefined") {
      return;
    }

    if (Array.isArray(value)) {
      normalized.set(key, value.join(", "));
      return;
    }

    normalized.set(key, value);
  });

  return normalized;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = (error as { code?: unknown }).code;
  return typeof candidate === "string" ? candidate : "";
}

function isRetriableNetworkError(error: unknown) {
  const code = getErrorCode(error);

  return [
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNABORTED",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "EAI_AGAIN",
  ].includes(code);
}

function getRetryDelayMs(attempt: number) {
  return FALLBACK_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
}

type NodeRequestDetails = {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body: Buffer | undefined;
  signal: AbortSignal;
};

function fallbackNodeFetchOnce(details: NodeRequestDetails): Promise<Response> {
  const { url, method, headers, body, signal } = details;

  if (signal.aborted) {
    return Promise.reject(new Error("The operation was aborted."));
  }

  return new Promise<Response>((resolve, reject) => {
    const transport = url.protocol === "http:" ? httpRequest : httpsRequest;

    const nodeRequest = transport(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        timeout: FALLBACK_TIMEOUT_MS,
      },
      (nodeResponse) => {
        const chunks: Buffer[] = [];

        nodeResponse.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        nodeResponse.on("end", () => {
          resolve(
            new Response(Buffer.concat(chunks), {
              status: nodeResponse.statusCode ?? 500,
              statusText: nodeResponse.statusMessage ?? "",
              headers: toWebHeaders(nodeResponse.headers),
            })
          );
        });
      }
    );

    const abortHandler = () => {
      nodeRequest.destroy(new Error("The operation was aborted."));
    };

    signal.addEventListener("abort", abortHandler, { once: true });

    nodeRequest.on("close", () => {
      signal.removeEventListener("abort", abortHandler);
    });

    nodeRequest.on("timeout", () => {
      nodeRequest.destroy(Object.assign(new Error("Supabase fallback fetch timed out."), { code: "ETIMEDOUT" }));
    });

    nodeRequest.on("error", (error) => {
      reject(error);
    });

    if (body) {
      nodeRequest.write(body);
    }

    nodeRequest.end();
  });
}

async function fallbackNodeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const requestHeaders = toNodeHeaders(request.headers);
  const hasBody = method !== "GET" && method !== "HEAD";
  const requestBody = hasBody
    ? Buffer.from(await request.arrayBuffer())
    : undefined;

  if (requestBody && !requestHeaders["content-length"]) {
    requestHeaders["content-length"] = String(requestBody.length);
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= FALLBACK_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fallbackNodeFetchOnce({
        url,
        method,
        headers: requestHeaders,
        body: requestBody,
        signal: request.signal,
      });
    } catch (error) {
      lastError = error;

      if (request.signal.aborted) {
        throw error;
      }

      const canRetry =
        attempt < FALLBACK_MAX_ATTEMPTS && isRetriableNetworkError(error);

      if (!canRetry) {
        throw error;
      }

      await sleep(getRetryDelayMs(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Supabase fallback fetch failed.");
}

export const supabaseServerFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (!isUndiciFetchFailure(error)) {
      throw error;
    }

    return fallbackNodeFetch(input, init);
  }
};
