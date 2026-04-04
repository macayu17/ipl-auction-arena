import { adjustPurseAction, resetTeamAction } from "@/app/actions/teams";
import { CredentialsExportButton } from "@/components/admin/credentials-export-button";
import { TeamLogo } from "@/components/auction/team-logo";
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
        <MetricCard label="Teams" value={String(teams.length)} iconName="wallet" />
        <MetricCard
          label="Linked"
          value={`${linkedCaptains}/${teams.length}`}
          iconName="key-round"
        />
        <MetricCard
          label="Purse left"
          value={formatPrice(totalPurseRemaining)}
          iconName="wallet"
        />
        <MetricCard
          label="Total rating"
          value={String(totalRating)}
          hint={`Sold players: ${totalPlayers}`}
          iconName="key-round"
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
                className="glass-panel rounded-xl border border-white/5 bg-black/20 p-6 flex flex-col h-full"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <TeamLogo shortCode={team.short_code} size={44} />
                      <span className="text-3xl font-bold tracking-tight text-white display-font">
                        {team.short_code}
                      </span>
                    </div>
                    <h2 className="mt-2 text-[15px] font-bold tracking-wide text-white">
                      {team.name}
                    </h2>
                  </div>
                  <div
                    className={`rounded-md border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      team.user_id
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-400/30 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {team.user_id ? "Linked" : "Pending"}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                      Purse left
                    </div>
                    <div className="mt-2 font-bold text-white text-lg mono-font">
                      {formatPrice(team.purse_remaining)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                      Players
                    </div>
                    <div className="mt-2 font-bold text-white text-lg mono-font">
                      {team.players_acquired}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                      Rating
                    </div>
                    <div className="mt-2 font-bold text-white text-lg mono-font">
                      {team.squad_rating_total}
                    </div>
                  </div>
                </div>

                <form action={adjustPurseAction} className="mt-6 grid gap-4 border-t border-white/10 pt-6">
                  <input type="hidden" name="teamId" value={team.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                      Purse total
                      <input
                        name="purseTotal"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={team.purse_total}
                        className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-mono"
                      />
                    </label>
                    <label className="grid gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                      Purse spent
                      <input
                        name="purseSpent"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={team.purse_spent}
                        className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-mono"
                      />
                    </label>
                  </div>
                  <SubmitButton
                    pendingLabel="Saving..."
                    className="glass-button-primary px-6 py-3.5 text-[13px] font-bold uppercase tracking-wider"
                  >
                    Save override
                  </SubmitButton>
                </form>

                <div className="mt-6 grid gap-4 border-t border-white/10 pt-6 flex-1">
                  <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                      Captain login
                    </div>
                    <div className="mt-2 text-[13px] font-medium text-white/80 font-mono break-all">
                      {team.credentials?.login_email ?? "Not provisioned"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                      Captain password
                    </div>
                    <div className="mt-2 text-[13px] font-medium text-white/80 font-mono break-all">
                      {team.credentials?.login_password ?? "Not provisioned"}
                    </div>
                  </div>
                </div>

                <form action={resetTeamAction} className="mt-6 border-t border-white/10 pt-6">
                  <input type="hidden" name="teamId" value={team.id} />
                  <SubmitButton
                    pendingLabel="Resetting..."
                    disabled={resetLocked}
                    className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 px-6 py-3.5 text-[13px] font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {resetLocked
                      ? "Current leading bidder cannot be reset"
                      : "Emergency reset team squad"}
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
