import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Server-side: verified user id from the session cookie, or null. */
export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/** Server-side: current user's profile, or redirect to /login. */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data as Profile;

  // Trigger should have created it; create defensively if missing.
  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select()
    .single();
  return created as Profile;
}
