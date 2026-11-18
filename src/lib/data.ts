import { createClient } from "@/lib/supabase/client";
import { scale } from "@/lib/nutrition";
import { AI_DAILY_LIMIT, istanbulToday } from "@/lib/constants";
import type { DiaryEntry, FoodHit, Meal, WeightLog } from "@/lib/types";
import type { AiErrorCode } from "@/lib/ai/codes";

/** Ranked search in our food list — straight from the browser to Supabase. */
export async function searchFoods(q: string): Promise<FoodHit[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("search_foods", { q, max_results: 30 });
  if (error) throw error;
  return (data ?? []) as FoodHit[];
}

/** Packaged products sold in Turkey (Open Food Facts) — only on request. */
export async function searchPackaged(q: string, lang: "en" | "tr"): Promise<FoodHit[]> {
  const res = await fetch(`/api/foods/packaged?q=${encodeURIComponent(q)}&lang=${lang}`);
  if (!res.ok) throw new Error("packaged_failed");
  const json = (await res.json()) as { items?: FoodHit[] };
  return json.items ?? [];
}

export type { AiErrorCode };

export class AiError extends Error {
  constructor(public code: AiErrorCode, public remaining?: number) {
    super(code);
  }
}

async function postAi<T>(path: string, body: object): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiError("failed");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new AiError((json.error as AiErrorCode) ?? "failed", json.remaining);
  return json as T;
}

/** "2 yumurta, 1 simit" → foods with grams (AI). */
export function aiParseMeal(text: string) {
  return postAi<{ items: { food: FoodHit; grams: number }[]; remaining: number }>(
    "/api/ai/parse",
    { text }
  );
}

/** Food name → nutrition (AI, or free if someone already asked). */
export function aiLookupFood(name: string) {
  return postAi<{ food: FoodHit; cached: boolean; remaining?: number }>("/api/ai/food", { name });
}

/** AI requests left today. */
export async function fetchAiRemaining(userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("ai_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("day", istanbulToday())
    .maybeSingle();
  return Math.max(0, AI_DAILY_LIMIT - (data?.count ?? 0));
}

export async function fetchDay(userId: string, date: string) {
  const supabase = createClient();
  const [entries, water] = await Promise.all([
    supabase
      .from("diary_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("created_at"),
    supabase
      .from("water_logs")
      .select("ml")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle(),
  ]);
  return {
    entries: (entries.data ?? []) as DiaryEntry[],
    waterMl: water.data?.ml ?? 0,
  };
}

/** Persist an external (OFF) hit as a user food so it has an id; returns the id. */
async function ensureFoodId(userId: string, hit: FoodHit): Promise<string | null> {
  if (hit.id) return hit.id;
  const supabase = createClient();
  const { data } = await supabase
    .from("foods")
    .insert({
      owner: userId,
      name_en: hit.name_en,
      name_tr: hit.name_tr,
      brand: hit.brand,
      barcode: hit.barcode,
      kcal_100: hit.kcal_100,
      protein_100: hit.protein_100,
      carbs_100: hit.carbs_100,
      fat_100: hit.fat_100,
      serving_g: hit.serving_g,
      serving_label_en: hit.serving_label_en,
      serving_label_tr: hit.serving_label_tr,
      source: "off",
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function addEntry(
  userId: string,
  date: string,
  meal: Meal,
  hit: FoodHit,
  grams: number,
  displayName: string
) {
  const supabase = createClient();
  const foodId = await ensureFoodId(userId, hit);
  const { data, error } = await supabase
    .from("diary_entries")
    .insert({
      user_id: userId,
      date,
      meal,
      food_id: foodId,
      name: displayName,
      grams,
      kcal: Math.round(scale(hit.kcal_100, grams)),
      protein: scale(hit.protein_100, grams),
      carbs: scale(hit.carbs_100, grams),
      fat: scale(hit.fat_100, grams),
    })
    .select()
    .single();
  if (error) throw error;
  return data as DiaryEntry;
}

export async function updateEntryGrams(entry: DiaryEntry, grams: number) {
  const supabase = createClient();
  const factor = grams / entry.grams;
  const { data, error } = await supabase
    .from("diary_entries")
    .update({
      grams,
      kcal: Math.round(entry.kcal * factor),
      protein: Math.round(entry.protein * factor * 10) / 10,
      carbs: Math.round(entry.carbs * factor * 10) / 10,
      fat: Math.round(entry.fat * factor * 10) / 10,
    })
    .eq("id", entry.id)
    .select()
    .single();
  if (error) throw error;
  return data as DiaryEntry;
}

export async function deleteEntry(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("diary_entries").delete().eq("id", id);
  if (error) throw error;
}

export async function setWater(userId: string, date: string, ml: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("water_logs")
    .upsert({ user_id: userId, date, ml: Math.max(0, ml) }, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function logWeight(userId: string, date: string, weightKg: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("weight_logs")
    .upsert({ user_id: userId, date, weight_kg: weightKg }, { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function fetchWeights(userId: string, sinceDate?: string) {
  const supabase = createClient();
  let q = supabase
    .from("weight_logs")
    .select("id,date,weight_kg")
    .eq("user_id", userId)
    .order("date");
  if (sinceDate) q = q.gte("date", sinceDate);
  const { data } = await q;
  return (data ?? []) as WeightLog[];
}

export async function fetchCaloriesByDay(userId: string, fromDate: string, toDate: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("diary_entries")
    .select("date,kcal")
    .eq("user_id", userId)
    .gte("date", fromDate)
    .lte("date", toDate);
  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    totals[row.date] = (totals[row.date] ?? 0) + Number(row.kcal);
  }
  return totals;
}

export async function fetchRecentFoods(userId: string, limit = 10): Promise<FoodHit[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("diary_entries")
    .select("food_id, created_at, foods(*)")
    .eq("user_id", userId)
    .not("food_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);
  const seen = new Set<string>();
  const out: FoodHit[] = [];
  for (const row of data ?? []) {
    const f = (row as unknown as { foods: FoodHit | null }).foods;
    if (!f || !f.id || seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
    if (out.length >= limit) break;
  }
  return out;
}

export async function createCustomFood(
  userId: string,
  food: Omit<FoodHit, "id" | "source">
): Promise<FoodHit> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("foods")
    .insert({ ...food, owner: userId, source: "custom" })
    .select()
    .single();
  if (error) throw error;
  return data as FoodHit;
}
