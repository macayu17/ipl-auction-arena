"use server";

import { revalidatePath } from "next/cache";

import { getSessionContext } from "@/lib/auth";
import {
  hasBundledPlayerCsv,
  parseBundledPlayerCsv,
  parsePlayerCsvText,
  type ImportedPlayerRecord,
} from "@/lib/player-csv";
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

async function importPlayerRecords(importedPlayers: ImportedPlayerRecord[]) {
  const supabase = toLooseSupabaseClient(await createServiceClient());
  const existingPlayersResult = await supabase.from("players").select("name");

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
}

export async function importBundledPlayersAction() {
  try {
    if (!(await isAdminRequest()) || !(await hasBundledPlayerCsv())) {
      return;
    }

    await importPlayerRecords(await parseBundledPlayerCsv());
  } catch (error) {
    console.error("Failed to import bundled players", error);
  }
}

export async function importUploadedPlayersAction(formData: FormData) {
  try {
    if (!(await isAdminRequest())) {
      return;
    }

    const csvFile = formData.get("csvFile");

    if (!(csvFile instanceof File) || csvFile.size === 0) {
      return;
    }

    const importedPlayers = parsePlayerCsvText(await csvFile.text());
    await importPlayerRecords(importedPlayers);
  } catch (error) {
    console.error("Failed to import uploaded players", error);
  }
}
