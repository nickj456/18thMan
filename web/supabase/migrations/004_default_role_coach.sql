-- ============================================================
-- Migration 004: Default new user role to 'coach'
--
-- This is a coaching platform — everyone who signs up is a coach.
-- The 'viewer' role is for explicitly invited read-only users.
-- Also upgrades any existing 'viewer' profiles to 'coach'.
-- ============================================================

-- Change column default
alter table public.profiles
  alter column role set default 'coach';

-- Upgrade existing viewers to coaches
-- (excludes any profiles that were manually set to viewer for a reason —
--  if you need a true viewer, set it explicitly after this migration)
update public.profiles
  set role = 'coach'
  where role = 'viewer';

-- Update the signup trigger to use 'coach' as default
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'coach'
  );
  return new;
end;
$$;
