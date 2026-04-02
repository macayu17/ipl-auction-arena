import type { User } from "@supabase/supabase-js";

import type { UserRole } from "@/types/app.types";

export function getRoleHome(role: UserRole) {
  return role === "admin" ? "/admin/auction" : "/team/auction";
}

export function getUserRole(role: unknown): UserRole | null {
  return role === "admin" || role === "team" ? role : null;
}

export function getUserRoleFromUser(user: Pick<User, "app_metadata" | "user_metadata">) {
  return (
    getUserRole(user.app_metadata?.role) ??
    getUserRole(user.user_metadata?.role)
  );
}
