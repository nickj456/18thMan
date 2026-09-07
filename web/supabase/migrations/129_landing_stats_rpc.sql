-- The public landing page shows a scoreboard of platform-wide stats (coaches
-- signed up, drills in the public library, sessions planned). RLS on
-- session_plans is coach/admin-only (own or shared plans), so an anonymous
-- visitor can't get a total count directly. This SECURITY DEFINER function
-- exposes only the three aggregate counts -- no row-level data -- to anon.
create or replace function public.get_landing_stats()
returns table (coach_count bigint, drill_count bigint, session_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.drills where is_public = true and club_id is null),
    (select count(*) from public.session_plans);
$$;

grant execute on function public.get_landing_stats() to anon, authenticated;
