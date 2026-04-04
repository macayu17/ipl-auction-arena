"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionContext } from "@/lib/auth";
import { publishAuctionEvent } from "@/lib/redis";
import {
  hasBundledPlayerCsv,
  parseBundledPlayerCsv,
  parsePlayerCsvText,
  type ImportedPlayerRecord,
} from "@/lib/player-csv";
import { toLooseSupabaseClient } from "@/lib/supabase/loose-client";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  Player,
  PlayerInsert,
  PlayerNationality,
  PlayerRole,
} from "@/types/app.types";

const playerFormSchema = z.object({
  playerId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  role: z.enum(["Batsman", "Bowler", "All-Rounder", "Wicket-Keeper"]),
  nationality: z.enum(["Indian", "Overseas"]),
  basePrice: z.coerce.number().int().min(1),
  rating: z.coerce.number().int().min(1).max(100),
  battingStyle: z
    .string()
    .trim()
    .max(120)
    .transform((value) => value || null),
  bowlingStyle: z
    .string()
    .trim()
    .max(120)
    .transform((value) => value || null),
  iplCaps: z.coerce.number().int().min(0),
  photoUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null),
});

function mapPlayerFormToInsert(
  data: z.infer<typeof playerFormSchema>,
  queueOrder: number
): PlayerInsert {
  return {
    name: data.name,
    role: data.role as PlayerRole,
    nationality: data.nationality as PlayerNationality,
    base_price: data.basePrice,
    rating: data.rating,
    batting_style: data.battingStyle,
    bowling_style: data.bowlingStyle,
    ipl_caps: data.iplCaps,
    photo_url: data.photoUrl,
    status: "pool",
    sold_to: null,
    sold_price: null,
    queue_order: queueOrder,
  };
}

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

async function getSupabase() {
  return toLooseSupabaseClient(await createServiceClient());
}

async function getNextQueueOrder() {
  const supabase = await getSupabase();
  const result = await supabase
    .from("players")
    .select("queue_order")
    .order("queue_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  const currentMax = (result.data as Pick<Player, "queue_order"> | null)?.queue_order;
  return (currentMax ?? 0) + 1;
}

async function importPlayerRecords(importedPlayers: ImportedPlayerRecord[]) {
  const supabase = await getSupabase();
  const existingPlayersResult = await supabase.from("players").select("name");

  if (existingPlayersResult.error) {
    throw existingPlayersResult.error;
  }

  const existingNames = new Set(
    ((existingPlayersResult.data ?? []) as Array<{ name: string }>).map((player) =>
      normalizeNameKey(player.name)
    )
  );
  let nextQueueOrder = await getNextQueueOrder();

  const playersToInsert = importedPlayers
    .filter((player) => !existingNames.has(normalizeNameKey(player.name)))
    .map((player) => {
      const { source_category, ...insertablePlayer } = player;
      const queueOrder = nextQueueOrder;

      nextQueueOrder += 1;
      void source_category;
      return {
        ...insertablePlayer,
        queue_order: queueOrder,
      };
    });

  if (playersToInsert.length > 0) {
    const insertResult = await supabase.from("players").insert(playersToInsert);

    if (insertResult.error) {
      throw insertResult.error;
    }
  }

  await publishAuctionEvent({
    type: "players_imported",
    source: "players.importPlayerRecords",
  });
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

export async function createPlayerAction(formData: FormData) {
  try {
    if (!(await isAdminRequest())) {
      return;
    }

    const parsed = playerFormSchema.safeParse({
      name: formData.get("name"),
      role: formData.get("role"),
      nationality: formData.get("nationality"),
      basePrice: formData.get("basePrice"),
      rating: formData.get("rating"),
      battingStyle: formData.get("battingStyle"),
      bowlingStyle: formData.get("bowlingStyle"),
      iplCaps: formData.get("iplCaps"),
      photoUrl: formData.get("photoUrl"),
    });

    if (!parsed.success) {
      return;
    }

    const supabase = await getSupabase();
    const queueOrder = await getNextQueueOrder();
    const result = await supabase
      .from("players")
      .insert(mapPlayerFormToInsert(parsed.data, queueOrder));

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "player_created",
      source: "players.createPlayerAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to create player", error);
  }
}

export async function updatePlayerAction(formData: FormData) {
  try {
    if (!(await isAdminRequest())) {
      return;
    }

    const parsed = playerFormSchema.safeParse({
      playerId: formData.get("playerId"),
      name: formData.get("name"),
      role: formData.get("role"),
      nationality: formData.get("nationality"),
      basePrice: formData.get("basePrice"),
      rating: formData.get("rating"),
      battingStyle: formData.get("battingStyle"),
      bowlingStyle: formData.get("bowlingStyle"),
      iplCaps: formData.get("iplCaps"),
      photoUrl: formData.get("photoUrl"),
    });

    if (!parsed.success || !parsed.data.playerId) {
      return;
    }

    const supabase = await getSupabase();
    const result = await supabase
      .from("players")
      .update({
        name: parsed.data.name,
        role: parsed.data.role,
        nationality: parsed.data.nationality,
        base_price: parsed.data.basePrice,
        rating: parsed.data.rating,
        batting_style: parsed.data.battingStyle,
        bowling_style: parsed.data.bowlingStyle,
        ipl_caps: parsed.data.iplCaps,
        photo_url: parsed.data.photoUrl,
      })
      .eq("id", parsed.data.playerId);

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "player_updated",
      source: "players.updatePlayerAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to update player", error);
  }
}

export async function deletePlayerAction(formData: FormData) {
  try {
    if (!(await isAdminRequest())) {
      return;
    }

    const playerId = String(formData.get("playerId") ?? "").trim();

    if (!playerId) {
      return;
    }

    const supabase = await getSupabase();
    const playerResult = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .maybeSingle();

    if (playerResult.error) {
      throw playerResult.error;
    }

    const player = playerResult.data as Player | null;

    if (!player || player.status === "sold" || player.status === "active") {
      return;
    }

    const deleteResult = await supabase.from("players").delete().eq("id", playerId);

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    await publishAuctionEvent({
      type: "player_deleted",
      source: "players.deletePlayerAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to delete player", error);
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
