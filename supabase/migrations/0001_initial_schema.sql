-- Tiny Bedtime Tales initial production schema
-- Privacy principle: store only the minimum storytelling data needed.

create extension if not exists pgcrypto;

create table if not exists public.parent_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  age_band text not null check (age_band in ('4–5','6–7','8–9')),
  interests text default '',
  pets text default '',
  friends_first_names text default '',
  favourite_things text default '',
  preferred_tone text default 'Magical and adventurous',
  preferred_length text default 'Bedtime — about 7 minutes',
  avoid_topics text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  title text not null,
  world_memory text not null default '',
  status text not null default 'active' check (status in ('active','finished','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  series_id uuid references public.story_series(id) on delete set null,
  title text not null,
  strapline text default '',
  theme text not null,
  story_format text not null default 'standalone' check (story_format in ('standalone','continue','special','support')),
  package_type text not null default 'read' check (package_type in ('read','audio','illustrated')),
  reading_minutes integer not null default 7 check (reading_minutes between 1 and 30),
  pages jsonb not null default '[]'::jsonb,
  series_memory text default '',
  bedtime_line text default '',
  generation_engine text default '',
  parent_request text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null default 'preview',
  stories_remaining integer,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  child_id uuid references public.child_profiles(id) on delete set null,
  story_id uuid references public.stories(id) on delete set null,
  event_type text not null default 'story',
  model text default '',
  success boolean not null default false,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists child_profiles_user_id_idx on public.child_profiles(user_id);
create index if not exists stories_user_id_created_idx on public.stories(user_id, created_at desc);
create index if not exists stories_child_id_created_idx on public.stories(child_id, created_at desc);
create index if not exists story_series_child_id_idx on public.story_series(child_id);

alter table public.parent_profiles enable row level security;
alter table public.child_profiles enable row level security;
alter table public.story_series enable row level security;
alter table public.stories enable row level security;
alter table public.entitlements enable row level security;
alter table public.generation_events enable row level security;

create policy "parents manage own parent profile" on public.parent_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "parents manage own child profiles" on public.child_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "parents manage own story series" on public.story_series
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "parents manage own stories" on public.stories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "parents read own entitlements" on public.entitlements
  for select using (auth.uid() = user_id);
create policy "parents read own generation events" on public.generation_events
  for select using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger parent_profiles_touch before update on public.parent_profiles
for each row execute procedure public.touch_updated_at();
create trigger child_profiles_touch before update on public.child_profiles
for each row execute procedure public.touch_updated_at();
create trigger story_series_touch before update on public.story_series
for each row execute procedure public.touch_updated_at();
create trigger entitlements_touch before update on public.entitlements
for each row execute procedure public.touch_updated_at();
