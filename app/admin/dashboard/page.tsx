import { BarChart3, CircleDollarSign, ListChecks, Users2 } from "lucide-react";

import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { getDashboardPageData } from "@/lib/auction-data";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const { summary, teamSummary, recentSales } = await getDashboardPageData();
  const teamById = new Map(teamSummary.map((team) => [team.id, team]));
  const richestTeam = [...teamSummary].sort(
    (left, right) => right.purse_remaining - left.purse_remaining
  )[0];
  const orderedTeams = [...teamSummary].sort(
    (left, right) =>
      right.squad_rating_total - left.squad_rating_total ||
      right.purse_remaining - left.purse_remaining
  );
  const averageSale =
    summary.soldPlayers > 0 ? summary.totalMoneySpent / summary.soldPlayers : 0;
  const ratingMax = Math.max(
    1,
    ...orderedTeams.map((team) => team.squad_rating_total || 0)
  );

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Players sold"
          value={String(summary.soldPlayers)}
          hint="This count updates directly from sold player records in the database."
          icon={ListChecks}
        />
        <MetricCard
          label="Money spent"
          value={formatPrice(summary.totalMoneySpent)}
          hint="Every hammer price contributes to the shared purse board immediately."
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Active teams"
          value={String(teamSummary.length)}
          hint="The live auction supports one admin room and ten connected captain consoles."
          icon={Users2}
        />
        <MetricCard
          label="Most purse left"
          value={richestTeam?.short_code ?? "--"}
          hint="This is the team currently holding the most remaining buying power."
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard
          title="Leaderboard and Budgets"
          description="Squad index, purse remaining, and roster depth across the room."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {orderedTeams.map((team, index) => {
              const pursePercent =
                team.purse_total > 0
                  ? (team.purse_remaining / team.purse_total) * 100
                  : 0;
              const ratingPercent = Math.max(
                14,
                Math.round((team.squad_rating_total / ratingMax) * 100)
              );

              return (
                <div key={team.id} className="screen-frame rounded-[22px] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                          #{index + 1}
                        </span>
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: team.color_primary ?? "#ffffff" }}
                        />
                        <span className="text-lg font-semibold text-white">
                          {team.name}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-[var(--text-soft)]">
                        {team.players_acquired} players acquired
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mono-font text-[var(--gold-soft)]">
                        {formatPrice(team.purse_remaining)}
                      </div>
                      <div className="text-xs text-[var(--text-soft)]">
                        purse left
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[16px] border border-white/8 bg-white/4 px-3 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                        Squad rating
                      </div>
                      <div className="mt-1.5 text-xl font-semibold text-white">
                        {team.squad_rating_total}
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-[rgba(255,255,255,0.08)]">
                        <div
                          className="h-full rounded-full bg-[var(--gold)]"
                          style={{ width: `${ratingPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-white/8 bg-white/4 px-3 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
                        Budget health
                      </div>
                      <div className="mt-1.5 text-xl font-semibold text-white">
                        {Math.round(pursePercent)}%
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-[rgba(255,255,255,0.08)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(pursePercent, 6)}%`,
                            backgroundColor: team.color_primary ?? "var(--gold)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Hammer Log"
          description="The last completed sales, with buyer and timestamp."
        >
          <div className="space-y-3">
            {recentSales.length === 0 ? (
              <div className="grid min-h-[420px] place-items-center rounded-[24px] border border-dashed border-white/15 bg-white/4 p-8 text-center">
                <div className="max-w-sm space-y-3">
                  <h3 className="text-xl font-semibold text-white">
                    No completed deals yet
                  </h3>
                  <p className="text-sm leading-6 text-slate-300">
                    Sell the first player from the auction room and this feed will
                    update instantly.
                  </p>
                </div>
              </div>
            ) : (
              recentSales.map((player) => {
                const team = player.sold_to ? teamById.get(player.sold_to) : null;

                return (
                  <div
                    key={player.id}
                    className="screen-frame rounded-[20px] px-4 py-4"
                  >
                    <div>
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="mt-1 text-xs text-[var(--text-soft)]">
                        {team?.short_code ?? "Unknown team"} • {player.role} •{" "}
                        {new Date(player.updated_at).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="mono-font text-[var(--gold-soft)]">
                      {formatPrice(player.sold_price ?? player.base_price)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Market Pulse"
        description="A quick read on spend velocity and room pressure."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="screen-frame rounded-[20px] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
              Total spent
            </div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {formatPrice(summary.totalMoneySpent)}
            </div>
          </div>
          <div className="screen-frame rounded-[20px] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
              Average sale
            </div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {formatPrice(averageSale)}
            </div>
          </div>
          <div className="screen-frame rounded-[20px] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
              Most purse left
            </div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {richestTeam?.short_code ?? "--"}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
