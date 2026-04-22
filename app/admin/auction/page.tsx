"use client";

import { Clock3, Gavel, RadioTower, Trophy, Users, Wallet, TimerOff } from "lucide-react";
import { useRef, useState } from "react";

import {
  adjustAllPursesAction,
  markUnsoldAction,
  nominateNextPlayerAction,
  placeBidAction,
  sellCurrentPlayerAction,
  setTimerStateAction,
  setBidIncrementAction,
  setAuctionPhaseAction,
  setCustomBidAction,
  undoLastBidAction,
} from "@/app/actions/auction";
import { NominationQueueManager } from "@/components/auction/nomination-queue-manager";
import { OverseasBadge } from "@/components/auction/overseas-badge";
import { PlayerHeadshot } from "@/components/auction/player-headshot";
import { TeamLogo } from "@/components/auction/team-logo";
import { TimerDisplay } from "@/components/auction/timer-display";
import { SoldNotificationToast } from "@/components/auction/sold-notification-toast";
import { useLiveAuctionSync } from "@/components/auction/use-live-auction-sync";
import { SubmitButton } from "@/components/forms/submit-button";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { TEAM_COLORS } from "@/lib/team-colors";
import {
  formatPrice,
  formatPriceShort,
  getRoleBadgeColor,
  getStatusColor,
  isLegendaryRating,
} from "@/lib/utils";
import type {
  AuctionState,
  BidWithTeam,
  Player,
  Team,
  TeamWithSummary,
} from "@/types/app.types";

const phases = ["setup", "live", "paused", "ended"] as const;
const timerPresets = [10, 15, 20, 30, 45, 60, 90];
/** Standard bid increment amounts in Lakhs */
const incrementPresets = [5, 10, 25, 50, 100, 200];

function parseBidAmountInputToLakhs(value: string) {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/inr/g, "")
    .replace(/rs\.?/g, "")
    .trim();

  if (!normalized) {
    return null;
  }

  const match = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(cr|crore|crores|l|lac|lakh|lakhs)?$/
  );

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const unit = match[2] ?? "l";
  const multiplier = ["cr", "crore", "crores"].includes(unit) ? 100 : 1;

  return Math.floor(amount * multiplier);
}

const emptyAuctionState: AuctionState = {
  id: 1,
  phase: "setup",
  current_player_id: null,
  current_bid_amount: 0,
  current_bid_team_id: null,
  timer_seconds: 10,
  timer_active: false,
  bid_increment: 50,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

export default function AdminAuctionPage() {
  const customBidRef = useRef<HTMLInputElement>(null);
  const customBidTeamRef = useRef<HTMLSelectElement>(null);
  const [quickBidCustomIncrement, setQuickBidCustomIncrement] = useState("");
  const [quickBidCustomAmount, setQuickBidCustomAmount] = useState("");

  const { data, soldNotification } = useLiveAuctionSync<{
    auctionState: AuctionState;
    currentPlayer: Player | null;
    leadingTeam: Team | null;
    queue: Player[];
    bidHistory: BidWithTeam[];
    teamSummary: TeamWithSummary[];
  }>({
    initialData: null,
    expectedRole: "admin",
  });

  const auctionState = data?.auctionState ?? emptyAuctionState;
  const currentPlayer = data?.currentPlayer ?? null;
  const leadingTeam = data?.leadingTeam ?? null;
  const queue = data?.queue ?? [];
  const bidHistory = data?.bidHistory ?? [];
  const teamSummary = data?.teamSummary ?? [];

  const soldPlayers = teamSummary.reduce(
    (sum, team) => sum + team.players_acquired,
    0
  );
  const orderedTeams = [...teamSummary].sort(
    (left, right) =>
      right.squad_rating_total - left.squad_rating_total ||
      right.purse_remaining - left.purse_remaining
  );
  const currentBidAmount = currentPlayer
    ? auctionState.current_bid_amount || currentPlayer.base_price
    : 0;
  const parsedQuickBidCustomAmount = parseBidAmountInputToLakhs(
    quickBidCustomAmount
  );
  const hasQuickBidCustomAmount = parsedQuickBidCustomAmount !== null;
  const minimumQuickBidAmount = currentPlayer
    ? auctionState.current_bid_amount > 0
      ? auctionState.current_bid_amount + 1
      : currentPlayer.base_price
    : null;
  const shouldApplyQuickBidCustomAmount =
    hasQuickBidCustomAmount &&
    minimumQuickBidAmount !== null &&
    parsedQuickBidCustomAmount >= minimumQuickBidAmount;
  const parsedQuickBidCustomIncrement = Number(quickBidCustomIncrement);
  const hasQuickBidCustomIncrement =
    Number.isFinite(parsedQuickBidCustomIncrement) &&
    parsedQuickBidCustomIncrement > 0;
  const effectiveQuickBidIncrement = hasQuickBidCustomIncrement
    ? Math.floor(parsedQuickBidCustomIncrement)
    : auctionState.bid_increment;
  const nextBidAmount = currentPlayer
    ? shouldApplyQuickBidCustomAmount
      ? parsedQuickBidCustomAmount
      : auctionState.current_bid_amount > 0
        ? auctionState.current_bid_amount + effectiveQuickBidIncrement
        : currentPlayer.base_price
    : 0;
  const topRatedTeam = orderedTeams[0] ?? null;
  const timerDisabled = auctionState.timer_seconds === 0 && !auctionState.timer_active;
  const isLegendaryCurrentPlayer = currentPlayer
    ? isLegendaryRating(currentPlayer.rating)
    : false;

  if (data === null) {
    return (
      <SectionCard
        title="Loading auction room"
        description="Connecting to the latest control-room snapshot."
      >
        <div className="rounded-lg border border-white/10 bg-white/4 p-6 text-sm leading-6 text-slate-300">
          Pulling the current player, queue order, bid history, and team board.
        </div>
      </SectionCard>
    );
  }

  return (
    <>
      {soldNotification ? (
        <SoldNotificationToast notification={soldNotification} />
      ) : null}

      {/* ── Metric Cards: 2x2 on mobile, 4-col on xl ── */}
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-3">
        <MetricCard
          label="Phase"
          value={auctionState.phase.toUpperCase()}
          hint="Shared state for every connected room."
          icon={Gavel}
        />
        <MetricCard
          label="Current bid"
          value={currentPlayer ? formatPrice(currentBidAmount) : "Waiting"}
          hint="Live amount on the block."
          icon={Trophy}
        />
        <MetricCard
          label="Increment"
          value={formatPriceShort(auctionState.bid_increment)}
          hint="Bid ladder for the whole room."
          icon={Clock3}
        />
        <MetricCard
          label="Players sold"
          value={String(soldPlayers)}
          hint={
            topRatedTeam
              ? `Top squad ${topRatedTeam.short_code} rated ${topRatedTeam.squad_rating_total}`
              : "Waiting for the first hammer."
          }
          icon={Users}
        />
      </div>

      {/* ── MOBILE: Flex column with reordered sections ── */}
      {/* ── DESKTOP: 3-column grid (Player+Queue | BidEngine | TeamPulse) ── */}
      <div className="flex flex-col gap-1.5 xl:grid xl:grid-cols-[1fr_1.5fr_0.8fr] xl:gap-2">

        {/* ============================================================ */}
        {/* SECTION: Auction Engine — shows FIRST on mobile (order-1)    */}
        {/* On desktop this is in column 2                               */}
        {/* ============================================================ */}
        <div className="space-y-2 lg:space-y-3 mobile-order-1 xl:order-none xl:col-start-2 xl:row-start-1 xl:row-span-4">
          {/* Quick Bid — Team Logo Buttons */}
          <SectionCard
            title="Quick Bid"
            description="Tap a team logo to place the next bid instantly."
          >
            <div className="rounded-xl border border-white/10 bg-black/30 p-2.5 lg:p-3">
              <div className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                Quick bid custom increment (L)
              </div>
              <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5 lg:gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={quickBidCustomIncrement}
                  onChange={(event) => setQuickBidCustomIncrement(event.target.value)}
                  placeholder={`Default ${auctionState.bid_increment}`}
                  disabled={shouldApplyQuickBidCustomAmount}
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-[11px] lg:text-[12px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all h-7 lg:h-8"
                />
                <button
                  type="button"
                  onClick={() => setQuickBidCustomIncrement("")}
                  disabled={!hasQuickBidCustomIncrement || shouldApplyQuickBidCustomAmount}
                  className="h-7 lg:h-8 px-2.5 lg:px-3 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
              <div className="mt-1.5 text-[9px] lg:text-[10px] text-[var(--text-soft)]">
                {shouldApplyQuickBidCustomAmount
                  ? "Custom amount is active. Increment is ignored for Quick Bid logos."
                  : hasQuickBidCustomIncrement
                  ? `Quick Bid logos will raise by ${formatPriceShort(effectiveQuickBidIncrement)}.`
                  : `Quick Bid logos are using room increment ${formatPriceShort(auctionState.bid_increment)}.`}
              </div>
            </div>

            <div className="mt-2 lg:mt-3 grid grid-cols-5 gap-1.5 lg:gap-2">
              {teamSummary.map((team) => {
                const colors = TEAM_COLORS[team.short_code];
                const isLeading = leadingTeam?.id === team.id;
                const purseLeft = team.purse_remaining;
                const canAfford = purseLeft >= nextBidAmount;
                const isSameTeam = auctionState.current_bid_team_id === team.id;
                const disabled = !currentPlayer || auctionState.phase !== "live" || isSameTeam || !canAfford;

                return (
                  <form key={team.id} action={async (formData) => {
                    await placeBidAction(formData);
                  }}>
                    <input type="hidden" name="teamId" value={team.id} />
                    {shouldApplyQuickBidCustomAmount ? (
                      <input
                        type="hidden"
                        name="customAmount"
                        value={String(parsedQuickBidCustomAmount)}
                      />
                    ) : hasQuickBidCustomIncrement ? (
                      <input
                        type="hidden"
                        name="customIncrement"
                        value={String(effectiveQuickBidIncrement)}
                      />
                    ) : null}
                    <button
                      type="submit"
                      disabled={disabled}
                      className="w-full flex flex-col items-center gap-1 lg:gap-1.5 rounded-xl p-2 lg:p-3 border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.04] active:scale-95"
                      style={{
                        borderColor: isLeading ? colors?.primary ?? "var(--gold)" : "rgba(255,255,255,0.08)",
                        backgroundColor: isLeading ? (colors?.bgTint ?? "rgba(255,255,255,0.05)") : "rgba(0,0,0,0.2)",
                        boxShadow: isLeading ? `0 0 20px ${colors?.glow ?? "transparent"}` : "none",
                      }}
                    >
                      <TeamLogo shortCode={team.short_code} size={32} className="lg:w-10 lg:h-10" />
                      <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-white">{team.short_code}</span>
                      <span className="text-[8px] lg:text-[9px] font-medium text-white/40 mono-font">{formatPriceShort(purseLeft)}</span>
                    </button>
                  </form>
                );
              })}
            </div>

            <div className="mt-2 lg:mt-3 rounded-xl border border-white/10 bg-black/30 p-2.5 lg:p-3">
              <div className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                Quick bid custom amount
              </div>
              <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5 lg:gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={quickBidCustomAmount}
                  onChange={(event) => setQuickBidCustomAmount(event.target.value)}
                  placeholder="e.g. 10 cr or 950"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-[11px] lg:text-[12px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all h-7 lg:h-8"
                />
                <button
                  type="button"
                  onClick={() => setQuickBidCustomAmount("")}
                  disabled={quickBidCustomAmount.trim().length === 0}
                  className="h-7 lg:h-8 px-2.5 lg:px-3 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
              <div className="mt-1.5 text-[9px] lg:text-[10px] text-[var(--text-soft)]">
                {shouldApplyQuickBidCustomAmount
                  ? `Quick Bid logos will set bid directly to ${formatPrice(parsedQuickBidCustomAmount)}.`
                  : hasQuickBidCustomAmount
                    ? `Target amount must be at least ${formatPrice(minimumQuickBidAmount ?? 0)}. Quick Bid logos will continue incrementing until you raise the target.`
                  : quickBidCustomAmount.trim().length > 0
                    ? "Invalid amount. Try values like 10 cr, 12.5 cr, or 950."
                    : "Optional jump-bid mode for direct calls from auctioneer (for example 10 cr)."}
              </div>
            </div>

            {/* Next bid amount display */}
            <div className="mt-2 lg:mt-3 flex items-center justify-between rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 px-3 py-2 lg:px-4 lg:py-3">
              <div>
                <div className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">Next bid amount</div>
                <div className="text-lg lg:text-2xl font-bold text-white mono-font mt-0.5">
                  {currentPlayer ? formatPrice(nextBidAmount) : "--"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--text-soft)]">Increment</div>
                <div className="text-base lg:text-lg font-bold text-white/70 mono-font mt-0.5">{formatPriceShort(effectiveQuickBidIncrement)}</div>
              </div>
            </div>
          </SectionCard>

          {/* Auction Engine — Timer + Bid Info */}
          <SectionCard
            title="Auction Engine"
            description="Timer, bid status, and live auction stage."
          >
            <div className="glass-panel p-3 lg:p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--gold-soft)_0%,transparent_70%)] opacity-20 pointer-events-none" />

              <div className="relative flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 lg:px-2.5 lg:py-1 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-rose-200">
                  <RadioTower className="w-3 h-3" />
                  Live auction stage
                </div>
                <div className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 lg:px-2.5 lg:py-1 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-white">
                  Phase {auctionState.phase}
                </div>
              </div>

              <div className="relative mt-4 lg:mt-6 text-center">
                <p className="text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-[var(--gold)]">
                  Current Bid
                </p>
                <div className="mt-1 lg:mt-2 display-font text-[2.5rem] lg:text-[4.5rem] text-white leading-none glow-text font-bold">
                  {currentPlayer ? formatPrice(currentBidAmount) : "WAITING"}
                </div>
                <div className="mt-3 lg:mt-4 inline-flex items-center gap-2 lg:gap-3 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-3 py-2 lg:px-4 lg:py-2.5 text-left shadow-[0_0_40px_rgba(232,168,56,0.1)]">
                  {leadingTeam ? (
                    <TeamLogo shortCode={leadingTeam.short_code} size={28} className="lg:w-8 lg:h-8" />
                  ) : (
                    <div className="inline-flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30">
                      <Gavel className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                    </div>
                  )}
                  <div>
                    <p className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">
                      Highest bidder
                    </p>
                    <p className="text-xs lg:text-sm font-bold text-white mt-0.5">
                      {leadingTeam?.name ?? "No active bidder"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sell button — prominent, right below the bid display */}
              {currentPlayer && (
                <div className="relative mt-4 lg:mt-5 grid grid-cols-2 gap-2">
                  <form action={sellCurrentPlayerAction} className="contents">
                    <SubmitButton
                      pendingLabel="Selling..."
                      className="glass-button-primary h-11 lg:h-12 rounded-xl text-sm lg:text-base font-bold uppercase tracking-wider col-span-1"
                      disabled={!leadingTeam}
                    >
                      🔨 Sell
                    </SubmitButton>
                  </form>
                  <form action={markUnsoldAction} className="contents">
                    <SubmitButton
                      pendingLabel="..."
                      className="h-11 lg:h-12 rounded-xl border border-red-500/30 bg-red-500/10 text-sm lg:text-base font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition"
                    >
                      Unsold
                    </SubmitButton>
                  </form>
                </div>
              )}

              <div className="relative mt-4 lg:mt-6 grid gap-2 lg:gap-3 lg:grid-cols-2 items-start">
                {/* Timer state */}
                <div className="glass-panel rounded-xl p-3 lg:p-4 border border-white/5 bg-black/30 flex flex-col">
                  <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Timer state
                  </div>
                  <div className="mt-1.5 lg:mt-2 display-font text-3xl lg:text-4xl text-white font-bold">
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
                  <div className="mt-1 text-[10px] lg:text-[11px] font-medium tracking-wide text-[var(--text-soft)]">
                    {timerDisabled ? "Timer disabled" : auctionState.timer_active ? "Clock running" : "Clock paused"}
                  </div>
                  <div className="mt-3 lg:mt-4 grid grid-cols-3 gap-1.5 lg:gap-2">
                    <form action={setTimerStateAction}>
                      <input type="hidden" name="timerSeconds" value={String(auctionState.timer_seconds)} />
                      <input type="hidden" name="timerActive" value="false" />
                      <SubmitButton pendingLabel="..." className="w-full h-7 lg:h-8 inline-flex items-center justify-center rounded-lg border border-white/20 hover:border-white/40 bg-white/5 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-white transition">Pause</SubmitButton>
                    </form>
                    <form action={setTimerStateAction}>
                      <input type="hidden" name="timerSeconds" value={String(auctionState.timer_seconds)} />
                      <input type="hidden" name="timerActive" value="true" />
                      <SubmitButton pendingLabel="..." className="w-full h-7 lg:h-8 glass-button-primary text-[9px] lg:text-[10px] font-bold uppercase tracking-wider transition">Resume</SubmitButton>
                    </form>
                    {/* Timer OFF toggle */}
                    <form action={setTimerStateAction}>
                      <input type="hidden" name="timerSeconds" value="0" />
                      <input type="hidden" name="timerActive" value="false" />
                      <SubmitButton
                        pendingLabel="..."
                        className={`w-full h-7 lg:h-8 inline-flex items-center justify-center gap-1 rounded-lg border text-[9px] lg:text-[10px] font-bold uppercase tracking-wider transition ${
                          timerDisabled
                            ? "border-red-500/40 bg-red-500/15 text-red-300"
                            : "border-white/10 bg-white/5 text-white/50 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10"
                        }`}
                      >
                        <TimerOff className="w-3 h-3" />
                        Off
                      </SubmitButton>
                    </form>
                  </div>
                </div>

                {/* Custom bid override */}
                <form action={async (formData) => {
                  await setCustomBidAction(formData);
                }} className="glass-panel rounded-xl p-3 lg:p-4 border border-white/5 bg-black/30">
                  <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Custom bid (override)
                  </div>
                  <div className="mt-2 grid gap-1.5 lg:gap-2">
                    <select
                      ref={customBidTeamRef}
                      name="teamId"
                      className="w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-[11px] lg:text-[12px] font-medium text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all"
                      defaultValue=""
                    >
                      <option value="" disabled>Select team</option>
                      {teamSummary.map((team) => (
                        <option key={team.id} value={team.id}>{team.short_code}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-[1fr_auto] gap-1.5 lg:gap-2">
                      <input
                        ref={customBidRef}
                        name="amount"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Amount (L)"
                        className="w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5 text-[11px] lg:text-[12px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all mono-font h-7 lg:h-8"
                      />
                      <SubmitButton
                        pendingLabel="..."
                        className="h-7 lg:h-8 px-2.5 lg:px-3 inline-flex items-center justify-center rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-all"
                        disabled={!currentPlayer}
                      >
                        Set
                      </SubmitButton>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </SectionCard>

          {/* Room Controls — Phase, Timer, Increment */}
          <SectionCard
            title="Room Controls"
            description="Phase, timer presets, increment scale, and purse."
          >
            <div className="space-y-3 lg:space-y-4">
              <div>
                <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)] mb-1.5 lg:mb-2">
                  Phase controls
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 p-1 grid grid-cols-4 gap-1">
                  {phases.map((phase) => (
                    <form key={phase} action={setAuctionPhaseAction}>
                      <input type="hidden" name="phase" value={phase} />
                      <SubmitButton
                        pendingLabel="..."
                        className={`w-full h-7 lg:h-8 inline-flex items-center justify-center rounded-md text-[9px] lg:text-[10px] font-bold uppercase tracking-wider transition-all ${
                          auctionState.phase === phase
                            ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                            : "text-[var(--text-muted)] hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {phase.toUpperCase()}
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 lg:gap-3 lg:grid-cols-2">
                <div className="glass-panel rounded-xl p-3 lg:p-4 border border-white/5 bg-black/30">
                  <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Timer presets
                  </div>
                  <div className="mt-2 lg:mt-3 grid grid-cols-4 lg:grid-cols-3 gap-1 lg:gap-1.5">
                    {timerPresets.map((seconds) => (
                      <form key={seconds} action={setTimerStateAction}>
                        <input type="hidden" name="timerSeconds" value={String(seconds)} />
                        <input type="hidden" name="timerActive" value="true" />
                        <SubmitButton pendingLabel="..." className="w-full h-7 lg:h-8 rounded-md border border-white/10 bg-black/40 text-[11px] lg:text-[12px] font-bold text-[var(--text-soft)] hover:text-white hover:bg-white/10 hover:border-white/20 transition-all">
                          {seconds}s
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                  <form
                    action={setTimerStateAction}
                    className="mt-2 lg:mt-3 grid grid-cols-[1fr_auto_auto] gap-1 lg:gap-1.5"
                  >
                    <input
                      name="timerSeconds"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={auctionState.timer_seconds}
                      className="w-full rounded-md border border-white/10 bg-black/50 px-2 py-1.5 text-[11px] lg:text-[12px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-mono h-7 lg:h-8"
                    />
                    <SubmitButton
                      name="timerActive"
                      value="false"
                      pendingLabel="..."
                      className="h-7 lg:h-8 px-2.5 lg:px-3 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-all"
                    >
                      Save
                    </SubmitButton>
                    <SubmitButton
                      name="timerActive"
                      value="true"
                      pendingLabel="..."
                      className="h-7 lg:h-8 px-2.5 lg:px-3 inline-flex items-center justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-all"
                    >
                      Start
                    </SubmitButton>
                  </form>
                </div>

                <div className="glass-panel rounded-xl p-3 lg:p-4 border border-white/5 bg-black/30">
                  <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Increment scale
                  </div>
                  <div className="mt-2 lg:mt-3 grid grid-cols-3 gap-1 lg:gap-1.5">
                    {incrementPresets.map((increment) => (
                      <form key={increment} action={setBidIncrementAction}>
                        <input
                          type="hidden"
                          name="bidIncrement"
                          value={String(increment)}
                        />
                        <SubmitButton
                          pendingLabel="..."
                          className={`w-full h-7 lg:h-8 rounded-md border text-[11px] lg:text-[12px] font-bold transition-all ${auctionState.bid_increment === increment ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]" : "border-white/10 bg-black/40 text-[var(--text-soft)] hover:text-white hover:bg-white/10 hover:border-white/20"}`}
                        >
                          {formatPriceShort(increment)}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                  <form
                    action={setBidIncrementAction}
                    className="mt-2 lg:mt-3 grid grid-cols-[1fr_auto] gap-1 lg:gap-1.5"
                  >
                    <input
                      name="bidIncrement"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={auctionState.bid_increment}
                      className="w-full rounded-md border border-white/10 bg-black/50 px-2 py-1.5 text-[11px] lg:text-[12px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all h-7 lg:h-8"
                    />
                    <SubmitButton
                      pendingLabel="..."
                      className="h-7 lg:h-8 px-2.5 lg:px-3 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-all"
                    >
                      Save
                    </SubmitButton>
                  </form>
                </div>
              </div>

              {/* All-teams purse adjustment */}
              <form action={adjustAllPursesAction} className="glass-panel rounded-xl p-3 lg:p-4 border border-white/5 bg-black/30">
                <div className="flex items-center gap-2 mb-2 lg:mb-3">
                  <Wallet className="w-3.5 h-3.5 text-[var(--text-soft)]" />
                  <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Set all teams purse (L)
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-1.5 lg:gap-2">
                  <input
                    name="purseTotal"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue="1000"
                    className="w-full rounded-md border border-white/10 bg-black/50 px-2 py-1.5 text-[11px] lg:text-[12px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all h-7 lg:h-8"
                  />
                  <SubmitButton
                    pendingLabel="..."
                    className="h-7 lg:h-8 px-3 lg:px-4 inline-flex items-center justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-all"
                  >
                    Apply
                  </SubmitButton>
                </div>
              </form>
            </div>
          </SectionCard>

          {/* Bid Activity Feed */}
          <SectionCard
            title="Bid Activity Feed"
            description="Most recent bids for the current player."
          >
            <div className="space-y-2 lg:space-y-3">
              {bidHistory.length === 0 ? (
                <div className="glass-panel items-center justify-center min-h-[80px] lg:min-h-[120px] rounded-xl border border-dashed border-white/10 flex px-4 text-xs lg:text-sm text-[var(--text-soft)]">
                  No bids yet for the current player.
                </div>
              ) : (
                bidHistory.map((bid, index) => (
                  <div key={bid.id} className="glass-panel rounded-xl px-3 py-2.5 lg:px-4 lg:py-3 text-[13px] lg:text-[14px]">
                    <div className="flex items-center justify-between gap-3 lg:gap-4">
                      <div className="flex items-center gap-2.5 lg:gap-4">
                        <div className="inline-flex h-8 w-8 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-black/20 border border-white/5 overflow-hidden">
                          {bid.team ? <TeamLogo shortCode={bid.team.short_code} size={28} className="lg:w-[34px] lg:h-[34px]" /> : <span className="text-[10px] lg:text-[11px] uppercase tracking-wider text-white font-bold">??</span>}
                        </div>
                        <div>
                          <div className="font-bold text-white tracking-wide text-xs lg:text-sm">
                            {bid.team?.name ?? "Unknown team"}
                          </div>
                          <div className={`mt-0.5 text-[10px] lg:text-[11px] font-bold uppercase tracking-wider ${index === 0 ? "text-[var(--gold)]" : "text-[var(--text-soft)]"}`}>
                            {index === 0 ? "Latest call" : "Previous bid"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono-font text-white font-bold text-base lg:text-lg">
                          {formatPrice(bid.amount)}
                        </div>
                        <div className="mt-0.5 text-[10px] lg:text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                          {new Date(bid.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        {/* ============================================================ */}
        {/* SECTION: Player On the Block — shows SECOND on mobile        */}
        {/* On desktop this is column 1                                  */}
        {/* ============================================================ */}
        <div className="space-y-2 lg:space-y-3 mobile-order-2 xl:order-none xl:col-start-1 xl:row-start-1 xl:row-span-4">
          <SectionCard
            title="On the Block"
            description="Current nomination and the direct hammer actions."
          >
            {currentPlayer ? (
              <div className="space-y-3 lg:space-y-4">
                {isLegendaryCurrentPlayer ? (
                  <div className="legendary-alert rounded-xl px-3 py-2 lg:px-4 lg:py-2.5">
                    <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffe7a8]">Legendary Player Alert</div>
                    <div className="mt-0.5 text-[12px] lg:text-sm font-semibold text-[#fff3cb]">
                      {currentPlayer.name} just entered the auction block.
                    </div>
                  </div>
                ) : null}

                <div className={`glass-panel p-3 lg:p-5 rounded-2xl relative overflow-hidden ${isLegendaryCurrentPlayer ? "legendary-frame" : ""}`}>
                  <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(currentPlayer.role)}`}
                    >
                      {currentPlayer.role}
                    </span>
                    <OverseasBadge nationality={currentPlayer.nationality} />
                    {isLegendaryCurrentPlayer ? (
                      <span className="legendary-pill inline-flex rounded-md px-2 py-0.5 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider">
                        Legendary
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] lg:text-[10px] font-bold uppercase tracking-wider ${getStatusColor(currentPlayer.status)}`}
                    >
                      {currentPlayer.status}
                    </span>
                  </div>

                  <div className="mt-3 lg:mt-5 grid gap-3 lg:gap-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
                    <PlayerHeadshot
                      name={currentPlayer.name}
                      photoUrl={currentPlayer.photo_url}
                      legendary={isLegendaryCurrentPlayer}
                      className="aspect-[4/5] w-full max-w-[190px] justify-self-center md:max-w-none"
                      sizes="(max-width: 768px) 58vw, 140px"
                    />

                    <div className="min-w-0">
                      <p className="text-[9px] lg:text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
                        Live nomination
                      </p>
                      <h3 className="mt-1 lg:mt-1.5 display-font text-2xl lg:text-3xl xl:text-4xl font-bold tracking-tight text-white glow-text leading-none">
                        <span className={isLegendaryCurrentPlayer ? "legendary-name" : ""}>
                          {currentPlayer.name}
                        </span>
                      </h3>
                      <p className="mt-2 lg:mt-3 text-[11px] lg:text-[13px] leading-relaxed text-white/60">
                        <span className={isLegendaryCurrentPlayer ? "legendary-rating" : ""}>Rating {currentPlayer.rating}</span>. Leader{" "}
                        {leadingTeam?.name ?? "not set yet"}.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 lg:mt-5 grid gap-1.5 lg:gap-2 grid-cols-2">
                    <div className="glass-panel rounded-lg p-2.5 lg:p-3 border border-white/5 bg-black/30">
                      <div className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                        Base price
                      </div>
                      <div className="mt-0.5 lg:mt-1 text-base lg:text-lg font-bold text-white mono-font">
                        {formatPrice(currentPlayer.base_price)}
                      </div>
                    </div>
                    <div className="glass-panel rounded-lg p-2.5 lg:p-3 border border-[var(--gold)]/30 bg-[var(--gold)]/5 relative overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--gold)]/50" />
                      <div className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">
                        Current call
                      </div>
                      <div className="mt-0.5 lg:mt-1 text-base lg:text-lg font-bold text-white mono-font">
                        {formatPrice(currentBidAmount)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <form action={nominateNextPlayerAction} className="contents">
                    <SubmitButton
                      pendingLabel="..."
                      className="h-8 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition"
                      disabled={queue.length === 0}
                    >
                      Pull Next
                    </SubmitButton>
                  </form>
                  <form action={undoLastBidAction} className="contents">
                    <SubmitButton
                      pendingLabel="..."
                      className="h-8 rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/5 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]/80 hover:text-[var(--gold)] hover:bg-[var(--gold)]/10 transition"
                      disabled={bidHistory.length === 0}
                    >
                      Undo Last Bid
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-5 lg:p-8 text-center rounded-2xl border border-dashed border-white/10">
                <div className="text-lg lg:text-xl font-bold tracking-tight text-white mb-2">No active player</div>
                <p className="text-[13px] lg:text-[15px] leading-relaxed text-white/50 max-w-md mx-auto">
                  Pull the next player from the queue to start the room.
                </p>
                <form action={nominateNextPlayerAction} className="mt-4 lg:mt-6">
                  <SubmitButton
                    pendingLabel="Nominating..."
                    className="glass-button-primary px-5 py-2.5 lg:px-6 lg:py-3 text-[12px] lg:text-[14px] font-bold uppercase tracking-wider"
                    disabled={queue.length === 0}
                  >
                    Nominate Next Player
                  </SubmitButton>
                </form>
              </div>
            )}

          </SectionCard>

          <SectionCard
            title="Nomination Queue"
            description="Upcoming order and quick recall controls."
          >
            <NominationQueueManager
              queue={queue}
              currentPlayerId={currentPlayer?.id ?? null}
            />
          </SectionCard>
        </div>

        {/* ============================================================ */}
        {/* SECTION: Team Pulse — shows LAST on mobile                   */}
        {/* On desktop this is column 3                                  */}
        {/* ============================================================ */}
        <div className="space-y-2 lg:space-y-3 mobile-order-3 xl:order-none xl:col-start-3 xl:row-start-1 xl:row-span-4">
          <SectionCard
            title="Team Pulse"
            description="Purse pressure and rating for the admin desk."
          >
            <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-1 xl:gap-3">
              {orderedTeams.map((team) => {
                const isLeader = leadingTeam?.id === team.id;
                const colors = TEAM_COLORS[team.short_code];

                return (
                  <div
                    key={team.id}
                    className="glass-panel rounded-xl px-2.5 py-2 lg:px-4 lg:py-3 transition-all"
                    style={{
                      borderColor: isLeader ? (colors?.border ?? "var(--gold)") : "rgba(255,255,255,0.05)",
                      boxShadow: isLeader ? `0 0 20px ${colors?.glow ?? "transparent"}` : "none",
                      backgroundColor: isLeader ? (colors?.bgTint ?? "rgba(255,255,255,0.05)") : "rgba(0,0,0,0.2)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 lg:gap-3">
                      <div className="flex items-center gap-1.5 lg:gap-2.5">
                        <TeamLogo shortCode={team.short_code} size={22} className="lg:w-7 lg:h-7" />
                        <div>
                          <span className="text-xs lg:text-sm font-bold tracking-tight text-white">
                            {team.short_code}
                          </span>
                          {isLeader ? (
                            <span className="ml-1 lg:ml-2 rounded-full border px-1.5 lg:px-2 py-0.5 text-[7px] lg:text-[8px] font-bold uppercase tracking-wider" style={{ borderColor: colors?.border, color: colors?.primary }}>
                              Bidding
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono-font text-white font-bold text-xs lg:text-sm">
                          {formatPrice(team.purse_remaining)}
                        </div>
                        <div className="text-[8px] lg:text-[9px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                          {team.players_acquired}p · r{team.squad_rating_total}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
