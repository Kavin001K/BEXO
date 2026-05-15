import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim() || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.warn(
    "[Supabase] SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL is not set. Admin client requests will fail.",
  );
}
if (!SERVICE_ROLE_KEY) {
  console.warn("[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Database updates will fail.");
}

/**
 * Service Role client for server-side updates that bypass RLS.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Creates a user-authenticated client for verifying permissions.
 */
export function createUserClient(token: string) {
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, anonKey || "", {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
