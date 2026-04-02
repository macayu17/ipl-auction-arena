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
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
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
