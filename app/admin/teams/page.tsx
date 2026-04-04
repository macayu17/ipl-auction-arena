import { KeyRound, Wallet } from "lucide-react";

import { adjustPurseAction, resetTeamAction } from "@/app/actions/teams";
import { CredentialsExportButton } from "@/components/admin/credentials-export-button";
import { SubmitButton } from "@/components/forms/submit-button";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { getTeamsPageData } from "@/lib/auction-data";
import { formatPrice } from "@/lib/utils";

export default async function AdminTeamsPage() {
  const { teams, auctionState } = await getTeamsPageData();
  const linkedCaptains = teams.filter((team) => team.user_id).length;
  const totalPurseRemaining = teams.reduce(
    (sum, team) => sum + team.purse_remaining,
    0
  );
  const totalPlayers = teams.reduce(
    (sum, team) => sum + team.players_acquired,
    0
  );
  const totalRating = teams.reduce(
    (sum, team) => sum + team.squad_rating_total,
    0
  );
  const credentialRows = teams
    .filter((team) => team.credentials?.login_email && team.credentials?.login_password)
    .map((team) => ({
      teamName: team.name,
      shortCode: team.short_code,
      loginEmail: team.credentials?.login_email ?? "",
      loginPassword: team.credentials?.login_password ?? "",
    }));

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-4">
        <MetricCard label="Teams" value={String(teams.length)} icon={Wallet} />
        <MetricCard
          label="Linked"
          value={`${linkedCaptains}/${teams.length}`}
          icon={KeyRound}
        />
        <MetricCard
          label="Purse left"
          value={formatPrice(totalPurseRemaining)}
          icon={Wallet}
        />
        <MetricCard
          label="Total rating"
          value={String(totalRating)}
          hint={`Sold players: ${totalPlayers}`}
          icon={KeyRound}
        />
      </div>

      <SectionCard
        title="Teams"
        description="Adjust team budgets, reset one squad in emergencies, and export captain handoff credentials."
        action={<CredentialsExportButton rows={credentialRows} />}
      >
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {teams.map((team) => {
            const resetLocked = auctionState.current_bid_team_id === team.id;

            return (
              <article
                key={team.id}
                className="rounded-[22px] border border-white/8 bg-white/4 p-4"
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
                    <h2 className="mt-2 text-lg font-semibold text-white">
                      {team.name}
                    </h2>
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

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-white/8 bg-slate-950/25 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Purse left
                    </div>
                    <div className="mt-2 font-semibold text-white">
                      {formatPrice(team.purse_remaining)}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-slate-950/25 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Players
                    </div>
                    <div className="mt-2 font-semibold text-white">
                      {team.players_acquired}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-slate-950/25 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Rating
                    </div>
                    <div className="mt-2 font-semibold text-white">
                      {team.squad_rating_total}
                    </div>
                  </div>
                </div>

                <form action={adjustPurseAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="teamId" value={team.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm text-slate-300">
                      Purse total
                      <input
                        name="purseTotal"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={team.purse_total}
                        className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-300">
                      Purse spent
                      <input
                        name="purseSpent"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={team.purse_spent}
                        className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                      />
                    </label>
                  </div>
                  <SubmitButton
                    pendingLabel="Saving..."
                    className="rounded-xl border border-[var(--gold)]/30 bg-[rgba(245,166,35,0.12)] px-4 py-3 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(245,166,35,0.18)]"
                  >
                    Save purse override
                  </SubmitButton>
                </form>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-[18px] border border-white/8 bg-slate-950/25 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Captain login
                    </div>
                    <div className="mt-2 text-sm text-white">
                      {team.credentials?.login_email ?? "Not provisioned"}
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-slate-950/25 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Captain password
                    </div>
                    <div className="mt-2 text-sm text-white">
                      {team.credentials?.login_password ?? "Not provisioned"}
                    </div>
                  </div>
                </div>

                <form action={resetTeamAction} className="mt-4">
                  <input type="hidden" name="teamId" value={team.id} />
                  <SubmitButton
                    pendingLabel="Resetting..."
                    disabled={resetLocked}
                    className="w-full rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 hover:border-rose-400/35 hover:bg-rose-500/15"
                  >
                    {resetLocked
                      ? "Current leading bidder cannot be reset"
                      : "Reset team squad"}
                  </SubmitButton>
                </form>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}
