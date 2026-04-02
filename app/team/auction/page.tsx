import { RadioTower, Shield, TimerReset, Trophy } from "lucide-react";

import { placeBidAction } from "@/app/actions/auction";
import { TimerDisplay } from "@/components/auction/timer-display";
import { SubmitButton } from "@/components/forms/submit-button";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { requireRole } from "@/lib/auth";
import { getTeamAuctionPageData } from "@/lib/auction-data";
import {
  formatPrice,
  formatPurse,
  getRoleBadgeColor,
} from "@/lib/utils";

export default async function TeamAuctionPage() {
  const session = await requireRole("team");

  if (session.status !== "authenticated") {
    return (
      <SectionCard
        title="Team console preview"
        description="Connect Supabase auth to unlock the personalized live team experience."
      >
        <div className="rounded-[24px] border border-white/8 bg-white/4 p-6 text-sm leading-6 text-slate-300">
          Sign in with a linked team account to see purse, bidding, and squad data.
        </div>
      </SectionCard>
    );
  }

  const { auctionState, currentPlayer, leadingTeam, myTeam, mySquad, bidHistory } =
    await getTeamAuctionPageData(session.user.id);

  if (!myTeam) {
    return (
      <SectionCard
        title="Team linkage pending"
        description="This login worked, but it is not attached to a row in the `teams` table yet."
      >
        <div className="rounded-[24px] border border-white/8 bg-white/4 p-6 text-sm leading-6 text-slate-300">
          Link this user to a team from the admin setup flow, then refresh the page.
        </div>
      </SectionCard>
    );
  }

  const nextBidAmount = currentPlayer
    ? auctionState.current_bid_amount > 0
      ? auctionState.current_bid_amount + auctionState.bid_increment
      : currentPlayer.base_price
    : 0;
  const canBid =
    Boolean(currentPlayer) &&
    auctionState.phase === "live" &&
    auctionState.current_bid_team_id !== myTeam.id &&
    myTeam.purse_total - myTeam.purse_spent >= nextBidAmount;
  const bidMessage = !currentPlayer
    ? "Waiting for the auctioneer to nominate a player."
    : auctionState.phase !== "live"
      ? "Bidding is paused until the admin moves the auction back to live."
      : auctionState.current_bid_team_id === myTeam.id
        ? "Your team is already leading this player."
        : myTeam.purse_total - myTeam.purse_spent < nextBidAmount
          ? "Your remaining purse is below the next valid bid."
          : `Your next click will bid ${formatPrice(nextBidAmount)}.`;

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-4">
        <MetricCard
          label="Connection"
          value="Ready"
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
          value={
            currentPlayer
              ? formatPrice(auctionState.current_bid_amount || currentPlayer.base_price)
              : "Waiting"
          }
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
            title="Captain Board"
            description="Player focus, live amount, and the one action that matters most."
          >
            {currentPlayer ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.18),transparent_35%),linear-gradient(180deg,rgba(31,31,37,0.96),rgba(14,14,19,0.98))] p-5 lg:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(currentPlayer.role)}`}
                    >
                      {currentPlayer.role}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                      {currentPlayer.nationality}
                    </span>
                  </div>

                  <div className="mt-10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--gold-soft)]">
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
                    <div className="screen-frame rounded-[18px] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                        Current
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {formatPrice(
                          auctionState.current_bid_amount || currentPlayer.base_price
                        )}
                      </div>
                    </div>
                    <div className="screen-frame rounded-[18px] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                        Next bid
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        {formatPrice(nextBidAmount)}
                      </div>
                    </div>
                    <div className="screen-frame rounded-[18px] p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
                        Timer
                      </div>
                      <div className="mt-2 text-xl font-semibold text-white">
                        <TimerDisplay
                          seconds={auctionState.timer_seconds}
                          timerActive={auctionState.timer_active}
                          updatedAt={auctionState.updated_at}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-[rgba(31,31,37,0.85)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">
                        Leading team
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {leadingTeam?.name ?? "No active bidder"}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--gold-soft)]">
                      {auctionState.phase}
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
                    {bidMessage}
                  </p>

                  <form action={placeBidAction} className="mt-5">
                    <SubmitButton
                      pendingLabel="Sending bid..."
                      className="w-full rounded-[22px] border border-[var(--gold)]/25 bg-[rgba(245,166,35,0.12)] px-5 py-5 text-lg font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/45 hover:bg-[rgba(245,166,35,0.18)]"
                      disabled={!canBid}
                    >
                      {currentPlayer
                        ? `Bid ${formatPrice(nextBidAmount)}`
                        : "Waiting for player"}
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[420px] place-items-center rounded-[24px] border border-dashed border-white/15 bg-white/4 p-8 text-center">
                <div className="max-w-lg space-y-4">
                  <p className="display-font text-5xl text-[var(--gold-soft)]">LIVE VIEW</p>
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
                <div className="rounded-[20px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-sm text-slate-300">
                  No bids yet for this player.
                </div>
              ) : (
                bidHistory.map((bid) => (
                  <div
                    key={bid.id}
                    className="screen-frame rounded-[18px] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-white">
                          {bid.team?.short_code ?? "Unknown team"}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-soft)]">
                          {new Date(bid.timestamp).toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="mono-font text-[var(--gold-soft)]">
                        {formatPrice(bid.amount)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Squad Snapshot"
            description="Your latest additions stay visible while the bidding room keeps moving."
          >
            <div className="space-y-3">
              {mySquad.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-300">
                  No players purchased yet.
                </div>
              ) : (
                mySquad.slice(0, 6).map((player) => (
                  <div
                    key={player.id}
                    className="screen-frame rounded-[18px] px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="mt-1 text-xs text-[var(--text-soft)]">
                          {player.role} • Rating {player.rating}
                        </div>
                      </div>
                      <div className="mono-font text-[var(--gold-soft)]">
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
