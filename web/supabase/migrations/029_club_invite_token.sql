-- ── Club Invite Token ────────────────────────────────────────────────────────
-- Adds a shareable invite token to clubs. Anyone with the link can join the club
-- without needing to be found/invited individually by the admin.

alter table public.clubs
  add column invite_token uuid not null unique default gen_random_uuid();

-- Anyone (including unauthenticated) can look up a club by invite token.
-- We need anon access so the /join/[token] page can show the club name before login.
create policy "clubs_select_by_token"
  on public.clubs for select
  to anon
  using (true);

-- Club admin can regenerate their own invite token
create policy "clubs_update_own"
  on public.clubs for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.club_id = clubs.id
        and p.club_role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.club_id = clubs.id
        and p.club_role = 'admin'
    )
  );
