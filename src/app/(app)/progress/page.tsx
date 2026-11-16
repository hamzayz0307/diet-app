"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useT } from "@/lib/i18n/context";
import { useProfile } from "@/components/ProfileProvider";
import { fetchCaloriesByDay, fetchWeights } from "@/lib/data";
import { addDays, bmi, todayISO } from "@/lib/nutrition";
import type { WeightLog } from "@/lib/types";

type Range = 30 | 90 | 0;

export default function ProgressPage() {
  const { t, lang } = useT();
  const { profile } = useProfile();
  const today = todayISO();

  const [range, setRange] = useState<Range>(30);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [calories, setCalories] = useState<Record<string, number>>({});

  useEffect(() => {
    const since = range ? addDays(today, -range) : undefined;
    fetchWeights(profile.id, since).then(setWeights);
  }, [profile.id, range, today]);

  useEffect(() => {
    fetchCaloriesByDay(profile.id, addDays(today, -29), today).then(setCalories);
  }, [profile.id, today]);

  const weightData = weights.map((w) => ({
    date: w.date,
    label: fmt(w.date, lang),
    kg: Number(w.weight_kg),
  }));

  const first = weights[0]?.weight_kg;
  const last = weights[weights.length - 1]?.weight_kg;
  const change = first !== undefined && last !== undefined ? Number(last) - Number(first) : null;

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today, i - 6);
        return { date: d, label: fmt(d, lang, true), kcal: Math.round(calories[d] ?? 0) };
      }),
    [calories, today, lang]
  );

  const streak = useMemo(() => {
    let n = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, -i);
      if ((calories[d] ?? 0) > 0) n++;
      else if (i > 0) break; // today may still be empty
    }
    return n;
  }, [calories, today]);

  const yMin = weightData.length ? Math.floor(Math.min(...weightData.map((d) => d.kg)) - 1) : 0;
  const yMax = weightData.length ? Math.ceil(Math.max(...weightData.map((d) => d.kg)) + 1) : 100;

  return (
    <main className="px-5 pt-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t.progress}</h1>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t.weight}</h2>
          <div className="flex gap-1">
            {([30, 90, 0] as Range[]).map((r) => (
              <button
                key={r}
                className={`pill ${range === r ? "pill-active" : ""}`}
                onClick={() => setRange(r)}
              >
                {r === 30 ? "30" : r === 90 ? "90" : t.all_time}
              </button>
            ))}
          </div>
        </div>

        {weightData.length === 0 ? (
          <p className="text-sm text-muted">{t.no_weights}</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              <Stat label={t.start} value={`${Number(first).toFixed(1)}`} />
              <Stat label={t.current} value={`${Number(last).toFixed(1)}`} />
              <Stat
                label={t.change}
                value={change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)}`}
                tone={change === null ? undefined : change < 0 ? "good" : change > 0 ? "bad" : undefined}
              />
              <Stat
                label={t.bmi}
                value={profile.height_cm ? bmi(Number(last), profile.height_cm).toFixed(1) : "—"}
              />
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis domain={[yMin, yMax]} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "var(--muted)" }}
                    formatter={(v) => [`${v} kg`, t.weight]}
                  />
                  <Line type="monotone" dataKey="kg" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--accent)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t.calories_week}</h2>
          <span className="text-xs text-muted">
            {t.streak}: <span className="text-text font-medium">{streak}</span> {t.days}
          </span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v) => [`${v} kcal`, t.eaten]}
              />
              {profile.calorie_target && (
                <ReferenceLine y={profile.calorie_target} stroke="var(--carbs)" strokeDasharray="4 4" />
              )}
              <Bar dataKey="kcal" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}

function fmt(iso: string, lang: "en" | "tr", weekday = false) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(
    lang === "tr" ? "tr-TR" : "en-GB",
    weekday ? { weekday: "short" } : { day: "numeric", month: "short" }
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="bg-surface-2 rounded-xl p-2">
      <p className={`font-semibold ${tone === "good" ? "text-accent" : tone === "bad" ? "text-danger" : ""}`}>
        {value}
      </p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
