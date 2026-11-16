"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import { useProfile } from "@/components/ProfileProvider";
import { calculateTargets } from "@/lib/nutrition";
import { todayISO } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/client";
import type { Activity, Goal, Sex } from "@/lib/types";
import LangSwitch from "@/components/LangSwitch";
import Logo from "@/components/Logo";
import MacroRow from "@/components/MacroRow";

const ACTIVITIES: Activity[] = ["sedentary", "light", "moderate", "active", "very_active"];
const GOALS: Goal[] = ["lose", "maintain", "gain"];
const RATES = [0.25, 0.5, 0.75] as const;

export default function OnboardingPage() {
  const { t } = useT();
  const { profile, update } = useProfile();
  const router = useRouter();

  const [name, setName] = useState(profile.display_name ?? "");
  const [sex, setSex] = useState<Sex | "">(profile.sex ?? "");
  const [birthYear, setBirthYear] = useState(profile.birth_year?.toString() ?? "");
  const [height, setHeight] = useState(profile.height_cm?.toString() ?? "");
  const [weight, setWeight] = useState(profile.weight_kg?.toString() ?? "");
  const [activity, setActivity] = useState<Activity>(profile.activity ?? "light");
  const [goal, setGoal] = useState<Goal>(profile.goal ?? "lose");
  const [rate, setRate] = useState<number>(profile.weekly_rate_kg ?? 0.5);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const thisYear = new Date().getFullYear();

  const targets = useMemo(() => {
    const by = Number(birthYear);
    const h = Number(height);
    const w = Number(weight);
    if (!sex || !by || !h || !w) return null;
    const age = thisYear - by;
    if (age < 10 || age > 100 || h < 100 || h > 250 || w < 25 || w > 350) return null;
    return calculateTargets({
      sex,
      age,
      heightCm: h,
      weightKg: w,
      activity,
      goal,
      weeklyRateKg: rate,
    });
  }, [sex, birthYear, height, weight, activity, goal, rate, thisYear]);

  async function save() {
    if (!targets || !sex) {
      setError(t.required_fields);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await update({
        display_name: name.trim() || null,
        sex,
        birth_year: Number(birthYear),
        height_cm: Number(height),
        weight_kg: Number(weight),
        activity,
        goal,
        weekly_rate_kg: goal === "maintain" ? null : rate,
        calorie_target: targets.calories,
        protein_g: targets.proteinG,
        carbs_g: targets.carbsG,
        fat_g: targets.fatG,
        onboarded: true,
      });
      // Also log today's weight as the starting point.
      const supabase = createClient();
      await supabase
        .from("weight_logs")
        .upsert(
          { user_id: profile.id, date: todayISO(), weight_kg: Number(weight) },
          { onConflict: "user_id,date" }
        );
      router.replace("/");
      router.refresh();
    } catch {
      setError(t.error_generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Logo />
        <LangSwitch onChange={(l) => update({ language: l }).catch(() => {})} />
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{t.onboarding_title}</h1>
        <p className="text-muted text-sm mt-1">{t.onboarding_sub}</p>
      </div>

      <div className="card p-4 space-y-3">
        <Field label={t.display_name}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label={t.sex}>
          <div className="grid grid-cols-2 gap-2">
            {(["male", "female"] as Sex[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                className={`btn ${sex === s ? "btn-primary" : "btn-ghost"}`}
              >
                {t[s]}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label={t.birth_year}>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={thisYear - 100}
              max={thisYear - 10}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
            />
          </Field>
          <Field label={t.height_cm}>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </Field>
          <Field label={t.weight_kg}>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </Field>
        </div>

        <Field label={t.activity}>
          <select
            className="input"
            value={activity}
            onChange={(e) => setActivity(e.target.value as Activity)}
          >
            {ACTIVITIES.map((a) => (
              <option key={a} value={a}>
                {t[`activity_${a}` as const]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.goal}>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={`btn text-sm ${goal === g ? "btn-primary" : "btn-ghost"}`}
              >
                {t[`goal_${g}` as const]}
              </button>
            ))}
          </div>
        </Field>

        {goal !== "maintain" && (
          <Field label={t.weekly_rate}>
            <div className="flex flex-col gap-2">
              {RATES.map((r, i) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRate(r)}
                  className={`btn text-sm justify-start ${rate === r ? "btn-primary" : "btn-ghost"}`}
                >
                  {[t.rate_slow, t.rate_medium, t.rate_fast][i]}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>

      {targets && (
        <div className="card p-4">
          <p className="text-muted text-sm">{t.your_target}</p>
          <p className="text-4xl font-semibold mt-1">
            {targets.calories} <span className="text-base text-muted">{t.kcal}</span>
          </p>
          <div className="mt-3">
            <MacroRow protein={targets.proteinG} carbs={targets.carbsG} fat={targets.fatG} />
          </div>
          <p className="text-xs text-muted mt-3">
            BMR {targets.bmr} · TDEE {targets.tdee}
          </p>
        </div>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}

      <button className="btn btn-primary w-full" onClick={save} disabled={busy || !targets}>
        {busy ? t.loading : t.save_continue}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}
