import type { FoodHit } from "./types";

const UA = "KaloriTakip/0.1 (https://github.com/hamzayz0307/diet-app)";

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_tr?: string;
  product_name_en?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

function num(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function offToHit(p: OffProduct): FoodHit | null {
  const n = p.nutriments ?? {};
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === null) {
    const kj = num(n["energy_100g"]);
    if (kj !== null) kcal = kj / 4.184;
  }
  if (kcal === null) return null;

  const base = p.product_name?.trim() ?? "";
  const nameTr = p.product_name_tr?.trim() || base;
  const nameEn = p.product_name_en?.trim() || base;
  if (!nameTr && !nameEn) return null;

  const serving = num(p.serving_quantity);

  return {
    id: null,
    name_en: nameEn || nameTr,
    name_tr: nameTr || nameEn,
    brand: p.brands?.split(",")[0]?.trim() || null,
    barcode: p.code ?? null,
    kcal_100: Math.round(kcal),
    protein_100: num(n["proteins_100g"]) ?? 0,
    carbs_100: num(n["carbohydrates_100g"]) ?? 0,
    fat_100: num(n["fat_100g"]) ?? 0,
    serving_g: serving && serving > 0 ? serving : null,
    serving_label_en: serving ? "1 serving" : null,
    serving_label_tr: serving ? "1 porsiyon" : null,
    source: "off",
  };
}

const FIELDS =
  "code,product_name,product_name_tr,product_name_en,brands,serving_quantity,nutriments";

/** Drops products with missing or impossible nutrition values. */
export function plausible(h: FoodHit): boolean {
  if (h.kcal_100 <= 0 || h.kcal_100 > 900) return false;
  if (h.protein_100 < 0 || h.carbs_100 < 0 || h.fat_100 < 0) return false;
  if (h.protein_100 + h.carbs_100 + h.fat_100 > 105) return false;
  if (h.name_tr.length < 2 || h.name_tr.length > 80) return false;
  return true;
}

const fold = (s: string) =>
  s
    .replace(/[Çç]/g, "c")
    .replace(/[Ğğ]/g, "g")
    .replace(/[İIı]/g, "i")
    .replace(/[Öö]/g, "o")
    .replace(/[Şş]/g, "s")
    .replace(/[Üü]/g, "u")
    .toLowerCase()
    .trim();

/** Packaged products sold in Turkey, most-scanned first. */
export async function searchOff(q: string, lang: "en" | "tr"): Promise<FoodHit[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", q);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "24");
  url.searchParams.set("lc", lang);
  url.searchParams.set("tagtype_0", "countries");
  url.searchParams.set("tag_contains_0", "contains");
  url.searchParams.set("tag_0", "turkey");
  url.searchParams.set("sort_by", "unique_scans_n");
  url.searchParams.set("fields", FIELDS);

  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { products?: OffProduct[] };

  const seen = new Set<string>();
  const out: FoodHit[] = [];
  for (const p of json.products ?? []) {
    const h = offToHit(p);
    if (!h || !plausible(h)) continue;
    const key = `${fold(h.name_tr)}|${fold(h.brand ?? "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
    if (out.length >= 12) break;
  }
  return out;
}

export async function lookupBarcode(code: string): Promise<FoodHit | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
    { headers: { "User-Agent": UA }, next: { revalidate: 86400 } }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { status?: number; product?: OffProduct };
  if (!json.product) return null;
  return offToHit(json.product);
}
