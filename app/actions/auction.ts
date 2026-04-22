"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getUserRoleFromUser } from "@/lib/auth-roles";
import { invalidateAllCaches } from "@/lib/auction-cache";
import { publishAuctionEvent } from "@/lib/redis";
import {
  toLooseSupabaseClient,
  type LooseSupabaseClient,
} from "@/lib/supabase/loose-client";
import {
  createClient as createAuthClient,
  createServiceClient,
} from "@/lib/supabase/server";
import { isLegendaryRating } from "@/lib/utils";
import type {
  AuctionPhase,
  AuctionState,
  Player,
  PlayerRole,
  Team,
} from "@/types/app.types";

const defaultAuctionState = {
  id: 1,
  phase: "setup",
  current_player_id: null,
  current_bid_amount: 0,
  current_bid_team_id: null,
  timer_seconds: 10,
  timer_active: false,
  bid_increment: 50,
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

const ROUND_ROLE_ORDER: PlayerRole[] = [
  "Batsman",
  "Wicket-Keeper",
  "All-Rounder",
  "Bowler",
];

type RoundQueueState = {
  players: Player[];
  legendaryCount: number;
  roleCounts: Record<PlayerRole, number>;
};

function createRoundQueueState(): RoundQueueState {
  return {
    players: [],
    legendaryCount: 0,
    roleCounts: {
      Batsman: 0,
      "Wicket-Keeper": 0,
      "All-Rounder": 0,
      Bowler: 0,
    },
  };
}

function compareQueuePriority(left: Player, right: Player) {
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
}

function addPlayerToRound(round: RoundQueueState, player: Player, role: PlayerRole) {
  round.players.push(player);
  round.roleCounts[role] += 1;

  if (isLegendaryRating(player.rating)) {
    round.legendaryCount += 1;
  }
}

function pickRoundForRole(
  roundOne: RoundQueueState,
  roundTwo: RoundQueueState,
  role: PlayerRole,
  prioritizeLegendaryBalance: boolean,
  targetLegendaryPerRound?: number
) {
  const roleDiff = roundOne.roleCounts[role] - roundTwo.roleCounts[role];

  if (roleDiff !== 0) {
    return roleDiff < 0 ? roundOne : roundTwo;
  }

  if (prioritizeLegendaryBalance) {
    if (typeof targetLegendaryPerRound === "number") {
      const scoreOne =
        Math.abs(roundOne.legendaryCount + 1 - targetLegendaryPerRound) +
        Math.abs(roundTwo.legendaryCount - targetLegendaryPerRound);
      const scoreTwo =
        Math.abs(roundOne.legendaryCount - targetLegendaryPerRound) +
        Math.abs(roundTwo.legendaryCount + 1 - targetLegendaryPerRound);

      if (scoreOne !== scoreTwo) {
        return scoreOne < scoreTwo ? roundOne : roundTwo;
      }
    }

    const legendaryDiff = roundOne.legendaryCount - roundTwo.legendaryCount;

    if (legendaryDiff !== 0) {
      return legendaryDiff < 0 ? roundOne : roundTwo;
    }
  }

  const sizeDiff = roundOne.players.length - roundTwo.players.length;

  if (sizeDiff !== 0) {
    return sizeDiff < 0 ? roundOne : roundTwo;
  }

  return roundOne;
}

function interleaveRoundByRole(players: Player[]) {
  const roleBuckets: Record<PlayerRole, Player[]> = {
    Batsman: [],
    "Wicket-Keeper": [],
    "All-Rounder": [],
    Bowler: [],
  };
  const fallbackPlayers: Player[] = [];

  for (const player of players) {
    const role = player.role as PlayerRole;

    if (!ROUND_ROLE_ORDER.includes(role)) {
      fallbackPlayers.push(player);
      continue;
    }

    roleBuckets[role].push(player);
  }

  const ordered: Player[] = [];

  while (true) {
    let pushed = false;

    for (const role of ROUND_ROLE_ORDER) {
      const nextPlayer = roleBuckets[role].shift();

      if (!nextPlayer) {
        continue;
      }

      ordered.push(nextPlayer);
      pushed = true;
    }

    if (!pushed) {
      break;
    }
  }

  return [...ordered, ...fallbackPlayers];
}

function buildTwoRoundQueue(
  poolPlayers: Player[],
  targetLegendaryPerRound?: number
) {
  const roleBuckets: Record<PlayerRole, Player[]> = {
    Batsman: [],
    "Wicket-Keeper": [],
    "All-Rounder": [],
    Bowler: [],
  };
  const fallbackPlayers: Player[] = [];

  for (const player of [...poolPlayers].sort(compareQueuePriority)) {
    const role = player.role as PlayerRole;

    if (!ROUND_ROLE_ORDER.includes(role)) {
      fallbackPlayers.push(player);
      continue;
    }

    roleBuckets[role].push(player);
  }

  const roundOne = createRoundQueueState();
  const roundTwo = createRoundQueueState();

  for (const role of ROUND_ROLE_ORDER) {
    const rolePlayers = roleBuckets[role];
    const legendaryPlayers = rolePlayers.filter((player) =>
      isLegendaryRating(player.rating)
    );
    const standardPlayers = rolePlayers.filter(
      (player) => !isLegendaryRating(player.rating)
    );

    for (const player of legendaryPlayers) {
      const targetRound = pickRoundForRole(
        roundOne,
        roundTwo,
        role,
        true,
        targetLegendaryPerRound
      );
      addPlayerToRound(targetRound, player, role);
    }

    for (const player of standardPlayers) {
      const targetRound = pickRoundForRole(roundOne, roundTwo, role, false);
      addPlayerToRound(targetRound, player, role);
    }
  }

  return [
    ...interleaveRoundByRole(roundOne.players),
    ...interleaveRoundByRole(roundTwo.players),
    ...fallbackPlayers,
  ];
}

/**
 * Revalidate non-auction views (dashboard, players, teams).
 * Auction pages use client-side state via useLiveAuctionSync,
 * so revalidating them just causes unnecessary full-page RSC re-renders.
 */
function revalidateNonAuctionViews() {
  [
    "/admin/dashboard",
    "/admin/players",
    "/admin/teams",
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
    const unsoldDiff = Number(left.status === "unsold") - Number(right.status === "unsold");

    if (unsoldDiff !== 0) {
      return unsoldDiff;
    }

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

type AuctionBidRpcResponse = {
  success: boolean;
  delta?: Record<string, unknown>;
  error?: string;
};

async function ensureAdmin() {
  const supabase = await createAuthClient();
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;

  try {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      user = session?.user ?? null;
    } else {
      user = authUser;
    }
  } catch {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    user = session?.user ?? null;
  }

  if (!user || getUserRoleFromUser(user) !== "admin") {
    return null;
  }

  return user;
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
      timer_seconds: defaultAuctionState.timer_seconds,
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
  } catch (error) {
    console.error("Failed to reorder queue", error);
  }
}

export async function balanceQueueIntoThreeRoundsAction() {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const playersResult = await supabase
      .from("players")
      .select("*")
      .in("status", ["pool", "unsold"]);

    if (playersResult.error) {
      throw playersResult.error;
    }

    const queuePlayers = (playersResult.data as Player[] | null) ?? [];
    const poolPlayers = queuePlayers.filter((player) => player.status === "pool");
    const unsoldPlayers = queuePlayers
      .filter((player) => player.status === "unsold")
      .sort(compareQueuePriority);
    const unsoldLegendaryCount = unsoldPlayers.filter((player) =>
      isLegendaryRating(player.rating)
    ).length;
    const unsoldRound = interleaveRoundByRole(unsoldPlayers);

    const balancedQueue = [
      ...buildTwoRoundQueue(poolPlayers, unsoldLegendaryCount),
      ...unsoldRound,
    ];

    for (const [index, player] of balancedQueue.entries()) {
      const result = await supabase
        .from("players")
        .update({ queue_order: index + 1 })
        .eq("id", player.id);

      if (result.error) {
        throw result.error;
      }
    }

    await publishAuctionEvent({
      type: "queue_reordered",
      source: "auction.balanceQueueIntoThreeRoundsAction",
      delta: { rounds: 3, layout: "two-pool-rounds-plus-unsold" },
    });
    revalidateNonAuctionViews();
  } catch (error) {
    console.error("Failed to balance queue into three rounds", error);
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
  } catch (error) {
    console.error("Failed to update timer state", error);
  }
}

export async function placeBidAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return { success: false, error: "Unauthorized" };
    }

    const teamId = String(formData.get("teamId") ?? "").trim();
    if (!teamId) return { success: false, error: "Missing team ID" };

    const parsedCustomAmount = Number(formData.get("customAmount") ?? 0);
    const customAmount =
      Number.isFinite(parsedCustomAmount) && parsedCustomAmount > 0
        ? Math.floor(parsedCustomAmount)
        : null;

    const parsedCustomIncrement = Number(formData.get("customIncrement") ?? 0);
    const customIncrement =
      Number.isFinite(parsedCustomIncrement) && parsedCustomIncrement > 0
        ? Math.floor(parsedCustomIncrement)
        : null;

    // Keep the RPC fast path for normal quick bids.
    if (!customAmount && !customIncrement) {
      const supabase = await createServiceClient();
      const rpcClient = supabase as unknown as {
        rpc: (
          functionName: "place_auction_bid",
          args: { p_team_id: string }
        ) => Promise<{ data: AuctionBidRpcResponse | null; error: Error | null }>;
      };

      // Execute all 5 db operations in 1 ultra-fast RPC call
      const result = await rpcClient.rpc("place_auction_bid", {
        p_team_id: teamId,
      });

      if (result.error) {
        throw result.error;
      }

      const data = result.data;

      if (data?.success && data.delta) {
        await publishAuctionEvent({
          type: "bid_placed",
          source: "auction.placeBidAction",
          delta: data.delta,
        });
      }

      return data ?? { success: false };
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const [{ auctionState, currentPlayer }, team] = await Promise.all([
      getCurrentPlayerWithTeamContext(supabase),
      resolveTeamById(supabase, teamId),
    ]);

    if (!currentPlayer || !team) {
      return { success: false, error: "No active player or team" };
    }

    if (auctionState.current_bid_team_id === team.id) {
      return { success: false, error: "Team is already leading" };
    }

    const minimumAllowedAmount =
      auctionState.current_bid_amount > 0
        ? auctionState.current_bid_amount + 1
        : currentPlayer.base_price;

    const shouldUseCustomAmount =
      customAmount !== null && customAmount >= minimumAllowedAmount;
    const effectiveCustomIncrement =
      customIncrement ?? defaultAuctionState.bid_increment;

    const nextBidAmount = shouldUseCustomAmount
      ? customAmount
      : auctionState.current_bid_amount > 0
        ? auctionState.current_bid_amount + effectiveCustomIncrement
        : currentPlayer.base_price;

    const purseRemaining = team.purse_total - team.purse_spent;
    if (purseRemaining < nextBidAmount) {
      return { success: false, error: "Insufficient purse" };
    }

    const insertBidResult = await supabase.from("bids").insert({
      player_id: currentPlayer.id,
      team_id: team.id,
      amount: nextBidAmount,
    });

    if (insertBidResult.error) {
      throw insertBidResult.error;
    }

    const timerSeconds =
      auctionState.timer_seconds > 0
        ? auctionState.timer_seconds
        : defaultAuctionState.timer_seconds;

    const updateAuctionStateResult = await supabase
      .from("auction_state")
      .update({
        current_bid_amount: nextBidAmount,
        current_bid_team_id: team.id,
        timer_seconds: timerSeconds,
        timer_active: true,
        phase: "live",
      })
      .eq("id", 1);

    if (updateAuctionStateResult.error) {
      throw updateAuctionStateResult.error;
    }

    const delta = {
      currentBidAmount: nextBidAmount,
      currentBidTeamId: team.id,
      currentBidTeamCode: team.short_code,
      timerSeconds,
      timerActive: true,
      ...(customIncrement ? { customIncrement } : {}),
      ...(shouldUseCustomAmount && customAmount ? { customAmount } : {}),
    };

    await publishAuctionEvent({
      type: "bid_placed",
      source: shouldUseCustomAmount
        ? "auction.placeBidAction.customAmount"
        : "auction.placeBidAction.customIncrement",
      delta,
    });

    return {
      success: true,
      delta,
    };
  } catch (error) {
    console.error("Failed to place bid", error);
    return { success: false };
  }
}

/**
 * Set a custom bid amount + team directly (for corrections / jumps).
 * Admin only.
 */
export async function setCustomBidAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) return { success: false };

    const teamId = String(formData.get("teamId") ?? "").trim();
    const amount = Number(formData.get("amount") ?? 0);
    if (!teamId || !Number.isFinite(amount) || amount <= 0) return { success: false };

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const [{ auctionState, currentPlayer }, team] = await Promise.all([
      getCurrentPlayerWithTeamContext(supabase),
      resolveTeamById(supabase, teamId),
    ]);

    if (!currentPlayer || !team) return { success: false };

    const insertBidResult = await supabase.from("bids").insert({
      player_id: currentPlayer.id,
      team_id: team.id,
      amount,
    });
    if (insertBidResult.error) throw insertBidResult.error;

    const timerSeconds = auctionState.timer_seconds > 0
      ? auctionState.timer_seconds
      : defaultAuctionState.timer_seconds;

    const updateResult = await supabase
      .from("auction_state")
      .update({
        current_bid_amount: amount,
        current_bid_team_id: team.id,
        timer_seconds: timerSeconds,
        timer_active: true,
        phase: "live",
      })
      .eq("id", 1);
    if (updateResult.error) throw updateResult.error;

    const delta = {
      currentBidAmount: amount,
      currentBidTeamId: team.id,
      currentBidTeamCode: team.short_code,
      timerSeconds: timerSeconds,
      timerActive: true,
    };

    await publishAuctionEvent({
      type: "bid_placed",
      source: "auction.setCustomBidAction",
      delta,
    });

    return {
      success: true,
      delta,
    };
  } catch (error) {
    console.error("Failed to set custom bid", error);
    return { success: false };
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

    // Fetch all team IDs first, then update with a proper filter
    const teamsResult = await supabase.from("teams").select("id");
    if (teamsResult.error) throw teamsResult.error;

    const teamIds = ((teamsResult.data ?? []) as { id: string }[]).map((t) => t.id);
    if (teamIds.length === 0) return;

    const result = await supabase
      .from("teams")
      .update({ purse_total: purseTotal })
      .in("id", teamIds);

    if (result.error) throw result.error;

    await publishAuctionEvent({
      type: "purse_adjusted",
      source: "auction.adjustAllPursesAction",
    });
    revalidateNonAuctionViews();
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
        timer_seconds: defaultAuctionState.timer_seconds,
        timer_active: false,
      })
      .eq("id", 1);

    if (updateAuctionStateResult.error) {
      throw updateAuctionStateResult.error;
    }

    const soldAmount = auctionState.current_bid_amount;
    const nextPurseSpent = team.purse_spent + soldAmount;

    await publishAuctionEvent({
      type: "player_sold",
      source: "auction.sellCurrentPlayerAction",
      delta: {
        playerName: currentPlayer.name,
        teamName: team.name,
        teamCode: team.short_code,
        amount: soldAmount,
        purseLeft: Math.max(team.purse_total - nextPurseSpent, 0),
      },
    });
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
        timer_seconds: defaultAuctionState.timer_seconds,
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
  } catch (error) {
    console.error("Failed to mark player unsold", error);
  }
}

export async function resetAuctionAction() {
  try {
    if (!(await ensureAdmin())) {
      console.error("resetAuctionAction denied: missing admin session.");
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const [bidsResult, playersResult, teamsResult] = await Promise.all([
      supabase.from("bids").select("id"),
      supabase.from("players").select("id"),
      supabase.from("teams").select("id"),
    ]);

    if (bidsResult.error) {
      throw bidsResult.error;
    }

    if (playersResult.error) {
      throw playersResult.error;
    }

    if (teamsResult.error) {
      throw teamsResult.error;
    }

    const bidIds = ((bidsResult.data ?? []) as { id: string }[]).map(
      (bid) => bid.id
    );
    const playerIds = ((playersResult.data ?? []) as { id: string }[]).map(
      (player) => player.id
    );
    const teamIds = ((teamsResult.data ?? []) as { id: string }[]).map(
      (team) => team.id
    );

    if (bidIds.length > 0) {
      const deleteBidsResult = await supabase
        .from("bids")
        .delete()
        .in("id", bidIds);

      if (deleteBidsResult.error) {
        throw deleteBidsResult.error;
      }
    }

    if (playerIds.length > 0) {
      const resetPlayersResult = await supabase
        .from("players")
        .update({
          status: "pool",
          sold_to: null,
          sold_price: null,
        })
        .in("id", playerIds);

      if (resetPlayersResult.error) {
        throw resetPlayersResult.error;
      }
    }

    if (teamIds.length > 0) {
      const resetTeamsResult = await supabase
        .from("teams")
        .update({ purse_spent: 0 })
        .in("id", teamIds);

      if (resetTeamsResult.error) {
        throw resetTeamsResult.error;
      }
    }

    const resetAuctionStateResult = await supabase
      .from("auction_state")
      .upsert(defaultAuctionState, { onConflict: "id" });

    if (resetAuctionStateResult.error) {
      throw resetAuctionStateResult.error;
    }

    await invalidateAllCaches();
    revalidateNonAuctionViews();
    revalidatePath("/admin/auction");
    revalidatePath("/team/auction");

    try {
      await publishAuctionEvent({
        type: "auction_reset",
        source: "auction.resetAuctionAction",
      });
    } catch (broadcastError) {
      console.error(
        "Auction reset completed, but live broadcast failed.",
        broadcastError
      );
    }
  } catch (error) {
    console.error("Failed to reset auction", error);
  }
}
