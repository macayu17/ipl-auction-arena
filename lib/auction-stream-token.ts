import "server-only";

import crypto from "node:crypto";

import type { UserRole } from "@/types/app.types";

const STREAM_TOKEN_TTL_SECONDS = 60 * 15;

type AuctionStreamTokenPayload = {
  sub: string;
  role: UserRole;
  scope: "auction:stream";
  iat: number;
  exp: number;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAuctionJwtSecret() {
  const secret = process.env.AUCTION_JWT_SECRET;

  if (!secret) {
    throw new Error(
      "AUCTION_JWT_SECRET is required to mint auction stream JWTs."
    );
  }

  return secret;
}

export function hasAuctionJwtSecret() {
  return Boolean(process.env.AUCTION_JWT_SECRET);
}

export function signAuctionStreamToken(input: {
  userId: string;
  role: UserRole;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuctionStreamTokenPayload = {
    sub: input.userId,
    role: input.role,
    scope: "auction:stream",
    iat: now,
    exp: now + STREAM_TOKEN_TTL_SECONDS,
  };

  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", getAuctionJwtSecret())
    .update(unsignedToken)
    .digest("base64url");

  return {
    token: `${unsignedToken}.${signature}`,
    expiresAt: payload.exp,
  };
}

export function verifyAuctionStreamToken(token: string) {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = crypto
      .createHmac("sha256", getAuctionJwtSecret())
      .update(unsignedToken)
      .digest("base64url");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      decodeBase64Url(encodedPayload)
    ) as AuctionStreamTokenPayload;
    const now = Math.floor(Date.now() / 1000);

    if (payload.scope !== "auction:stream" || payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
