"use client";

import { RadioTower, Shield, TimerReset, Trophy } from "lucide-react";

import { OverseasBadge } from "@/components/auction/overseas-badge";
import { TeamLogo } from "@/components/auction/team-logo";
import { TimerDisplay } from "@/components/auction/timer-display";
import { useLiveAuctionSync } from "@/components/auction/use-live-auction-sync";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { ActiveSlideOverlay } from "@/components/slides/active-slide-overlay";
import { TEAM_COLORS } from "@/lib/team-colors";
import {
  formatPrice,
  formatPurse,
  getRoleBadgeColor,
} from "@/lib/utils";
import type {
  AuctionState,
  BidWithTeam,
  Player,
  Slide,
  Team,
} from "@/types/app.types";

const emptyAuctionState: AuctionState = {
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

export default function TeamAuctionPage() {
  const { data, isRefreshing } = useLiveAuctionSync<{
    auctionState: AuctionState;
    currentPlayer: Player | null;
    leadingTeam: Team | null;
    myTeam: Team | null;
    mySquad: Player[];
    bidHistory: BidWithTeam[];
    activeSlide: Slide | null;
  }>({
    initialData: null,
    expectedRole: "team",
  });

  const auctionState = data?.auctionState ?? emptyAuctionState;
  const currentPlayer = data?.currentPlayer ?? null;
  const leadingTeam = data?.leadingTeam ?? null;
  const myTeam = data?.myTeam ?? null;
  const mySquad = data?.mySquad ?? [];
  const bidHistory = data?.bidHistory ?? [];
  const activeSlide = data?.activeSlide ?? null;

  if (data === null) {
    return (
      <SectionCard
        title="Loading live room"
        description="Connecting to the latest auction snapshot."
      >
        <div className="rounded-lg border border-white/10 bg-white/4 p-6 text-sm leading-6 text-slate-300">
          Pulling the latest bid board, purse state, and squad snapshot.
        </div>
      </SectionCard>
    );
  }

  if (!myTeam) {
    return (
      <SectionCard
        title="Team linkage pending"
        description="This login worked, but it is not attached to a row in the `teams` table yet."
      >
        <div className="rounded-lg border border-white/10 bg-white/4 p-6 text-sm leading-6 text-slate-300">
          Link this user to a team from the admin setup flow, then refresh the page.
        </div>
      </SectionCard>
    );
  }

  // Team theming
  const teamColors = TEAM_COLORS[myTeam.short_code] ?? null;
  const primaryColor = teamColors?.primary ?? "var(--gold)";
  const glowColor = teamColors?.glow ?? "rgba(232,168,56,0.3)";
  const borderColor = teamColors?.border ?? "rgba(232,168,56,0.4)";
  const bgTint = teamColors?.bgTint ?? "rgba(232,168,56,0.05)";

  const currentBid = currentPlayer
    ? auctionState.current_bid_amount || currentPlayer.base_price
    : 0;

  return (
    <>
      {activeSlide ? (
        <ActiveSlideOverlay slide={activeSlide} audienceLabel="team consoles" />
      ) : null}

      <div className="grid gap-3 xl:grid-cols-4">
        <MetricCard
          label="Connection"
          value={isRefreshing ? "Syncing" : "Ready"}
          hint="Subscribed to the same live room state."
          icon={RadioTower}
        />
        <MetricCard
          label="Purse left"
          value={formatPurse(myTeam.purse_total, myTeam.purse_spent)}
          hint={`${myTeam.short_code} can bid up to this ceiling.`}
          icon={Shield}
        />
        <MetricCard
          label="Current bid"
          value={currentPlayer ? formatPrice(currentBid) : "Waiting"}
          hint="Live amount refreshes the moment a bid lands."
          icon={Trophy}
        />
        <MetricCard
          label="Squad size"
          value={String(mySquad.length)}
          hint="Purchased players mirror instantly on the squad page."
          icon={TimerReset}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <SectionCard
            title="Live Auction Board"
            description="Watch the bidding unfold in real-time. Bids are placed by the auctioneer."
          >
            {currentPlayer ? (
              <div className="space-y-4">
                {/* Player info panel with team-themed accents */}
                <div
                  className="relative overflow-hidden rounded-lg p-5 lg:p-6"
                  style={{
                    background: `radial-gradient(circle at top right, ${bgTint}, transparent 35%), linear-gradient(180deg, rgba(31,31,37,0.96), rgba(14,14,19,0.98))`,
                    border: `1px solid ${borderColor}`,
                    boxShadow: `0 0 40px ${glowColor}`,
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-lg border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(currentPlayer.role)}`}
                    >
                      {currentPlayer.role}
                    </span>
                    <OverseasBadge nationality={currentPlayer.nationality} />
                  </div>

                  <div className="mt-10">
                    <p className="text-xs font-semibold tracking-normal" style={{ color: primaryColor }}>
                      Live nomination
                    </p>
                    <h2 className="mt-2 display-font text-5xl text-white lg:text-6xl">
                      {currentPlayer.name}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                      Rating {currentPlayer.rating}. Base {formatPrice(currentPlayer.base_price)}.
                      Current leader {leadingTeam?.name ?? "not set yet"}.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg p-4" style={{ border: `1px solid ${borderColor}`, backgroundColor: bgTint }}>
                      <div className="text-[10px] font-semibold tracking-normal" style={{ color: primaryColor }}>
                        Current Bid
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white mono-font">
                        {formatPrice(currentBid)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-transparent p-4">
                      <div className="text-[10px] font-semibold tracking-normal text-[var(--text-soft)]">
                        Timer
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white mono-font">
                        <TimerDisplay
                          seconds={auctionState.timer_seconds}
                          timerActive={auctionState.timer_active}
                          updatedAt={auctionState.updated_at}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-transparent p-4">
                      <div className="text-[10px] font-semibold tracking-normal text-[var(--text-soft)]">
                        Phase
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white uppercase">
                        {auctionState.phase}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leading team display */}
                <div
                  className="rounded-lg p-5"
                  style={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: bgTint,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold tracking-normal" style={{ color: primaryColor }}>
                        Leading team
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {leadingTeam ? <TeamLogo shortCode={leadingTeam.short_code} size={36} /> : null}
                        <div className="text-2xl font-semibold text-white">
                          {leadingTeam?.name ?? "No active bidder"}
                        </div>
                      </div>
                    </div>
                    <div
                      className="rounded-lg px-3 py-2 text-xs tracking-normal font-bold uppercase"
                      style={{
                        border: `1px solid ${borderColor}`,
                        backgroundColor: bgTint,
                        color: primaryColor,
                      }}
                    >
                      {auctionState.phase}
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                    Watch the live auction. The auctioneer places bids on behalf of teams.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[420px] place-items-center rounded-lg border border-dashed p-8 text-center" style={{ borderColor }}>
                <div className="max-w-lg space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <TeamLogo shortCode={myTeam.short_code} size={64} />
                  </div>
                  <p className="display-font text-5xl text-white font-medium">LIVE VIEW</p>
                  <h2 className="text-3xl font-semibold text-white">
                    No player has been nominated yet
                  </h2>
                  <p className="text-sm leading-6 text-[var(--text-soft)]">
                    Stay ready. As soon as the auctioneer puts a player on the block,
                    this panel updates automatically.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Bid History"
            description="Momentum on the current player, newest call first."
          >
            <div className="space-y-3">
              {bidHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/4 px-4 py-4 text-sm text-slate-300">
                  No bids yet for this player.
                </div>
              ) : (
                bidHistory.map((bid) => {
                  const bidTeamColors = bid.team ? TEAM_COLORS[bid.team.short_code] : null;

                  return (
                    <div
                      key={bid.id}
                      className="rounded-lg px-3 py-2 text-sm"
                      style={{
                        border: `1px solid ${bidTeamColors?.border ?? "rgba(255,255,255,0.05)"}`,
                        backgroundColor: bidTeamColors?.bgTint ?? "transparent",
                      }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {bid.team ? <TeamLogo shortCode={bid.team.short_code} size={24} /> : null}
                            <span className="font-medium text-white">
                              {bid.team?.short_code ?? "Unknown team"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[var(--text-soft)]">
                            {new Date(bid.timestamp).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="mono-font text-white font-medium">
                          {formatPrice(bid.amount)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Squad Snapshot"
            description="Your latest additions stay visible while the bidding room keeps moving."
          >
            <div className="space-y-3">
              {mySquad.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/4 px-4 py-5 text-sm text-slate-300">
                  No players purchased yet.
                </div>
              ) : (
                mySquad.slice(0, 6).map((player) => (
                  <div
                    key={player.id}
                    className="rounded-lg px-4 py-4"
                    style={{
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgTint,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="mt-1 text-xs text-[var(--text-soft)]">
                          {player.role} • Rating {player.rating}
                        </div>
                      </div>
                      <div className="mono-font text-white font-medium">
                        {formatPrice(player.sold_price ?? player.base_price)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
