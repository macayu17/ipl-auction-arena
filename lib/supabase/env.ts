export const SUPABASE_ENV_HINT =
  "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth, route protection, and live auction data.";

function normalizeEnvValue(value: string | undefined) {
  if (!value) return "";
  return value.trim().replace(/^"(.*)"$/, "$1");
}

export function hasSupabaseEnv() {
  return Boolean(
    normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getSupabaseEnv() {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    throw new Error(SUPABASE_ENV_HINT);
  }

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is invalid. Use a full URL like https://<project-ref>.supabase.co"
    );
  }

  return { url, anonKey };
}

export function getServiceRoleKey() {
  const serviceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for privileged server-side mutations."
    );
  }

  return serviceRoleKey;
}
