import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Server-side: current user's profile, or redirect to /login. */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (data) return data as Profile;

  // Trigger should have created it; create defensively if missing.
  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: user.id })
    .select()
    .single();
  return created as Profile;
}
