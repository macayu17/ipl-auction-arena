import { RadioTower, ShieldCheck, Trophy, Users } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { StatusBanner } from "@/components/layout/status-banner";
import { SUPABASE_ENV_HINT, hasSupabaseEnv } from "@/lib/supabase/env";

const highlights = [
  {
    icon: Trophy,
    title: "Auctioneer control",
    description:
      "Run nominations, bidding, player sales, and team purse tracking from one control room.",
  },
  {
    icon: RadioTower,
    title: "Realtime broadcast",
    description:
      "Keep the admin screen and all ten team consoles in lockstep through Supabase-powered sync.",
  },
  {
    icon: Users,
    title: "Role-based access",
    description:
      "Separate admin and captain flows so every screen shows the right controls for the right person.",
  },
];

export default function LoginPage() {
  const configured = hasSupabaseEnv();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,166,35,0.16),transparent_30%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(5,102,217,0.12),transparent_26%)]" />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-4 py-6 lg:px-8 lg:py-10">
        <div className="grid min-h-[calc(100vh-3rem)] gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="surface-panel overflow-hidden p-4 lg:p-6">
            <div className="grid-overlay flex h-full flex-col justify-between rounded-[22px] border border-white/8 bg-black/15 p-6 lg:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[rgba(245,166,35,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                  <ShieldCheck className="size-3.5" />
                  Live Auction Stack
                </div>

                <div className="mt-8 space-y-4">
                  <p className="display-font text-5xl leading-none text-[var(--gold-soft)] sm:text-6xl lg:text-7xl">
                    AUCTION
                    <br />
                    COMMAND
                  </p>
                  <h1 className="max-w-3xl text-3xl font-semibold text-white lg:text-5xl">
                    Step into the control room before the hammer drops.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-200 lg:text-base">
                    The platform already handles admin orchestration, captain bidding,
                    live purse tracking, and synchronized room state. This screen now
                    opens with the same command-center tone as the auction UI itself.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 xl:grid-cols-3">
                {highlights.map(({ icon: Icon, title, description }) => (
                  <article
                    key={title}
                    className="rounded-[20px] border border-white/8 bg-[rgba(19,19,24,0.72)] p-5"
                  >
                    <div className="inline-flex rounded-xl border border-white/10 bg-[rgba(245,166,35,0.08)] p-3 text-[var(--gold-soft)]">
                      <Icon className="size-5" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                      {description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="surface-panel flex items-center p-4 lg:p-6">
            <div className="mx-auto w-full max-w-xl rounded-[24px] border border-white/8 bg-[rgba(18,18,26,0.92)] p-6 lg:p-8">
              <div className="flex flex-col items-center text-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--gold)]/20 bg-[rgba(245,166,35,0.08)] text-[var(--gold)]">
                  <ShieldCheck className="size-7" />
                </div>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--gold-soft)]">
                  Secure Sign In
                </p>
                <h2 className="mt-3 display-font text-4xl text-white">Join The Room</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-soft)]">
                  Use the seeded admin or team credentials. Once authenticated, the
                  app routes you straight into the right console.
                </p>
              </div>

              {!configured ? (
                <div className="mt-6">
                  <StatusBanner
                    title="Supabase setup still needed"
                    description={SUPABASE_ENV_HINT}
                    tone="amber"
                  >
                    <div className="rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-xs text-slate-200">
                      <code>NEXT_PUBLIC_SUPABASE_URL</code>
                      <br />
                      <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                      <br />
                      <code>SUPABASE_SERVICE_ROLE_KEY</code>
                    </div>
                  </StatusBanner>
                </div>
              ) : null}

              <div className="mt-8">
                <LoginForm configured={configured} />
              </div>

              <div className="mt-8 grid gap-3 rounded-[20px] border border-white/8 bg-[rgba(31,31,37,0.72)] p-5 text-sm text-[var(--text-soft)]">
                <div className="flex items-center justify-between gap-4">
                  <span>Admin redirect</span>
                  <span className="mono-font text-[var(--gold-soft)]">/admin/auction</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Team redirect</span>
                  <span className="mono-font text-[var(--gold-soft)]">/team/auction</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Realtime stack</span>
                  <span className="mono-font text-[var(--gold-soft)]">Supabase + Next 16</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
