import {
  createPlayerAction,
  deletePlayerAction,
  importBundledPlayersAction,
  importUploadedPlayersAction,
  updatePlayerAction,
} from "@/app/actions/players";
import { OverseasBadge } from "@/components/auction/overseas-badge";
import { TeamLogo } from "@/components/auction/team-logo";
import { SubmitButton } from "@/components/forms/submit-button";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { getPlayersPageData } from "@/lib/auction-data";
import { getBundledPlayerCsvName } from "@/lib/player-csv";
import { formatPrice, getRoleBadgeColor, getStatusColor, isLegendaryRating } from "@/lib/utils";
import type { PlayerRole } from "@/types/app.types";

export const dynamic = "force-dynamic";

const roleOrder: PlayerRole[] = [
  "Batsman",
  "Bowler",
  "All-Rounder",
  "Wicket-Keeper",
];

export default async function AdminPlayersPage() {
  const [{ players, summary, teamSummary }, bundledCsvName] = await Promise.all([
    getPlayersPageData(),
    getBundledPlayerCsvName(),
  ]);
  const bundledCsvExists = bundledCsvName !== null;

  const teamById = new Map(teamSummary.map((team) => [team.id, team]));
  const roleSummary = roleOrder.map((role) => ({
    role,
    count: players.filter((player) => player.role === role).length,
  }));

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-4">
        <MetricCard label="Total" value={String(summary.total)} iconName="database" />
        <MetricCard label="Pool" value={String(summary.pool)} iconName="filter" />
        <MetricCard label="Sold" value={String(summary.sold)} iconName="trophy" />
        <MetricCard label="Unsold" value={String(summary.unsold)} iconName="file-up" />
      </div>

      <SectionCard
        title="Player workstation"
        description="Add one player manually or import a batch from the auction sheet."
      >
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <form
            action={createPlayerAction}
            className="glass-panel grid gap-4 rounded-xl border border-white/5 bg-black/20 p-6"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gold)]">
              Add player
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <input
                name="name"
                type="text"
                required
                placeholder="Player name"
                className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-white/30 transition-all"
              />
              <select
                name="role"
                defaultValue="Batsman"
                className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-medium"
              >
                {roleOrder.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <select
                name="nationality"
                defaultValue="Indian"
                className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-medium"
              >
                <option value="Indian">Indian</option>
                <option value="Overseas">Overseas</option>
              </select>
              <input
                name="basePrice"
                type="number"
                min="1"
                step="1"
                required
                placeholder="Base price (Lakhs)"
                className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-white/30 transition-all"
              />
              <input
                name="rating"
                type="number"
                min="1"
                max="100"
                step="1"
                required
                placeholder="Rating"
                className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-white/30 transition-all"
              />
              <input
                name="iplCaps"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                placeholder="IPL caps"
                className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-white/30 transition-all"
              />
              <input
                name="battingStyle"
                type="text"
                placeholder="Batting style"
                className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-white/30 transition-all"
              />
              <input
                name="bowlingStyle"
                type="text"
                placeholder="Bowling style"
                className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-white/30 transition-all"
              />
            </div>
            <input
              name="photoUrl"
              type="url"
              placeholder="Photo URL (optional)"
              className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-white/30 transition-all"
            />
            <SubmitButton
              pendingLabel="Saving..."
              className="glass-button-primary mt-2 px-6 py-3.5 text-[14px] font-bold uppercase tracking-wider w-full lg:w-auto self-start"
            >
              Create player
            </SubmitButton>
          </form>

          <div className="grid gap-4">
            <form
              action={importUploadedPlayersAction}
              className="glass-panel grid gap-4 rounded-xl border border-white/5 bg-black/20 p-6"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gold)]">
                Upload CSV
              </div>
              <input
                name="csvFile"
                type="file"
                accept=".csv,text/csv"
                required
                className="rounded-xl border border-dashed border-white/20 bg-black/30 px-3 py-2.5 text-[14px] text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-white file:cursor-pointer hover:border-[var(--gold)]/50 transition-colors w-full"
              />
              <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                <span className="rounded-md border border-white/10 bg-black/40 px-3 py-1.5">
                  Columns: Player&apos;s Name, Category, Rating
                </span>
                <span className="rounded-md border border-white/10 bg-black/40 px-3 py-1.5">
                  Duplicate names are skipped
                </span>
              </div>
              <SubmitButton
                pendingLabel="Uploading..."
                className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-[14px] font-bold uppercase tracking-wider text-white hover:bg-white/20 transition-all w-full lg:w-auto self-start mt-2"
              >
                Import uploaded CSV
              </SubmitButton>
            </form>

            <div className="glass-panel rounded-xl border border-white/5 bg-black/20 p-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--gold)]">
                Bundled source
              </div>
              <div className="mt-2 text-xl font-bold tracking-tight text-white mono-font">
                {bundledCsvName ?? "No bundled CSV found"}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {roleSummary.map((item) => (
                  <span
                    key={item.role}
                    className="rounded-md border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-300"
                  >
                    <span className="uppercase text-[var(--text-soft)] mr-1">{item.role}</span> {item.count}
                  </span>
                ))}
              </div>
            </div>

            {bundledCsvExists ? (
              <form action={importBundledPlayersAction}>
                <SubmitButton
                  pendingLabel="Syncing..."
                  className="w-full rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-6 py-3.5 text-[14px] font-bold uppercase tracking-wider text-[var(--gold)] hover:bg-[var(--gold)]/20 transition-all"
                >
                  Sync bundled CSV
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Player database"
        description="Inspect every player, open inline edit controls, and remove unused pool entries."
      >
        <div className="space-y-3">
          {players.length === 0 ? (
            <div className="glass-panel flex items-center justify-center min-h-[200px] rounded-xl border border-dashed border-white/10 px-4 text-sm text-[var(--text-soft)]">
              Upload a CSV or sync the bundled file to populate the pool.
            </div>
          ) : (
            players.map((player) => {
              const soldTeam = player.sold_to ? teamById.get(player.sold_to) : null;
              const canDelete = player.status !== "sold" && player.status !== "active";
              const isLegendary = isLegendaryRating(player.rating);

              return (
                <details
                  key={player.id}
                  className="glass-panel rounded-xl border border-white/5 bg-black/20 group overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between hover:bg-white/[0.04] transition-colors focus:outline-none focus:bg-white/[0.06]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={isLegendary ? "font-bold text-lg tracking-tight legendary-name" : "font-bold text-white text-lg tracking-tight"}>{player.name}</span>
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(player.role)}`}
                        >
                          {player.role}
                        </span>
                        <OverseasBadge nationality={player.nationality} />
                        {isLegendary ? (
                          <span className="legendary-pill inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                            Legendary
                          </span>
                        ) : null}
                        <span
                          className={`inline-flex rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(player.status)}`}
                        >
                          {player.status}
                        </span>
                      </div>
                      <div className="mt-2.5 text-[13px] font-medium text-[var(--text-soft)] flex flex-wrap items-center gap-2">
                        <span className={isLegendary ? "legendary-rating" : "text-[var(--gold)]/80"}>Rating {player.rating}</span>
                        <span>•</span>
                        <span className="text-white/60 text-[11px] uppercase tracking-wider">Base</span>
                        <span className="mono-font text-white">{formatPrice(player.base_price)}</span>
                        <span>•</span>
                        <span className="text-white/60 text-[11px] uppercase tracking-wider">Caps</span>
                        <span className="text-white">{player.ipl_caps}</span>
                        <span>•</span>
                        {soldTeam ? (
                          <span className="inline-flex items-center gap-1.5">
                            <TeamLogo shortCode={soldTeam.short_code} size={18} />
                            <span className="text-[var(--blue-soft)] font-bold">{soldTeam.short_code}</span>
                          </span>
                        ) : (
                          <span className="text-[var(--blue-soft)] font-bold">-</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/40 group-open:text-[var(--gold)] transition-colors border border-white/10 rounded-md px-3 py-1.5 bg-black/40 text-center">
                      Edit details
                    </div>
                  </summary>

                  <div className="border-t border-white/10 px-6 py-6 bg-black/40">
                    <form action={updatePlayerAction} className="grid gap-4">
                      <input type="hidden" name="playerId" value={player.id} />
                      <div className="grid gap-4 lg:grid-cols-2">
                        <input
                          name="name"
                          type="text"
                          required
                          defaultValue={player.name}
                          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-medium"
                        />
                        <select
                          name="role"
                          defaultValue={player.role}
                          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-medium"
                        >
                          {roleOrder.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <select
                          name="nationality"
                          defaultValue={player.nationality}
                          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-medium"
                        >
                          <option value="Indian">Indian</option>
                          <option value="Overseas">Overseas</option>
                        </select>
                        <input
                          name="basePrice"
                          type="number"
                          min="1"
                          step="1"
                          required
                          defaultValue={player.base_price}
                          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-mono"
                        />
                        <input
                          name="rating"
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          required
                          defaultValue={player.rating}
                          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-mono"
                        />
                        <input
                          name="iplCaps"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={player.ipl_caps}
                          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all font-mono"
                        />
                        <input
                          name="battingStyle"
                          type="text"
                          defaultValue={player.batting_style ?? ""}
                          placeholder="Batting style"
                          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-slate-500 transition-all"
                        />
                        <input
                          name="bowlingStyle"
                          type="text"
                          defaultValue={player.bowling_style ?? ""}
                          placeholder="Bowling style"
                          className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-slate-500 transition-all"
                        />
                      </div>
                      <input
                        name="photoUrl"
                        type="url"
                        defaultValue={player.photo_url ?? ""}
                        placeholder="Photo URL"
                        className="rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-slate-500 transition-all"
                      />
                      <div className="flex flex-wrap gap-4 mt-2">
                        <SubmitButton
                          pendingLabel="Saving..."
                          className="glass-button-primary px-8 py-3.5 text-[13px] font-bold uppercase tracking-wider"
                        >
                          Save changes
                        </SubmitButton>
                        <form action={deletePlayerAction} className="inline-block">
                          <input type="hidden" name="playerId" value={player.id} />
                          <SubmitButton
                            pendingLabel="Deleting..."
                            disabled={!canDelete}
                            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-8 py-3.5 text-[13px] font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {canDelete
                              ? "Delete player"
                              : "Sold or active players cannot be deleted"}
                          </SubmitButton>
                        </form>
                      </div>
                    </form>
                  </div>
                </details>
              );
            })
          )}
        </div>
      </SectionCard>
    </>
  );
}
