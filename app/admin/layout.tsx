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
    caption: "Run bidding, timers, and player sales.",
  },
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    caption: "Monitor purse health and recent transactions.",
  },
  {
    href: "/admin/players",
    label: "Players",
    caption: "Build the pool and manage imports.",
  },
  {
    href: "/admin/teams",
    label: "Teams",
    caption: "Track captains, purse, and credentials.",
  },
  {
    href: "/admin/slides",
    label: "Slides",
    caption: "Queue pre-auction announcements and overlays.",
  },
] as const;

const stats = [
  { label: "Default phase", value: "Setup" },
  { label: "Realtime target", value: "<100 ms" },
  { label: "Connected roles", value: "1 admin + 10 teams" },
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
      description="Coordinate nominations, accept bids, monitor purses, and push the entire auction forward from one command center."
      navItems={[...navItems]}
      stats={[...stats]}
      userLabel={userLabel}
      banner={banner}
      actions={
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
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
