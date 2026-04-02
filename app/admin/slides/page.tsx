import { ImageIcon, MonitorUp, Radio, Trash2 } from "lucide-react";

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
            icon={ImageIcon}
          />
          <MetricCard
            label="Broadcast target"
            value="All teams"
            hint="Once env is configured, slide activation will overlay team consoles in realtime."
            icon={MonitorUp}
          />
          <MetricCard
            label="Live slide"
            value="Unavailable"
            hint="Preview mode keeps the admin route stable even before the backend is configured."
            icon={Radio}
          />
        </div>

        <SectionCard
          title="Slide manager preview"
          description={SUPABASE_ENV_HINT}
        >
          <div className="rounded-[24px] border border-white/8 bg-white/4 p-6 text-sm leading-6 text-slate-300">
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
          icon={ImageIcon}
        />
        <MetricCard
          label="Broadcast target"
          value="All teams"
          hint="Activating a slide overlays every connected team console through the existing realtime refresh loop."
          icon={MonitorUp}
        />
        <MetricCard
          label="Live slide"
          value={activeSlide ? "On air" : "Idle"}
          hint="Only one slide stays active at a time, so announcements remain crisp and easy to control."
          icon={Radio}
        />
      </div>

      <SectionCard
        title="Create slide"
        description="Add a title and optional image URL to prepare announcements, sponsor cards, or intermission visuals."
      >
        <form action={createSlideAction} className="grid gap-4 lg:grid-cols-[1.1fr_1fr_140px_auto] lg:items-end">
          <label className="grid gap-2 text-sm text-slate-300">
            Title
            <input
              name="title"
              type="text"
              required
              placeholder="Lunch break begins in 5 minutes"
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Image URL
            <input
              name="imageUrl"
              type="url"
              placeholder="https://..."
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Order
            <input
              name="orderIndex"
              type="number"
              min="0"
              step="1"
              defaultValue="0"
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <SubmitButton
            pendingLabel="Saving..."
            className="rounded-2xl border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.12)] px-5 py-3 text-sm font-semibold text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(240,165,0,0.18)]"
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
                  className="rounded-full border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 hover:border-rose-400/40 hover:bg-rose-500/15"
                >
                  Clear broadcast
                </SubmitButton>
              </form>
            ) : null
          }
        >
          {activeSlide ? (
            <div className="grid gap-5 rounded-[24px] border border-[var(--gold)]/20 bg-white/4 p-5">
              <div className="inline-flex w-fit rounded-full border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.1)] px-3 py-1 text-xs uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                Currently live
              </div>
              <div>
                <div className="display-font text-4xl text-white">{activeSlide.title}</div>
                <div className="mt-3 text-sm text-slate-300">
                  Order {activeSlide.order_index}. Updated{" "}
                  {new Date(activeSlide.updated_at).toLocaleString("en-IN")}.
                </div>
              </div>
              {activeSlide.image_url ? (
                <div
                  aria-label={activeSlide.title ?? "Active slide"}
                  role="img"
                  className="min-h-[320px] rounded-[22px] border border-white/10 bg-cover bg-center"
                  style={{ backgroundImage: `url(${activeSlide.image_url})` }}
                />
              ) : (
                <div className="grid min-h-[220px] place-items-center rounded-[22px] border border-dashed border-white/12 bg-slate-950/25 p-6 text-center text-sm leading-6 text-slate-300">
                  This slide is title-only right now. Add an image URL for a richer
                  fullscreen broadcast.
                </div>
              )}
            </div>
          ) : (
            <div className="grid min-h-[320px] place-items-center rounded-[24px] border border-dashed border-white/15 bg-white/4 p-8 text-center">
              <div className="max-w-md space-y-3">
                <h2 className="text-2xl font-semibold text-white">No live slide</h2>
                <p className="text-sm leading-6 text-slate-300">
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
          <div className="space-y-3">
            {slides.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-slate-300">
                No slides queued yet. Create your first announcement above.
              </div>
            ) : (
              slides.map((slide) => (
                <article
                  key={slide.id}
                  className="rounded-[22px] border border-white/8 bg-white/4 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                            slide.is_active
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                              : "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          {slide.is_active ? "Live" : "Queued"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                          Order {slide.order_index}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white">{slide.title}</h3>
                      <p className="text-xs text-slate-500">
                        {slide.image_url || "No image URL"} • Updated{" "}
                        {new Date(slide.updated_at).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="grid gap-3 lg:min-w-[250px]">
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
                          className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none"
                        />
                        <SubmitButton
                          pendingLabel="Saving..."
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:border-white/20 hover:bg-white/10"
                        >
                          Save
                        </SubmitButton>
                      </form>

                      <div className="grid grid-cols-2 gap-2">
                        <form action={activateSlideAction}>
                          <input type="hidden" name="slideId" value={slide.id} />
                          <SubmitButton
                            pendingLabel="Going live..."
                            className="w-full rounded-2xl border border-[var(--gold)]/30 bg-[rgba(240,165,0,0.12)] px-4 py-3 text-sm font-medium text-[var(--gold-soft)] hover:border-[var(--gold)]/50 hover:bg-[rgba(240,165,0,0.18)]"
                          >
                            {slide.is_active ? "Refresh live" : "Go live"}
                          </SubmitButton>
                        </form>

                        <form action={deleteSlideAction}>
                          <input type="hidden" name="slideId" value={slide.id} />
                          <SubmitButton
                            pendingLabel="Deleting..."
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 hover:border-rose-400/35 hover:bg-rose-500/15"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </SubmitButton>
                        </form>
                      </div>
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
