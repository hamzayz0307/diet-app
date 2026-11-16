"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT, foodName } from "@/lib/i18n/context";
import { useProfile } from "@/components/ProfileProvider";
import { addEntry, createCustomFood, fetchRecentFoods } from "@/lib/data";
import { scale, todayISO } from "@/lib/nutrition";
import { MEALS, type FoodHit, type Meal } from "@/lib/types";

export default function AddFoodPage() {
  return (
    <Suspense>
      <AddFood />
    </Suspense>
  );
}

function AddFood() {
  const { t, lang } = useT();
  const { profile } = useProfile();
  const router = useRouter();
  const params = useSearchParams();
  const date = params.get("date") ?? todayISO();
  const initialMeal = (params.get("meal") as Meal) || "snack";

  const [meal, setMeal] = useState<Meal>(MEALS.includes(initialMeal) ? initialMeal : "snack");
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<FoodHit[]>([]);
  const [off, setOff] = useState<FoodHit[]>([]);
  const [recent, setRecent] = useState<FoodHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodHit | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentFoods(profile.id).then(setRecent);
  }, [profile.id]);

  function onQueryChange(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setLocal([]);
      setOff([]);
      setSearching(false);
    }
  }

  // Debounced search.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const h = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/foods/search?q=${encodeURIComponent(term)}&lang=${lang}`,
          { signal: ctrl.signal }
        );
        const json = await res.json();
        setLocal(json.local ?? []);
        setOff(json.off ?? []);
      } catch {
        /* aborted or network */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(h);
      ctrl.abort();
    };
  }, [q, lang]);

  async function confirm(hit: FoodHit, grams: number) {
    await addEntry(profile.id, date, meal, hit, grams, foodName(hit, lang));
    setSelected(null);
    setToast(t.added);
    setTimeout(() => setToast(null), 1500);
  }

  const showingSearch = q.trim().length >= 2;

  return (
    <main className="px-5 pt-6 space-y-4">
      <header className="flex items-center gap-3">
        <button className="btn btn-ghost px-3" onClick={() => router.push(`/diary?date=${date}`)}>
          ‹
        </button>
        <h1 className="text-lg font-semibold flex-1">{t.add_food}</h1>
      </header>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {MEALS.map((m) => (
          <button
            key={m}
            className={`pill whitespace-nowrap ${meal === m ? "pill-active" : ""}`}
            onClick={() => setMeal(m)}
          >
            {t[m]}
          </button>
        ))}
      </div>

      <input
        className="input text-base"
        placeholder={t.search_food}
        value={q}
        onChange={(e) => onQueryChange(e.target.value)}
        autoFocus
      />

      {!showingSearch && (
        <>
          <p className="text-xs text-muted">{t.search_hint}</p>
          {recent.length > 0 && (
            <FoodList title="⏱" items={recent} onPick={setSelected} />
          )}
        </>
      )}

      {showingSearch && (
        <div className="space-y-3">
          {searching && <p className="text-xs text-muted">{t.searching}</p>}
          {local.length > 0 && <FoodList items={local} onPick={setSelected} />}
          {off.length > 0 && (
            <FoodList title={t.source_off} items={off} onPick={setSelected} />
          )}
          {!searching && local.length === 0 && off.length === 0 && (
            <p className="text-sm text-muted">{t.no_results}</p>
          )}
        </div>
      )}

      <button className="btn btn-ghost w-full text-accent" onClick={() => setShowCustom(true)}>
        + {t.add_custom}
      </button>

      {selected && (
        <PortionSheet
          hit={selected}
          meal={meal}
          onCancel={() => setSelected(null)}
          onConfirm={confirm}
        />
      )}

      {showCustom && (
        <CustomFoodSheet
          onCancel={() => setShowCustom(false)}
          onCreated={(f) => {
            setShowCustom(false);
            setSelected(f);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center pointer-events-none">
          <span className="bg-accent text-[#06241a] rounded-full px-4 py-2 text-sm font-medium">
            {toast}
          </span>
        </div>
      )}
    </main>
  );
}

function FoodList({
  title,
  items,
  onPick,
}: {
  title?: string;
  items: FoodHit[];
  onPick: (f: FoodHit) => void;
}) {
  const { t, lang } = useT();
  return (
    <section className="card">
      {title && <p className="px-4 pt-3 text-xs text-muted">{title}</p>}
      <ul className="divide-y divide-border">
        {items.map((f, i) => (
          <li key={f.id ?? `${f.barcode}-${i}`}>
            <button
              className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
              onClick={() => onPick(f)}
            >
              <div className="min-w-0">
                <p className="truncate">{foodName(f, lang)}</p>
                <p className="text-xs text-muted truncate">
                  {f.brand ? `${f.brand} · ` : ""}
                  {f.kcal_100} kcal {t.per_100g}
                  {f.source === "custom" ? ` · ${t.source_custom}` : ""}
                </p>
              </div>
              <span className="text-accent text-xl">+</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PortionSheet({
  hit,
  meal,
  onCancel,
  onConfirm,
}: {
  hit: FoodHit;
  meal: Meal;
  onCancel: () => void;
  onConfirm: (hit: FoodHit, grams: number) => Promise<void>;
}) {
  const { t, lang } = useT();
  const hasServing = !!hit.serving_g;
  const [mode, setMode] = useState<"grams" | "serving">(hasServing ? "serving" : "grams");
  const [grams, setGrams] = useState(String(hit.serving_g ?? 100));
  const [servings, setServings] = useState("1");
  const [busy, setBusy] = useState(false);

  const g =
    mode === "serving" ? Number(servings) * (hit.serving_g ?? 0) : Number(grams);
  const valid = g > 0 && Number.isFinite(g);
  const servingLabel = lang === "tr" ? hit.serving_label_tr : hit.serving_label_en;

  return (
    <Sheet onClose={onCancel}>
      <h2 className="font-semibold text-lg">{foodName(hit, lang)}</h2>
      {hit.brand && <p className="text-sm text-muted">{hit.brand}</p>}

      {hasServing && (
        <div className="flex gap-1 mt-3">
          <button
            className={`pill ${mode === "serving" ? "pill-active" : ""}`}
            onClick={() => setMode("serving")}
          >
            {servingLabel ?? t.serving} ({hit.serving_g} g)
          </button>
          <button
            className={`pill ${mode === "grams" ? "pill-active" : ""}`}
            onClick={() => setMode("grams")}
          >
            {t.grams}
          </button>
        </div>
      )}

      <label className="block mt-3">
        <span className="block text-xs text-muted mb-1">{t.amount}</span>
        {mode === "serving" ? (
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={() => setServings((s) => String(Math.max(0.5, Number(s) - 0.5)))}>−</button>
            <input
              className="input text-center"
              type="number"
              inputMode="decimal"
              step="0.5"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
            <button className="btn btn-ghost" onClick={() => setServings((s) => String(Number(s) + 0.5))}>+</button>
          </div>
        ) : (
          <input
            className="input"
            type="number"
            inputMode="decimal"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
        )}
      </label>

      <div className="grid grid-cols-4 gap-2 mt-4 text-center">
        <Stat label="kcal" value={valid ? Math.round(scale(hit.kcal_100, g)) : 0} />
        <Stat label={t.protein} value={valid ? scale(hit.protein_100, g) : 0} />
        <Stat label={t.carbs} value={valid ? scale(hit.carbs_100, g) : 0} />
        <Stat label={t.fat} value={valid ? scale(hit.fat_100, g) : 0} />
      </div>
      <p className="text-xs text-muted mt-2 text-center">{Math.round(g)} g</p>

      <button
        className="btn btn-primary w-full mt-4"
        disabled={!valid || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm(hit, Math.round(g * 10) / 10);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t.add_to} {t[meal]}
      </button>
    </Sheet>
  );
}

function CustomFoodSheet({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (f: FoodHit) => void;
}) {
  const { t, lang } = useT();
  const { profile } = useProfile();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [servingG, setServingG] = useState("");
  const [servingLabel, setServingLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !kcal) {
      setError(t.required_fields);
      return;
    }
    setBusy(true);
    try {
      const f = await createCustomFood(profile.id, {
        name_en: name.trim(),
        name_tr: name.trim(),
        brand: brand.trim() || null,
        barcode: null,
        kcal_100: Number(kcal),
        protein_100: Number(protein) || 0,
        carbs_100: Number(carbs) || 0,
        fat_100: Number(fat) || 0,
        serving_g: Number(servingG) || null,
        serving_label_en: lang === "en" ? servingLabel.trim() || null : null,
        serving_label_tr: lang === "tr" ? servingLabel.trim() || null : null,
      });
      onCreated(f);
    } catch {
      setError(t.error_generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onCancel}>
      <h2 className="font-semibold text-lg mb-3">{t.custom_food_title}</h2>
      <div className="space-y-2">
        <input className="input" placeholder={t.food_name} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder={t.brand} value={brand} onChange={(e) => setBrand(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" inputMode="decimal" placeholder={t.kcal_100} value={kcal} onChange={(e) => setKcal(e.target.value)} />
          <input className="input" type="number" inputMode="decimal" placeholder={t.protein_100} value={protein} onChange={(e) => setProtein(e.target.value)} />
          <input className="input" type="number" inputMode="decimal" placeholder={t.carbs_100} value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          <input className="input" type="number" inputMode="decimal" placeholder={t.fat_100} value={fat} onChange={(e) => setFat(e.target.value)} />
          <input className="input" type="number" inputMode="decimal" placeholder={t.serving_g} value={servingG} onChange={(e) => setServingG(e.target.value)} />
          <input className="input" placeholder={t.serving_label} value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button className="btn btn-ghost flex-1" onClick={onCancel}>{t.cancel}</button>
        <button className="btn btn-primary flex-1" onClick={save} disabled={busy}>{t.save}</button>
      </div>
    </Sheet>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface border-t border-border rounded-t-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-2">
      <p className="text-base font-semibold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
