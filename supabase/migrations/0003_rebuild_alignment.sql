-- Align the schema with the October 2026 rebuild (see docs/STRATEGY.md).
-- Safe to run on a fresh project after 0001 and 0002.

-- Inclusive story levels, pronouns and structured profile fields.
alter table public.child_profiles drop constraint if exists child_profiles_age_band_check;
alter table public.child_profiles
  add constraint child_profiles_age_band_check
  check (age_band in ('Newborn–1','2–3','4–5','6–7','8–9','10–12','Older kids'));

alter table public.child_profiles
  add column if not exists pronouns text not null default 'they' check (pronouns in ('she','he','they')),
  add column if not exists loves jsonb not null default '[]'::jsonb,
  add column if not exists companions jsonb not null default '[]'::jsonb,
  add column if not exists avoid jsonb not null default '[]'::jsonb,
  -- Locked look for illustrated stories (skin tone, hair, glasses...). No photos.
  add column if not exists hero_look jsonb not null default '{}'::jsonb;

alter table public.child_profiles drop column if exists favourite_things;

-- Stories become chapters in a series.
alter table public.stories
  add column if not exists hook text default '',
  add column if not exists world text default '',
  add column if not exists mood text default '',
  add column if not exists chapter integer not null default 1,
  add column if not exists model text default '',
  add column if not exists prompt_version text default '';

alter table public.stories drop constraint if exists stories_story_format_check;

-- Ready-to-Read catalogue (public, read-only to families).
create table if not exists public.books (
  slug text primary key,
  title text not null,
  ages text not null,
  minutes integer not null,
  tags jsonb not null default '[]'::jsonb,
  hook text not null default '',
  blurb text not null default '',
  cover_path text,
  art_status text not null default 'pending' check (art_status in ('final','interim','pending')),
  content jsonb not null,            -- cast, style, pages, timings
  published boolean not null default false,
  subscriber_only boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.books enable row level security;
create policy "anyone reads published books" on public.books for select using (published);
create trigger books_touch before update on public.books for each row execute procedure public.touch_updated_at();

-- Where each family is up to, per book or story.
create table if not exists public.reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,            -- 'book:<slug>' or 'story:<uuid>'
  page integer not null default 0,
  finished boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);
alter table public.reading_progress enable row level security;
create policy "parents manage own progress" on public.reading_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-family reader preferences (sleepy mode, narration, text size...).
create table if not exists public.family_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.family_settings enable row level security;
create policy "parents manage own settings" on public.family_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Generation cost tracking.
alter table public.generation_events
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists cache_read_tokens integer,
  add column if not exists cost_usd numeric(10,6),
  add column if not exists prompt_version text default '';
