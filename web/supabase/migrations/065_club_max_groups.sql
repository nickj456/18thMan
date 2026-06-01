-- Add per-club group limit (null = platform default of 5)
alter table public.clubs
  add column if not exists max_groups integer check (max_groups is null or max_groups >= 1);

-- Drop the old hard-coded trigger; enforcement moves to app layer
drop trigger if exists enforce_club_group_limit on public.coaching_groups;
drop function if exists public.check_club_group_limit();
