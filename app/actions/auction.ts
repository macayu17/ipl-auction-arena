"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionContext } from "@/lib/auth";
import { invalidateAllCaches } from "@/lib/auction-cache";
import { publishAuctionEvent } from "@/lib/redis";
import {
  toLooseSupabaseClient,
  type LooseSupabaseClient,
} from "@/lib/supabase/loose-client";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  AuctionPhase,
  AuctionState,
  Player,
  Team,
} from "@/types/app.types";

const defaultAuctionState = {
  id: 1,
  phase: "setup",
  current_player_id: null,
  current_bid_amount: 0,
  current_bid_team_id: null,
  timer_seconds: 30,
  timer_active: false,
  bid_increment: 5,
};

const reorderQueueSchema = z.object({
  orderedPlayerIds: z
    .string()
    .transform((value) => JSON.parse(value) as string[])
    .refine(
      (value) =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => typeof item === "string" && item.length > 0),
      "Queue order must contain at least one player id."
    ),
});

function revalidateAuctionViews() {
  [
    "/admin/auction",
    "/admin/dashboard",
    "/admin/players",
    "/admin/teams",
    "/team/auction",
    "/team/squad",
  ].forEach((path) => revalidatePath(path));
}

function parsePositiveInteger(
  value: FormDataEntryValue | null,
  fallback: number
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function sortQueue(players: Player[]) {
  return [...players].sort((left, right) => {
    const queueDiff = (left.queue_order ?? Number.MAX_SAFE_INTEGER) -
      (right.queue_order ?? Number.MAX_SAFE_INTEGER);

    if (queueDiff !== 0) {
      return queueDiff;
    }

    const ratingDiff = (right.rating ?? 0) - (left.rating ?? 0);

    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    const priceDiff = right.base_price - left.base_price;

    if (priceDiff !== 0) {
      return priceDiff;
    }

    return left.name.localeCompare(right.name);
  });
}

async function ensureAdmin() {
  const session = await getSessionContext();

  if (session.status !== "authenticated" || session.role !== "admin") {
    return null;
  }

  return session.user;
}

async function getAuctionState(supabase: LooseSupabaseClient) {
  const auctionStateResult = await supabase
    .from("auction_state")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (auctionStateResult.error) {
    throw auctionStateResult.error;
  }

  if (auctionStateResult.data) {
    return auctionStateResult.data as AuctionState;
  }

  return {
    ...defaultAuctionState,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

async function nominatePlayerById(playerId: string) {
  const supabase = toLooseSupabaseClient(await createServiceClient());
  const [auctionState, playerResult] = await Promise.all([
    getAuctionState(supabase),
    supabase.from("players").select("*").eq("id", playerId).maybeSingle(),
  ]);

  if (playerResult.error) {
    throw playerResult.error;
  }

  const player = playerResult.data as Player | null;

  if (!player || player.status === "sold") {
    return;
  }

  if (
    auctionState.current_player_id &&
    auctionState.current_player_id !== playerId
  ) {
    return;
  }

  const resetPreviousActiveResult = await supabase
    .from("players")
    .update({ status: "pool" })
    .eq("status", "active")
    .neq("id", playerId);

  if (resetPreviousActiveResult.error) {
    throw resetPreviousActiveResult.error;
  }

  const activatePlayerResult = await supabase
    .from("players")
    .update({
      status: "active",
      sold_to: null,
      sold_price: null,
    })
    .eq("id", playerId);

  if (activatePlayerResult.error) {
    throw activatePlayerResult.error;
  }

  const updateAuctionStateResult = await supabase
    .from("auction_state")
    .update({
      phase: "live",
      current_player_id: playerId,
      current_bid_amount: 0,
      current_bid_team_id: null,
      timer_seconds: 30,
      timer_active: false,
    })
    .eq("id", 1);

  if (updateAuctionStateResult.error) {
    throw updateAuctionStateResult.error;
  }
}

async function getLatestBidsForCurrentPlayer(
  supabase: LooseSupabaseClient,
  playerId: string
) {
  const bidResult = await supabase
    .from("bids")
    .select("*")
    .eq("player_id", playerId)
    .order("timestamp", { ascending: false });

  if (bidResult.error) {
    throw bidResult.error;
  }

  return (bidResult.data as { id: string; team_id: string; amount: number }[] | null) ?? [];
}

async function getCurrentPlayerWithTeamContext(
  supabase: LooseSupabaseClient
) {
  const auctionState = await getAuctionState(supabase);

  if (!auctionState.current_player_id) {
    return { auctionState, currentPlayer: null };
  }

  const playerResult = await supabase
    .from("players")
    .select("*")
    .eq("id", auctionState.current_player_id)
    .maybeSingle();

  if (playerResult.error) {
    throw playerResult.error;
  }

  return {
    auctionState,
    currentPlayer: playerResult.data as Player | null,
  };
}

function getNextBidAmount(auctionState: AuctionState, currentPlayer: Player) {
  return auctionState.current_bid_amount > 0
    ? auctionState.current_bid_amount + auctionState.bid_increment
    : currentPlayer.base_price;
}

async function resolveTeamById(
  supabase: LooseSupabaseClient,
  teamId: string
) {
  const teamResult = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .maybeSingle();

  if (teamResult.error) {
    throw teamResult.error;
  }

  return teamResult.data as Team | null;
}

export async function nominatePlayerAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const playerId = String(formData.get("playerId") ?? "").trim();

    if (!playerId) {
      return;
    }

    await nominatePlayerById(playerId);
    await publishAuctionEvent({
      type: "player_nominated",
      source: "auction.nominatePlayerAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to nominate player", error);
  }
}

export async function nominateNextPlayerAction() {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const auctionState = await getAuctionState(supabase);

    if (auctionState.current_player_id) {
      return;
    }

    const playersResult = await supabase
      .from("players")
      .select("*")
      .in("status", ["pool", "unsold"]);

    if (playersResult.error) {
      throw playersResult.error;
    }

    const nextPlayer = sortQueue((playersResult.data as Player[] | null) ?? [])[0];

    if (!nextPlayer) {
      return;
    }

    await nominatePlayerById(nextPlayer.id);
    await publishAuctionEvent({
      type: "player_nominated",
      source: "auction.nominateNextPlayerAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to nominate next player", error);
  }
}

export async function setAuctionPhaseAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const phase = String(formData.get("phase") ?? "").trim() as AuctionPhase;

    if (!["setup", "live", "paused", "ended"].includes(phase)) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const result = await supabase
      .from("auction_state")
      .update({ phase, timer_active: phase === "live" })
      .eq("id", 1);

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "auction_phase_changed",
      source: "auction.setAuctionPhaseAction",
      delta: { phase, timerActive: phase === "live" },
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to change auction phase", error);
  }
}

export async function reorderQueueAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const parsed = reorderQueueSchema.safeParse({
      orderedPlayerIds: formData.get("orderedPlayerIds"),
    });

    if (!parsed.success) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());

    for (const [index, playerId] of parsed.data.orderedPlayerIds.entries()) {
      const result = await supabase
        .from("players")
        .update({ queue_order: index + 1 })
        .eq("id", playerId);

      if (result.error) {
        throw result.error;
      }
    }

    await publishAuctionEvent({
      type: "queue_reordered",
      source: "auction.reorderQueueAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to reorder queue", error);
  }
}

export async function setBidIncrementAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const bidIncrement = parsePositiveInteger(
      formData.get("bidIncrement"),
      defaultAuctionState.bid_increment
    );
    const supabase = toLooseSupabaseClient(await createServiceClient());
    const result = await supabase
      .from("auction_state")
      .update({ bid_increment: bidIncrement })
      .eq("id", 1);

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "bid_increment_changed",
      source: "auction.setBidIncrementAction",
      delta: { bidIncrement },
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to update bid increment", error);
  }
}

export async function setTimerStateAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const timerSeconds = parsePositiveInteger(
      formData.get("timerSeconds"),
      defaultAuctionState.timer_seconds
    );
    const timerActive = String(formData.get("timerActive") ?? "") === "true";

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const result = await supabase
      .from("auction_state")
      .update({
        timer_seconds: timerSeconds,
        timer_active: timerActive,
      })
      .eq("id", 1);

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "timer_state_changed",
      source: "auction.setTimerStateAction",
      delta: { timerSeconds, timerActive },
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to update timer state", error);
  }
}

export async function placeBidAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const teamId = String(formData.get("teamId") ?? "").trim();
    if (!teamId) return;

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const [{ auctionState, currentPlayer }, team] = await Promise.all([
      getCurrentPlayerWithTeamContext(supabase),
      resolveTeamById(supabase, teamId),
    ]);

    if (!currentPlayer || !team) return;
    if (auctionState.phase !== "live") return;
    if (auctionState.current_bid_team_id === team.id) return;

    const nextBidAmount = getNextBidAmount(auctionState, currentPlayer);
    const purseRemaining = team.purse_total - team.purse_spent;
    if (purseRemaining < nextBidAmount) return;

    const insertBidResult = await supabase.from("bids").insert({
      player_id: currentPlayer.id,
      team_id: team.id,
      amount: nextBidAmount,
    });

    if (insertBidResult.error) throw insertBidResult.error;

    const updateAuctionStateResult = await supabase
      .from("auction_state")
      .update({
        current_bid_amount: nextBidAmount,
        current_bid_team_id: team.id,
        timer_seconds: 30,
        timer_active: true,
        phase: "live",
      })
      .eq("id", 1);

    if (updateAuctionStateResult.error) throw updateAuctionStateResult.error;

    await publishAuctionEvent({
      type: "bid_placed",
      source: "auction.placeBidAction",
      delta: {
        currentBidAmount: nextBidAmount,
        currentBidTeamId: team.id,
        currentBidTeamCode: team.short_code,
        timerSeconds: 30,
        timerActive: true,
      },
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to place bid", error);
  }
}

/**
 * Set a custom bid amount + team directly (for corrections / jumps).
 * Admin only.
 */
export async function setCustomBidAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) return;

    const teamId = String(formData.get("teamId") ?? "").trim();
    const amount = Number(formData.get("amount") ?? 0);
    if (!teamId || !Number.isFinite(amount) || amount <= 0) return;

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const [{ auctionState, currentPlayer }, team] = await Promise.all([
      getCurrentPlayerWithTeamContext(supabase),
      resolveTeamById(supabase, teamId),
    ]);

    if (!currentPlayer || !team) return;

    const insertBidResult = await supabase.from("bids").insert({
      player_id: currentPlayer.id,
      team_id: team.id,
      amount,
    });
    if (insertBidResult.error) throw insertBidResult.error;

    const updateResult = await supabase
      .from("auction_state")
      .update({
        current_bid_amount: amount,
        current_bid_team_id: team.id,
        timer_seconds: auctionState.timer_seconds > 0 ? auctionState.timer_seconds : 30,
        timer_active: true,
        phase: "live",
      })
      .eq("id", 1);
    if (updateResult.error) throw updateResult.error;

    await publishAuctionEvent({
      type: "bid_placed",
      source: "auction.setCustomBidAction",
      delta: {
        currentBidAmount: amount,
        currentBidTeamId: team.id,
        currentBidTeamCode: team.short_code,
        timerSeconds: auctionState.timer_seconds > 0 ? auctionState.timer_seconds : 30,
        timerActive: true,
      },
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to set custom bid", error);
  }
}

/**
 * Adjust purse_total for ALL teams at once. Admin only.
 */
export async function adjustAllPursesAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) return;

    const purseTotal = Number(formData.get("purseTotal") ?? 0);
    if (!Number.isFinite(purseTotal) || purseTotal <= 0) return;

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const result = await supabase
      .from("teams")
      .update({ purse_total: purseTotal })
      .neq("id", "");

    if (result.error) throw result.error;

    await publishAuctionEvent({
      type: "purse_adjusted",
      source: "auction.adjustAllPursesAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to adjust purses", error);
  }
}

export async function undoLastBidAction() {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const { auctionState, currentPlayer } =
      await getCurrentPlayerWithTeamContext(supabase);

    if (!currentPlayer) {
      return;
    }

    const bids = await getLatestBidsForCurrentPlayer(supabase, currentPlayer.id);
    const [latestBid, previousBid] = bids;

    if (!latestBid) {
      return;
    }

    const deleteResult = await supabase.from("bids").delete().eq("id", latestBid.id);

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    const updateAuctionStateResult = await supabase
      .from("auction_state")
      .update({
        current_bid_amount: previousBid?.amount ?? 0,
        current_bid_team_id: previousBid?.team_id ?? null,
        timer_seconds: auctionState.timer_seconds > 0
          ? auctionState.timer_seconds
          : defaultAuctionState.timer_seconds,
        timer_active: Boolean(currentPlayer),
        phase: currentPlayer ? "live" : auctionState.phase,
      })
      .eq("id", 1);

    if (updateAuctionStateResult.error) {
      throw updateAuctionStateResult.error;
    }

    await publishAuctionEvent({
      type: "bid_reverted",
      source: "auction.undoLastBidAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to undo last bid", error);
  }
}

export async function sellCurrentPlayerAction() {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const { auctionState, currentPlayer } =
      await getCurrentPlayerWithTeamContext(supabase);

    if (
      !currentPlayer ||
      !auctionState.current_bid_team_id ||
      auctionState.current_bid_amount <= 0
    ) {
      return;
    }

    const teamResult = await supabase
      .from("teams")
      .select("*")
      .eq("id", auctionState.current_bid_team_id)
      .maybeSingle();

    if (teamResult.error) {
      throw teamResult.error;
    }

    const team = teamResult.data as Team | null;

    if (!team) {
      return;
    }

    const purseRemaining = team.purse_total - team.purse_spent;

    if (purseRemaining < auctionState.current_bid_amount) {
      return;
    }

    const updatePlayerResult = await supabase
      .from("players")
      .update({
        status: "sold",
        sold_to: team.id,
        sold_price: auctionState.current_bid_amount,
      })
      .eq("id", currentPlayer.id);

    if (updatePlayerResult.error) {
      throw updatePlayerResult.error;
    }

    const updateTeamResult = await supabase
      .from("teams")
      .update({
        purse_spent: team.purse_spent + auctionState.current_bid_amount,
      })
      .eq("id", team.id);

    if (updateTeamResult.error) {
      throw updateTeamResult.error;
    }

    const updateAuctionStateResult = await supabase
      .from("auction_state")
      .update({
        current_player_id: null,
        current_bid_amount: 0,
        current_bid_team_id: null,
        timer_seconds: 30,
        timer_active: false,
      })
      .eq("id", 1);

    if (updateAuctionStateResult.error) {
      throw updateAuctionStateResult.error;
    }

    await publishAuctionEvent({
      type: "player_sold",
      source: "auction.sellCurrentPlayerAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to sell current player", error);
  }
}

export async function markUnsoldAction() {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const { currentPlayer } = await getCurrentPlayerWithTeamContext(supabase);

    if (!currentPlayer) {
      return;
    }

    const updatePlayerResult = await supabase
      .from("players")
      .update({
        status: "unsold",
        sold_to: null,
        sold_price: null,
      })
      .eq("id", currentPlayer.id);

    if (updatePlayerResult.error) {
      throw updatePlayerResult.error;
    }

    const updateAuctionStateResult = await supabase
      .from("auction_state")
      .update({
        current_player_id: null,
        current_bid_amount: 0,
        current_bid_team_id: null,
        timer_seconds: 30,
        timer_active: false,
      })
      .eq("id", 1);

    if (updateAuctionStateResult.error) {
      throw updateAuctionStateResult.error;
    }

    await publishAuctionEvent({
      type: "player_marked_unsold",
      source: "auction.markUnsoldAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to mark player unsold", error);
  }
}

export async function resetAuctionAction() {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const [deleteBidsResult, resetPlayersResult, resetTeamsResult] =
      await Promise.all([
        supabase.from("bids").delete().gt("amount", 0),
        supabase.from("players").update({
          status: "pool",
          sold_to: null,
          sold_price: null,
        }).neq("id", ""),
        supabase.from("teams").update({ purse_spent: 0 }).neq("id", ""),
      ]);

    if (deleteBidsResult.error) {
      throw deleteBidsResult.error;
    }

    if (resetPlayersResult.error) {
      throw resetPlayersResult.error;
    }

    if (resetTeamsResult.error) {
      throw resetTeamsResult.error;
    }

    await getAuctionState(supabase);

    const resetAuctionStateResult = await supabase
      .from("auction_state")
      .update(defaultAuctionState)
      .eq("id", 1);

    if (resetAuctionStateResult.error) {
      throw resetAuctionStateResult.error;
    }

    await invalidateAllCaches();
    await publishAuctionEvent({
      type: "auction_reset",
      source: "auction.resetAuctionAction",
    });
    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to reset auction", error);
  }
}
