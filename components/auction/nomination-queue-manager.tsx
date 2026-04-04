"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

import {
  nominatePlayerAction,
  reorderQueueAction,
} from "@/app/actions/auction";
import { formatPrice, getRoleBadgeColor } from "@/lib/utils";
import type { Player } from "@/types/app.types";

type NominationQueueManagerProps = {
  queue: Player[];
  currentPlayerId: string | null;
};

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

  return (
    <div className="space-y-2.5">
      <form ref={reorderFormRef} action={reorderQueueAction} className="hidden">
        <input
          ref={hiddenOrderInputRef}
          name="orderedPlayerIds"
          defaultValue={JSON.stringify(orderedIds)}
          type="hidden"
        />
      </form>

      {orderedQueue.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/12 bg-white/4 px-4 py-4 text-sm text-slate-300">
          No players waiting in the pool.
        </div>
      ) : (
        orderedQueue.map((player, index) => (
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
            className="screen-frame rounded-[18px] px-4 py-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--gold-soft)]">
                    <GripVertical className="size-3.5" />
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-semibold text-white">{player.name}</span>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getRoleBadgeColor(player.role)}`}
                  >
                    {player.role}
                  </span>
                </div>
                <div className="mt-2 text-xs text-[var(--text-soft)]">
                  {player.nationality} • Rating {player.rating} • Base{" "}
                  {formatPrice(player.base_price)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => movePlayer(player.id, -1)}
                  disabled={index === 0}
                  className="inline-flex rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Move ${player.name} up`}
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => movePlayer(player.id, 1)}
                  disabled={index === orderedQueue.length - 1}
                  className="inline-flex rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Move ${player.name} down`}
                >
                  <ArrowDown className="size-4" />
                </button>

                <form action={nominatePlayerAction}>
                  <input type="hidden" name="playerId" value={player.id} />
                  <button
                    type="submit"
                    disabled={Boolean(currentPlayerId) && currentPlayerId !== player.id}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {player.status === "unsold" ? "Recall" : "Nominate"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
