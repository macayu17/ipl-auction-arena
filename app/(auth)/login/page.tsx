import { RadioTower, ShieldCheck, Trophy } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { StatusBanner } from "@/components/layout/status-banner";
import { SUPABASE_ENV_HINT, hasSupabaseEnv } from "@/lib/supabase/env";
import { IPL_LOGO_URL } from "@/lib/team-logos";

export default function LoginPage() {
  const configured = hasSupabaseEnv();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] flex items-center justify-center">
      {/* Premium ambient glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[var(--gold)]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-[var(--blue)]/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-[1200px] px-4 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 items-center mx-auto">
          {/* Left Side: Brand Narrative */}
          <section className="flex flex-col justify-center px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IPL_LOGO_URL} alt="IPL Logo" className="w-20 h-20 object-contain mb-6 drop-shadow-[0_0_20px_rgba(232,168,56,0.3)]" />
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wider text-white w-fit">
              <ShieldCheck className="w-4 h-4 text-[var(--gold)]" />
              LIVE AUCTION COMMAND
            </div>

            <h1 className="mt-8 display-font text-5xl lg:text-7xl font-bold tracking-tight text-white glow-text leading-[1.1]">
              The Control Room.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/60">
              Orchestrate the live room, manage finances, and sync all team consoles in milliseconds. The high-stakes environment demands a seamless command center.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 pr-8">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center text-[var(--gold)]">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Auctioneer Control</h3>
                <p className="text-sm text-white/50 leading-relaxed">Run nominations, bidding, and tracking from a single dashboard.</p>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center text-[var(--gold)]">
                  <RadioTower className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white">Realtime Broadcast</h3>
                <p className="text-sm text-white/50 leading-relaxed">Keep all ten team consoles in lockstep seamlessly via Supabase.</p>
              </div>
            </div>
          </section>

          {/* Right Side: Authentication */}
          <section className="flex justify-center lg:justify-end lg:pr-8 mt-12 lg:mt-0">
            <div className="w-full max-w-[440px] glass-panel-elevated rounded-2xl p-8 sm:p-10 relative overflow-hidden">
              {/* Subtle top edge highlight */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)]/30 to-transparent" />

              <div className="text-center mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={IPL_LOGO_URL} alt="IPL" className="w-14 h-14 object-contain mx-auto mb-4 drop-shadow-[0_0_15px_rgba(232,168,56,0.2)]" />
                <h2 className="display-font text-3xl font-bold text-white mb-2">Join The Room</h2>
                <p className="text-sm text-white/50">Enter credentials to securely authenticate.</p>
              </div>

              {!configured ? (
                <div className="mb-8">
                  <StatusBanner
                    title="Supabase setup required"
                    description={SUPABASE_ENV_HINT}
                    tone="amber"
                  >
                    <div className="rounded-lg border border-white/5 bg-black/40 p-3 text-xs text-slate-300 font-mono mt-3 space-y-1">
                      <div>NEXT_PUBLIC_SUPABASE_URL</div>
                      <div>NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
                      <div>SUPABASE_SERVICE_ROLE_KEY</div>
                    </div>
                  </StatusBanner>
                </div>
              ) : null}

              <LoginForm configured={configured} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
