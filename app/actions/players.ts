"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionContext } from "@/lib/auth";
import { isMemePlayer } from "@/lib/meme-players";
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
  Team,
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

function isQueueEligibleStatus(status: Player["status"]) {
  return status === "pool" || status === "unsold";
}

function compareQueueOrder(
  left: Pick<Player, "name" | "queue_order">,
  right: Pick<Player, "name" | "queue_order">
) {
  const queueDiff = (left.queue_order ?? Number.MAX_SAFE_INTEGER) -
    (right.queue_order ?? Number.MAX_SAFE_INTEGER);

  if (queueDiff !== 0) {
    return queueDiff;
  }

  return left.name.localeCompare(right.name);
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
  const existingPlayersResult = await supabase
    .from("players")
    .select("id, name, status, queue_order");

  if (existingPlayersResult.error) {
    throw existingPlayersResult.error;
  }

  const existingPlayers =
    ((existingPlayersResult.data ?? []) as Array<
      Pick<Player, "id" | "name" | "status" | "queue_order">
    >);
  const existingByName = new Map<
    string,
    Pick<Player, "id" | "name" | "status" | "queue_order">
  >();

  for (const player of existingPlayers) {
    const key = normalizeNameKey(player.name);
    const current = existingByName.get(key);

    if (
      !current ||
      (!isQueueEligibleStatus(current.status) && isQueueEligibleStatus(player.status))
    ) {
      existingByName.set(key, player);
    }
  }

  const remainingQueuePlayers = existingPlayers
    .filter((player) => isQueueEligibleStatus(player.status))
    .sort(compareQueueOrder);

  const consumedExistingIds = new Set<string>();
  const orderedQueueEntries: Array<
    | {
      kind: "existing";
      player: Pick<Player, "id" | "name" | "status" | "queue_order">;
    }
    | {
      kind: "new";
      player: ImportedPlayerRecord;
    }
  > = [];

  for (const importedPlayer of importedPlayers) {
    const key = normalizeNameKey(importedPlayer.name);
    const existingPlayer = existingByName.get(key);

    if (existingPlayer) {
      if (
        isQueueEligibleStatus(existingPlayer.status) &&
        !consumedExistingIds.has(existingPlayer.id)
      ) {
        orderedQueueEntries.push({ kind: "existing", player: existingPlayer });
        consumedExistingIds.add(existingPlayer.id);
      }

      continue;
    }

    orderedQueueEntries.push({ kind: "new", player: importedPlayer });
  }

  for (const player of remainingQueuePlayers) {
    if (consumedExistingIds.has(player.id)) {
      continue;
    }

    orderedQueueEntries.push({ kind: "existing", player });
    consumedExistingIds.add(player.id);
  }

  const playersToInsert: PlayerInsert[] = [];
  const queueOrderUpdates: Array<{ id: string; queue_order: number }> = [];

  for (const [index, entry] of orderedQueueEntries.entries()) {
    const queueOrder = index + 1;

    if (entry.kind === "new") {
      const { source_category, ...insertablePlayer } = entry.player;

      void source_category;
      playersToInsert.push({
        ...insertablePlayer,
        queue_order: queueOrder,
      });
      continue;
    }

    if ((entry.player.queue_order ?? null) !== queueOrder) {
      queueOrderUpdates.push({ id: entry.player.id, queue_order: queueOrder });
    }
  }

  if (playersToInsert.length > 0) {
    const insertResult = await supabase.from("players").insert(playersToInsert);

    if (insertResult.error) {
      throw insertResult.error;
    }
  }

  if (queueOrderUpdates.length > 0) {
    for (const update of queueOrderUpdates) {
      const updateResult = await supabase
        .from("players")
        .update({ queue_order: update.queue_order })
        .eq("id", update.id);

      if (updateResult.error) {
        throw updateResult.error;
      }
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

    const rawSoldTo = String(formData.get("soldTo") ?? "").trim();
    const nextSoldToFromForm = rawSoldTo.length > 0 ? rawSoldTo : null;

    if (nextSoldToFromForm) {
      const soldToValidation = z.string().uuid().safeParse(nextSoldToFromForm);
      if (!soldToValidation.success) {
        return;
      }
    }

    const supabase = await getSupabase();
    const existingPlayerResult = await supabase
      .from("players")
      .select("id, name, status, sold_to, sold_price")
      .eq("id", parsed.data.playerId)
      .maybeSingle();

    if (existingPlayerResult.error) {
      throw existingPlayerResult.error;
    }

    const existingPlayer = (existingPlayerResult.data as Pick<
      Player,
      "id" | "name" | "status" | "sold_to" | "sold_price"
    > | null);

    if (!existingPlayer) {
      return;
    }

    const nextSoldTo = existingPlayer.status === "sold"
      ? nextSoldToFromForm ?? existingPlayer.sold_to
      : null;
    const shouldTransferSoldPlayer =
      existingPlayer.status === "sold" &&
      existingPlayer.sold_to !== nextSoldTo;
    const transferAmount = existingPlayer.sold_price ?? 0;
    const shouldAdjustPurseSpent =
      shouldTransferSoldPlayer &&
      transferAmount > 0 &&
      !isMemePlayer(existingPlayer);

    const affectedTeamIds = shouldTransferSoldPlayer
      ? [...new Set([existingPlayer.sold_to, nextSoldTo].filter(
        (teamId): teamId is string => Boolean(teamId)
      ))]
      : [];
    let affectedTeamById = new Map<
      string,
      Pick<Team, "id" | "purse_total" | "purse_spent">
    >();

    if (affectedTeamIds.length > 0) {
      const teamsResult = await supabase
        .from("teams")
        .select("id, purse_total, purse_spent")
        .in("id", affectedTeamIds);

      if (teamsResult.error) {
        throw teamsResult.error;
      }

      const affectedTeams =
        ((teamsResult.data as Pick<Team, "id" | "purse_total" | "purse_spent">[] | null) ??
          []);
      affectedTeamById = new Map(
        affectedTeams.map((team) => [team.id, team])
      );

      if (nextSoldTo && !affectedTeamById.has(nextSoldTo)) {
        return;
      }
    }

    if (shouldAdjustPurseSpent && nextSoldTo) {
      const targetTeam = affectedTeamById.get(nextSoldTo);
      if (!targetTeam) {
        return;
      }

      const projectedTargetSpend = targetTeam.purse_spent + transferAmount;
      if (projectedTargetSpend > targetTeam.purse_total) {
        return;
      }
    }

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
        sold_to: nextSoldTo,
      })
      .eq("id", parsed.data.playerId);

    if (result.error) {
      throw result.error;
    }

    if (shouldAdjustPurseSpent) {
      if (existingPlayer.sold_to && existingPlayer.sold_to !== nextSoldTo) {
        const previousTeam = affectedTeamById.get(existingPlayer.sold_to);

        if (!previousTeam) {
          return;
        }

        const updatePreviousTeamResult = await supabase
          .from("teams")
          .update({
            purse_spent: Math.max(previousTeam.purse_spent - transferAmount, 0),
          })
          .eq("id", previousTeam.id);

        if (updatePreviousTeamResult.error) {
          throw updatePreviousTeamResult.error;
        }
      }

      if (nextSoldTo && existingPlayer.sold_to !== nextSoldTo) {
        const nextTeam = affectedTeamById.get(nextSoldTo);

        if (!nextTeam) {
          return;
        }

        const updateNextTeamResult = await supabase
          .from("teams")
          .update({
            purse_spent: nextTeam.purse_spent + transferAmount,
          })
          .eq("id", nextTeam.id);

        if (updateNextTeamResult.error) {
          throw updateNextTeamResult.error;
        }
      }
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
