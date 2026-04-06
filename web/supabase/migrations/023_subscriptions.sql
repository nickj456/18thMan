-- ── Subscription Tiers ───────────────────────────────────────────────────────

-- 1. Subscription tier enum
create type public.subscription_tier as enum ('free', 'club');

-- 2. Add subscription fields to clubs
alter table public.clubs
  add column subscription_tier  public.subscription_tier not null default 'free',
  add column stripe_customer_id      text,
  add column stripe_subscription_id  text;

-- 3. Add trial + stripe fields to profiles
alter table public.profiles
  add column trial_ends_at       timestamptz,
  add column trial_used          boolean not null default false;

-- 4. Feature overrides table (admin-controlled)
create table public.feature_overrides (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('user', 'club')),
  target_id    uuid not null,
  feature      text not null,
  enabled      boolean not null default true,
  expires_at   timestamptz,
  created_by   uuid not null references public.profiles(id) on delete restrict,
  created_at   timestamptz not null default now()
);

-- Unique: one override per target+feature
create unique index feature_overrides_target_feature_idx
  on public.feature_overrides (target_type, target_id, feature);

create index feature_overrides_target_id_idx on public.feature_overrides (target_id);

-- RLS: only admins can manage overrides
alter table public.feature_overrides enable row level security;

create policy "feature_overrides_admin"
  on public.feature_overrides for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Helper: get effective tier for a user
--    Returns 'club' if:
--      - user's club has subscription_tier = 'club'
--      - OR user has an active trial
--      - OR admin override exists (checked in app layer for flexibility)
create or replace function public.effective_tier(p_user_id uuid)
returns text
language sql
stable
security definer set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.profiles p
      join public.clubs c on c.id = p.club_id
      where p.id = p_user_id and c.subscription_tier = 'club'
    ) then 'club'
    when exists (
      select 1 from public.profiles p
      where p.id = p_user_id
        and p.trial_ends_at is not null
        and p.trial_ends_at > now()
    ) then 'trial'
    else 'free'
  end
$$;
