"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import {
  nominatePlayerAction,
  reorderQueueAction,
} from "@/app/actions/auction";
import { OverseasBadge } from "@/components/auction/overseas-badge";
import { formatPrice, getRoleBadgeColor } from "@/lib/utils";
import type { Player } from "@/types/app.types";

type NominationQueueManagerProps = {
  queue: Player[];
  currentPlayerId: string | null;
};

const MOBILE_VISIBLE_COUNT = 3;

function reorderPlayers(players: Player[], fromId: string, toId: string) {
  const sourceIndex = players.findIndex((player) => player.id === fromId);
  const destinationIndex = players.findIndex((player) => player.id === toId);

  if (sourceIndex === -1 || destinationIndex === -1 || sourceIndex === destinationIndex) {
    return players;
  }

  const nextPlayers = [...players];
  const [moved] = nextPlayers.splice(sourceIndex, 1);

  nextPlayers.splice(destinationIndex, 0, moved);

  return nextPlayers;
}

export function NominationQueueManager({
  queue,
  currentPlayerId,
}: NominationQueueManagerProps) {
  const [orderedQueue, setOrderedQueue] = useState(queue);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const hiddenOrderInputRef = useRef<HTMLInputElement>(null);
  const reorderFormRef = useRef<HTMLFormElement>(null);
  const dragPlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    setOrderedQueue(queue);
  }, [queue]);

  const orderedIds = useMemo(
    () => orderedQueue.map((player) => player.id),
    [orderedQueue]
  );

  function submitQueue(nextQueue: Player[]) {
    setOrderedQueue(nextQueue);

    if (!hiddenOrderInputRef.current || !reorderFormRef.current) {
      return;
    }

    hiddenOrderInputRef.current.value = JSON.stringify(
      nextQueue.map((player) => player.id)
    );
    reorderFormRef.current.requestSubmit();
  }

  function movePlayer(playerId: string, direction: -1 | 1) {
    const currentIndex = orderedQueue.findIndex((player) => player.id === playerId);
    const nextIndex = currentIndex + direction;

    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= orderedQueue.length) {
      return;
    }

    const nextQueue = [...orderedQueue];
    const [moved] = nextQueue.splice(currentIndex, 1);

    nextQueue.splice(nextIndex, 0, moved);
    submitQueue(nextQueue);
  }

  const showMobileToggle = orderedQueue.length > MOBILE_VISIBLE_COUNT;

  return (
    <div className="space-y-2 lg:space-y-3">
      <form ref={reorderFormRef} action={reorderQueueAction} className="hidden">
        <input
          ref={hiddenOrderInputRef}
          name="orderedPlayerIds"
          defaultValue={JSON.stringify(orderedIds)}
          type="hidden"
        />
      </form>

      {orderedQueue.length === 0 ? (
        <div className="glass-panel items-center justify-center min-h-[80px] lg:min-h-[120px] rounded-xl border border-dashed border-white/10 flex px-4 text-xs lg:text-sm text-[var(--text-soft)]">
          No players waiting in the pool.
        </div>
      ) : (
        <>
          {orderedQueue.map((player, index) => {
            // On mobile, hide players beyond MOBILE_VISIBLE_COUNT unless expanded
            const mobileHidden = !mobileExpanded && index >= MOBILE_VISIBLE_COUNT;

            return (
              <div
                key={player.id}
                draggable
                onDragStart={() => {
                  dragPlayerIdRef.current = player.id;
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();

                  if (!dragPlayerIdRef.current || dragPlayerIdRef.current === player.id) {
                    return;
                  }

                  submitQueue(reorderPlayers(orderedQueue, dragPlayerIdRef.current, player.id));
                  dragPlayerIdRef.current = null;
                }}
                onDragEnd={() => {
                  dragPlayerIdRef.current = null;
                }}
                className={`glass-panel rounded-xl px-3 py-2.5 lg:px-4 lg:py-3.5 cursor-grab active:cursor-grabbing hover:bg-white/[0.04] transition-colors border border-white/5 bg-black/20 ${mobileHidden ? "hidden lg:block" : ""}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full h-full">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 lg:gap-2.5 min-w-0">
                      <span className="inline-flex items-center gap-1.5 lg:gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-wider text-[var(--text-soft)]">
                        <GripVertical className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-bold text-white text-sm lg:text-lg tracking-tight truncate min-w-0">{player.name}</span>
                      <span
                        className={`inline-flex rounded-md px-1.5 lg:px-2 py-0.5 text-[9px] lg:text-[10px] uppercase font-bold tracking-wider shrink-0 ${getRoleBadgeColor(player.role)}`}
                      >
                        {player.role}
                      </span>
                      <OverseasBadge nationality={player.nationality} />
                    </div>
                    <div className="mt-1 lg:mt-1.5 text-[11px] lg:text-[13px] font-medium text-[var(--text-soft)] whitespace-nowrap overflow-hidden text-ellipsis">
                      <span className="text-[var(--gold)]/80">Rating {player.rating}</span> • <span className="mono-font text-white">{formatPrice(player.base_price)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 lg:gap-1.5 shrink-0">
                    <div className="flex items-center gap-0.5 lg:gap-1 bg-black/40 p-0.5 lg:p-1 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => movePlayer(player.id, -1)}
                        disabled={index === 0}
                        className="inline-flex rounded-md p-1 lg:p-1.5 text-white/50 transition hover:text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Move ${player.name} up`}
                      >
                        <ArrowUp className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePlayer(player.id, 1)}
                        disabled={index === orderedQueue.length - 1}
                        className="inline-flex rounded-md p-1 lg:p-1.5 text-white/50 transition hover:text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Move ${player.name} down`}
                      >
                        <ArrowDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      </button>
                    </div>

                    <form action={nominatePlayerAction}>
                      <input type="hidden" name="playerId" value={player.id} />
                      <button
                        type="submit"
                        disabled={Boolean(currentPlayerId) && currentPlayerId !== player.id}
                        className="glass-button-primary px-2.5 py-1.5 lg:px-3.5 lg:py-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.08em] disabled:opacity-40 disabled:cursor-not-allowed shadow-none"
                      >
                        {player.status === "unsold" ? "Recall" : "Nominate"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mobile show more / show less toggle */}
          {showMobileToggle && (
            <button
              type="button"
              onClick={() => setMobileExpanded(!mobileExpanded)}
              className="lg:hidden w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              {mobileExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show all ({orderedQueue.length})
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
