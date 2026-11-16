# KaloriTakip

Calorie & macro tracker — Türkçe / English. Next.js + Supabase, mobile-first web app.

## Features (v0.1)

- Email/password auth (Supabase)
- Onboarding → daily calorie + macro target (Mifflin-St Jeor, goal & pace)
- Food diary by meal (breakfast / lunch / dinner / snacks), per-gram or per-serving
- Food search: shared Turkish food database + your custom foods + Open Food Facts (packaged products)
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
5. **Project Settings → API**: copy *Project URL* and *anon public* key.

### 2. Local

```bash
cp .env.example .env.local   # paste URL + anon key
npm install
npm run dev
```

Open http://localhost:3000.

### 3. Vercel

Import the GitHub repo, add the two env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`), deploy.
Then in Supabase **Authentication → URL Configuration** set *Site URL* to your Vercel URL and add it to *Redirect URLs*.

## Structure

```
src/
  app/
    (auth)/login, signup, forgot-password
    (app)/           # tab-bar pages: home, diary, diary/add, progress, profile
    onboarding/
    api/foods/search # local DB + Open Food Facts
    api/foods/barcode
  components/        # TabBar, CalorieRing, MacroRow, ProfileProvider, …
  lib/
    nutrition.ts     # BMR/TDEE/macros, helpers
    data.ts          # Supabase queries
    off.ts           # Open Food Facts client
    i18n/            # en.ts, tr.ts, context
    supabase/        # client + server helpers
  proxy.ts           # auth redirect (Next.js "proxy", formerly middleware)
supabase/
  schema.sql, seed_foods.sql
```

## Roadmap

- Photo logging (Gemini) and barcode scanning (camera)
- Reminders / notifications
- Google sign-in
- Recipes (multi-ingredient custom foods)
- Exercise & step sync
