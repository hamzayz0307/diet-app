"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDay, setWater as persistWater } from "@/lib/data";
import type { DiaryEntry, Meal } from "@/lib/types";

export function useDay(userId: string, date: string) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [tick, setTick] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const key = `${userId}:${date}:${tick}`;
  const loading = loadedKey !== key;

  useEffect(() => {
    let cancelled = false;
    fetchDay(userId, date).then((d) => {
      if (cancelled) return;
      setEntries(d.entries);
      setWaterMl(d.waterMl);
      setLoadedKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, date, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const totals = useMemo(() => {
    const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    for (const e of entries) {
      t.kcal += Number(e.kcal);
      t.protein += Number(e.protein);
      t.carbs += Number(e.carbs);
      t.fat += Number(e.fat);
    }
    return t;
  }, [entries]);

  const byMeal = useMemo(() => {
    const m: Record<Meal, DiaryEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of entries) m[e.meal].push(e);
    return m;
  }, [entries]);

  const changeWater = useCallback(
    async (delta: number) => {
      const next = Math.max(0, waterMl + delta);
      setWaterMl(next);
      await persistWater(userId, date, next).catch(() => reload());
    },
    [userId, date, waterMl, reload]
  );

  const resetWater = useCallback(async () => {
    setWaterMl(0);
    await persistWater(userId, date, 0).catch(() => reload());
  }, [userId, date, reload]);

  return {
    entries,
    setEntries,
    byMeal,
    totals,
    waterMl,
    changeWater,
    resetWater,
    loading,
    reload,
  };
}
