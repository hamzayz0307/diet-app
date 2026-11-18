"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/context";
import { useProfile } from "@/components/ProfileProvider";
import { useDay } from "@/lib/useDay";
import { addDays, todayISO } from "@/lib/nutrition";
import { deleteEntry, updateEntryGrams } from "@/lib/data";
import { MEALS, type DiaryEntry } from "@/lib/types";
import MacroRow from "@/components/MacroRow";

export default function DiaryPage() {
  return (
    <Suspense>
      <Diary />
    </Suspense>
  );
}

function Diary() {
  const { t, lang } = useT();
  const { profile } = useProfile();
  const router = useRouter();
  const params = useSearchParams();
  const today = todayISO();
  const date = params.get("date") ?? today;
  const day = useDay(profile.id, date);

  const go = (d: string) => router.replace(`/diary?date=${d}`);

  const label =
    date === today
      ? t.today
      : date === addDays(today, -1)
        ? t.yesterday
        : date === addDays(today, 1)
          ? t.tomorrow
          : new Date(date + "T00:00:00").toLocaleDateString(
              lang === "tr" ? "tr-TR" : "en-GB",
              { day: "numeric", month: "short", weekday: "short" }
            );

  const remaining = (profile.calorie_target ?? 0) - day.totals.kcal;

  return (
    <main className="px-5 pt-6 space-y-4">
      <header className="flex items-center justify-between">
        <button className="btn btn-ghost px-3" onClick={() => go(addDays(date, -1))} aria-label="prev">
          ‹
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold capitalize">{label}</h1>
          <p className="text-xs text-muted">{date}</p>
        </div>
        <button className="btn btn-ghost px-3" onClick={() => go(addDays(date, 1))} aria-label="next">
          ›
        </button>
      </header>

      <section className={`card p-4 transition-opacity ${day.loading ? "opacity-50" : ""}`}>
        <div className="flex items-baseline justify-between">
          <span className="text-muted text-sm">{t.eaten}</span>
          <span>
            <span className="text-2xl font-semibold">{Math.round(day.totals.kcal)}</span>
            <span className="text-muted text-sm"> / {profile.calorie_target ?? "—"} kcal</span>
          </span>
        </div>
        <p className={`text-sm mt-1 ${remaining < 0 ? "text-danger" : "text-accent"}`}>
          {Math.abs(Math.round(remaining))} {remaining < 0 ? t.over : t.remaining}
        </p>
        <div className="mt-3">
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

      {MEALS.map((meal) => {
        const items = day.byMeal[meal];
        const kcal = items.reduce((s, e) => s + Number(e.kcal), 0);
        return (
          <section key={meal} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">{t[meal]}</h2>
              <span className="text-sm text-muted">{Math.round(kcal)} kcal</span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted">{t.no_entries}</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    onChange={(next) =>
                      day.setEntries((prev) => prev.map((p) => (p.id === next.id ? next : p)))
                    }
                    onDelete={() => day.setEntries((prev) => prev.filter((p) => p.id !== e.id))}
                  />
                ))}
              </ul>
            )}
            <Link
              href={`/diary/add?meal=${meal}&date=${date}`}
              className="btn btn-ghost w-full mt-3 text-sm text-accent"
            >
              + {t.add_food}
            </Link>
          </section>
        );
      })}
    </main>
  );
}

function EntryRow({
  entry,
  onChange,
  onDelete,
}: {
  entry: DiaryEntry;
  onChange: (e: DiaryEntry) => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [grams, setGrams] = useState(String(entry.grams));
  const [busy, setBusy] = useState(false);

  async function save() {
    const g = Number(grams);
    if (!g || g <= 0) return;
    setBusy(true);
    const next = await updateEntryGrams(entry, g);
    onChange(next);
    setBusy(false);
    setEditing(false);
  }

  async function remove() {
    setBusy(true);
    await deleteEntry(entry.id);
    onDelete();
  }

  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-2">
        <button className="text-left flex-1 min-w-0" onClick={() => setEditing((v) => !v)}>
          <p className="truncate">{entry.name}</p>
          <p className="text-xs text-muted">
            {entry.grams} g · P {Math.round(entry.protein)} · C {Math.round(entry.carbs)} · F{" "}
            {Math.round(entry.fat)}
          </p>
        </button>
        <span className="text-sm font-medium shrink-0">{Math.round(entry.kcal)}</span>
      </div>
      {editing && (
        <div className="flex gap-2 mt-2">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
          <button className="btn btn-primary text-sm" onClick={save} disabled={busy}>
            {t.save}
          </button>
          <button className="btn btn-danger text-sm" onClick={remove} disabled={busy}>
            {t.delete}
          </button>
        </div>
      )}
    </li>
  );
}
