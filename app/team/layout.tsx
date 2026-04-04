import { signOutAction } from "@/app/actions/auth";
import { RealtimeRefresh } from "@/components/auction/realtime-refresh";
import { AppShell } from "@/components/layout/app-shell";
import { StatusBanner } from "@/components/layout/status-banner";
import { TeamLayoutSlideGate } from "@/components/slides/team-layout-slide-gate";
import { getTeamForCurrentUser, requireRole } from "@/lib/auth";
import { getActiveSlide } from "@/lib/auction-data";
import { hasSupabaseEnv, SUPABASE_ENV_HINT } from "@/lib/supabase/env";
import { formatPurse } from "@/lib/utils";
import { IPL_TEAMS } from "@/types/app.types";

const navItems = [
  {
    href: "/team/auction",
    label: "Live Auction",
    shortLabel: "Bid",
    caption: "Watch the block, current bid, and the team bid button.",
  },
  {
    href: "/team/squad",
    label: "My Squad",
    shortLabel: "Squad",
    caption: "Track purse, roster balance, and purchased players.",
  },
] as const;

export default async function TeamLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole("team");
  const linkedTeam =
    session.status === "authenticated" ? await getTeamForCurrentUser() : null;
  const activeSlide = hasSupabaseEnv() ? await getActiveSlide() : null;
  const previewTeam = IPL_TEAMS[0];

  const teamName = linkedTeam?.name ?? previewTeam.name;
  const teamCode = linkedTeam?.short_code ?? previewTeam.short_code;
  const purseTotal = linkedTeam?.purse_total ?? previewTeam.purse_total;
  const purseSpent = linkedTeam?.purse_spent ?? 0;

  let banner: React.ReactNode = null;

  if (session.status === "missing_env") {
    banner = (
      <StatusBanner
        title="Preview captain console"
        description={`${SUPABASE_ENV_HINT} Until then, this route doubles as a realistic shell for the team-facing experience.`}
        tone="amber"
      />
    );
  } else if (session.status === "authenticated" && !linkedTeam) {
    banner = (
      <StatusBanner
        title="Team row not linked yet"
        description="Authentication succeeded, but this user is not yet connected to a record in the `teams` table. Once linked, purse and squad data can become fully personalized."
        tone="blue"
      />
    );
  }

  return (
    <AppShell
      badge="Team Console"
      title={`${teamCode} match room`}
      description="Follow live nominations, decide when to bid, and keep one eye on the squad build and purse pressure."
      navItems={[...navItems]}
      stats={[
        { label: "Team", value: teamName },
        { label: "Purse left", value: formatPurse(purseTotal, purseSpent) },
        { label: "Auction mode", value: "Live-ready" },
      ]}
      userLabel={
        session.status === "authenticated"
          ? linkedTeam?.name ?? session.user.email ?? "Team captain"
          : `${previewTeam.name} preview`
      }
      banner={banner}
      actions={
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/10 hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      }
    >
      <TeamLayoutSlideGate slide={activeSlide} />
      <RealtimeRefresh />
      {children}
    </AppShell>
  );
}
