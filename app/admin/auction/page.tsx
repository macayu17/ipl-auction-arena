import { Clock3, Gavel, RadioTower, Trophy, Users } from "lucide-react";

import {
  markUnsoldAction,
  nominateNextPlayerAction,
  nominatePlayerAction,
  placeBidAction,
  resetAuctionAction,
  sellCurrentPlayerAction,
  setAuctionPhaseAction,
  setBidIncrementAction,
  setTimerStateAction,
} from "@/app/actions/auction";
import { TimerDisplay } from "@/components/auction/timer-display";
import { SubmitButton } from "@/components/forms/submit-button";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { getAdminAuctionPageData } from "@/lib/auction-data";
import {
  formatPrice,
  formatPriceShort,
  getRoleBadgeColor,
  getStatusColor,
} from "@/lib/utils";

const phases = ["setup", "live", "paused", "ended"] as const;
const timerPresets = [15, 20, 30, 45, 60, 90];
const incrementPresets = [1, 2, 5, 10, 25];

export default async function AdminAuctionPage() {
  const { auctionState, currentPlayer, leadingTeam, queue, bidHistory, teamSummary } =
    await getAdminAuctionPageData();

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
  const ratingMax = Math.max(
    1,
    ...orderedTeams.map((team) => team.squad_rating_total || 0)
  );
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

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.2fr_0.95fr]">
        <div className="space-y-4">
          <SectionCard
            title="On the Block"
            description="Current nomination and the direct hammer actions."
          >
            {currentPlayer ? (
              <div className="space-y-4">
                <div className="command-grid rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(31,31,37,0.94),rgba(14,14,19,0.98))] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(currentPlayer.role)}`}
                    >
                      {currentPlayer.role}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                      {currentPlayer.nationality}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${getStatusColor(currentPlayer.status)}`}
                    >
                      {currentPlayer.status}
                    </span>
                  </div>

                  <div className="mt-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold-soft)]">
                      Live nomination
                    </p>
                    <h3 className="mt-2 display-font text-4xl text-white lg:text-5xl">
                      {currentPlayer.name}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                      Rating {currentPlayer.rating}. Leader{" "}
                      {leadingTeam?.name ?? "not set yet"}.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="screen-frame rounded-[18px] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                        Base price
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {formatPrice(currentPlayer.base_price)}
                      </div>
                    </div>
                    <div className="screen-frame rounded-[18px] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                        Current call
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {formatPrice(currentBidAmount)}
                      </div>
                    </div>
                    <div className="screen-frame rounded-[18px] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                        Next bid
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {formatPrice(nextBidAmount)}
                      </div>
                    </div>
                    <div className="screen-frame rounded-[18px] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                        Highest bidder
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {leadingTeam?.short_code ?? "--"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <form action={sellCurrentPlayerAction}>
                    <SubmitButton
                      pendingLabel="Selling..."
                      className="w-full rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-100 hover:border-emerald-400/35 hover:bg-emerald-500/15"
                      disabled={!leadingTeam}
                    >
                      Sell To Leader
                    </SubmitButton>
                  </form>
                  <form action={markUnsoldAction}>
                    <SubmitButton
                      pendingLabel="Updating..."
                      className="w-full rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 hover:border-rose-400/35 hover:bg-rose-500/15"
                    >
                      Mark Unsold
                    </SubmitButton>
                  </form>
                  <form action={nominateNextPlayerAction}>
                    <SubmitButton
                      pendingLabel="Nominating..."
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
                      disabled={queue.length === 0}
                    >
                      Pull Next Player
                    </SubmitButton>
                  </form>
                  <form action={resetAuctionAction}>
                    <SubmitButton
                      pendingLabel="Resetting..."
                      className="w-full rounded-xl border border-white/10 bg-[rgba(14,14,19,0.8)] px-4 py-3 text-sm font-medium text-slate-300 hover:border-white/20 hover:bg-black/70"
                    >
                      Reset Room
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 p-5">
                <div className="text-lg font-semibold text-white">No active player</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                  Pull the next player from the queue to start the room.
                </p>
                <form action={nominateNextPlayerAction} className="mt-4">
                  <SubmitButton
                    pendingLabel="Nominating..."
                    className="rounded-xl border border-[var(--gold)]/30 bg-[rgba(245,166,35,0.12)] px-4 py-3 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(245,166,35,0.18)]"
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
            <div className="space-y-2.5">
              {queue.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-sm text-slate-300">
                  No players waiting in the pool.
                </div>
              ) : (
                queue.map((player, index) => (
                  <div
                    key={player.id}
                    className="screen-frame rounded-[18px] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="font-semibold text-white">
                            {player.name}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getRoleBadgeColor(player.role)}`}
                          >
                            {player.role}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-[var(--text-soft)]">
                          {player.nationality} • Rating {player.rating} • Base{" "}
                          {formatPrice(player.base_price)}
                        </div>
                      </div>

                      <form action={nominatePlayerAction}>
                        <input type="hidden" name="playerId" value={player.id} />
                        <SubmitButton
                          pendingLabel="..."
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:border-white/20 hover:bg-white/10"
                          disabled={Boolean(currentPlayer)}
                        >
                          {player.status === "unsold" ? "Recall" : "Nominate"}
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Auction Engine"
            description="Live amount, timer state, and fallback bid controls."
          >
            <div className="rounded-[26px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.16),transparent_45%),linear-gradient(180deg,rgba(31,31,37,0.96),rgba(14,14,19,0.98))] p-5 lg:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-100">
                  <RadioTower className="size-3.5" />
                  Live auction stage
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                  Phase {auctionState.phase}
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                  Current bid
                </p>
                <div className="mt-4 display-font text-6xl text-white sm:text-7xl lg:text-[5.25rem]">
                  {currentPlayer ? formatPrice(currentBidAmount) : "WAITING"}
                </div>
                <div className="mt-5 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--blue)]/25 bg-[rgba(5,102,217,0.14)] px-4 py-3 text-left">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--blue-soft)]">
                    <Gavel className="size-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--blue-soft)]">
                      Highest bidder
                    </p>
                    <p className="text-lg font-semibold text-white">
                      {leadingTeam?.name ?? "No active bidder"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="screen-frame rounded-[22px] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                    Timer state
                  </div>
                  <div className="mt-3 display-font text-4xl text-[var(--gold-soft)]">
                    <TimerDisplay
                      seconds={auctionState.timer_seconds}
                      timerActive={auctionState.timer_active}
                      updatedAt={auctionState.updated_at}
                    />
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    {auctionState.timer_active ? "Clock running" : "Clock paused"}
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <form action={setTimerStateAction}>
                      <input
                        type="hidden"
                        name="timerSeconds"
                        value={String(auctionState.timer_seconds)}
                      />
                      <input type="hidden" name="timerActive" value="false" />
                      <SubmitButton
                        pendingLabel="Pausing..."
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
                      >
                        Pause
                      </SubmitButton>
                    </form>
                    <form action={setTimerStateAction}>
                      <input
                        type="hidden"
                        name="timerSeconds"
                        value={String(auctionState.timer_seconds)}
                      />
                      <input type="hidden" name="timerActive" value="true" />
                      <SubmitButton
                        pendingLabel="Starting..."
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
                      >
                        Resume
                      </SubmitButton>
                    </form>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="screen-frame rounded-[22px] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                      Next valid bid
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {currentPlayer ? formatPrice(nextBidAmount) : "--"}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                      Shared increment scale {formatPriceShort(auctionState.bid_increment)}.
                    </p>
                  </div>

                  <form
                    action={placeBidAction}
                    className="screen-frame rounded-[22px] p-4"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                      Admin fallback bid
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select
                        name="teamId"
                        className="rounded-xl border border-white/10 bg-[rgba(14,14,19,0.9)] px-4 py-2.5 text-sm text-white outline-none"
                        defaultValue=""
                        disabled={!currentPlayer || auctionState.phase !== "live"}
                      >
                        <option value="" disabled>
                          Select team
                        </option>
                        {teamSummary.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.short_code} | rating {team.squad_rating_total}
                          </option>
                        ))}
                      </select>
                      <SubmitButton
                        pendingLabel="Placing..."
                        className="rounded-xl border border-[var(--gold)]/30 bg-[rgba(245,166,35,0.12)] px-4 py-2.5 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(245,166,35,0.18)]"
                        disabled={!currentPlayer || auctionState.phase !== "live"}
                      >
                        Bid
                      </SubmitButton>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Room Controls"
            description="Phase, timer presets, and increment scale."
          >
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                  Phase controls
                </div>
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                  {phases.map((phase) => (
                    <form key={phase} action={setAuctionPhaseAction}>
                      <input type="hidden" name="phase" value={phase} />
                      <SubmitButton
                        pendingLabel="Saving..."
                        className={`w-full rounded-xl border px-3 py-2.5 text-sm font-medium ${
                          auctionState.phase === phase
                            ? "border-[var(--gold)]/30 bg-[rgba(245,166,35,0.12)] text-[var(--gold-soft)]"
                            : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        {phase.toUpperCase()}
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="screen-frame rounded-[22px] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                    Timer presets
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {timerPresets.map((seconds) => (
                      <form key={seconds} action={setTimerStateAction}>
                        <input type="hidden" name="timerSeconds" value={String(seconds)} />
                        <input type="hidden" name="timerActive" value="true" />
                        <SubmitButton
                          pendingLabel="..."
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:border-white/20 hover:bg-white/10"
                        >
                          {seconds}s
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                  <form
                    action={setTimerStateAction}
                    className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"
                  >
                    <input
                      name="timerSeconds"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={auctionState.timer_seconds}
                      className="rounded-xl border border-white/10 bg-[rgba(14,14,19,0.9)] px-4 py-2.5 text-sm text-white outline-none"
                    />
                    <SubmitButton
                      name="timerActive"
                      value="false"
                      pendingLabel="Saving..."
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
                    >
                      Save
                    </SubmitButton>
                    <SubmitButton
                      name="timerActive"
                      value="true"
                      pendingLabel="Starting..."
                      className="rounded-xl border border-[var(--gold)]/30 bg-[rgba(245,166,35,0.12)] px-4 py-2.5 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(245,166,35,0.18)]"
                    >
                      Start
                    </SubmitButton>
                  </form>
                </div>

                <div className="screen-frame rounded-[22px] p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                    Increment scale
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {incrementPresets.map((increment) => (
                      <form key={increment} action={setBidIncrementAction}>
                        <input
                          type="hidden"
                          name="bidIncrement"
                          value={String(increment)}
                        />
                        <SubmitButton
                          pendingLabel="..."
                          className={`w-full rounded-xl border px-3 py-2 text-sm font-medium ${
                            auctionState.bid_increment === increment
                              ? "border-[var(--gold)]/30 bg-[rgba(245,166,35,0.12)] text-[var(--gold-soft)]"
                              : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                          }`}
                        >
                          {increment}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                  <form
                    action={setBidIncrementAction}
                    className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"
                  >
                    <input
                      name="bidIncrement"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={auctionState.bid_increment}
                      className="rounded-xl border border-white/10 bg-[rgba(14,14,19,0.9)] px-4 py-2.5 text-sm text-white outline-none"
                    />
                    <SubmitButton
                      pendingLabel="Saving..."
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
                    >
                      Save increment
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Bid Activity Feed"
            description="Most recent bids for the current player."
          >
            <div className="space-y-2.5">
              {bidHistory.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-sm text-slate-300">
                  No bids yet for the current player.
                </div>
              ) : (
                bidHistory.map((bid, index) => (
                  <div key={bid.id} className="screen-frame rounded-[18px] px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                          {bid.team?.short_code ?? "??"}
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {bid.team?.name ?? "Unknown team"}
                          </div>
                          <div className="text-xs text-[var(--text-soft)]">
                            {index === 0 ? "Latest call" : "Previous bid"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono-font text-[var(--gold-soft)]">
                          {formatPrice(bid.amount)}
                        </div>
                        <div className="text-xs text-[var(--text-soft)]">
                          {new Date(bid.timestamp).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Team Pulse"
            description="Purse pressure and total rating visibility for the admin desk."
          >
            <div className="space-y-3">
              {topRatedTeam ? (
                <div className="rounded-[22px] border border-[var(--gold)]/20 bg-[rgba(245,166,35,0.08)] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    Highest squad rating
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {topRatedTeam.name}
                  </div>
                  <div className="mt-2 text-sm text-[var(--text-soft)]">
                    {topRatedTeam.players_acquired} players • purse{" "}
                    {formatPrice(topRatedTeam.purse_remaining)} • rating{" "}
                    {topRatedTeam.squad_rating_total}
                  </div>
                </div>
              ) : null}

              {orderedTeams.map((team) => {
                const ratingPercent = Math.max(
                  12,
                  Math.round((team.squad_rating_total / ratingMax) * 100)
                );
                const isLeader = leadingTeam?.id === team.id;

                return (
                  <div
                    key={team.id}
                    className={`rounded-[20px] border px-4 py-4 ${
                      isLeader
                        ? "border-[var(--blue)]/25 bg-[rgba(5,102,217,0.14)]"
                        : "screen-frame"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor: team.color_primary ?? "var(--gold)",
                            }}
                          />
                          <span className="text-lg font-semibold text-white">
                            {team.short_code}
                          </span>
                          {isLeader ? (
                            <span className="rounded-full border border-[var(--blue)]/25 bg-[rgba(5,102,217,0.14)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--blue-soft)]">
                              Active bidder
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm text-[var(--text-soft)]">
                          {team.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono-font text-[var(--gold-soft)]">
                          {formatPrice(team.purse_remaining)}
                        </div>
                        <div className="text-xs text-[var(--text-soft)]">
                          Purse left
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          Players
                        </div>
                        <div className="mt-1 font-semibold text-white">
                          {team.players_acquired}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          Rating
                        </div>
                        <div className="mt-1 font-semibold text-white">
                          {team.squad_rating_total}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          Rank
                        </div>
                        <div className="mt-1 font-semibold text-white">
                          {orderedTeams.findIndex((item) => item.id === team.id) + 1}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
                      <div
                        className="h-full rounded-full bg-[var(--gold)]"
                        style={{ width: `${ratingPercent}%` }}
                      />
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
