"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getSessionContext } from "@/lib/auth";
import { publishAuctionEvent } from "@/lib/redis";
import { toLooseSupabaseClient } from "@/lib/supabase/loose-client";
import { createServiceClient } from "@/lib/supabase/server";
import type { AuctionState, Player } from "@/types/app.types";

const adjustPurseSchema = z
  .object({
    teamId: z.string().uuid(),
    purseTotal: z.coerce.number().int().min(0),
    purseSpent: z.coerce.number().int().min(0),
  })
  .refine((value) => value.purseSpent <= value.purseTotal, {
    message: "Purse spent cannot be greater than purse total.",
    path: ["purseSpent"],
  });

const resetTeamSchema = z.object({
  teamId: z.string().uuid(),
});

function revalidateTeamViews() {
  [
    "/admin/auction",
    "/admin/dashboard",
    "/admin/players",
    "/admin/teams",
    "/team/auction",
    "/team/squad",
  ].forEach((path) => revalidatePath(path));
}

async function ensureAdmin() {
  const session = await getSessionContext();

  return session.status === "authenticated" && session.role === "admin";
}

async function getAuctionState() {
  const supabase = toLooseSupabaseClient(await createServiceClient());
  const result = await supabase
    .from("auction_state")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  return (result.data as AuctionState | null) ?? null;
}

async function getNextQueueOrder() {
  const supabase = toLooseSupabaseClient(await createServiceClient());
  const result = await supabase
    .from("players")
    .select("queue_order")
    .order("queue_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  const currentMax = (result.data as Pick<Player, "queue_order"> | null)?.queue_order;
  return (currentMax ?? 0) + 1;
}

export async function adjustPurseAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const parsed = adjustPurseSchema.safeParse({
      teamId: formData.get("teamId"),
      purseTotal: formData.get("purseTotal"),
      purseSpent: formData.get("purseSpent"),
    });

    if (!parsed.success) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const result = await supabase
      .from("teams")
      .update({
        purse_total: parsed.data.purseTotal,
        purse_spent: parsed.data.purseSpent,
      })
      .eq("id", parsed.data.teamId);

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "team_budget_updated",
      source: "teams.adjustPurseAction",
    });
    revalidateTeamViews();
  } catch (error) {
    console.error("Failed to adjust purse", error);
  }
}

export async function resetTeamAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const parsed = resetTeamSchema.safeParse({
      teamId: formData.get("teamId"),
    });

    if (!parsed.success) {
      return;
    }

    const auctionState = await getAuctionState();

    if (auctionState?.current_bid_team_id === parsed.data.teamId) {
      return;
    }

    const supabase = toLooseSupabaseClient(await createServiceClient());
    const playersResult = await supabase
      .from("players")
      .select("*")
      .eq("sold_to", parsed.data.teamId)
      .order("queue_order", { ascending: true });

    if (playersResult.error) {
      throw playersResult.error;
    }

    const squad = (playersResult.data as Player[] | null) ?? [];

    if (squad.length === 0) {
      const teamResetResult = await supabase
        .from("teams")
        .update({ purse_spent: 0 })
        .eq("id", parsed.data.teamId);

      if (teamResetResult.error) {
        throw teamResetResult.error;
      }

      await publishAuctionEvent({
        type: "team_reset",
        source: "teams.resetTeamAction",
      });
      revalidateTeamViews();
      return;
    }

    let nextQueueOrder = await getNextQueueOrder();

    for (const player of squad) {
      const result = await supabase
        .from("players")
        .update({
          status: "pool",
          sold_to: null,
          sold_price: null,
          queue_order: nextQueueOrder,
        })
        .eq("id", player.id);

      if (result.error) {
        throw result.error;
      }

      nextQueueOrder += 1;
    }

    const teamResult = await supabase
      .from("teams")
      .update({ purse_spent: 0 })
      .eq("id", parsed.data.teamId);

    if (teamResult.error) {
      throw teamResult.error;
    }

    await publishAuctionEvent({
      type: "team_reset",
      source: "teams.resetTeamAction",
    });
    revalidateTeamViews();
  } catch (error) {
    console.error("Failed to reset team", error);
  }
}
