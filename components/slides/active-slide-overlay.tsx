"use client";

import type { Slide } from "@/types/app.types";

export function ActiveSlideOverlay({
  slide,
  audienceLabel,
}: {
  slide: Slide;
  audienceLabel: string;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-md" />

      {slide.image_url ? (
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(8,17,31,0.35), rgba(8,17,31,0.78)), url(${slide.image_url})`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(240,165,0,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(0,120,188,0.18),transparent_32%)]" />
      )}

      <div className="relative z-[101] flex min-h-screen items-center justify-center px-6 py-10">
        <div className="surface-panel grid w-full max-w-5xl gap-8 overflow-hidden border-white/10 bg-white/5 p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div className="space-y-5">
            <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-normal text-white font-medium">
              Live broadcast
            </div>
            <div className="space-y-4">
              <p className="display-font text-4xl leading-tight text-white lg:text-6xl">
                {slide.title ?? "Auction announcement"}
              </p>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 lg:text-base">
                The auctioneer has pushed a full-screen update to every {audienceLabel}
                . Return to the live bidding view once the slide is cleared from the
                admin control room.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs tracking-normal text-slate-400">
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                Slide order {slide.order_index}
              </span>
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                Broadcast active
              </span>
            </div>
          </div>

          <div className="grid min-h-[280px] place-items-center rounded-lg border border-white/10 bg-white/5 p-5">
            {slide.image_url ? (
              <div
                aria-label={slide.title ?? "Active slide"}
                role="img"
                className="min-h-[320px] w-full rounded-lg bg-cover bg-center"
                style={{ backgroundImage: `url(${slide.image_url})` }}
              />
            ) : (
              <div className="grid h-full w-full place-items-center rounded-lg border border-dashed border-white/10 bg-slate-950/25 p-8 text-center">
                <div className="space-y-3">
                  <div className="display-font text-3xl text-white font-medium">
                    Auction Intermission
                  </div>
                  <p className="text-sm leading-6 text-slate-300">
                    Add an image URL on the slide manager page to turn this into a
                    sponsor card, announcement graphic, or stage visual.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
