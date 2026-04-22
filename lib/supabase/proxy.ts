import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getRoleHome, getUserRoleFromUser } from "@/lib/auth-roles";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

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

function matchesRoute(pathname: string, route: string) {
  if (route === "/") {
    return pathname === "/";
  }

  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  let url = "";
  let anonKey = "";

  try {
    const resolvedEnv = getSupabaseEnv();
    url = resolvedEnv.url;
    anonKey = resolvedEnv.anonKey;
  } catch (error) {
    console.error(
      "Supabase env is configured but invalid in middleware. Continuing without auth enforcement.",
      error
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user = null;

  try {
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    user = sessionUser;
  } catch (error) {
    if (!isRefreshTokenFailure(error)) {
      console.error("Supabase session refresh failed in proxy middleware.", error);
    }
  }

  const pathname = request.nextUrl.pathname;
  const publicRoutes = ["/", "/login"];
  const isPublicRoute = publicRoutes.some((route) => matchesRoute(pathname, route));

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (!user) {
    return supabaseResponse;
  }

  const role = getUserRoleFromUser(user);

  if (isPublicRoute) {
    if (!role) {
      return supabaseResponse;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getRoleHome(role);
    return NextResponse.redirect(redirectUrl);
  }

  if (!role) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getRoleHome(role);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/team") && role !== "team") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getRoleHome(role);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
