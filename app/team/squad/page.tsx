import { OverseasBadge } from "@/components/auction/overseas-badge";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { requireRole } from "@/lib/auth";
import { getTeamSquadPageData } from "@/lib/auction-data";
import {
  formatPrice,
  formatPurse,
  getRoleBadgeColor,
} from "@/lib/utils";
import type { PlayerRole } from "@/types/app.types";

const roleBuckets: PlayerRole[] = [
  "Batsman",
  "Bowler",
  "All-Rounder",
  "Wicket-Keeper",
];

export default async function TeamSquadPage() {
  const session = await requireRole("team");

  if (session.status !== "authenticated") {
    return (
      <SectionCard
        title="Team squad preview"
        description="Team-specific squad data appears here after authentication is fully configured."
      >
        <div className="rounded-lg border border-white/10 bg-white/4 p-6 text-sm leading-6 text-slate-300">
          Sign in with a linked team account to unlock the squad tracker.
        </div>
      </SectionCard>
    );
  }

  const { myTeam, squad } = await getTeamSquadPageData(session.user.id);

  if (!myTeam) {
    return (
      <SectionCard
        title="Team linkage pending"
        description="This account is authenticated but not yet mapped to a team row."
      >
        <div className="rounded-lg border border-white/10 bg-white/4 p-6 text-sm leading-6 text-slate-300">
          Ask the admin to re-run team provisioning or update the `teams.user_id`
          mapping for this user.
        </div>
      </SectionCard>
    );
  }

  const overseasCount = squad.filter(
    (player) => player.nationality === "Overseas"
  ).length;

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-4">
        <MetricCard
          label="Team"
          value={myTeam.short_code}
          hint={`${myTeam.name} can audit balance and roster shape here.`}
          iconName="shield-check"
        />
        <MetricCard
          label="Purse spent"
          value={formatPrice(myTeam.purse_spent)}
          hint="Every completed sale rolls into this immediately."
          iconName="circle-dollar-sign"
        />
        <MetricCard
          label="Purse left"
          value={formatPurse(myTeam.purse_total, myTeam.purse_spent)}
          hint="Your hard ceiling before the next aggressive bid."
          iconName="users"
        />
        <MetricCard
          label="Overseas players"
          value={String(overseasCount)}
          hint={`${squad.length} total players currently signed.`}
          iconName="shield-check"
        />
      </div>

      <SectionCard
        title="Squad composition"
        description="Purchased players are grouped by role so the team can assess balance at a glance."
      >
        <div className="grid gap-4 xl:grid-cols-4">
          {roleBuckets.map((role) => {
            const players = squad.filter((player) => player.role === role);

            return (
              <article
                key={role}
                className="rounded-lg border border-white/5 bg-transparent shadow-none rounded-lg p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-white">{role}</h2>
                  <span
                    className={`inline-flex rounded-lg border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(role)}`}
                  >
                    {players.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {players.length === 0 ? (
                    <div className="grid min-h-[180px] place-items-center rounded-lg border border-dashed border-white/10 bg-slate-950/20 p-5 text-center">
                      <p className="text-sm leading-6 text-slate-300">
                        No {role.toLowerCase()} signed yet.
                      </p>
                    </div>
                  ) : (
                    players.map((player) => (
                      <div
                        key={player.id}
                        className="rounded-lg border border-white/10 bg-white/4 px-4 py-4"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{player.name}</span>
                          <OverseasBadge nationality={player.nationality} />
                        </div>
                        <div className="mt-2 mono-font text-sm text-white font-medium">
                          {formatPrice(player.sold_price ?? player.base_price)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}
