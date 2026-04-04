import { Database, FileUp, Filter, Trophy } from "lucide-react";

import {
  createPlayerAction,
  deletePlayerAction,
  importBundledPlayersAction,
  importUploadedPlayersAction,
  updatePlayerAction,
} from "@/app/actions/players";
import { SubmitButton } from "@/components/forms/submit-button";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { getPlayersPageData } from "@/lib/auction-data";
import { hasBundledPlayerCsv } from "@/lib/player-csv";
import { formatPrice, getRoleBadgeColor, getStatusColor } from "@/lib/utils";
import type { PlayerRole } from "@/types/app.types";

const roleOrder: PlayerRole[] = [
  "Batsman",
  "Bowler",
  "All-Rounder",
  "Wicket-Keeper",
];

export default async function AdminPlayersPage() {
  const [{ players, summary, teamSummary }, bundledCsvExists] = await Promise.all([
    getPlayersPageData(),
    hasBundledPlayerCsv(),
  ]);

  const teamById = new Map(teamSummary.map((team) => [team.id, team]));
  const roleSummary = roleOrder.map((role) => ({
    role,
    count: players.filter((player) => player.role === role).length,
  }));

  return (
    <>
      <div className="grid gap-3 xl:grid-cols-4">
        <MetricCard label="Total" value={String(summary.total)} icon={Database} />
        <MetricCard label="Pool" value={String(summary.pool)} icon={Filter} />
        <MetricCard label="Sold" value={String(summary.sold)} icon={Trophy} />
        <MetricCard label="Unsold" value={String(summary.unsold)} icon={FileUp} />
      </div>

      <SectionCard
        title="Player workstation"
        description="Add one player manually or import a batch from the auction sheet."
      >
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <form
            action={createPlayerAction}
            className="command-grid grid gap-3 rounded-[20px] border border-white/8 bg-[rgba(19,19,24,0.72)] p-4"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Add player
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <input
                name="name"
                type="text"
                required
                placeholder="Player name"
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <select
                name="role"
                defaultValue="Batsman"
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
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
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
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
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                name="rating"
                type="number"
                min="1"
                max="100"
                step="1"
                required
                placeholder="Rating"
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                name="iplCaps"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                placeholder="IPL caps"
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                name="battingStyle"
                type="text"
                placeholder="Batting style"
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                name="bowlingStyle"
                type="text"
                placeholder="Bowling style"
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
            <input
              name="photoUrl"
              type="url"
              placeholder="Photo URL (optional)"
              className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
            <SubmitButton
              pendingLabel="Saving..."
              className="rounded-2xl border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.12)] px-4 py-3 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(240,165,0,0.18)]"
            >
              Create player
            </SubmitButton>
          </form>

          <div className="grid gap-4">
            <form
              action={importUploadedPlayersAction}
              className="command-grid grid gap-3 rounded-[20px] border border-white/8 bg-[rgba(19,19,24,0.72)] p-4"
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Upload CSV
              </div>
              <input
                name="csvFile"
                type="file"
                accept=".csv,text/csv"
                required
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(240,165,0,0.12)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--gold-soft)]"
              />
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Columns: Player&apos;s Name, Category, Rating
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Duplicate names are skipped
                </span>
              </div>
              <SubmitButton
                pendingLabel="Uploading..."
                className="rounded-2xl border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.12)] px-4 py-3 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(240,165,0,0.18)]"
              >
                Import uploaded CSV
              </SubmitButton>
            </form>

            <div className="screen-frame rounded-[20px] p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Bundled source
              </div>
              <div className="mt-1.5 text-lg font-semibold text-white">
                IPL AUCTION DATA SHEET.csv
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {roleSummary.map((item) => (
                  <span
                    key={item.role}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300"
                  >
                    {item.role} {item.count}
                  </span>
                ))}
              </div>
            </div>

            {bundledCsvExists ? (
              <form action={importBundledPlayersAction}>
                <SubmitButton
                  pendingLabel="Syncing..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
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
            <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-slate-300">
              Upload a CSV or sync the bundled file to populate the pool.
            </div>
          ) : (
            players.map((player) => {
              const soldTeam = player.sold_to ? teamById.get(player.sold_to) : null;
              const canDelete = player.status !== "sold" && player.status !== "active";

              return (
                <details
                  key={player.id}
                  className="rounded-[20px] border border-white/8 bg-[rgba(14,14,19,0.32)]"
                >
                  <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{player.name}</span>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(player.role)}`}
                        >
                          {player.role}
                        </span>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${getStatusColor(player.status)}`}
                        >
                          {player.status}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-[var(--text-soft)]">
                        {player.nationality} • Rating {player.rating} • Base{" "}
                        {formatPrice(player.base_price)} • Caps {player.ipl_caps} • Team{" "}
                        {soldTeam?.short_code ?? "-"}
                      </div>
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">
                      Edit player
                    </div>
                  </summary>

                  <div className="border-t border-white/8 px-4 py-4">
                    <form action={updatePlayerAction} className="grid gap-3">
                      <input type="hidden" name="playerId" value={player.id} />
                      <div className="grid gap-3 lg:grid-cols-2">
                        <input
                          name="name"
                          type="text"
                          required
                          defaultValue={player.name}
                          className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                        />
                        <select
                          name="role"
                          defaultValue={player.role}
                          className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
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
                          className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
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
                          className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                        />
                        <input
                          name="rating"
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          required
                          defaultValue={player.rating}
                          className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                        />
                        <input
                          name="iplCaps"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={player.ipl_caps}
                          className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                        />
                        <input
                          name="battingStyle"
                          type="text"
                          defaultValue={player.batting_style ?? ""}
                          placeholder="Batting style"
                          className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                        />
                        <input
                          name="bowlingStyle"
                          type="text"
                          defaultValue={player.bowling_style ?? ""}
                          placeholder="Bowling style"
                          className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                        />
                      </div>
                      <input
                        name="photoUrl"
                        type="url"
                        defaultValue={player.photo_url ?? ""}
                        placeholder="Photo URL"
                        className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                      />
                      <div className="flex flex-wrap gap-2">
                        <SubmitButton
                          pendingLabel="Saving..."
                          className="rounded-xl border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.12)] px-4 py-3 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(240,165,0,0.18)]"
                        >
                          Save player
                        </SubmitButton>
                      </div>
                    </form>

                    <form action={deletePlayerAction} className="mt-3">
                      <input type="hidden" name="playerId" value={player.id} />
                      <SubmitButton
                        pendingLabel="Deleting..."
                        disabled={!canDelete}
                        className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 hover:border-rose-400/35 hover:bg-rose-500/15"
                      >
                        {canDelete
                          ? "Delete player"
                          : "Sold or active players cannot be deleted"}
                      </SubmitButton>
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
