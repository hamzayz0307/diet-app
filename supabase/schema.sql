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
  source text not null default 'custom',
  created_at timestamptz not null default now()
);

-- sources: seed = our list, custom = user's own, off = Open Food Facts, ai = estimated by AI
alter table public.foods drop constraint if exists foods_source_check;
alter table public.foods add constraint foods_source_check
  check (source in ('seed', 'custom', 'off', 'ai'));

-- Turkish-aware search key: lower-case, ç→c ğ→g ı/İ→i ö→o ş→s ü→u
create or replace function public.fold(t text)
returns text
language sql immutable parallel safe
as $$
  select lower(translate(coalesce(t, ''),
    'ÇĞİIÖŞÜÂÎÛçğıöşüâîû',
    'CGIIOSUAIUcgiosuaiu'))
$$;

alter table public.foods add column if not exists search_key text
  generated always as (
    public.fold(name_tr) || ' ' || public.fold(name_en) || ' ' || public.fold(brand)
  ) stored;

create index if not exists foods_barcode_idx on public.foods (barcode);

-- one shared row per food name (keeps AI-added foods from duplicating)
create unique index if not exists foods_shared_name_uniq
  on public.foods (public.fold(name_tr)) where owner is null;

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

-- Ranked food search, called from the app.
-- Order: exact name → first word is the query ("Süt (tam yağlı)") → whole word
-- elsewhere ("Beyaz peynir") → name starts with it ("Sütlaç") → a word starts
-- with it → contains; then the user's own
-- foods, our list, AI-added, packaged; then shorter names.
-- Also matches Turkish consonant softening: ekmek → ekmeği, kebap → kebabı.
create or replace function public.search_foods(q text, max_results int default 30)
returns setof public.foods
language sql stable
set search_path = public
as $$
  with t as (
    select k,
      case when length(k) >= 4 and right(k, 1) in ('k', 'p', 't')
        then left(k, -1) || translate(right(k, 1), 'kpt', 'gbd')
        else k end as k2
    from (select replace(replace(public.fold(trim(q)), '%', ''), '_', '') as k) s
  )
  select f.*
  from public.foods f
  cross join t
  cross join lateral (
    select public.fold(f.name_tr) as ntr, public.fold(f.name_en) as nen
  ) n
  where length(t.k) >= 2
    and (f.owner is null or f.owner = auth.uid())
    and (f.search_key like '%' || t.k || '%' or f.search_key like '%' || t.k2 || '%')
  order by
    case
      when n.ntr = t.k or n.nen = t.k then 0
      when n.ntr like t.k || ' %' or n.ntr like t.k || ' (%'
        or n.nen like t.k || ' %' or n.nen like t.k || ' (%' then 1
      when n.ntr like '% ' || t.k or n.ntr like '% ' || t.k || ' %' or n.ntr like '% ' || t.k || ' (%'
        or n.nen like '% ' || t.k or n.nen like '% ' || t.k || ' %' or n.nen like '% ' || t.k || ' (%' then 2
      when n.ntr like t.k || '%' or n.nen like t.k || '%' then 3
      when f.search_key like '% ' || t.k || '%' or f.search_key like '%(' || t.k || '%'
        or f.search_key like '% ' || t.k2 || '%' then 4
      else 5
    end,
    case
      when f.owner = auth.uid() and f.source <> 'off' then 0
      when f.source = 'seed' then 1
      when f.source = 'ai' then 2
      when f.owner = auth.uid() then 3
      else 4
    end,
    length(f.name_tr)
  limit greatest(1, least(max_results, 50));
$$;

grant execute on function public.search_foods(text, int) to authenticated;

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
-- ai_usage (daily AI request counter; written only by the server)
-- ---------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage: read own" on public.ai_usage;
create policy "ai_usage: read own" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Takes one AI credit for today (Istanbul time). Returns credits left, or -1 if
-- the daily limit is reached. Only the server (secret key) may call these.
create or replace function public.use_ai_credit(uid uuid, daily_limit int)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  used int;
begin
  insert into public.ai_usage (user_id, day, count)
  values (uid, (now() at time zone 'Europe/Istanbul')::date, 1)
  on conflict (user_id, day) do update
    set count = public.ai_usage.count + 1
    where public.ai_usage.count < daily_limit
  returning count into used;

  if used is null then
    return -1;
  end if;
  return daily_limit - used;
end;
$$;

-- Gives a credit back when the AI call itself failed.
create or replace function public.refund_ai_credit(uid uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.ai_usage set count = greatest(0, count - 1)
  where user_id = uid and day = (now() at time zone 'Europe/Istanbul')::date;
$$;

revoke all on function public.use_ai_credit(uuid, int) from public, anon, authenticated;
revoke all on function public.refund_ai_credit(uuid) from public, anon, authenticated;
grant execute on function public.use_ai_credit(uuid, int) to service_role;
grant execute on function public.refund_ai_credit(uuid) to service_role;

-- Finds a shared food by Turkish name, ignoring case and ç/ş/ı… differences.
create or replace function public.find_shared_food(name text)
returns setof public.foods
language sql stable
set search_path = public
as $$
  select * from public.foods
  where owner is null and public.fold(name_tr) = public.fold(name)
  limit 1;
$$;

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
