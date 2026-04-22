"use client";

import type { SoldNotification } from "@/components/auction/use-live-auction-sync";
import { formatPrice } from "@/lib/utils";

type SoldNotificationToastProps = {
  notification: SoldNotification;
};

export function SoldNotificationToast({ notification }: SoldNotificationToastProps) {
  return (
    <aside
      aria-live="polite"
      className="fixed right-3 top-20 z-[140] w-[min(92vw,360px)] rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 shadow-[0_12px_40px_rgba(16,185,129,0.25)] backdrop-blur-md"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200">
        Player Sold
      </p>
      <p className="mt-1 text-sm font-semibold text-white leading-snug">
        {notification.playerName} sold to {notification.teamName}
        {notification.teamCode ? ` (${notification.teamCode})` : ""}
      </p>
      <p className="mt-1 text-xs font-medium text-emerald-100/90">
        Amount: <span className="font-bold text-emerald-100">{formatPrice(notification.amount)}</span>
      </p>
    </aside>
  );
}
