"use client";

import { resetAuctionAction } from "@/app/actions/auction";
import { SubmitButton } from "@/components/forms/submit-button";

export function ResetWholeAuctionPanel() {
  return (
    <form
      action={resetAuctionAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Reset the whole auction? This clears all bids, resets all players to pool, and resets team spend."
          )
        ) {
          event.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300/75">
        Danger zone
      </p>
      <SubmitButton
        pendingLabel="Resetting..."
        className="w-full h-10 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 text-[12px] font-bold uppercase tracking-wider text-rose-200 hover:bg-rose-500/20 hover:text-rose-100 transition"
      >
        Reset Whole Auction
      </SubmitButton>
    </form>
  );
}
