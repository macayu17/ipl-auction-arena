"use server";

import { revalidatePath } from "next/cache";

import { getSessionContext } from "@/lib/auth";
import { publishAuctionEvent } from "@/lib/redis";
import {
  toLooseSupabaseClient,
  type LooseSupabaseClient,
} from "@/lib/supabase/loose-client";
import { createServiceClient } from "@/lib/supabase/server";

function revalidateSlideViews() {
  ["/admin/slides", "/team/auction", "/team/squad"].forEach((path) =>
    revalidatePath(path)
  );
}

async function ensureAdmin() {
  const session = await getSessionContext();

  return session.status === "authenticated" && session.role === "admin";
}

async function getSupabase(): Promise<LooseSupabaseClient> {
  return toLooseSupabaseClient(await createServiceClient());
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOrderIndex(formData: FormData) {
  const parsed = Number(formData.get("orderIndex"));

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
}

export async function createSlideAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const title = readText(formData, "title");
    const imageUrl = readText(formData, "imageUrl");
    const orderIndex = readOrderIndex(formData);

    if (!title) {
      return;
    }

    const supabase = await getSupabase();
    const result = await supabase.from("slides").insert({
      title,
      image_url: imageUrl || null,
      order_index: orderIndex,
      is_active: false,
    });

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "slide_created",
      source: "slides.createSlideAction",
    });
    revalidateSlideViews();
  } catch (error) {
    console.error("Failed to create slide", error);
  }
}

async function clearActiveSlides(supabase: LooseSupabaseClient) {
  const result = await supabase
    .from("slides")
    .update({ is_active: false })
    .eq("is_active", true);

  if (result.error) {
    throw result.error;
  }
}

export async function activateSlideAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const slideId = readText(formData, "slideId");

    if (!slideId) {
      return;
    }

    const supabase = await getSupabase();
    await clearActiveSlides(supabase);

    const result = await supabase
      .from("slides")
      .update({ is_active: true })
      .eq("id", slideId);

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "slide_activated",
      source: "slides.activateSlideAction",
    });
    revalidateSlideViews();
  } catch (error) {
    console.error("Failed to activate slide", error);
  }
}

export async function deactivateSlidesAction() {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const supabase = await getSupabase();
    await clearActiveSlides(supabase);
    await publishAuctionEvent({
      type: "slides_deactivated",
      source: "slides.deactivateSlidesAction",
    });
    revalidateSlideViews();
  } catch (error) {
    console.error("Failed to deactivate slides", error);
  }
}

export async function deleteSlideAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const slideId = readText(formData, "slideId");

    if (!slideId) {
      return;
    }

    const supabase = await getSupabase();
    const result = await supabase.from("slides").delete().eq("id", slideId);

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "slide_deleted",
      source: "slides.deleteSlideAction",
    });
    revalidateSlideViews();
  } catch (error) {
    console.error("Failed to delete slide", error);
  }
}

export async function updateSlideOrderAction(formData: FormData) {
  try {
    if (!(await ensureAdmin())) {
      return;
    }

    const slideId = readText(formData, "slideId");
    const orderIndex = readOrderIndex(formData);

    if (!slideId) {
      return;
    }

    const supabase = await getSupabase();
    const result = await supabase
      .from("slides")
      .update({ order_index: orderIndex })
      .eq("id", slideId);

    if (result.error) {
      throw result.error;
    }

    await publishAuctionEvent({
      type: "slide_reordered",
      source: "slides.updateSlideOrderAction",
    });
    revalidateSlideViews();
  } catch (error) {
    console.error("Failed to update slide order", error);
  }
}
