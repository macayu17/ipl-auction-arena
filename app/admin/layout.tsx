import { signOutAction } from "@/app/actions/auth";
import { RealtimeRefresh } from "@/components/auction/realtime-refresh";
import { AppShell } from "@/components/layout/app-shell";
import { StatusBanner } from "@/components/layout/status-banner";
import { requireRole } from "@/lib/auth";
import { SUPABASE_ENV_HINT } from "@/lib/supabase/env";

const navItems = [
  {
    href: "/admin/auction",
    label: "Auction",
    shortLabel: "Bid",
  },
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    shortLabel: "Dash",
  },
  {
    href: "/admin/players",
    label: "Players",
    shortLabel: "Pool",
  },
  {
    href: "/admin/teams",
    label: "Teams",
    shortLabel: "Teams",
  },
  {
    href: "/admin/slides",
    label: "Slides",
    shortLabel: "Slides",
  },
] as const;

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireRole("admin");
  const userLabel =
    session.status === "authenticated"
      ? session.user.email ?? "Auction admin"
      : "Preview mode";

  const banner =
    session.status === "missing_env" ? (
      <StatusBanner
        title="Preview shell active"
        description={`${SUPABASE_ENV_HINT} Until then, the admin routes render as a working shell so the project can keep moving.`}
        tone="amber"
      />
    ) : null;

  return (
    <AppShell
      badge="Auctioneer"
      title="Admin control room"
      description="Run the live room, manage players, and keep every team view in sync."
      navItems={[...navItems]}
      stats={[]}
      userLabel={userLabel}
      banner={banner}
      compactHeader
      actions={
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-white/10 hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      }
    >
      <RealtimeRefresh />
      {children}
    </AppShell>
  );
}
