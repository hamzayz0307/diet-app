import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupBarcode } from "@/lib/off";

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim();
  if (!/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: "bad_code" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: local } = await supabase
    .from("foods")
    .select("*")
    .eq("barcode", code)
    .limit(1)
    .maybeSingle();
  if (local) return NextResponse.json({ hit: local });

  const hit = await lookupBarcode(code).catch(() => null);
  return NextResponse.json({ hit });
}
