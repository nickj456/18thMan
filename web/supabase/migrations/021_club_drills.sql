-- ── Phase: Club-Private Drills ───────────────────────────────────────────────

-- 1. Add club_id to drills
alter table public.drills
  add column club_id uuid references public.clubs(id) on delete set null;

create index drills_club_id_idx on public.drills(club_id);

-- 2. Helper: current user's club_id
create or replace function public.current_user_club_id()
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select club_id from public.profiles where id = auth.uid()
$$;

-- 3. Replace drills_select policy to include club visibility
--    Public:     is_public = true (and no club restriction)
--    Club:       club_id matches the viewer's club_id
--    Private:    author only
--    Admin:      sees everything
drop policy "drills_select" on public.drills;

create policy "drills_select"
  on public.drills for select
  using (
    public.is_admin()
    or auth.uid() = author_id
    or (
      is_public = true
      and club_id is null
    )
    or (
      club_id is not null
      and club_id = public.current_user_club_id()
    )
  );
