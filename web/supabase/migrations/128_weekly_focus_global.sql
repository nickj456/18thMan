-- Weekly Focus was strictly per-club (club_id not null, RLS scoped to the
-- caller's own club_id) -- content posted by the platform admin for their
-- own club was only ever visible to that one club's members, invisible to
-- every other coach including anyone not in a club at all. This makes
-- club_id nullable: null means a global focus, visible to every
-- authenticated user regardless of club membership.
alter table public.weekly_focuses
  alter column club_id drop not null;

-- The existing unique(club_id, week_start) constraint doesn't stop multiple
-- global (null club_id) rows for the same week, since SQL treats each NULL
-- as distinct -- a partial index enforces "at most one global focus per
-- week" the same way the per-club constraint enforces one-per-club.
create unique index weekly_focuses_global_week_idx
  on public.weekly_focuses(week_start)
  where club_id is null;

drop policy "weekly_focuses_select" on public.weekly_focuses;
create policy "weekly_focuses_select"
  on public.weekly_focuses for select to authenticated
  using (
    club_id is null
    or exists (select 1 from public.profiles where id = auth.uid() and club_id = weekly_focuses.club_id)
  );

drop policy "weekly_focuses_insert" on public.weekly_focuses;
create policy "weekly_focuses_insert"
  on public.weekly_focuses for insert to authenticated
  with check (
    (club_id is null and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    or exists (select 1 from public.profiles where id = auth.uid() and club_id = weekly_focuses.club_id and role = 'admin')
  );

drop policy "weekly_focuses_update" on public.weekly_focuses;
create policy "weekly_focuses_update"
  on public.weekly_focuses for update to authenticated
  using (
    (club_id is null and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    or exists (select 1 from public.profiles where id = auth.uid() and club_id = weekly_focuses.club_id and role = 'admin')
  );

drop policy "weekly_focuses_delete" on public.weekly_focuses;
create policy "weekly_focuses_delete"
  on public.weekly_focuses for delete to authenticated
  using (
    (club_id is null and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    or exists (select 1 from public.profiles where id = auth.uid() and club_id = weekly_focuses.club_id and role = 'admin')
  );

-- Comments follow the same club-or-global visibility as their parent focus.
drop policy "weekly_focus_comments_select" on public.weekly_focus_comments;
create policy "weekly_focus_comments_select"
  on public.weekly_focus_comments for select to authenticated
  using (
    exists (
      select 1 from public.weekly_focuses wf
      where wf.id = weekly_focus_comments.focus_id
        and (
          wf.club_id is null
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.club_id = wf.club_id)
        )
    )
  );

drop policy "weekly_focus_comments_insert" on public.weekly_focus_comments;
create policy "weekly_focus_comments_insert"
  on public.weekly_focus_comments for insert to authenticated
  with check (
    exists (
      select 1 from public.weekly_focuses wf
      where wf.id = weekly_focus_comments.focus_id
        and (
          wf.club_id is null
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.club_id = wf.club_id)
        )
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('coach', 'admin'))
    )
  );
