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

export async function searchOff(q: string, lang: "en" | "tr"): Promise<FoodHit[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", q);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "12");
  url.searchParams.set("lc", lang);
  url.searchParams.set("fields", FIELDS);

  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { products?: OffProduct[] };
  return (json.products ?? [])
    .map(offToHit)
    .filter((h): h is FoodHit => h !== null);
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
