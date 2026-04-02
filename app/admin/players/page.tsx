import { Database, FileUp, Filter, Trophy } from "lucide-react";

import {
  importBundledPlayersAction,
  importUploadedPlayersAction,
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
        <MetricCard
          label="Unsold"
          value={String(summary.unsold)}
          icon={FileUp}
        />
      </div>

      <SectionCard title="Import players">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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

          <div className="grid gap-3">
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

      <SectionCard title="Player database">
        <div className="overflow-hidden rounded-[20px] border border-white/8">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-[rgba(255,255,255,0.05)] text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Nationality</th>
                  <th className="px-4 py-3">Base</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Caps</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Team</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-slate-300"
                    >
                      Upload a CSV or sync the bundled file to populate the pool.
                    </td>
                  </tr>
                ) : (
                  players.map((player) => {
                    const soldTeam = player.sold_to
                      ? teamById.get(player.sold_to)
                      : null;

                    return (
                      <tr
                        key={player.id}
                        className="border-t border-white/6 bg-[rgba(14,14,19,0.32)] text-sm text-slate-200"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white">{player.name}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(player.role)}`}
                          >
                            {player.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">{player.nationality}</td>
                        <td className="px-4 py-3.5 mono-font text-[var(--gold-soft)]">
                          {formatPrice(player.base_price)}
                        </td>
                        <td className="px-4 py-3.5">{player.rating}</td>
                        <td className="px-4 py-3.5">{player.ipl_caps}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${getStatusColor(player.status)}`}
                          >
                            {player.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {soldTeam ? soldTeam.short_code : "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
