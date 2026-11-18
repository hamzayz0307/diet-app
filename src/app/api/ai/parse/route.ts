import { NextResponse, type NextRequest } from "next/server";
import { parseMeal } from "@/lib/ai/gemini";
import { findOrSaveShared } from "@/lib/ai/shared";
import { aiContext, aiError, withCredit } from "@/lib/ai/route-helpers";

export const maxDuration = 30;

/** POST { text } → { items: [{ food, grams }], remaining } */
export async function POST(req: NextRequest) {
  const ctx = await aiContext();
  if (!ctx.ok) return ctx.res;

  const body = (await req.json().catch(() => ({}))) as { text?: unknown };
  const text = String(body.text ?? "").trim();
  if (text.length < 2 || text.length > 400) return aiError("bad_input", 400);

  const run = await withCredit(ctx.admin, ctx.userId, () => parseMeal(text));
  if (!run.ok) return run.res;

  // Each item becomes (or reuses) a shared food, so it can be logged and found later.
  const items = await Promise.all(
    run.result.map(async (item) => ({
      food: await findOrSaveShared(ctx.admin, item),
      grams: item.grams,
    }))
  );

  return NextResponse.json({ items, remaining: run.remaining });
}
