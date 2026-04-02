import { KeyRound, Wallet } from "lucide-react";

import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { getTeamsPageData } from "@/lib/auction-data";
import { formatPrice } from "@/lib/utils";

export default async function AdminTeamsPage() {
  const { teams } = await getTeamsPageData();
  const linkedCaptains = teams.filter((team) => team.user_id).length;
  const totalPurseRemaining = teams.reduce(
    (sum, team) => sum + team.purse_remaining,
    0
  );
  const totalPlayers = teams.reduce(
    (sum, team) => sum + team.players_acquired,
    0
  );

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Teams seeded"
          value={String(teams.length)}
          hint="All ten IPL teams are now pulled from the live Supabase seed rather than static UI constants."
          icon={Wallet}
        />
        <MetricCard
          label="Captain linkage"
          value={`${linkedCaptains}/${teams.length}`}
          hint="A team is considered linked once the auth user id has been attached to the team row."
          icon={KeyRound}
        />
        <MetricCard
          label="Purse left"
          value={formatPrice(totalPurseRemaining)}
          hint="This total drops with every successful sale across the auction."
          icon={Wallet}
        />
        <MetricCard
          label="Players sold"
          value={String(totalPlayers)}
          hint="Roster counts are derived directly from player ownership in the database."
          icon={KeyRound}
        />
      </div>

      <SectionCard
        title="Team grid"
        description="Live purse, squad, captain linkage, and credential handoff are now all visible from one admin page."
      >
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {teams.map((team) => (
            <article
              key={team.id}
              className="rounded-[26px] border border-white/8 bg-white/4 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: team.color_primary ?? "#ffffff" }}
                    />
                    <span className="display-font text-3xl text-white">
                      {team.short_code}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-white">{team.name}</h2>
                </div>
                <div
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${
                    team.user_id
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                      : "border-amber-400/30 bg-amber-500/10 text-amber-100"
                  }`}
                >
                  {team.user_id ? "Linked" : "Pending"}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-white/8 bg-slate-950/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Purse left
                  </div>
                  <div className="mt-2 font-semibold text-white">
                    {formatPrice(team.purse_remaining)}
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-slate-950/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Players
                  </div>
                  <div className="mt-2 font-semibold text-white">
                    {team.players_acquired} acquired
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-[20px] border border-white/8 bg-slate-950/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Captain login
                  </div>
                  <div className="mt-2 text-sm text-white">
                    {team.credentials?.login_email ?? "Not provisioned"}
                  </div>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-slate-950/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Captain password
                  </div>
                  <div className="mt-2 text-sm text-white">
                    {team.credentials?.login_password ?? "Not provisioned"}
                  </div>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-300">
                Squad rating total: {team.squad_rating_total}. Captain mapping is{" "}
                {team.user_id ? "ready for live bidding." : "still waiting to sync."}
              </p>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
