import { Database, FileUp, Filter, Trophy } from "lucide-react";

import { importBundledPlayersAction } from "@/app/actions/players";
import { SubmitButton } from "@/components/forms/submit-button";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { getPlayersPageData } from "@/lib/auction-data";
import { hasBundledPlayerCsv, parseBundledPlayerCsv } from "@/lib/player-csv";
import {
  formatPrice,
  getRoleBadgeColor,
  getStatusColor,
} from "@/lib/utils";
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
  const bundledPlayers = bundledCsvExists ? await parseBundledPlayerCsv() : [];
  const teamById = new Map(teamSummary.map((team) => [team.id, team]));
  const roleSummary = roleOrder.map((role) => ({
    role,
    count: players.filter((player) => player.role === role).length,
  }));

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Total players"
          value={String(summary.total)}
          hint="The database now feeds the auction queue, teams, and dashboard from one shared player pool."
          icon={Database}
        />
        <MetricCard
          label="In pool"
          value={String(summary.pool)}
          hint="These players are ready to be nominated from the admin auction queue."
          icon={Filter}
        />
        <MetricCard
          label="Sold"
          value={String(summary.sold)}
          hint="Every successful hammer sale immediately moves a player into team squads and dashboard summaries."
          icon={Trophy}
        />
        <MetricCard
          label="Bundled CSV"
          value={bundledCsvExists ? `${bundledPlayers.length} rows` : "Missing"}
          hint="The bundled player sheet can be imported again at any time without duplicating existing names."
          icon={FileUp}
        />
      </div>

      <SectionCard
        title="Bundled player import"
        description="The repo CSV is now wired directly into the auction schema, so one click is enough to sync the player pool with Supabase."
        action={
          bundledCsvExists ? (
            <form action={importBundledPlayersAction}>
              <SubmitButton
                pendingLabel="Importing..."
                className="rounded-full border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.12)] px-4 py-2 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(240,165,0,0.18)]"
              >
                Import or sync CSV
              </SubmitButton>
            </form>
          ) : null
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-white/8 bg-white/4 p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Source file
            </div>
            <div className="mt-3 text-lg font-semibold text-white">
              IPL AUCTION DATA SHEET.csv
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Ratings, categories, nationality inference, and base price bands are
              normalized automatically during import. Existing player names are
              skipped, so reruns stay safe.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {roleSummary.map((item) => (
              <div
                key={item.role}
                className="rounded-[22px] border border-white/8 bg-slate-950/25 px-4 py-4"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {item.role}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Player database"
        description="This table is now the live source of truth for nominations, bid history, dashboards, and team squads."
      >
        <div className="mb-5 flex flex-wrap gap-2">
          {roleSummary.map((item) => (
            <span
              key={item.role}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300"
            >
              {item.role}: {item.count}
            </span>
          ))}
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/8">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-white/6 text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Nationality</th>
                  <th className="px-4 py-3">Base price</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">IPL caps</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Team</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-sm text-slate-300"
                    >
                      Import the bundled CSV to populate the auction pool.
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
                        className="border-t border-white/6 text-sm text-slate-200"
                      >
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">{player.name}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            Updated {new Date(player.updated_at).toLocaleString("en-IN")}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(player.role)}`}
                          >
                            {player.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">{player.nationality}</td>
                        <td className="px-4 py-4 mono-font text-[var(--gold-soft)]">
                          {formatPrice(player.base_price)}
                        </td>
                        <td className="px-4 py-4">{player.rating}</td>
                        <td className="px-4 py-4">{player.ipl_caps}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${getStatusColor(player.status)}`}
                          >
                            {player.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {soldTeam ? (
                            <span className="font-medium text-white">
                              {soldTeam.short_code}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
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
