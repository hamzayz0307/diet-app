-- KaloriTakip — Supabase schema
-- Run this whole file in Supabase → SQL Editor → New query → Run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- profiles (1 row per user, created automatically on sign-up)
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  language text not null default 'tr' check (language in ('en', 'tr')),
  sex text check (sex in ('male', 'female')),
  birth_year int,
  height_cm numeric,
  weight_kg numeric,
  activity text check (activity in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text check (goal in ('lose', 'maintain', 'gain')),
  weekly_rate_kg numeric default 0.5,
  calorie_target int,
  protein_g int,
  carbs_g int,
  fat_g int,
  water_target_ml int not null default 2000,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- foods (shared seed rows have owner = null; user rows have owner)
-- ---------------------------------------------------------------
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users (id) on delete cascade,
  name_en text not null,
  name_tr text not null,
  brand text,
  barcode text,
  kcal_100 numeric not null,
  protein_100 numeric not null default 0,
  carbs_100 numeric not null default 0,
  fat_100 numeric not null default 0,
  serving_g numeric,
  serving_label_en text,
  serving_label_tr text,
  source text not null default 'custom' check (source in ('seed', 'custom', 'off')),
  created_at timestamptz not null default now()
);

create index if not exists foods_name_en_idx on public.foods (lower(name_en));
create index if not exists foods_name_tr_idx on public.foods (lower(name_tr));
create index if not exists foods_barcode_idx on public.foods (barcode);

alter table public.foods enable row level security;

drop policy if exists "foods: read shared or own" on public.foods;
create policy "foods: read shared or own" on public.foods
  for select using (owner is null or owner = auth.uid());

drop policy if exists "foods: insert own" on public.foods;
create policy "foods: insert own" on public.foods
  for insert with check (owner = auth.uid());

drop policy if exists "foods: update own" on public.foods;
create policy "foods: update own" on public.foods
  for update using (owner = auth.uid());

drop policy if exists "foods: delete own" on public.foods;
create policy "foods: delete own" on public.foods
  for delete using (owner = auth.uid());

-- ---------------------------------------------------------------
-- diary_entries (nutrition is copied in at log time)
-- ---------------------------------------------------------------
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id uuid references public.foods (id) on delete set null,
  name text not null,
  grams numeric not null,
  kcal numeric not null,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists diary_user_date_idx on public.diary_entries (user_id, date);

alter table public.diary_entries enable row level security;

drop policy if exists "diary: own rows" on public.diary_entries;
create policy "diary: own rows" on public.diary_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- weight_logs (one per day)
-- ---------------------------------------------------------------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.weight_logs enable row level security;

drop policy if exists "weight: own rows" on public.weight_logs;
create policy "weight: own rows" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- water_logs (one per day, running total in ml)
-- ---------------------------------------------------------------
create table if not exists public.water_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  ml int not null default 0,
  primary key (user_id, date)
);

alter table public.water_logs enable row level security;

drop policy if exists "water: own rows" on public.water_logs;
create policy "water: own rows" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- account deletion (called from the app; deletes the auth user,
-- cascades remove all data)
-- ---------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
