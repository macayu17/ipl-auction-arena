import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/auth";
import {
  getCachedAdminSnapshot,
  getCachedTeamSnapshot,
} from "@/lib/auction-cache";
import { getActiveSlide } from "@/lib/auction-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionContext();

  if (session.status !== "authenticated" || !session.role) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (session.role === "admin") {
    return NextResponse.json({
      role: "admin",
      data: await getCachedAdminSnapshot(),
    });
  }

  const [teamData, activeSlide] = await Promise.all([
    getCachedTeamSnapshot(session.user.id),
    getActiveSlide().catch(() => null),
  ]);

  return NextResponse.json({
    role: "team",
    data: {
      ...teamData,
      activeSlide,
    },
  });
}
