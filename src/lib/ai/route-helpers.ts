import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { currentUserId } from "@/lib/profile";
import { adminClient } from "@/lib/supabase/admin";
import { AI_DAILY_LIMIT } from "@/lib/constants";
import { AiNotConfigured } from "./gemini";
import { refundCredit, takeCredit } from "./shared";
import type { AiErrorCode } from "./codes";

export function aiError(code: AiErrorCode, status: number, extra: object = {}) {
  return NextResponse.json({ error: code, ...extra }, { status });
}

/** Auth + config checks shared by the AI routes. */
export async function aiContext(): Promise<
  { ok: true; userId: string; admin: SupabaseClient } | { ok: false; res: NextResponse }
> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, res: aiError("unauthorized", 401) };
  const admin = adminClient();
  if (!admin || !process.env.GEMINI_API_KEY) {
    return { ok: false, res: aiError("not_configured", 503) };
  }
  return { ok: true, userId, admin };
}

/**
 * Runs `fn` after taking one credit. Gives the credit back if the AI call fails.
 * Returns the credits left together with the result.
 */
export async function withCredit<T>(
  admin: SupabaseClient,
  userId: string,
  fn: () => Promise<T>
): Promise<{ ok: true; result: T; remaining: number } | { ok: false; res: NextResponse }> {
  const remaining = await takeCredit(admin, userId, AI_DAILY_LIMIT);
  if (remaining < 0) return { ok: false, res: aiError("limit", 429, { remaining: 0 }) };
  try {
    const result = await fn();
    return { ok: true, result, remaining };
  } catch (e) {
    await refundCredit(admin, userId).catch(() => {});
    if (e instanceof AiNotConfigured) return { ok: false, res: aiError("not_configured", 503) };
    console.error("AI call failed", e);
    return { ok: false, res: aiError("failed", 502, { remaining: remaining + 1 }) };
  }
}
