-- ── Coach Pro Tier ────────────────────────────────────────────────────────────

-- 1. Add 'coach' value to the subscription_tier enum
alter type public.subscription_tier add value 'coach';

-- 2. Add individual subscription fields to profiles
alter table public.profiles
  add column subscription_tier  public.subscription_tier not null default 'free',
  add column stripe_customer_id      text,
  add column stripe_subscription_id  text;

-- 3. Update helper: effective_tier now handles coach tier
--    Resolution order:
--      1. Club subscription (club beats individual)
--      2. Active trial
--      3. Individual coach subscription
--      4. Free
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
    when exists (
      select 1 from public.profiles p
      where p.id = p_user_id
        and p.subscription_tier = 'coach'
    ) then 'coach'
    else 'free'
  end
$$;
