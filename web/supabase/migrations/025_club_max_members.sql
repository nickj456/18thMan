-- Add max_members cap to clubs. NULL = unlimited.
alter table public.clubs
  add column max_members integer check (max_members is null or max_members >= 1);
