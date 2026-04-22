import { ResetWholeAuctionPanel } from "@/components/admin/reset-whole-auction-panel";
import { TeamLogo } from "@/components/auction/team-logo";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { getDashboardPageData } from "@/lib/auction-data";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
          iconName="list-checks"
        />
        <MetricCard
          label="Money spent"
          value={formatPrice(summary.totalMoneySpent)}
          hint="Every hammer price contributes to the shared purse board immediately."
          iconName="circle-dollar-sign"
        />
        <MetricCard
          label="Active teams"
          value={String(teamSummary.length)}
          hint="The live auction supports one admin room and ten connected captain consoles."
          iconName="users-2"
        />
        <MetricCard
          label="Most purse left"
          value={richestTeam?.short_code ?? "--"}
          hint="This is the team currently holding the most remaining buying power."
          iconName="bar-chart-3"
        />
      </div>

      <SectionCard
        title="Auction Controls"
        description="Critical room-level controls. Use carefully."
      >
        <div className="max-w-sm">
          <ResetWholeAuctionPanel />
        </div>
      </SectionCard>

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
                <div key={team.id} className="glass-panel rounded-xl p-5 border border-white/5 bg-black/20 hover:bg-black/40 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
                          #{index + 1}
                        </span>
                        <TeamLogo shortCode={team.short_code} size={28} />
                        <span className="text-xl font-bold tracking-tight text-white">
                          {team.name}
                        </span>
                      </div>
                      <div className="mt-2 text-[13px] text-[var(--text-soft)]">
                        {team.players_acquired} players acquired
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mono-font text-white font-bold text-lg leading-none">
                        {formatPrice(team.purse_remaining)}
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)] mt-1">
                        purse left
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="bg-black/30 rounded-lg border border-white/5 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                        Squad rating
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white leading-none">
                        {team.squad_rating_total}
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/50 border border-white/5 relative">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${ratingPercent}%`, backgroundColor: "white", boxShadow: "0 0 10px rgba(255,255,255,0.5)" }}
                        />
                      </div>
                    </div>

                    <div className="bg-black/30 rounded-lg border border-white/5 p-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                        Budget health
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white leading-none">
                        {Math.round(pursePercent)}%
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/50 border border-white/5 relative">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${Math.max(pursePercent, 6)}%`,
                            backgroundColor: team.color_primary ?? "var(--gold)",
                            boxShadow: `0 0 10px ${team.color_primary ?? "var(--gold)"}`
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
              <div className="glass-panel items-center justify-center min-h-[420px] rounded-xl border border-dashed border-white/10 flex p-8 text-center">
                <div className="max-w-sm space-y-3">
                  <h3 className="text-xl font-bold tracking-tight text-white mb-2">
                    No completed deals yet
                  </h3>
                  <p className="text-[15px] leading-relaxed text-white/50 max-w-md mx-auto">
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
                    className="glass-panel rounded-xl px-5 py-4 flex items-center justify-between gap-4 bg-black/20 border border-white/5"
                  >
                    <div>
                      <div className="font-bold text-white tracking-wide text-lg">{player.name}</div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)] flex items-center gap-2">
                        {team?.short_code ? (
                          <span className="inline-flex items-center gap-1.5 text-[var(--gold)]">
                            <TeamLogo shortCode={team.short_code} size={18} />
                            {team.short_code}
                          </span>
                        ) : "Unknown team"}
                        <span>•</span>
                        <span>{player.role}</span>
                        <span>•</span>
                        <span>{new Date(player.updated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    <div className="mono-font text-white font-bold text-xl leading-none">
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
        <div className="grid gap-4 md:grid-cols-3">
          <div className="glass-panel rounded-xl p-6 border border-[var(--gold)]/20 bg-[var(--gold)]/5 relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--gold)]/50" />
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gold)]">
              Total spent
            </div>
            <div className="mt-3 text-4xl font-bold text-white mono-font">
              {formatPrice(summary.totalMoneySpent)}
            </div>
          </div>
          <div className="glass-panel rounded-xl p-6 border border-white/5 bg-black/30">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
              Average sale
            </div>
            <div className="mt-3 text-4xl font-bold text-white mono-font">
              {formatPrice(averageSale)}
            </div>
          </div>
          <div className="glass-panel rounded-xl p-6 border border-[var(--blue)]/20 bg-[var(--blue)]/5 relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--blue)]/50" />
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--blue-soft)]">
              Most purse left
            </div>
            <div className="mt-3 text-4xl font-bold text-white">
              {richestTeam?.short_code ?? "--"}
            </div>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
