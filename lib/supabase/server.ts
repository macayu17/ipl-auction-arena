import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getServiceRoleKey, getSupabaseEnv } from "@/lib/supabase/env";
import { supabaseServerFetch } from "@/lib/supabase/server-fetch";
import { Database } from "@/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      global: {
        fetch: supabaseServerFetch,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Service-role client singleton.
 * The service client uses a fixed key with no per-user state,
 * so it's safe to reuse across requests within the same process.
 */
let _serviceClient: ReturnType<typeof createSupabaseClient<Database>> | null =
  null;

export async function createServiceClient() {
  if (_serviceClient) return _serviceClient;

  const { url } = getSupabaseEnv();
  const serviceRoleKey = getServiceRoleKey();

  _serviceClient = createSupabaseClient<Database>(url, serviceRoleKey, {
    global: {
      fetch: supabaseServerFetch,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _serviceClient;
}
