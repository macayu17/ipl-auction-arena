"use server";

import { revalidatePath } from "next/cache";

import { getSessionContext } from "@/lib/auth";
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

async function ensureAuthenticatedSession() {
  const session = await getSessionContext();

  if (session.status !== "authenticated") {
    return null;
  }

  return session;
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

async function resolveTeamForBid(
  supabase: LooseSupabaseClient,
  formData: FormData
) {
  const session = await ensureAuthenticatedSession();

  if (!session) {
    return null;
  }

  if (session.role === "admin") {
    const teamId = String(formData.get("teamId") ?? "").trim();

    if (!teamId) {
      return null;
    }

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

  if (session.role === "team") {
    const teamResult = await supabase
      .from("teams")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (teamResult.error) {
      throw teamResult.error;
    }

    return teamResult.data as Team | null;
  }

  return null;
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

    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to change auction phase", error);
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

    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to update timer state", error);
  }
}

export async function placeBidAction(formData: FormData) {
  try {
    const session = await ensureAuthenticatedSession();

    if (!session || (session.role !== "team" && session.role !== "admin")) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const [{ auctionState, currentPlayer }, team] = await Promise.all([
      getCurrentPlayerWithTeamContext(supabase),
      resolveTeamForBid(supabase, formData),
    ]);

    if (!currentPlayer || !team) {
      return;
    }

    if (auctionState.phase !== "live") {
      return;
    }

    if (auctionState.current_bid_team_id === team.id) {
      return;
    }

    const nextBidAmount = getNextBidAmount(auctionState, currentPlayer);
    const purseRemaining = team.purse_total - team.purse_spent;

    if (purseRemaining < nextBidAmount) {
      return;
    }

    const insertBidResult = await supabase.from("bids").insert({
      player_id: currentPlayer.id,
      team_id: team.id,
      amount: nextBidAmount,
    });

    if (insertBidResult.error) {
      throw insertBidResult.error;
    }

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

    if (updateAuctionStateResult.error) {
      throw updateAuctionStateResult.error;
    }

    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to place bid", error);
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

    revalidateAuctionViews();
  } catch (error) {
    console.error("Failed to reset auction", error);
  }
}
