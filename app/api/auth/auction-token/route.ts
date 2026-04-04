import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import {
  hasAuctionJwtSecret,
  signAuctionStreamToken,
} from "@/lib/auction-stream-token";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasAuctionJwtSecret()) {
    return NextResponse.json(
      { error: "Auction stream JWTs are not configured." },
      { status: 503 }
    );
  }

  const session = await getSessionContext();

  if (session.status !== "authenticated" || !session.role) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const token = signAuctionStreamToken({
    userId: session.user.id,
    role: session.role,
  });

  return NextResponse.json(token, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
