import { Clock3, Gavel, Trophy, Users } from "lucide-react";

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

export default async function AdminAuctionPage() {
  const { auctionState, currentPlayer, leadingTeam, queue, bidHistory, teamSummary } =
    await getAdminAuctionPageData();
  const soldPlayers = teamSummary.reduce(
    (sum, team) => sum + team.players_acquired,
    0
  );
  const nextBidAmount = currentPlayer
    ? auctionState.current_bid_amount > 0
      ? auctionState.current_bid_amount + auctionState.bid_increment
      : currentPlayer.base_price
    : 0;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Auction phase"
          value={auctionState.phase.toUpperCase()}
          hint="Phase changes now write straight into Supabase and refresh every connected route."
          icon={Gavel}
        />
        <MetricCard
          label="Current bid"
          value={
            currentPlayer
              ? formatPrice(
                  auctionState.current_bid_amount || currentPlayer.base_price
                )
              : "Waiting"
          }
          hint="The current amount is the live price teams are reacting to on their consoles."
          icon={Trophy}
        />
        <MetricCard
          label="Bid increment"
          value={formatPriceShort(auctionState.bid_increment)}
          hint="Admins can tune the live increment without leaving the auction room."
          icon={Clock3}
        />
        <MetricCard
          label="Players sold"
          value={String(soldPlayers)}
          hint="Every hammer sale updates purse totals, team squads, and the dashboard instantly."
          icon={Users}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr_0.95fr]">
        <SectionCard
          title="Current player on the block"
          description="Nominate from the queue below, then run bids and close the sale from this panel."
        >
          {currentPlayer ? (
            <div className="grid gap-4 rounded-[24px] border border-white/8 bg-white/4 p-6">
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

              <div>
                <p className="display-font text-5xl text-[var(--gold-soft)]">
                  {currentPlayer.name}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Rating {currentPlayer.rating} with {currentPlayer.ipl_caps} IPL caps.
                  Opening price starts at {formatPrice(currentPlayer.base_price)}.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-white/8 bg-slate-950/30 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Base price
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatPrice(currentPlayer.base_price)}
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-slate-950/30 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Next valid bid
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {formatPrice(nextBidAmount)}
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-slate-950/30 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Leading team
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {leadingTeam ? leadingTeam.short_code : "No bids"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[340px] place-items-center rounded-[24px] border border-dashed border-white/15 bg-white/4 p-8 text-center">
              <div className="max-w-md space-y-4">
                <p className="display-font text-5xl text-[var(--gold-soft)]">NEXT UP</p>
                <h3 className="text-2xl font-semibold text-white">
                  Waiting for a nomination
                </h3>
                <p className="text-sm leading-6 text-slate-300">
                  Use the quick queue or the nominate-next button to put the next
                  player on the block.
                </p>
                <form action={nominateNextPlayerAction}>
                  <SubmitButton
                    pendingLabel="Nominating..."
                    className="rounded-full border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.12)] px-5 py-3 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(240,165,0,0.18)]"
                    disabled={queue.length === 0}
                  >
                    Nominate next player
                  </SubmitButton>
                </form>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Bidding controls"
          description="Manual control for phases, fallback bidding, timer resets, and increment changes."
        >
          <div className="space-y-5">
            <div className="rounded-[24px] border border-white/8 bg-white/4 p-5">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Leading team
              </div>
              <div className="mt-3 text-3xl font-semibold text-white">
                {leadingTeam ? leadingTeam.name : "No bids yet"}
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {leadingTeam
                  ? `${leadingTeam.short_code} is currently ahead at ${formatPrice(
                      auctionState.current_bid_amount
                    )}.`
                  : "The first accepted bid will instantly fan out to every connected client."}
              </div>
            </div>

            <form action={placeBidAction} className="grid gap-3 rounded-[24px] border border-white/8 bg-white/4 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Admin fallback bid
              </div>
              <select
                name="teamId"
                className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                defaultValue=""
                disabled={!currentPlayer || auctionState.phase !== "live"}
              >
                <option value="" disabled>
                  Select team
                </option>
                {teamSummary.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.short_code} - {team.name}
                  </option>
                ))}
              </select>
              <SubmitButton
                pendingLabel="Placing bid..."
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
                disabled={!currentPlayer || auctionState.phase !== "live"}
              >
                Place next bid at {currentPlayer ? formatPrice(nextBidAmount) : "--"}
              </SubmitButton>
            </form>

            <div className="grid gap-3">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Phase controls
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {phases.map((phase) => (
                  <form key={phase} action={setAuctionPhaseAction}>
                    <input type="hidden" name="phase" value={phase} />
                    <SubmitButton
                      pendingLabel="Updating..."
                      className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium ${
                        auctionState.phase === phase
                          ? "border-[var(--gold)]/40 bg-[rgba(240,165,0,0.12)] text-[var(--gold-soft)]"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      {phase.toUpperCase()}
                    </SubmitButton>
                  </form>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-white/8 bg-white/4 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-300">Timer</span>
                <span className="mono-font text-lg text-white">
                  <TimerDisplay
                    seconds={auctionState.timer_seconds}
                    timerActive={auctionState.timer_active}
                    updatedAt={auctionState.updated_at}
                  />
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[var(--gold)] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max((auctionState.timer_seconds / 30) * 100, 0)
                    )}%`,
                  }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <form action={setTimerStateAction}>
                  <input type="hidden" name="timerSeconds" value="30" />
                  <input type="hidden" name="timerActive" value="true" />
                  <SubmitButton
                    pendingLabel="Starting..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 hover:border-white/20 hover:bg-white/10"
                  >
                    Start 30s
                  </SubmitButton>
                </form>
                <form action={setTimerStateAction}>
                  <input
                    type="hidden"
                    name="timerSeconds"
                    value={String(auctionState.timer_seconds)}
                  />
                  <input type="hidden" name="timerActive" value="false" />
                  <SubmitButton
                    pendingLabel="Pausing..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 hover:border-white/20 hover:bg-white/10"
                  >
                    Pause
                  </SubmitButton>
                </form>
                <form action={setTimerStateAction}>
                  <input type="hidden" name="timerSeconds" value="30" />
                  <input type="hidden" name="timerActive" value="false" />
                  <SubmitButton
                    pendingLabel="Resetting..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 hover:border-white/20 hover:bg-white/10"
                  >
                    Reset
                  </SubmitButton>
                </form>
              </div>
            </div>

            <form action={setBidIncrementAction} className="grid gap-3 rounded-[24px] border border-white/8 bg-white/4 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="grid gap-2 text-sm text-slate-300">
                Bid increment (Lakhs)
                <input
                  name="bidIncrement"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={auctionState.bid_increment}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                />
              </label>
              <SubmitButton
                pendingLabel="Saving..."
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
              >
                Save increment
              </SubmitButton>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          title="Team pulse"
          description="Live purse pressure and roster counts for every captain."
        >
          <div className="grid gap-3">
            {teamSummary.map((team) => (
              <div
                key={team.id}
                className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: team.color_primary ?? "#ffffff" }}
                    />
                    <div>
                      <div className="font-medium text-white">{team.short_code}</div>
                      <div className="text-xs text-slate-400">{team.name}</div>
                    </div>
                  </div>
                  <div className="mono-font text-sm text-[var(--gold-soft)]">
                    {formatPrice(team.purse_remaining)}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
                  <span>{team.players_acquired} players</span>
                  <span>rating {team.squad_rating_total}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <SectionCard
          title="Upcoming queue"
          description="The highest-rated pool players are ready for one-click nomination."
        >
          <div className="space-y-3">
            {queue.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-300">
                No players are waiting in the pool right now.
              </div>
            ) : (
              queue.map((player, index) => (
                <div
                  key={player.id}
                  className="flex flex-col gap-4 rounded-[22px] border border-white/8 bg-white/4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Queue slot {index + 1}
                    </div>
                    <div className="mt-1 font-semibold text-white">{player.name}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 font-medium ${getRoleBadgeColor(player.role)}`}
                      >
                        {player.role}
                      </span>
                      <span>{player.nationality}</span>
                      <span>{formatPrice(player.base_price)}</span>
                      <span>Rating {player.rating}</span>
                    </div>
                  </div>

                  <form action={nominatePlayerAction}>
                    <input type="hidden" name="playerId" value={player.id} />
                    <SubmitButton
                      pendingLabel="Nominating..."
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
                      disabled={Boolean(currentPlayer)}
                    >
                      {player.status === "unsold" ? "Recall player" : "Nominate"}
                    </SubmitButton>
                  </form>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Action bar"
            description="Core close-out and recovery actions for the live room."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <form action={nominateNextPlayerAction}>
                <SubmitButton
                  pendingLabel="Nominating..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
                  disabled={Boolean(currentPlayer) || queue.length === 0}
                >
                  Next player
                </SubmitButton>
              </form>
              <form action={sellCurrentPlayerAction}>
                <SubmitButton
                  pendingLabel="Selling..."
                  className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm font-medium text-emerald-100 hover:border-emerald-400/35 hover:bg-emerald-500/15"
                  disabled={!currentPlayer || !leadingTeam}
                >
                  Sell player
                </SubmitButton>
              </form>
              <form action={markUnsoldAction}>
                <SubmitButton
                  pendingLabel="Updating..."
                  className="w-full rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm font-medium text-rose-100 hover:border-rose-400/35 hover:bg-rose-500/15"
                  disabled={!currentPlayer}
                >
                  Mark unsold
                </SubmitButton>
              </form>
              <form action={resetAuctionAction}>
                <SubmitButton
                  pendingLabel="Resetting..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-4 text-sm font-medium text-slate-300 hover:border-white/20 hover:bg-slate-950/60"
                >
                  Reset auction
                </SubmitButton>
              </form>
            </div>
          </SectionCard>

          <SectionCard
            title="Recent bids"
            description="The last accepted bids for the active player."
          >
            <div className="space-y-3">
              {bidHistory.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-300">
                  No bids have landed for the current player yet.
                </div>
              ) : (
                bidHistory.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/4 px-4 py-4"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {bid.team?.short_code ?? "Unknown team"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(bid.timestamp).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="mono-font text-[var(--gold-soft)]">
                      {formatPrice(bid.amount)}
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
