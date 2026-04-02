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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Purse board"
          description="A live snapshot of remaining budget and squad buildup for every team."
        >
          <div className="space-y-4">
            {teamSummary.map((team) => {
              const pursePercent =
                team.purse_total > 0
                  ? (team.purse_remaining / team.purse_total) * 100
                  : 0;

              return (
                <div key={team.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-3">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: team.color_primary ?? "#ffffff" }}
                      />
                      <span className="font-medium text-white">{team.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="mono-font text-[var(--gold-soft)]">
                        {formatPrice(team.purse_remaining)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {team.players_acquired} players • rating {team.squad_rating_total}
                      </div>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(pursePercent, 4)}%`,
                        backgroundColor: team.color_primary ?? "#ffffff",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent sales"
          description="The last ten completed hammer results, including buyer and price."
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
                    className="flex items-center justify-between rounded-[22px] border border-white/8 bg-white/4 px-4 py-4"
                  >
                    <div>
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="mt-1 text-xs text-slate-400">
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
    </>
  );
}
