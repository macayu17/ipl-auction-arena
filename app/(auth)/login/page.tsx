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
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <section className="surface-panel overflow-hidden p-6 lg:p-8">
        <div className="grid-overlay rounded-[28px] border border-white/8 bg-black/15 p-6 lg:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">
            <ShieldCheck className="size-3.5" />
            Real-time College Fest Control Room
          </div>

          <div className="mt-6 space-y-4">
            <p className="display-font text-6xl leading-none text-white sm:text-7xl lg:text-8xl">
              SOLD
            </p>
            <h1 className="max-w-2xl text-3xl font-semibold text-white lg:text-5xl">
              Build the auction room before the hammer drops.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-200 lg:text-base">
              This project is shaping up into a full mock IPL auction platform with
              admin orchestration, captain bidding, and live purse updates across
              every screen.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {highlights.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-[24px] border border-white/8 bg-white/5 p-5"
              >
                <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 text-[var(--gold-soft)]">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-panel p-6 lg:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--gold-soft)]">
          Secure Sign In
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Join the auction</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Use the pre-generated admin or team credentials. Once signed in, you will
          be routed to the correct control room automatically.
        </p>

        {!configured ? (
          <div className="mt-6">
            <StatusBanner
              title="Supabase setup still needed"
              description={SUPABASE_ENV_HINT}
              tone="amber"
            >
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-xs text-slate-200">
                <code>NEXT_PUBLIC_SUPABASE_URL</code>
                <br />
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                <br />
                <code>SUPABASE_SERVICE_ROLE_KEY</code> for privileged actions later
              </div>
            </StatusBanner>
          </div>
        ) : null}

        <div className="mt-8">
          <LoginForm configured={configured} />
        </div>

        <div className="mt-8 grid gap-3 rounded-[24px] border border-white/8 bg-white/4 p-5 text-sm text-slate-300">
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
      </section>
    </div>
  );
}
