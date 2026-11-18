import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoodHit } from "@/lib/types";
import type { AiItem } from "./gemini";

export async function findShared(admin: SupabaseClient, name: string): Promise<FoodHit | null> {
  const { data } = await admin.rpc("find_shared_food", { name });
  return (data?.[0] as FoodHit | undefined) ?? null;
}

/**
 * Returns the shared food with this name. If it doesn't exist yet, saves the AI
 * estimate so everyone gets it instantly next time (no AI cost).
 * Existing foods keep their values: our own list beats an AI guess.
 */
export async function findOrSaveShared(admin: SupabaseClient, item: AiItem): Promise<FoodHit> {
  const existing = await findShared(admin, item.name_tr);
  if (existing) return existing;

  const { data, error } = await admin
    .from("foods")
    .insert({
      owner: null,
      name_tr: item.name_tr,
      name_en: item.name_en,
      kcal_100: item.kcal_100,
      protein_100: item.protein_100,
      carbs_100: item.carbs_100,
      fat_100: item.fat_100,
      serving_g: item.serving_g,
      serving_label_tr: item.serving_label_tr,
      serving_label_en: item.serving_label_en,
      source: "ai",
    })
    .select()
    .single();

  if (data) return data as FoodHit;

  // Someone saved the same name a moment ago (unique index) → use theirs.
  if (error?.code === "23505") {
    const again = await findShared(admin, item.name_tr);
    if (again) return again;
  }
  throw error ?? new Error("insert failed");
}

/** Takes one AI credit; returns credits left, or -1 when today's limit is used up. */
export async function takeCredit(admin: SupabaseClient, userId: string, limit: number) {
  const { data, error } = await admin.rpc("use_ai_credit", { uid: userId, daily_limit: limit });
  if (error) throw error;
  return Number(data);
}

export async function refundCredit(admin: SupabaseClient, userId: string) {
  await admin.rpc("refund_ai_credit", { uid: userId });
}
