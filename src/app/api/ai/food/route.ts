import { NextResponse, type NextRequest } from "next/server";
import { estimateFood } from "@/lib/ai/gemini";
import { findOrSaveShared, findShared } from "@/lib/ai/shared";
import { aiContext, aiError, withCredit } from "@/lib/ai/route-helpers";

export const maxDuration = 30;

/** POST { name } → { food, remaining?, cached } */
export async function POST(req: NextRequest) {
  const ctx = await aiContext();
  if (!ctx.ok) return ctx.res;

  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  const name = String(body.name ?? "").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 60) return aiError("bad_input", 400);

  // Already in the shared list → free, no AI call.
  const cached = await findShared(ctx.admin, name);
  if (cached) return NextResponse.json({ food: cached, cached: true });

  const run = await withCredit(ctx.admin, ctx.userId, () => estimateFood(name));
  if (!run.ok) return run.res;
  if (!run.result) return aiError("not_food", 422, { remaining: run.remaining });

  const food = await findOrSaveShared(ctx.admin, run.result);
  return NextResponse.json({ food, cached: false, remaining: run.remaining });
}
