# KaloriTakip

Calorie & macro tracker — Türkçe / English. Next.js + Supabase, mobile-first web app.

## Features (v0.1)

- Email/password auth (Supabase)
- Onboarding → daily calorie + macro target (Mifflin-St Jeor, goal & pace)
- Food diary by meal (breakfast / lunch / dinner / snacks), per-gram or per-serving
- Food search ranked in the database (exact → first word → whole word → prefix), Turkish-aware
  (ç/ş/ı/İ, ekmek → ekmeği), straight from the browser to Supabase
- AI (Gemini): type a whole meal ("2 yumurta, 1 simit, şekersiz çay") → editable items;
  "Ask AI" when search finds nothing. AI answers are saved to the shared list, so the
  next person gets them instantly and free. 30 AI requests per user per day.
- Packaged products (Open Food Facts, sold in Turkey) only when the user asks
- Daily summary ring, macro bars, water counter, quick weight log
- Progress: weight chart (30 / 90 days / all), last-7-days calories, logging streak
- Profile: edit targets, water goal, language toggle, log out, delete account
- Installable as a PWA (manifest included)

## Setup

### 1. Supabase

1. Create a new project.
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
3. New query → paste `supabase/seed_foods.sql` → **Run** (shared Turkish food list).
4. **Authentication → Providers → Email**: for testing with friends you can turn off *Confirm email*.
5. **Project Settings → API Keys**: copy the *publishable* key and create a *secret* key.

### 2. Vercel

Import the GitHub repo and add the four env vars from `.env.example`
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `GEMINI_API_KEY`), deploy.
Then in Supabase **Authentication → URL Configuration** set *Site URL* to your Vercel URL.

Keep Vercel's function region next to the Supabase region (`vercel.json` → `regions`).

Re-running `schema.sql` on an existing project is safe; it only adds what's missing.

## Structure

```
src/
  app/
    (auth)/login, signup, forgot-password
    (app)/           # tab-bar pages: home, diary, diary/add, progress, profile
    onboarding/
    api/ai/parse     # meal text → foods (Gemini)
    api/ai/food      # one food name → nutrition (cached in shared list)
    api/foods/packaged, api/foods/barcode   # Open Food Facts
  components/        # TabBar, CalorieRing, MacroRow, ProfileProvider, …
  lib/
    nutrition.ts     # BMR/TDEE/macros, helpers
    data.ts          # Supabase queries
    off.ts           # Open Food Facts client
    ai/              # Gemini prompts, shared-food cache, daily limit
    i18n/            # en.ts, tr.ts, context
    supabase/        # client + server helpers
  proxy.ts           # auth redirect (Next.js "proxy", formerly middleware)
supabase/
  schema.sql, seed_foods.sql
```

## Roadmap

- Photo logging (Gemini) and barcode scanning (camera)
- Bigger built-in Turkish food list
- Reminders / notifications
- Google sign-in
- Recipes (multi-ingredient custom foods)
- Exercise & step sync
