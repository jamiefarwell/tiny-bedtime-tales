-- Accounts, story tokens, subscriptions and family sync.
-- Run after 0001–0003. Money and tokens are only ever changed by the server
-- (service role) through the functions below; families can read their own rows.

-- ---------------------------------------------------------------------------
-- Family data, stored as documents keyed by the app's own ids so the phone's
-- local copy and the cloud copy merge without translation.
-- ---------------------------------------------------------------------------
create table if not exists public.family_children (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists family_children_user_idx on public.family_children(user_id);

create table if not exists public.family_stories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  child_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists family_stories_user_idx on public.family_stories(user_id, created_at desc);

alter table public.family_children enable row level security;
alter table public.family_stories enable row level security;
create policy "family manages own children" on public.family_children
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "family manages own stories" on public.family_stories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Wallet: two buckets.
--   plan_tokens  — topped up each month by an active plan; roll over up to cap
--   extra_tokens — bought in packs (or gifted); never expire
-- Spending uses plan tokens first.
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_tokens integer not null default 0 check (plan_tokens >= 0),
  extra_tokens integer not null default 0 check (extra_tokens >= 0),
  plan_code text,                       -- e.g. 'family'; null when no plan
  plan_status text not null default 'none'
    check (plan_status in ('none','trialing','active','past_due','canceled')),
  tokens_per_month integer not null default 0,
  rollover_cap integer not null default 0,
  next_refill_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
create policy "family reads own wallet" on public.wallets for select using (auth.uid() = user_id);

create table if not exists public.token_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  bucket text not null check (bucket in ('plan','extra')),
  kind text not null check (kind in (
    'welcome','plan_refill','pack_purchase','spend_story','refund_story','free_redo','adjustment'
  )),
  ref text,                              -- story id, Stripe invoice / session id…
  note text default '',
  created_at timestamptz not null default now()
);
-- One grant per Stripe object and one spend per story: webhooks and retries
-- can never double-count.
create unique index if not exists token_ledger_kind_ref_uniq on public.token_ledger(kind, ref) where ref is not null;
create index if not exists token_ledger_user_idx on public.token_ledger(user_id, created_at desc);
alter table public.token_ledger enable row level security;
create policy "family reads own ledger" on public.token_ledger for select using (auth.uid() = user_id);

-- Every new parent gets a wallet with their first story free.
create or replace function public.handle_new_parent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.wallets (user_id, extra_tokens) values (new.id, 1) on conflict do nothing;
  insert into public.token_ledger (user_id, delta, bucket, kind, ref, note)
    values (new.id, 1, 'extra', 'welcome', 'welcome:' || new.id, 'First story free');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_wallet on auth.users;
create trigger on_auth_user_created_wallet after insert on auth.users
  for each row execute procedure public.handle_new_parent();

-- Lazily apply any monthly refills that are due. Works for monthly and yearly
-- billing alike without a scheduler: called whenever the wallet is read or spent.
create or replace function public.refill_wallet(p_user uuid)
returns public.wallets language plpgsql security definer set search_path = public as $$
declare w public.wallets; before integer;
begin
  select * into w from public.wallets where user_id = p_user for update;
  if not found then
    insert into public.wallets (user_id) values (p_user) returning * into w;
  end if;
  while w.plan_status in ('active','trialing') and w.next_refill_at is not null and w.next_refill_at <= now() loop
    before := w.plan_tokens;
    update public.wallets
      set plan_tokens = least(plan_tokens + tokens_per_month, rollover_cap),
          next_refill_at = next_refill_at + interval '1 month',
          updated_at = now()
      where user_id = p_user returning * into w;
    -- Record what was actually added (the rollover cap may have trimmed it).
    insert into public.token_ledger (user_id, delta, bucket, kind, ref, note)
      values (p_user, w.plan_tokens - before, 'plan', 'plan_refill',
              'refill:' || p_user || ':' || to_char(w.next_refill_at - interval '1 month', 'YYYY-MM-DD'),
              'Monthly story tokens')
      on conflict do nothing;
  end loop;
  return w;
end;
$$;

-- Spend one token for a story. Atomic; raises 'no_tokens' if empty.
-- A free redo (one per story, within 24h of the original) costs nothing.
create or replace function public.spend_story_token(p_user uuid, p_story text, p_redo_of text default null)
returns table (plan_tokens integer, extra_tokens integer, bucket text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare w public.wallets; b text;
begin
  w := public.refill_wallet(p_user);

  if p_redo_of is not null
     and exists (select 1 from public.token_ledger l
                 where l.user_id = p_user and l.kind = 'spend_story' and l.ref = p_redo_of
                   and l.created_at > now() - interval '24 hours')
     and not exists (select 1 from public.token_ledger l where l.kind = 'free_redo' and l.ref = p_redo_of) then
    insert into public.token_ledger (user_id, delta, bucket, kind, ref, note)
      values (p_user, 0, 'plan', 'free_redo', p_redo_of, 'Free redo for ' || p_story);
    return query select w.plan_tokens, w.extra_tokens, 'free'::text;
    return;
  end if;

  if w.plan_tokens > 0 then
    update public.wallets set plan_tokens = wallets.plan_tokens - 1, updated_at = now() where user_id = p_user returning * into w;
    b := 'plan';
  elsif w.extra_tokens > 0 then
    update public.wallets set extra_tokens = wallets.extra_tokens - 1, updated_at = now() where user_id = p_user returning * into w;
    b := 'extra';
  else
    raise exception 'no_tokens';
  end if;
  insert into public.token_ledger (user_id, delta, bucket, kind, ref, note)
    values (p_user, -1, b, 'spend_story', p_story, 'Personalised story');
  return query select w.plan_tokens, w.extra_tokens, b;
end;
$$;

-- Give a token back when a story fails to generate.
create or replace function public.refund_story_token(p_user uuid, p_story text)
returns void language plpgsql security definer set search_path = public as $$
declare spent public.token_ledger;
begin
  select * into spent from public.token_ledger where user_id = p_user and kind = 'spend_story' and ref = p_story;
  if not found then return; end if;
  insert into public.token_ledger (user_id, delta, bucket, kind, ref, note)
    values (p_user, 1, spent.bucket, 'refund_story', p_story, 'Story failed; token returned')
    on conflict do nothing;
  if found then
    if spent.bucket = 'plan' then
      update public.wallets set plan_tokens = plan_tokens + 1, updated_at = now() where user_id = p_user;
    else
      update public.wallets set extra_tokens = extra_tokens + 1, updated_at = now() where user_id = p_user;
    end if;
  end if;
end;
$$;

-- Add pack tokens exactly once per Stripe checkout session.
create or replace function public.grant_pack_tokens(p_user uuid, p_amount integer, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.token_ledger (user_id, delta, bucket, kind, ref, note)
    values (p_user, p_amount, 'extra', 'pack_purchase', p_ref, p_amount || ' story tokens');
  update public.wallets set extra_tokens = extra_tokens + p_amount, updated_at = now() where user_id = p_user;
exception when unique_violation then
  null; -- already granted
end;
$$;

-- Only the server may call the money functions.
revoke all on function public.refill_wallet(uuid) from public, anon, authenticated;
revoke all on function public.spend_story_token(uuid, text, text) from public, anon, authenticated;
revoke all on function public.refund_story_token(uuid, text) from public, anon, authenticated;
revoke all on function public.grant_pack_tokens(uuid, integer, text) from public, anon, authenticated;
