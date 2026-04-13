"use client";

import { RadioTower, Shield, TimerReset, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { OverseasBadge } from "@/components/auction/overseas-badge";
import { PlayerHeadshot } from "@/components/auction/player-headshot";
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

const MOBILE_SQUAD_COUNT = 3;

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
  const [squadExpanded, setSquadExpanded] = useState(false);

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

  const timerDisabled = auctionState.timer_seconds === 0 && !auctionState.timer_active;

  return (
    <>
      {activeSlide ? (
        <ActiveSlideOverlay slide={activeSlide} audienceLabel="team consoles" />
      ) : null}

      {/* Team-themed metric bar — 2x2 on mobile, 4-col on xl */}
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-3">
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

      <div className="flex flex-col gap-2 xl:grid xl:grid-cols-[1.05fr_0.95fr] xl:gap-4">
        {/* ── Column 1: Live Auction Board ── */}
        <div className="space-y-2 lg:space-y-4">
          <SectionCard
            title="Live Auction Board"
            description="Watch the bidding unfold in real-time. Bids are placed by the auctioneer."
          >
            {currentPlayer ? (
              <div className="space-y-3 lg:space-y-4">
                {/* Player info panel with team-specific themed accents */}
                <div
                  className="relative overflow-hidden rounded-xl p-3 lg:p-5 xl:p-6"
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

                  <div className="flex flex-wrap items-center gap-1.5 lg:gap-2 mt-1">
                    <span
                      className={`inline-flex rounded-lg border px-2 py-0.5 lg:px-3 lg:py-1 text-[10px] lg:text-xs font-medium ${getRoleBadgeColor(currentPlayer.role)}`}
                    >
                      {currentPlayer.role}
                    </span>
                    <OverseasBadge nationality={currentPlayer.nationality} />
                  </div>

                  <div className="mt-4 lg:mt-8 grid gap-3 lg:gap-5 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
                    <PlayerHeadshot
                      name={currentPlayer.name}
                      photoUrl={currentPlayer.photo_url}
                      className="aspect-[4/5] w-full max-w-[220px] justify-self-center md:max-w-none"
                      sizes="(max-width: 768px) 62vw, (max-width: 1280px) 150px, 180px"
                    />

                    <div className="min-w-0">
                      <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                        Live nomination
                      </p>
                      <h2 className="mt-1 lg:mt-2 display-font text-3xl lg:text-5xl xl:text-6xl text-white">
                        {currentPlayer.name}
                      </h2>
                      <p className="mt-2 lg:mt-3 text-xs lg:text-sm leading-5 lg:leading-6 text-white/50">
                        Base {formatPrice(currentPlayer.base_price)}. Current leader {leadingTeam?.name ?? "not set yet"}.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 lg:mt-6 grid gap-2 lg:gap-3 grid-cols-3">
                    {/* Current Bid — highlighted with team color */}
                    <div
                      className="rounded-lg p-2.5 lg:p-4 relative overflow-hidden"
                      style={{ border: `1.5px solid ${borderColor}`, backgroundColor: bgTint }}
                    >
                      <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: primaryColor }} />
                      <div className="text-[8px] lg:text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                        Current Bid
                      </div>
                      <div className="mt-1 lg:mt-2 text-lg lg:text-2xl font-bold text-white mono-font">
                        {formatPrice(currentBid)}
                      </div>
                    </div>
                    {/* Timer */}
                    <div className="rounded-lg border border-white/8 bg-black/20 p-2.5 lg:p-4">
                      <div className="text-[8px] lg:text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Timer
                      </div>
                      <div className="mt-1 lg:mt-2 text-lg lg:text-2xl font-bold text-white mono-font">
                        {timerDisabled ? (
                          <span className="text-white/30">OFF</span>
                        ) : (
                          <TimerDisplay
                            seconds={auctionState.timer_seconds}
                            timerActive={auctionState.timer_active}
                            updatedAt={auctionState.updated_at}
                          />
                        )}
                      </div>
                    </div>
                    {/* Phase */}
                    <div className="rounded-lg border border-white/8 bg-black/20 p-2.5 lg:p-4">
                      <div className="text-[8px] lg:text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Phase
                      </div>
                      <div className="mt-1 lg:mt-2 text-lg lg:text-2xl font-bold text-white uppercase">
                        {auctionState.phase}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leading team display with team color */}
                <div
                  className="rounded-xl p-3 lg:p-5 relative overflow-hidden"
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

                  <div className="flex items-start justify-between gap-3 lg:gap-4 pl-2 lg:pl-3">
                    <div>
                      <div className="text-[10px] lg:text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
                        Leading team
                      </div>
                      <div className="flex items-center gap-2 lg:gap-3 mt-1 lg:mt-1.5">
                        {leadingTeam ? <TeamLogo shortCode={leadingTeam.short_code} size={28} className="lg:w-9 lg:h-9" /> : null}
                        <div className="text-lg lg:text-2xl font-semibold text-white">
                          {leadingTeam?.name ?? "No active bidder"}
                        </div>
                      </div>
                    </div>
                    <div
                      className="rounded-lg px-2 py-1.5 lg:px-3 lg:py-2 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest"
                      style={{
                        border: `1px solid ${borderColor}`,
                        backgroundColor: bgTint,
                        color: accentColor,
                      }}
                    >
                      {auctionState.phase}
                    </div>
                  </div>

                  <p className="mt-2 lg:mt-3 pl-2 lg:pl-3 text-xs lg:text-sm leading-5 lg:leading-6 text-white/50">
                    Watch the live auction. The auctioneer places bids on behalf of teams.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="grid min-h-[280px] lg:min-h-[420px] place-items-center rounded-xl p-6 lg:p-8 text-center"
                style={{
                  border: `1.5px dashed ${borderColor}`,
                  backgroundColor: bgTint,
                }}
              >
                <div className="max-w-lg space-y-3 lg:space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <TeamLogo shortCode={myTeam.short_code} size={60} className="lg:w-20 lg:h-20" />
                  </div>
                  <p className="display-font text-3xl lg:text-5xl font-medium" style={{ color: accentColor }}>LIVE VIEW</p>
                  <h2 className="text-xl lg:text-3xl font-semibold text-white">
                    No player has been nominated yet
                  </h2>
                  <p className="text-xs lg:text-sm leading-5 lg:leading-6 text-white/50">
                    Stay ready. As soon as the auctioneer puts a player on the block,
                    this panel updates automatically.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Column 2: Bid History + Squad ── */}
        <div className="space-y-2 lg:space-y-4">
          <SectionCard
            title="Bid History"
            description="Momentum on the current player, newest call first."
          >
            <div className="space-y-1.5 lg:space-y-2">
              {bidHistory.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/4 px-3 py-3 lg:px-4 lg:py-4 text-xs lg:text-sm text-slate-300">
                  No bids yet for this player.
                </div>
              ) : (
                bidHistory.map((bid, idx) => {
                  const bidTc = bid.team ? TEAM_COLORS[bid.team.short_code] : null;

                  return (
                    <div
                      key={bid.id}
                      className="rounded-lg px-2.5 py-1.5 lg:px-3 lg:py-2 text-xs lg:text-sm relative overflow-hidden"
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
                      <div className="flex items-center justify-between gap-3 lg:gap-4">
                        <div className="pl-1">
                          <div className="flex items-center gap-1.5 lg:gap-2">
                            {bid.team ? <TeamLogo shortCode={bid.team.short_code} size={20} className="lg:w-6 lg:h-6" /> : null}
                            <span className="font-medium text-white text-xs lg:text-sm">
                              {bid.team?.short_code ?? "Unknown"}
                            </span>
                            {idx === 0 && (
                              <span className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider px-1 lg:px-1.5 py-0.5 rounded" style={{ color: bidTc?.textOnDark ?? "white", backgroundColor: bidTc?.bgTint ?? "transparent" }}>
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[10px] lg:text-[11px] text-white/30">
                            {new Date(bid.timestamp).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="mono-font text-white font-bold text-xs lg:text-sm">
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
            <div className="space-y-1.5 lg:space-y-2">
              {mySquad.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/4 px-3 py-3 lg:px-4 lg:py-5 text-xs lg:text-sm text-slate-300">
                  No players purchased yet.
                </div>
              ) : (
                <>
                  {mySquad.slice(0, squadExpanded ? undefined : MOBILE_SQUAD_COUNT).map((player, idx) => (
                    <div
                      key={player.id}
                      className={`rounded-lg px-3 py-2 lg:px-4 lg:py-3 ${!squadExpanded && idx >= MOBILE_SQUAD_COUNT ? "hidden lg:block" : ""}`}
                      style={{
                        border: `1px solid ${borderColor}`,
                        backgroundColor: bgTint,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 lg:gap-4">
                        <div>
                          <div className="font-medium text-white text-xs lg:text-sm">{player.name}</div>
                          <div className="mt-0.5 text-[10px] lg:text-xs text-white/40">
                            {player.role}
                          </div>
                        </div>
                        <div className="mono-font font-bold text-xs lg:text-sm" style={{ color: accentColor }}>
                          {formatPrice(player.sold_price ?? player.base_price)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Always show all on desktop; on mobile, show toggle if more than MOBILE_SQUAD_COUNT */}
                  {mySquad.length > MOBILE_SQUAD_COUNT && (
                    <>
                      {/* Remaining items visible only on desktop */}
                      {!squadExpanded && mySquad.slice(MOBILE_SQUAD_COUNT, 6).map((player) => (
                        <div
                          key={player.id}
                          className="hidden lg:block rounded-lg px-4 py-3"
                          style={{
                            border: `1px solid ${borderColor}`,
                            backgroundColor: bgTint,
                          }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="font-medium text-white text-sm">{player.name}</div>
                              <div className="mt-0.5 text-xs text-white/40">
                                {player.role}
                              </div>
                            </div>
                            <div className="mono-font font-bold text-sm" style={{ color: accentColor }}>
                              {formatPrice(player.sold_price ?? player.base_price)}
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setSquadExpanded(!squadExpanded)}
                        className="lg:hidden w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-all"
                      >
                        {squadExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            Show all ({mySquad.length})
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
