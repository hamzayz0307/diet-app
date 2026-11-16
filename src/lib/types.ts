export type Language = "en" | "tr";
export type Sex = "male" | "female";
export type Activity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "lose" | "maintain" | "gain";
export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export interface Profile {
  id: string;
  display_name: string | null;
  language: Language;
  sex: Sex | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: Activity | null;
  goal: Goal | null;
  weekly_rate_kg: number | null;
  calorie_target: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_target_ml: number;
  onboarded: boolean;
}

export interface Food {
  id: string;
  owner: string | null;
  name_en: string;
  name_tr: string;
  brand: string | null;
  barcode: string | null;
  kcal_100: number;
  protein_100: number;
  carbs_100: number;
  fat_100: number;
  serving_g: number | null;
  serving_label_en: string | null;
  serving_label_tr: string | null;
  source: "seed" | "custom" | "off";
}

/** A search hit — may come from our DB or from Open Food Facts (not yet saved). */
export interface FoodHit {
  id: string | null; // null when it's an external (OFF) result
  name_en: string;
  name_tr: string;
  brand: string | null;
  barcode: string | null;
  kcal_100: number;
  protein_100: number;
  carbs_100: number;
  fat_100: number;
  serving_g: number | null;
  serving_label_en: string | null;
  serving_label_tr: string | null;
  source: "seed" | "custom" | "off";
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  meal: Meal;
  food_id: string | null;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

export interface WeightLog {
  id: string;
  date: string;
  weight_kg: number;
}

export interface WaterLog {
  date: string;
  ml: number;
}
