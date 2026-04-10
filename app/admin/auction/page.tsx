"use client";

import { Clock3, Gavel, RadioTower, Trophy, Users, Wallet } from "lucide-react";
import { useRef } from "react";

import {
  adjustAllPursesAction,
  markUnsoldAction,
  nominateNextPlayerAction,
  placeBidAction,
  resetAuctionAction,
  sellCurrentPlayerAction,
  setTimerStateAction,
  setBidIncrementAction,
  setAuctionPhaseAction,
  setCustomBidAction,
  undoLastBidAction,
} from "@/app/actions/auction";
import { NominationQueueManager } from "@/components/auction/nomination-queue-manager";
import { OverseasBadge } from "@/components/auction/overseas-badge";
import { TeamLogo } from "@/components/auction/team-logo";
import { TimerDisplay } from "@/components/auction/timer-display";
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

export default function AdminAuctionPage() {
  const customBidRef = useRef<HTMLInputElement>(null);
  const customBidTeamRef = useRef<HTMLSelectElement>(null);

  const { data, isRefreshing } = useLiveAuctionSync<{
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
  const nextBidAmount = currentPlayer
    ? auctionState.current_bid_amount > 0
      ? auctionState.current_bid_amount + auctionState.bid_increment
      : currentPlayer.base_price
    : 0;
  const topRatedTeam = orderedTeams[0] ?? null;

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-4">
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

      <div className="flex justify-end">
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs tracking-normal text-[var(--text-soft)]">
          {isRefreshing ? "Syncing live state" : "Live state synced"}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.5fr_0.8fr]">
        {/* ============ COLUMN 1: Player + Queue ============ */}
        <div className="space-y-3">
          <SectionCard
            title="On the Block"
            description="Current nomination and the direct hammer actions."
          >
            {currentPlayer ? (
              <div className="space-y-4">
                <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(currentPlayer.role)}`}
                    >
                      {currentPlayer.role}
                    </span>
                    <OverseasBadge nationality={currentPlayer.nationality} />
                    <span
                      className={`inline-flex rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(currentPlayer.status)}`}
                    >
                      {currentPlayer.status}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
                      Live nomination
                    </p>
                    <h3 className="mt-1.5 display-font text-3xl font-bold tracking-tight text-white lg:text-4xl glow-text leading-none">
                      {currentPlayer.name}
                    </h3>
                    <p className="mt-3 text-[13px] leading-relaxed text-white/60">
                      Rating {currentPlayer.rating}. Leader{" "}
                      {leadingTeam?.name ?? "not set yet"}.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-2 grid-cols-2">
                    <div className="glass-panel rounded-lg p-3 border border-white/5 bg-black/30">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                        Base price
                      </div>
                      <div className="mt-1 text-lg font-bold text-white mono-font">
                        {formatPrice(currentPlayer.base_price)}
                      </div>
                    </div>
                    <div className="glass-panel rounded-lg p-3 border border-[var(--gold)]/30 bg-[var(--gold)]/5 relative overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--gold)]/50" />
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">
                        Current call
                      </div>
                      <div className="mt-1 text-lg font-bold text-white mono-font">
                        {formatPrice(currentBidAmount)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <form action={sellCurrentPlayerAction} className="contents">
                    <SubmitButton
                      pendingLabel="..."
                      className="glass-button-primary h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                      disabled={!leadingTeam}
                    >
                      Sell
                    </SubmitButton>
                  </form>
                  <form action={markUnsoldAction} className="contents">
                    <SubmitButton
                      pendingLabel="..."
                      className="h-8 rounded-lg border border-red-500/30 bg-red-500/10 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20 transition"
                    >
                      Unsold
                    </SubmitButton>
                  </form>
                  <form action={nominateNextPlayerAction} className="contents">
                    <SubmitButton
                      pendingLabel="..."
                      className="h-8 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition"
                      disabled={queue.length === 0}
                    >
                      Pull Next
                    </SubmitButton>
                  </form>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <form action={resetAuctionAction} className="contents">
                    <SubmitButton
                      pendingLabel="..."
                      className="h-8 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-white transition"
                    >
                      Reset
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
              <div className="glass-panel p-8 text-center rounded-2xl border border-dashed border-white/10">
                <div className="text-xl font-bold tracking-tight text-white mb-2">No active player</div>
                <p className="text-[15px] leading-relaxed text-white/50 max-w-md mx-auto">
                  Pull the next player from the queue to start the room.
                </p>
                <form action={nominateNextPlayerAction} className="mt-6">
                  <SubmitButton
                    pendingLabel="Nominating..."
                    className="glass-button-primary px-6 py-3 text-[14px] font-bold uppercase tracking-wider"
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

        {/* ============ COLUMN 2: Auction Engine + Quick Bid ============ */}
        <div className="space-y-3">
          {/* Quick Bid — Team Logo Buttons */}
          <SectionCard
            title="Quick Bid"
            description="Tap a team logo to place the next bid instantly."
          >
            <div className="grid grid-cols-5 gap-2">
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
                    <button
                      type="submit"
                      disabled={disabled}
                      className="w-full flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.04] active:scale-95"
                      style={{
                        borderColor: isLeading ? colors?.primary ?? "var(--gold)" : "rgba(255,255,255,0.08)",
                        backgroundColor: isLeading ? (colors?.bgTint ?? "rgba(255,255,255,0.05)") : "rgba(0,0,0,0.2)",
                        boxShadow: isLeading ? `0 0 20px ${colors?.glow ?? "transparent"}` : "none",
                      }}
                    >
                      <TeamLogo shortCode={team.short_code} size={40} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">{team.short_code}</span>
                      <span className="text-[9px] font-medium text-white/40 mono-font">{formatPriceShort(purseLeft)}</span>
                    </button>
                  </form>
                );
              })}
            </div>

            {/* Next bid amount display */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 px-4 py-3">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">Next bid amount</div>
                <div className="text-2xl font-bold text-white mono-font mt-0.5">
                  {currentPlayer ? formatPrice(nextBidAmount) : "--"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-soft)]">Increment</div>
                <div className="text-lg font-bold text-white/70 mono-font mt-0.5">{formatPriceShort(auctionState.bid_increment)}</div>
              </div>
            </div>
          </SectionCard>

          {/* Auction Engine — Timer + Bid Info */}
          <SectionCard
            title="Auction Engine"
            description="Timer, bid status, and live auction stage."
          >
            <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--gold-soft)_0%,transparent_70%)] opacity-20 pointer-events-none" />

              <div className="relative flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-200">
                  <RadioTower className="w-3 h-3" />
                  Live auction stage
                </div>
                <div className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Phase {auctionState.phase}
                </div>
              </div>

              <div className="relative mt-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--gold)]">
                  Current Bid
                </p>
                <div className="mt-2 display-font text-[3.5rem] text-white lg:text-[4.5rem] leading-none glow-text font-bold">
                  {currentPlayer ? formatPrice(currentBidAmount) : "WAITING"}
                </div>
                <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-2.5 text-left shadow-[0_0_40px_rgba(232,168,56,0.1)]">
                  {leadingTeam ? (
                    <TeamLogo shortCode={leadingTeam.short_code} size={32} />
                  ) : (
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30">
                      <Gavel className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--gold)]">
                      Highest bidder
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {leadingTeam?.name ?? "No active bidder"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative mt-6 grid gap-3 lg:grid-cols-2 items-start">
                <div className="glass-panel rounded-xl p-4 border border-white/5 bg-black/30 flex flex-col">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Timer state
                  </div>
                  <div className="mt-2 display-font text-4xl text-white font-bold">
                    <TimerDisplay
                      seconds={auctionState.timer_seconds}
                      timerActive={auctionState.timer_active}
                      updatedAt={auctionState.updated_at}
                    />
                  </div>
                  <div className="mt-1 text-[11px] font-medium tracking-wide text-[var(--text-soft)]">
                    {auctionState.timer_active ? "Clock running" : "Clock paused"}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <form action={setTimerStateAction}>
                      <input type="hidden" name="timerSeconds" value={String(auctionState.timer_seconds)} />
                      <input type="hidden" name="timerActive" value="false" />
                      <SubmitButton pendingLabel="..." className="w-full h-8 inline-flex items-center justify-center rounded-lg border border-white/20 hover:border-white/40 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white transition">Pause</SubmitButton>
                    </form>
                    <form action={setTimerStateAction}>
                      <input type="hidden" name="timerSeconds" value={String(auctionState.timer_seconds)} />
                      <input type="hidden" name="timerActive" value="true" />
                      <SubmitButton pendingLabel="..." className="w-full h-8 glass-button-primary text-[10px] font-bold uppercase tracking-wider transition">Resume</SubmitButton>
                    </form>
                  </div>
                </div>

                {/* Custom bid override */}
                <form action={async (formData) => {
                  await setCustomBidAction(formData);
                }} className="glass-panel rounded-xl p-4 border border-white/5 bg-black/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Custom bid (override)
                  </div>
                  <div className="mt-2 grid gap-2">
                    <select
                      ref={customBidTeamRef}
                      name="teamId"
                      className="w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-[12px] font-medium text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all"
                      defaultValue=""
                    >
                      <option value="" disabled>Select team</option>
                      {teamSummary.map((team) => (
                        <option key={team.id} value={team.id}>{team.short_code}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        ref={customBidRef}
                        name="amount"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Amount (L)"
                        className="w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all mono-font h-8"
                      />
                      <SubmitButton
                        pendingLabel="..."
                        className="h-8 px-3 inline-flex items-center justify-center rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-all"
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
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)] mb-2">
                  Phase controls
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 p-1 grid grid-cols-4 gap-1">
                  {phases.map((phase) => (
                    <form key={phase} action={setAuctionPhaseAction}>
                      <input type="hidden" name="phase" value={phase} />
                      <SubmitButton
                        pendingLabel="..."
                        className={`w-full h-8 inline-flex items-center justify-center rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
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

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="glass-panel rounded-xl p-4 border border-white/5 bg-black/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Timer presets
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {timerPresets.map((seconds) => (
                      <form key={seconds} action={setTimerStateAction}>
                        <input type="hidden" name="timerSeconds" value={String(seconds)} />
                        <input type="hidden" name="timerActive" value="true" />
                        <SubmitButton pendingLabel="..." className="w-full h-8 rounded-md border border-white/10 bg-black/40 text-[12px] font-bold text-[var(--text-soft)] hover:text-white hover:bg-white/10 hover:border-white/20 transition-all">
                          {seconds}s
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                  <form
                    action={setTimerStateAction}
                    className="mt-3 grid grid-cols-[1fr_auto_auto] gap-1.5"
                  >
                    <input
                      name="timerSeconds"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={auctionState.timer_seconds}
                      className="w-full rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-mono h-8"
                    />
                    <SubmitButton
                      name="timerActive"
                      value="false"
                      pendingLabel="..."
                      className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-all"
                    >
                      Save
                    </SubmitButton>
                    <SubmitButton
                      name="timerActive"
                      value="true"
                      pendingLabel="..."
                      className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-all"
                    >
                      Start
                    </SubmitButton>
                  </form>
                </div>

                <div className="glass-panel rounded-xl p-4 border border-white/5 bg-black/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Increment scale
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {incrementPresets.map((increment) => (
                      <form key={increment} action={setBidIncrementAction}>
                        <input
                          type="hidden"
                          name="bidIncrement"
                          value={String(increment)}
                        />
                        <SubmitButton
                          pendingLabel="..."
                          className={`w-full h-8 rounded-md border text-[12px] font-bold transition-all ${auctionState.bid_increment === increment ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]" : "border-white/10 bg-black/40 text-[var(--text-soft)] hover:text-white hover:bg-white/10 hover:border-white/20"}`}
                        >
                          {formatPriceShort(increment)}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                  <form
                    action={setBidIncrementAction}
                    className="mt-3 grid grid-cols-[1fr_auto] gap-1.5"
                  >
                    <input
                      name="bidIncrement"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={auctionState.bid_increment}
                      className="w-full rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 text-[12px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all h-8"
                    />
                    <SubmitButton
                      pendingLabel="..."
                      className="h-8 px-3 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/10 transition-all"
                    >
                      Save
                    </SubmitButton>
                  </form>
                </div>
              </div>

              {/* All-teams purse adjustment */}
              <form action={adjustAllPursesAction} className="glass-panel rounded-xl p-4 border border-white/5 bg-black/30">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-3.5 h-3.5 text-[var(--text-soft)]" />
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Set all teams purse (L)
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    name="purseTotal"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue="1000"
                    className="w-full rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 text-[12px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all h-8"
                  />
                  <SubmitButton
                    pendingLabel="..."
                    className="h-8 px-4 inline-flex items-center justify-center rounded-md border border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-all"
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
            <div className="space-y-3">
              {bidHistory.length === 0 ? (
                <div className="glass-panel items-center justify-center min-h-[120px] rounded-xl border border-dashed border-white/10 flex px-4 text-sm text-[var(--text-soft)]">
                  No bids yet for the current player.
                </div>
              ) : (
                bidHistory.map((bid, index) => (
                  <div key={bid.id} className="glass-panel rounded-xl px-4 py-3 text-[14px]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-black/20 border border-white/5 overflow-hidden">
                          {bid.team ? <TeamLogo shortCode={bid.team.short_code} size={34} /> : <span className="text-[11px] uppercase tracking-wider text-white font-bold">??</span>}
                        </div>
                        <div>
                          <div className="font-bold text-white tracking-wide">
                            {bid.team?.name ?? "Unknown team"}
                          </div>
                          <div className={`mt-0.5 text-[11px] font-bold uppercase tracking-wider ${index === 0 ? "text-[var(--gold)]" : "text-[var(--text-soft)]"}`}>
                            {index === 0 ? "Latest call" : "Previous bid"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono-font text-white font-bold text-lg">
                          {formatPrice(bid.amount)}
                        </div>
                        <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
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

        {/* ============ COLUMN 3: Team Pulse ============ */}
        <div className="space-y-3">
          <SectionCard
            title="Team Pulse"
            description="Purse pressure and rating for the admin desk."
          >
            <div className="space-y-3">
              {orderedTeams.map((team) => {
                const isLeader = leadingTeam?.id === team.id;
                const colors = TEAM_COLORS[team.short_code];

                return (
                  <div
                    key={team.id}
                    className="glass-panel rounded-xl px-4 py-3 transition-all"
                    style={{
                      borderColor: isLeader ? (colors?.border ?? "var(--gold)") : "rgba(255,255,255,0.05)",
                      boxShadow: isLeader ? `0 0 20px ${colors?.glow ?? "transparent"}` : "none",
                      backgroundColor: isLeader ? (colors?.bgTint ?? "rgba(255,255,255,0.05)") : "rgba(0,0,0,0.2)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <TeamLogo shortCode={team.short_code} size={28} />
                        <div>
                          <span className="text-sm font-bold tracking-tight text-white">
                            {team.short_code}
                          </span>
                          {isLeader ? (
                            <span className="ml-2 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ borderColor: colors?.border, color: colors?.primary }}>
                              Bidding
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono-font text-white font-bold text-sm">
                          {formatPrice(team.purse_remaining)}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
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
