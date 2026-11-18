"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import { useProfile } from "@/components/ProfileProvider";
import { useDay } from "@/lib/useDay";
import { todayISO } from "@/lib/nutrition";
import { logWeight } from "@/lib/data";
import CalorieRing from "@/components/CalorieRing";
import MacroRow from "@/components/MacroRow";
import { MEALS } from "@/lib/types";

export default function HomePage() {
  const { t, lang } = useT();
  const { profile, update } = useProfile();
  const today = todayISO();
  const day = useDay(profile.id, today);

  const [weightInput, setWeightInput] = useState("");
  const [weightMsg, setWeightMsg] = useState<string | null>(null);

  async function saveWeight() {
    const w = Number(weightInput.replace(",", "."));
    if (!w || w < 25 || w > 350) return;
    await logWeight(profile.id, today, w);
    await update({ weight_kg: w }).catch(() => {});
    setWeightInput("");
    setWeightMsg(t.weight_logged);
    setTimeout(() => setWeightMsg(null), 2000);
  }

  const dateLabel = new Date(today + "T00:00:00").toLocaleDateString(
    lang === "tr" ? "tr-TR" : "en-GB",
    { weekday: "long", day: "numeric", month: "long" }
  );

  const mealKcal = (meal: (typeof MEALS)[number]) =>
    day.byMeal[meal].reduce((s, e) => s + Number(e.kcal), 0);

  return (
    <main className="px-5 pt-6 space-y-4">
      <header>
        <p className="text-muted text-sm capitalize">{dateLabel}</p>
        <h1 className="text-2xl font-semibold">
          {profile.display_name ? `${t.today}, ${profile.display_name}` : t.today}
        </h1>
      </header>

      <section className={`card p-4 transition-opacity ${day.loading ? "opacity-50" : ""}`}>
        <CalorieRing eaten={day.totals.kcal} target={profile.calorie_target} />
        <div className="mt-4">
          <MacroRow
            protein={day.totals.protein}
            carbs={day.totals.carbs}
            fat={day.totals.fat}
            targetProtein={profile.protein_g}
            targetCarbs={profile.carbs_g}
            targetFat={profile.fat_g}
          />
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t.quick_add}</h2>
          <Link href="/diary" className="text-accent text-sm">
            {t.diary} →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {MEALS.map((m) => (
            <Link
              key={m}
              href={`/diary/add?meal=${m}&date=${today}`}
              className="btn btn-ghost justify-between text-sm"
            >
              <span>{t[m]}</span>
              <span className="text-muted">{Math.round(mealKcal(m))}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t.water}</h2>
          <span className="text-sm">
            <span className="font-medium">{day.waterMl}</span>
            <span className="text-muted"> / {profile.water_target_ml} ml</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 mt-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-protein transition-all"
            style={{
              width: `${Math.min(100, (day.waterMl / profile.water_target_ml) * 100)}%`,
            }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <button className="btn btn-primary flex-1" onClick={() => day.changeWater(250)}>
            {t.add_water}
          </button>
          <button className="btn btn-ghost" onClick={() => day.changeWater(-250)}>
            −250
          </button>
          <button className="btn btn-ghost text-muted" onClick={day.resetWater}>
            {t.reset_water}
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-2">{t.log_weight}</h2>
        <div className="flex gap-2">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={profile.weight_kg ? `${profile.weight_kg} kg` : "kg"}
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
          <button className="btn btn-primary" onClick={saveWeight} disabled={!weightInput}>
            {t.save}
          </button>
        </div>
        {weightMsg && <p className="text-accent text-sm mt-2">{weightMsg}</p>}
      </section>
    </main>
  );
}
