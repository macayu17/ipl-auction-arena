"use server";

import { revalidatePath } from "next/cache";

import { getSessionContext } from "@/lib/auth";
import { hasBundledPlayerCsv, parseBundledPlayerCsv } from "@/lib/player-csv";
import { toLooseSupabaseClient } from "@/lib/supabase/loose-client";
import { createServiceClient } from "@/lib/supabase/server";

function normalizeNameKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function revalidateAuctionViews() {
  [
    "/admin/players",
    "/admin/auction",
    "/admin/dashboard",
    "/admin/teams",
    "/team/auction",
    "/team/squad",
  ].forEach((path) => revalidatePath(path));
}

async function isAdminRequest() {
  const session = await getSessionContext();

  return session.status === "authenticated" && session.role === "admin";
}

export async function importBundledPlayersAction() {
  try {
    if (!(await isAdminRequest())) {
      return;
    }

    if (!(await hasBundledPlayerCsv())) {
      return;
    }

    const importedPlayers = await parseBundledPlayerCsv();
    const supabase = toLooseSupabaseClient(await createServiceClient());
    const existingPlayersResult = await supabase
      .from("players")
      .select("name");

    if (existingPlayersResult.error) {
      throw existingPlayersResult.error;
    }

    const existingNames = new Set(
      ((existingPlayersResult.data ?? []) as Array<{ name: string }>).map((player) =>
        normalizeNameKey(player.name)
      )
    );

    const playersToInsert = importedPlayers
      .filter((player) => !existingNames.has(normalizeNameKey(player.name)))
      .map((player) => {
        const { source_category, ...insertablePlayer } = player;
        void source_category;
        return insertablePlayer;
      });

    if (playersToInsert.length > 0) {
      const insertResult = await supabase.from("players").insert(playersToInsert);

      if (insertResult.error) {
        throw insertResult.error;
      }
    }

    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to import bundled players", error);
  }
}
