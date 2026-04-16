import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getRoleHome, getUserRoleFromUser } from "@/lib/auth-roles";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Team, UserRole } from "@/types/app.types";

function getAuthErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = (error as { code?: unknown }).code;
  return typeof candidate === "string" ? candidate : "";
}

function getAuthErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = (error as { message?: unknown }).message;
  return typeof candidate === "string" ? candidate : "";
}

function isRefreshTokenFailure(error: unknown) {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessage(error).toLowerCase();

  return (
    code === "refresh_token_not_found" ||
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  );
}

export type SessionContext =
  | { status: "missing_env"; user: null; role: null }
  | { status: "anonymous"; user: null; role: null }
  | { status: "authenticated"; user: User; role: UserRole | null };

export const getSessionContext = cache(async (): Promise<SessionContext> => {
  if (!hasSupabaseEnv()) {
    return { status: "missing_env", user: null, role: null };
  }

  const supabase = await createClient();
  let user: User | null = null;

  try {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (!isRefreshTokenFailure(error)) {
        console.error("Failed to fetch authenticated user.", error);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      user = session?.user ?? null;
    } else {
      user = authUser;
    }
  } catch (error) {
    if (!isRefreshTokenFailure(error)) {
      console.error("Failed to resolve session context.", error);
    }
  }

  if (!user) {
    return { status: "anonymous", user: null, role: null };
  }

  const role = getUserRoleFromUser(user);

  return { status: "authenticated", user, role };
});

export async function requireRole(expectedRole: UserRole) {
  const session = await getSessionContext();

  if (session.status === "missing_env") {
    return session;
  }

  if (session.status !== "authenticated") {
    redirect("/login");
  }

  if (session.role !== expectedRole) {
    redirect(session.role ? getRoleHome(session.role) : "/login");
  }

  return session;
}

export const getTeamForCurrentUser = cache(async (): Promise<Team | null> => {
  const session = await getSessionContext();

  if (
    session.status !== "authenticated" ||
    session.role !== "team" ||
    !session.user
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  return data ?? null;
});
