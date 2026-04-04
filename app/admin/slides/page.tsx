import { Trash2 } from "lucide-react";

import {
  activateSlideAction,
  createSlideAction,
  deactivateSlidesAction,
  deleteSlideAction,
  updateSlideOrderAction,
} from "@/app/actions/slides";
import { SubmitButton } from "@/components/forms/submit-button";
import { MetricCard } from "@/components/layout/metric-card";
import { SectionCard } from "@/components/layout/section-card";
import { getSlidesPageData } from "@/lib/auction-data";
import { hasSupabaseEnv, SUPABASE_ENV_HINT } from "@/lib/supabase/env";

export default async function AdminSlidesPage() {
  if (!hasSupabaseEnv()) {
    return (
      <>
        <div className="grid gap-4 xl:grid-cols-3">
          <MetricCard
            label="Feature status"
            value="Preview"
            hint="The slide manager is implemented, but it needs Supabase env vars before it can persist and broadcast."
            iconName="image-icon"
          />
          <MetricCard
            label="Broadcast target"
            value="All teams"
            hint="Once env is configured, slide activation will overlay team consoles in realtime."
            iconName="monitor-up"
          />
          <MetricCard
            label="Live slide"
            value="Unavailable"
            hint="Preview mode keeps the admin route stable even before the backend is configured."
            iconName="radio"
          />
        </div>

        <SectionCard
          title="Slide manager preview"
          description={SUPABASE_ENV_HINT}
        >
          <div className="rounded-lg border border-white/10 bg-white/4 p-6 text-sm leading-6 text-slate-300">
            Configure Supabase, then this page becomes the live announcement and
            intermission control panel for the auction.
          </div>
        </SectionCard>
      </>
    );
  }

  const { slides, activeSlide, summary } = await getSlidesPageData();

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-3">
        <MetricCard
          label="Slides queued"
          value={String(summary.total)}
          hint="Announcement, sponsor, and intermission slides can now be queued right from the admin room."
          iconName="image-icon"
        />
        <MetricCard
          label="Broadcast target"
          value="All teams"
          hint="Activating a slide overlays every connected team console through the existing realtime refresh loop."
          iconName="monitor-up"
        />
        <MetricCard
          label="Live slide"
          value={activeSlide ? "On air" : "Idle"}
          hint="Only one slide stays active at a time, so announcements remain crisp and easy to control."
          iconName="radio"
        />
      </div>

      <SectionCard
        title="Create slide"
        description="Add a title and optional image URL to prepare announcements, sponsor cards, or intermission visuals."
      >
        <form action={createSlideAction} className="glass-panel grid gap-4 lg:grid-cols-[1.1fr_1fr_140px_auto] lg:items-end rounded-xl border border-white/5 bg-black/20 p-6">
          <label className="grid gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
            Title
            <input
              name="title"
              type="text"
              required
              placeholder="Lunch break begins in 5 minutes"
              className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-white/30 transition-all font-medium"
            />
          </label>
          <label className="grid gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
            Image URL
            <input
              name="imageUrl"
              type="url"
              placeholder="https://..."
              className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 placeholder:text-white/30 transition-all font-medium"
            />
          </label>
          <label className="grid gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
            Order
            <input
              name="orderIndex"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[14px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all"
            />
          </label>
          <SubmitButton
            pendingLabel="Saving..."
            className="glass-button-primary px-6 py-3.5 text-[13px] font-bold uppercase tracking-wider w-full lg:w-auto"
          >
            Add slide
          </SubmitButton>
        </form>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Broadcast preview"
          description="This is the currently active fullscreen message team captains will see over their console."
          action={
            activeSlide ? (
              <form action={deactivateSlidesAction}>
                <SubmitButton
                  pendingLabel="Clearing..."
                  className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 hover:border-rose-400/40 hover:bg-rose-500/15"
                >
                  Clear broadcast
                </SubmitButton>
              </form>
            ) : null
          }
        >
          {activeSlide ? (
            <div className="glass-panel grid gap-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500/50" />
              <div className="inline-flex w-fit rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                <span className="relative flex size-2 mr-2 self-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                </span>
                Currently live
              </div>
              <div>
                <div className="display-font text-5xl text-white tracking-tight">{activeSlide.title}</div>
                <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-emerald-300/70">
                  Order {activeSlide.order_index} • Updated{" "}
                  {new Date(activeSlide.updated_at).toLocaleString("en-IN")}
                </div>
              </div>
              {activeSlide.image_url ? (
                <div
                  aria-label={activeSlide.title ?? "Active slide"}
                  role="img"
                  className="min-h-[320px] rounded-xl border border-white/10 bg-cover bg-center shadow-2xl"
                  style={{ backgroundImage: `url(${activeSlide.image_url})` }}
                />
              ) : (
                <div className="glass-panel items-center justify-center min-h-[220px] rounded-xl border border-dashed border-white/10 flex p-6 text-center text-[15px] leading-relaxed text-white/50">
                  This slide is title-only right now. Add an image URL for a richer
                  fullscreen broadcast.
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel items-center justify-center min-h-[320px] rounded-xl border border-dashed border-white/10 flex p-8 text-center bg-black/20">
              <div className="max-w-md space-y-3">
                <h2 className="text-xl font-bold tracking-tight text-white mb-2">No live slide</h2>
                <p className="text-[15px] leading-relaxed text-white/50">
                  Activate any queued slide to push a fullscreen announcement to all
                  team consoles.
                </p>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Queue manager"
          description="Reorder, activate, and remove slides without leaving the control room."
        >
          <div className="space-y-4">
            {slides.length === 0 ? (
              <div className="glass-panel items-center justify-center min-h-[120px] rounded-xl border border-dashed border-white/10 flex px-4 text-[14px] text-[var(--text-soft)]">
                No slides queued yet. Create your first announcement above.
              </div>
            ) : (
              slides.map((slide) => (
                <article
                  key={slide.id}
                  className="glass-panel flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-white/5 bg-black/20 p-5 hover:bg-black/40 transition-colors"
                >
                  <div className="space-y-3 lg:flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-md border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                          slide.is_active
                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                            : "border-white/10 bg-black/40 text-[var(--text-soft)]"
                        }`}
                      >
                        {slide.is_active ? "Live" : "Queued"}
                      </span>
                      <span className="rounded-md border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
                        Order {slide.order_index}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-white mb-2">{slide.title}</h3>
                      <p className="text-[12px] font-medium text-[var(--text-soft)]">
                        {slide.image_url || "No image URL"} • Updated{" "}
                        {new Date(slide.updated_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:w-[280px] shrink-0">
                    <form
                      action={updateSlideOrderAction}
                      className="grid grid-cols-[1fr_auto] gap-2"
                    >
                      <input type="hidden" name="slideId" value={slide.id} />
                      <input
                        name="orderIndex"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={slide.order_index}
                        className="rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-[14px] font-mono text-white outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/50 transition-all text-center w-full min-w-0"
                      />
                      <SubmitButton
                        pendingLabel="Saving..."
                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-white hover:bg-white/20 transition-all"
                      >
                        Save
                      </SubmitButton>
                    </form>

                    <div className="grid grid-cols-2 gap-2">
                      <form action={activateSlideAction}>
                        <input type="hidden" name="slideId" value={slide.id} />
                        <SubmitButton
                          pendingLabel="Going live..."
                          className="glass-button-primary w-full px-2 py-3 text-[11px] font-bold uppercase tracking-wider shadow-none"
                        >
                          {slide.is_active ? "Refresh live" : "Go live"}
                        </SubmitButton>
                      </form>

                      <form action={deleteSlideAction}>
                        <input type="hidden" name="slideId" value={slide.id} />
                        <SubmitButton
                          pendingLabel="Deleting..."
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-3 text-[11px] font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
