import { NextResponse, type NextRequest } from "next/server";
import { currentUserId } from "@/lib/profile";
import { searchOff } from "@/lib/off";

/** Packaged products (Open Food Facts, Turkey) — only called when the user asks for them. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "tr";
  if (q.length < 2) return NextResponse.json({ items: [] });

  if (!(await currentUserId())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const items = await searchOff(q, lang);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [], error: "unavailable" }, { status: 502 });
  }
}
