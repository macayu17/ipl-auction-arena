"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getRoleHome, getUserRoleFromUser } from "@/lib/auth-roles";
import { hasSupabaseEnv, SUPABASE_ENV_HINT } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type SignInState = {
  status: "idle" | "error";
  message?: string;
};

function getLoginErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("timed out") ||
    normalized.includes("etimedout") ||
    normalized.includes("econn") ||
    normalized.includes("network")
  ) {
    return "Unable to reach Supabase from the server right now. Check network/firewall access to your Supabase project and try again.";
  }

  return message;
}

export async function signInAction(
  _previousState: SignInState,
  formData: FormData
): Promise<SignInState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: SUPABASE_ENV_HINT,
    };
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid email and password.",
    };
  }

  const supabase = await createClient();
  let data:
    | Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"]
    | null = null;
  let error:
    | Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"]
    | null = null;

  try {
    const result = await supabase.auth.signInWithPassword({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    });

    data = result.data;
    error = result.error;
  } catch (caughtError) {
    const fallbackMessage =
      caughtError instanceof Error
        ? caughtError.message
        : "Unable to sign in right now.";

    return {
      status: "error",
      message: getLoginErrorMessage(fallbackMessage),
    };
  }

  if (error) {
    return {
      status: "error",
      message: getLoginErrorMessage(error.message),
    };
  }

  const role = data.user ? getUserRoleFromUser(data.user) : null;

  if (!role) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message:
        "This account is missing a valid role. Ask the auction admin to re-provision it.",
    };
  }

  redirect(getRoleHome(role));
}

export async function signOutAction() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
