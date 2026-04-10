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

type TeamVisiblePlayer = Omit<Player, "rating">;

const emptyAuctionState: AuctionState = {
  id: 1,
  phase: "setup",
  current_player_id: null,
  current_bid_amount: 0,
  current_bid_team_id: null,
  timer_seconds: 10,
  timer_active: false,
  bid_increment: 5,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

export default function TeamAuctionPage() {
  const { data, isRefreshing } = useLiveAuctionSync<{
    auctionState: AuctionState;
    currentPlayer: TeamVisiblePlayer | null;
    leadingTeam: Team | null;
    myTeam: Team | null;
    mySquad: TeamVisiblePlayer[];
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

  // Team theming — use textOnDark for visible text accents on dark bg
  const tc = TEAM_COLORS[myTeam.short_code] ?? null;
  const accentColor = tc?.textOnDark ?? "#ffffff";
  const primaryColor = tc?.primary ?? "#ffffff";
  const glowColor = tc?.glow ?? "rgba(255,255,255,0.15)";
  const borderColor = tc?.border ?? "rgba(255,255,255,0.15)";
  const bgTint = tc?.bgTint ?? "rgba(255,255,255,0.03)";

  const currentBid = currentPlayer
    ? auctionState.current_bid_amount || currentPlayer.base_price
    : 0;

  return (
    <>
      {activeSlide ? (
        <ActiveSlideOverlay slide={activeSlide} audienceLabel="team consoles" />
      ) : null}

      {/* Team-themed metric bar */}
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
                {/* Player info panel with team-specific themed accents */}
                <div
                  className="relative overflow-hidden rounded-xl p-5 lg:p-6"
                  style={{
                    background: `radial-gradient(circle at top right, ${bgTint}, transparent 35%), linear-gradient(180deg, rgba(31,31,37,0.96), rgba(14,14,19,0.98))`,
                    border: `1.5px solid ${borderColor}`,
                    boxShadow: `0 0 50px ${glowColor}, inset 0 1px 0 ${borderColor}`,
                  }}
                >
                  {/* Decorative team color stripe at top */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: `linear-gradient(90deg, ${primaryColor}, ${tc?.accent ?? primaryColor}, transparent)` }}
                  />

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span
                      className={`inline-flex rounded-lg border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(currentPlayer.role)}`}
                    >
                      {currentPlayer.role}
                    </span>
                    <OverseasBadge nationality={currentPlayer.nationality} />
                  </div>

                  <div className="mt-8">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                      Live nomination
                    </p>
                    <h2 className="mt-2 display-font text-5xl text-white lg:text-6xl">
                      {currentPlayer.name}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      Base {formatPrice(currentPlayer.base_price)}. Current leader {leadingTeam?.name ?? "not set yet"}.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {/* Current Bid — highlighted with team color */}
                    <div
                      className="rounded-lg p-4 relative overflow-hidden"
                      style={{ border: `1.5px solid ${borderColor}`, backgroundColor: bgTint }}
                    >
                      <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: primaryColor }} />
                      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                        Current Bid
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white mono-font">
                        {formatPrice(currentBid)}
                      </div>
                    </div>
                    {/* Timer */}
                    <div className="rounded-lg border border-white/8 bg-black/20 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
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
                    {/* Phase */}
                    <div className="rounded-lg border border-white/8 bg-black/20 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Phase
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white uppercase">
                        {auctionState.phase}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leading team display with team color */}
                <div
                  className="rounded-xl p-5 relative overflow-hidden"
                  style={{
                    border: `1.5px solid ${borderColor}`,
                    backgroundColor: bgTint,
                  }}
                >
                  {/* Side accent bar */}
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1"
                    style={{ backgroundColor: primaryColor }}
                  />

                  <div className="flex items-start justify-between gap-4 pl-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                        Leading team
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        {leadingTeam ? <TeamLogo shortCode={leadingTeam.short_code} size={36} /> : null}
                        <div className="text-2xl font-semibold text-white">
                          {leadingTeam?.name ?? "No active bidder"}
                        </div>
                      </div>
                    </div>
                    <div
                      className="rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        border: `1px solid ${borderColor}`,
                        backgroundColor: bgTint,
                        color: accentColor,
                      }}
                    >
                      {auctionState.phase}
                    </div>
                  </div>

                  <p className="mt-3 pl-3 text-sm leading-6 text-white/50">
                    Watch the live auction. The auctioneer places bids on behalf of teams.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="grid min-h-[420px] place-items-center rounded-xl p-8 text-center"
                style={{
                  border: `1.5px dashed ${borderColor}`,
                  backgroundColor: bgTint,
                }}
              >
                <div className="max-w-lg space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <TeamLogo shortCode={myTeam.short_code} size={80} />
                  </div>
                  <p className="display-font text-5xl font-medium" style={{ color: accentColor }}>LIVE VIEW</p>
                  <h2 className="text-3xl font-semibold text-white">
                    No player has been nominated yet
                  </h2>
                  <p className="text-sm leading-6 text-white/50">
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
            <div className="space-y-2">
              {bidHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/4 px-4 py-4 text-sm text-slate-300">
                  No bids yet for this player.
                </div>
              ) : (
                bidHistory.map((bid, idx) => {
                  const bidTc = bid.team ? TEAM_COLORS[bid.team.short_code] : null;

                  return (
                    <div
                      key={bid.id}
                      className="rounded-lg px-3 py-2 text-sm relative overflow-hidden"
                      style={{
                        border: `1px solid ${bidTc?.border ?? "rgba(255,255,255,0.05)"}`,
                        backgroundColor: bidTc?.bgTint ?? "transparent",
                      }}
                    >
                      {/* Side accent for first bid */}
                      {idx === 0 && (
                        <div
                          className="absolute top-0 left-0 bottom-0 w-0.5"
                          style={{ backgroundColor: bidTc?.primary ?? "white" }}
                        />
                      )}
                      <div className="flex items-center justify-between gap-4">
                        <div className="pl-1">
                          <div className="flex items-center gap-2">
                            {bid.team ? <TeamLogo shortCode={bid.team.short_code} size={24} /> : null}
                            <span className="font-medium text-white">
                              {bid.team?.short_code ?? "Unknown"}
                            </span>
                            {idx === 0 && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: bidTc?.textOnDark ?? "white", backgroundColor: bidTc?.bgTint ?? "transparent" }}>
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-white/30">
                            {new Date(bid.timestamp).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="mono-font text-white font-bold">
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
            <div className="space-y-2">
              {mySquad.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/4 px-4 py-5 text-sm text-slate-300">
                  No players purchased yet.
                </div>
              ) : (
                mySquad.slice(0, 6).map((player) => (
                  <div
                    key={player.id}
                    className="rounded-lg px-4 py-3"
                    style={{
                      border: `1px solid ${borderColor}`,
                      backgroundColor: bgTint,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="mt-0.5 text-xs text-white/40">
                          {player.role}
                        </div>
                      </div>
                      <div className="mono-font font-bold" style={{ color: accentColor }}>
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
