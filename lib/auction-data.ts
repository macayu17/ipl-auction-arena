import "server-only";

import { cache } from "react";

import { toLooseSupabaseClient } from "@/lib/supabase/loose-client";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  AuctionState,
  Bid,
  BidWithTeam,
  Player,
  Slide,
  Team,
  TeamCredential,
  TeamWithSummary,
} from "@/types/app.types";

const defaultAuctionState: AuctionState = {
  id: 1,
  phase: "setup",
  current_player_id: null,
  current_bid_amount: 0,
  current_bid_team_id: null,
  timer_seconds: 30,
  timer_active: false,
  bid_increment: 5,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

function sortPlayersForQueue(players: Player[]) {
  return [...players].sort((left, right) => {
    const queueDiff =
      (left.queue_order ?? Number.MAX_SAFE_INTEGER) -
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

function buildTeamSummary(
  teams: Team[],
  players: Player[],
  credentials: TeamCredential[] = []
): TeamWithSummary[] {
  const credentialByTeamId = new Map(credentials.map((item) => [item.team_id, item]));

  return teams
    .map((team) => {
      const squad = players.filter((player) => player.sold_to === team.id);

      return {
        ...team,
        players_acquired: squad.length,
        purse_remaining: team.purse_total - team.purse_spent,
        squad_rating_total: squad.reduce(
          (sum, player) => sum + (player.rating ?? 0),
          0
        ),
        credentials: credentialByTeamId.get(team.id) ?? null,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function getBaseAuctionData() {
  const supabase = toLooseSupabaseClient(await createServiceClient());

  const [
    auctionStateResult,
    playersResult,
    teamsResult,
    credentialsResult,
  ] = await Promise.all([
    supabase.from("auction_state").select("*").eq("id", 1).maybeSingle(),
    supabase.from("players").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("team_credentials").select("*"),
  ]);

  if (auctionStateResult.error) throw auctionStateResult.error;
  if (playersResult.error) throw playersResult.error;
  if (teamsResult.error) throw teamsResult.error;
  if (credentialsResult.error) throw credentialsResult.error;

  const auctionState =
    (auctionStateResult.data as AuctionState | null) ?? defaultAuctionState;
  const players = (playersResult.data as Player[] | null) ?? [];
  const teams = (teamsResult.data as Team[] | null) ?? [];
  const credentials = (credentialsResult.data as TeamCredential[] | null) ?? [];
  const teamSummary = buildTeamSummary(teams, players, credentials);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const currentPlayer =
    players.find((player) => player.id === auctionState.current_player_id) ?? null;
  const leadingTeam =
    teams.find((team) => team.id === auctionState.current_bid_team_id) ?? null;

  return {
    supabase,
    auctionState,
    players,
    teams,
    credentials,
    teamSummary,
    teamById,
    currentPlayer,
    leadingTeam,
  };
}

export const getPlayersPageData = cache(async () => {
  const { players, teamSummary } = await getBaseAuctionData();
  const queueSortedPlayers = sortPlayersForQueue(players);

  return {
    players: queueSortedPlayers,
    teamSummary,
    summary: {
      total: players.length,
      pool: players.filter((player) => player.status === "pool").length,
      active: players.filter((player) => player.status === "active").length,
      sold: players.filter((player) => player.status === "sold").length,
      unsold: players.filter((player) => player.status === "unsold").length,
    },
  };
});

export const getAdminAuctionPageData = cache(async () => {
  const {
    supabase,
    auctionState,
    players,
    teamSummary,
    teamById,
    currentPlayer,
    leadingTeam,
  } = await getBaseAuctionData();

  let bidHistory: BidWithTeam[] = [];

  if (auctionState.current_player_id) {
    const bidResult = await supabase
      .from("bids")
      .select("*")
      .eq("player_id", auctionState.current_player_id)
      .order("timestamp", { ascending: false })
      .limit(10);

    if (bidResult.error) throw bidResult.error;

    bidHistory = (((bidResult.data as Bid[] | null) ?? []).map((bid) => ({
      ...bid,
      team: teamById.get(bid.team_id) ?? null,
    }))) as BidWithTeam[];
  }

  return {
    auctionState,
    currentPlayer,
    leadingTeam,
    queue: sortPlayersForQueue(
      players.filter((player) => player.status === "pool" || player.status === "unsold")
    ),
    bidHistory,
    teamSummary,
  };
});

export const getTeamsPageData = cache(async () => {
  const { teamSummary, auctionState } = await getBaseAuctionData();

  return {
    teams: teamSummary,
    auctionState,
  };
});

export const getDashboardPageData = cache(async () => {
  const { players, teamSummary } = await getBaseAuctionData();

  const soldPlayers = players
    .filter((player) => player.status === "sold")
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));

  return {
    summary: {
      totalPlayers: players.length,
      soldPlayers: soldPlayers.length,
      unsoldPlayers: players.filter((player) => player.status === "unsold").length,
      totalMoneySpent: teamSummary.reduce(
        (sum, team) => sum + team.purse_spent,
        0
      ),
    },
    teamSummary,
    recentSales: soldPlayers.slice(0, 10),
  };
});

export const getSlidesPageData = cache(async () => {
  const { supabase } = await getBaseAuctionData();
  const slideResult = await supabase
    .from("slides")
    .select("*")
    .order("is_active", { ascending: false })
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });

  if (slideResult.error) {
    throw slideResult.error;
  }

  const slides = (slideResult.data as Slide[] | null) ?? [];
  const activeSlide = slides.find((slide) => slide.is_active) ?? null;

  return {
    slides,
    activeSlide,
    summary: {
      total: slides.length,
      active: activeSlide ? 1 : 0,
      queued: slides.filter((slide) => !slide.is_active).length,
    },
  };
});

export const getActiveSlide = cache(async () => {
  const { supabase } = await getBaseAuctionData();
  const slideResult = await supabase
    .from("slides")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (slideResult.error) {
    throw slideResult.error;
  }

  return (slideResult.data as Slide | null) ?? null;
});

export const getTeamAuctionPageData = cache(async (userId: string) => {
  const {
    supabase,
    auctionState,
    players,
    teams,
    currentPlayer,
    leadingTeam,
  } = await getBaseAuctionData();

  const myTeam = teams.find((team) => team.user_id === userId) ?? null;

  let bidHistory: BidWithTeam[] = [];

  if (auctionState.current_player_id) {
    const bidResult = await supabase
      .from("bids")
      .select("*")
      .eq("player_id", auctionState.current_player_id)
      .order("timestamp", { ascending: false })
      .limit(8);

    if (bidResult.error) throw bidResult.error;

    const teamById = new Map(teams.map((team) => [team.id, team]));
    bidHistory = (((bidResult.data as Bid[] | null) ?? []).map((bid) => ({
      ...bid,
      team: teamById.get(bid.team_id) ?? null,
    }))) as BidWithTeam[];
  }

  return {
    auctionState,
    currentPlayer,
    leadingTeam,
    myTeam,
    mySquad: players.filter((player) => player.sold_to === myTeam?.id),
    bidHistory,
  };
});

export const getTeamSquadPageData = cache(async (userId: string) => {
  const { players, teams } = await getBaseAuctionData();
  const myTeam = teams.find((team) => team.user_id === userId) ?? null;

  return {
    myTeam,
    squad: players
      .filter((player) => player.sold_to === myTeam?.id)
      .sort((left, right) => {
        if (left.role !== right.role) {
          return left.role.localeCompare(right.role);
        }

        return (right.rating ?? 0) - (left.rating ?? 0);
      }),
  };
});
