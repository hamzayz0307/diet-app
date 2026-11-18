"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT, foodName } from "@/lib/i18n/context";
import type { Dict } from "@/lib/i18n/en";
import { useProfile } from "@/components/ProfileProvider";
import {
  AiError,
  addEntry,
  aiLookupFood,
  aiParseMeal,
  createCustomFood,
  fetchAiRemaining,
  fetchRecentFoods,
  searchFoods,
  searchPackaged,
} from "@/lib/data";
import { AI_DAILY_LIMIT } from "@/lib/constants";
import { scale, todayISO } from "@/lib/nutrition";
import { MEALS, type FoodHit, type Meal } from "@/lib/types";

export default function AddFoodPage() {
  return (
    <Suspense>
      <AddFood />
    </Suspense>
  );
}

function aiMessage(t: Dict, e: unknown) {
  if (e instanceof AiError) {
    switch (e.code) {
      case "limit":
        return t.ai_limit_reached.replace("{n}", String(AI_DAILY_LIMIT));
      case "not_configured":
        return t.ai_not_configured;
      case "not_food":
        return t.ai_not_food;
    }
  }
  return t.ai_failed;
}

function AddFood() {
  const { t, lang } = useT();
  const { profile } = useProfile();
  const router = useRouter();
  const params = useSearchParams();
  const date = params.get("date") ?? todayISO();
  const initialMeal = (params.get("meal") as Meal) || "snack";

  const [meal, setMeal] = useState<Meal>(MEALS.includes(initialMeal) ? initialMeal : "snack");
  const [tab, setTab] = useState<"search" | "ai">("search");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [selected, setSelected] = useState<FoodHit | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchAiRemaining(profile.id).then(setRemaining).catch(() => {});
  }, [profile.id]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  }

  async function confirm(hit: FoodHit, grams: number) {
    await addEntry(profile.id, date, meal, hit, grams, foodName(hit, lang));
    setSelected(null);
    flash(t.added);
  }

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

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 border border-border">
        {(["search", "ai"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-lg py-2 text-sm font-medium ${
              tab === k ? "bg-surface text-text" : "text-muted"
            }`}
          >
            {k === "search" ? `🔍 ${t.tab_search}` : `✨ ${t.tab_ai}`}
          </button>
        ))}
      </div>

      {tab === "search" ? (
        <SearchTab
          onPick={setSelected}
          onCustom={() => setShowCustom(true)}
          remaining={remaining}
          setRemaining={setRemaining}
        />
      ) : (
        <AiTab
          date={date}
          meal={meal}
          remaining={remaining}
          setRemaining={setRemaining}
          onAdded={() => flash(t.added)}
        />
      )}

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
        <div className="fixed bottom-24 inset-x-0 flex justify-center pointer-events-none z-50">
          <span className="bg-accent text-[#06241a] rounded-full px-4 py-2 text-sm font-medium">
            {toast}
          </span>
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Search tab                                                          */
/* ------------------------------------------------------------------ */

function SearchTab({
  onPick,
  onCustom,
  remaining,
  setRemaining,
}: {
  onPick: (f: FoodHit) => void;
  onCustom: () => void;
  remaining: number | null;
  setRemaining: (n: number) => void;
}) {
  const { t, lang } = useT();
  const { profile } = useProfile();

  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodHit[]>([]);
  const [resultsFor, setResultsFor] = useState("");
  const [recent, setRecent] = useState<FoodHit[]>([]);

  const [packaged, setPackaged] = useState<FoodHit[] | null>(null);
  const [packagedBusy, setPackagedBusy] = useState(false);
  const [packagedError, setPackagedError] = useState(false);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  const term = q.trim();
  const active = term.length >= 2;
  const searching = active && resultsFor !== term;

  useEffect(() => {
    fetchRecentFoods(profile.id).then(setRecent).catch(() => {});
  }, [profile.id]);

  // Debounced search in our own list (browser → Supabase, ranked in the database).
  useEffect(() => {
    if (term.length < 2) return;
    let cancelled = false;
    const h = setTimeout(() => {
      searchFoods(term)
        .then((r) => {
          if (cancelled) return;
          setResults(r);
          setResultsFor(term);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setResultsFor(term);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [term]);

  function onQueryChange(v: string) {
    setQ(v);
    setPackaged(null);
    setPackagedError(false);
    setAiMsg(null);
  }

  async function loadPackaged() {
    setPackagedBusy(true);
    setPackagedError(false);
    try {
      setPackaged(await searchPackaged(term, lang));
    } catch {
      setPackagedError(true);
    } finally {
      setPackagedBusy(false);
    }
  }

  async function askAi() {
    setAiBusy(true);
    setAiMsg(null);
    try {
      const r = await aiLookupFood(term);
      if (typeof r.remaining === "number") setRemaining(r.remaining);
      onPick(r.food);
    } catch (e) {
      if (e instanceof AiError && typeof e.remaining === "number") setRemaining(e.remaining);
      setAiMsg(aiMessage(t, e));
    } finally {
      setAiBusy(false);
    }
  }

  const noResults = active && !searching && results.length === 0;
  const outOfAi = remaining === 0;

  return (
    <div className="space-y-3">
      <input
        className="input text-base"
        placeholder={t.search_food}
        value={q}
        onChange={(e) => onQueryChange(e.target.value)}
        autoFocus
      />

      {!active && (
        <>
          <p className="text-xs text-muted">{t.search_hint}</p>
          {recent.length > 0 && <FoodList title={t.recent} items={recent} onPick={onPick} />}
        </>
      )}

      {active && (
        <>
          {searching && results.length === 0 && (
            <p className="text-xs text-muted">{t.searching}</p>
          )}
          {results.length > 0 && (
            <div className={searching ? "opacity-60 transition-opacity" : ""}>
              <FoodList items={results} onPick={onPick} />
            </div>
          )}
          {noResults && <p className="text-sm text-muted">{t.no_results}</p>}

          {!searching && (
            <div className="space-y-2">
              <button
                className={`btn w-full ${noResults ? "btn-primary" : "btn-ghost text-accent"}`}
                onClick={askAi}
                disabled={aiBusy || outOfAi}
              >
                {aiBusy ? t.ai_thinking : `✨ ${t.ask_ai_about.replace("{q}", term)}`}
              </button>
              {aiMsg && <p className="text-sm text-danger">{aiMsg}</p>}

              {packaged === null ? (
                <button
                  className="btn btn-ghost w-full text-sm"
                  onClick={loadPackaged}
                  disabled={packagedBusy}
                >
                  {packagedBusy ? t.searching : `📦 ${t.search_packaged}`}
                </button>
              ) : packaged.length > 0 ? (
                <FoodList title={t.packaged_title} items={packaged} onPick={onPick} />
              ) : (
                <p className="text-sm text-muted">{t.packaged_none}</p>
              )}
              {packagedError && <p className="text-sm text-danger">{t.packaged_error}</p>}
            </div>
          )}
        </>
      )}

      <AiRemaining remaining={remaining} />

      <button className="btn btn-ghost w-full text-sm" onClick={onCustom}>
        + {t.add_custom}
      </button>
    </div>
  );
}

function AiRemaining({ remaining }: { remaining: number | null }) {
  const { t } = useT();
  if (remaining === null) return null;
  return (
    <p className={`text-xs text-center ${remaining === 0 ? "text-danger" : "text-muted"}`}>
      {remaining === 0
        ? t.ai_limit_reached.replace("{n}", String(AI_DAILY_LIMIT))
        : t.ai_remaining.replace("{n}", String(remaining))}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* AI tab: type a whole meal                                           */
/* ------------------------------------------------------------------ */

interface Draft {
  key: string;
  food: FoodHit;
  grams: string;
}

function AiTab({
  date,
  meal,
  remaining,
  setRemaining,
  onAdded,
}: {
  date: string;
  meal: Meal;
  remaining: number | null;
  setRemaining: (n: number) => void;
  onAdded: () => void;
}) {
  const { t, lang } = useT();
  const { profile } = useProfile();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  async function calculate() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await aiParseMeal(text.trim());
      setRemaining(r.remaining);
      if (r.items.length === 0) {
        setMsg(t.ai_no_items);
        setDrafts([]);
      } else {
        setDrafts(
          r.items.map((it, i) => ({
            key: `${it.food.id ?? i}-${i}`,
            food: it.food,
            grams: String(it.grams),
          }))
        );
      }
    } catch (e) {
      if (e instanceof AiError && typeof e.remaining === "number") setRemaining(e.remaining);
      setMsg(aiMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  async function addAll() {
    setSaving(true);
    try {
      for (const d of drafts) {
        const g = Number(d.grams.replace(",", "."));
        if (!(g > 0)) continue;
        await addEntry(profile.id, date, meal, d.food, g, foodName(d.food, lang));
      }
      setDrafts([]);
      setText("");
      onAdded();
    } catch {
      setMsg(t.error_generic);
    } finally {
      setSaving(false);
    }
  }

  const totals = drafts.reduce(
    (s, d) => {
      const g = Number(d.grams.replace(",", ".")) || 0;
      s.kcal += scale(d.food.kcal_100, g);
      s.protein += scale(d.food.protein_100, g);
      s.carbs += scale(d.food.carbs_100, g);
      s.fat += scale(d.food.fat_100, g);
      return s;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const validCount = drafts.filter((d) => Number(d.grams.replace(",", ".")) > 0).length;

  return (
    <div className="space-y-3">
      <textarea
        className="input text-base min-h-24 resize-none"
        placeholder={t.ai_placeholder}
        value={text}
        maxLength={400}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <button
        className="btn btn-primary w-full"
        onClick={calculate}
        disabled={busy || text.trim().length < 2 || remaining === 0}
      >
        {busy ? t.ai_thinking : `✨ ${t.ai_calculate}`}
      </button>
      {msg && <p className="text-sm text-danger">{msg}</p>}
      <AiRemaining remaining={remaining} />

      {drafts.length > 0 && (
        <section className="card p-4 space-y-3">
          <p className="text-xs text-muted">{t.ai_estimate_note}</p>
          <ul className="divide-y divide-border">
            {drafts.map((d) => {
              const g = Number(d.grams.replace(",", ".")) || 0;
              return (
                <li key={d.key} className="py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{foodName(d.food, lang)}</p>
                    <p className="text-xs text-muted">
                      {Math.round(scale(d.food.kcal_100, g))} kcal · P{" "}
                      {Math.round(scale(d.food.protein_100, g))} · C{" "}
                      {Math.round(scale(d.food.carbs_100, g))} · F{" "}
                      {Math.round(scale(d.food.fat_100, g))}
                    </p>
                  </div>
                  <input
                    className="input w-20 text-center px-2"
                    type="number"
                    inputMode="decimal"
                    value={d.grams}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((p) => (p.key === d.key ? { ...p, grams: e.target.value } : p))
                      )
                    }
                  />
                  <span className="text-xs text-muted">g</span>
                  <button
                    className="text-muted px-2 text-lg"
                    aria-label={t.remove}
                    onClick={() => setDrafts((prev) => prev.filter((p) => p.key !== d.key))}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">{t.total}</span>
            <span>
              <span className="font-semibold">{Math.round(totals.kcal)} kcal</span>
              <span className="text-muted">
                {" "}
                · P {Math.round(totals.protein)} · C {Math.round(totals.carbs)} · F{" "}
                {Math.round(totals.fat)}
              </span>
            </span>
          </div>
          <button
            className="btn btn-primary w-full"
            onClick={addAll}
            disabled={saving || validCount === 0}
          >
            {saving
              ? t.loading
              : t.ai_add_all.replace("{meal}", t[meal]).replace("{n}", String(validCount))}
          </button>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

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
        {items.map((f, i) => {
          const serving =
            f.serving_g && (lang === "tr" ? f.serving_label_tr : f.serving_label_en);
          return (
            <li key={f.id ?? `${f.barcode}-${i}`}>
              <button
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                onClick={() => onPick(f)}
              >
                <div className="min-w-0">
                  <p className="truncate">
                    {foodName(f, lang)}
                    {f.source === "ai" && (
                      <span className="ml-2 text-[10px] align-middle rounded-full border border-border px-1.5 py-0.5 text-muted">
                        {t.source_ai}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {f.brand ? `${f.brand} · ` : ""}
                    {serving
                      ? `${serving} ≈ ${Math.round(scale(f.kcal_100, f.serving_g!))} kcal`
                      : `${f.kcal_100} kcal ${t.per_100g}`}
                    {f.source === "custom" ? ` · ${t.source_custom}` : ""}
                  </p>
                </div>
                <span className="text-accent text-xl">+</span>
              </button>
            </li>
          );
        })}
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
      {hit.source === "ai" && <p className="text-xs text-muted mt-1">✨ {t.ai_estimate_note}</p>}

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
