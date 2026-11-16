import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchOff } from "@/lib/off";
import type { FoodHit } from "@/lib/types";

/** Case/diacritic-insensitive-ish pattern for Postgres ilike. */
function pattern(q: string) {
  return `%${q.replace(/[%_]/g, "")}%`;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "tr";
  const includeOff = req.nextUrl.searchParams.get("off") !== "0";

  if (q.length < 2) return NextResponse.json({ local: [], off: [] });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const localPromise = supabase
    .from("foods")
    .select("*")
    .or(`name_tr.ilike.${pattern(q)},name_en.ilike.${pattern(q)},brand.ilike.${pattern(q)}`)
    .order("source", { ascending: false }) // custom > seed > off
    .limit(25);

  const offPromise = includeOff ? searchOff(q, lang).catch(() => []) : Promise.resolve([]);

  const [{ data: local }, off] = await Promise.all([localPromise, offPromise]);

  // Drop OFF hits that are already saved locally (same barcode).
  const knownBarcodes = new Set((local ?? []).map((f) => f.barcode).filter(Boolean));
  const offFiltered = off.filter((h) => !h.barcode || !knownBarcodes.has(h.barcode));

  return NextResponse.json({
    local: (local ?? []) as FoodHit[],
    off: offFiltered,
  });
}
