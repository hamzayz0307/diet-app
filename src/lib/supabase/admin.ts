import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/**
 * Server-only client with the secret key (bypasses Row Level Security).
 * Used for: shared AI-added foods and the daily AI counter.
 * Returns null when SUPABASE_SECRET_KEY isn't set.
 */
export function adminClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
