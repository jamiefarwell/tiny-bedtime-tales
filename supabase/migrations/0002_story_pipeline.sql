-- Tiny Bedtime Tales operational story pipeline additions
-- Prepared for the production Supabase project once provisioned.

create table if not exists public.story_versions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null default 1,
  title text not null,
  strapline text default '',
  pages jsonb not null default '[]'::jsonb,
  bedtime_line text default '',
  series_memory text default '',
  generation_engine text default '',
  model text default '',
  prompt_version text default '',
  created_at timestamptz not null default now(),
  unique(story_id, version_number)
);

create table if not exists public.story_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid not null references public.child_profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  job_type text not null default 'story' check (job_type in ('story','illustration','narration')),
  status text not null default 'queued' check (status in ('queued','writing','checking','illustrating','narrating','ready','failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  error_message text default '',
  provider text default '',
  model text default '',
  estimated_cost_usd numeric(10,6),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  story_version_id uuid references public.story_versions(id) on delete cascade,
  asset_type text not null check (asset_type in ('illustration','audio')),
  page_index integer,
  storage_path text not null,
  provider text default '',
  model text default '',
  status text not null default 'ready' check (status in ('queued','generating','ready','failed')),
  estimated_cost_usd numeric(10,6),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.story_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  rating text check (rating in ('loved','okay','not_right')),
  reason text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.generation_configs (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  prompt_version text not null,
  primary_model text not null,
  fallback_models jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists story_versions_story_idx on public.story_versions(story_id, version_number desc);
create index if not exists story_jobs_user_status_idx on public.story_jobs(user_id, status, created_at desc);
create index if not exists media_assets_story_idx on public.media_assets(story_id, asset_type);
create index if not exists story_feedback_story_idx on public.story_feedback(story_id);

alter table public.story_versions enable row level security;
alter table public.story_jobs enable row level security;
alter table public.media_assets enable row level security;
alter table public.story_feedback enable row level security;
alter table public.generation_configs enable row level security;

create policy "parents manage own story versions" on public.story_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "parents read own story jobs" on public.story_jobs
  for select using (auth.uid() = user_id);
create policy "parents read own media assets" on public.media_assets
  for select using (auth.uid() = user_id);
create policy "parents manage own story feedback" on public.story_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "authenticated users read generation configs" on public.generation_configs
  for select using (auth.role() = 'authenticated');

create trigger story_jobs_touch before update on public.story_jobs
for each row execute procedure public.touch_updated_at();
create trigger generation_configs_touch before update on public.generation_configs
for each row execute procedure public.touch_updated_at();
