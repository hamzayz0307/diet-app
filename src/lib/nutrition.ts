import type { Activity, Goal, Sex } from "./types";

export const ACTIVITY_MULTIPLIER: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const KCAL_PER_KG = 7700;

export interface TargetInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  /** kg per week to lose/gain (ignored for maintain). */
  weeklyRateKg: number;
}

export interface Targets {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Mifflin-St Jeor BMR. */
export function bmr({ sex, age, heightCm, weightKg }: Omit<TargetInput, "activity" | "goal" | "weeklyRateKg">) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTargets(input: TargetInput): Targets {
  const b = bmr(input);
  const tdee = b * ACTIVITY_MULTIPLIER[input.activity];

  let calories = tdee;
  if (input.goal === "lose") {
    calories = tdee - (input.weeklyRateKg * KCAL_PER_KG) / 7;
  } else if (input.goal === "gain") {
    calories = tdee + (input.weeklyRateKg * KCAL_PER_KG) / 7;
  }

  // Safety floor — don't recommend very low intakes.
  const floor = input.sex === "male" ? 1500 : 1200;
  calories = Math.max(calories, floor);
  calories = Math.round(calories / 10) * 10;

  // Protein: higher when cutting to preserve muscle.
  const proteinPerKg = input.goal === "lose" ? 1.8 : input.goal === "gain" ? 1.7 : 1.5;
  const proteinG = Math.round(input.weightKg * proteinPerKg);

  // Fat: 27% of calories.
  const fatG = Math.round((calories * 0.27) / 9);

  // Carbs: whatever is left.
  const carbsG = Math.max(
    0,
    Math.round((calories - proteinG * 4 - fatG * 9) / 4)
  );

  return {
    bmr: Math.round(b),
    tdee: Math.round(tdee),
    calories,
    proteinG,
    carbsG,
    fatG,
  };
}

export function bmi(weightKg: number, heightCm: number) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Nutrition of `grams` of a food given its per-100g values. */
export function scale(per100: number, grams: number) {
  return Math.round(((per100 * grams) / 100) * 10) / 10;
}

export function todayISO(d = new Date()) {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

export function addDays(iso: string, delta: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return todayISO(d);
}
