-- ── Phase 1 extension: Club Admin Role ───────────────────────────────────────
-- Adds club_role to profiles so a coach can be designated as their club's admin.
-- Club admins can invite/remove members from their own club without platform admin access.

create type public.club_role as enum ('admin', 'member');

alter table public.profiles
  add column club_role public.club_role;

-- When a coach joins a club (invite accepted), club_role is set to 'member' by the app.
-- Platform admin can promote a member to 'admin' from /admin/clubs/[id].
-- Clearing club_id also clears club_role (handled in app layer, not a DB constraint,
-- because we want both cleared atomically).

-- ── RLS: club invitations ─────────────────────────────────────────────────────

-- Club admin can insert invitations for their own club
create policy "club_invitations_club_admin_insert"
  on public.club_invitations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.club_id = club_id
        and p.club_role = 'admin'
    )
  );

-- Club admin can read all invitations for their own club
create policy "club_invitations_club_admin_select"
  on public.club_invitations for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.club_id = club_id
        and p.club_role = 'admin'
    )
  );

-- ── Index ─────────────────────────────────────────────────────────────────────
create index profiles_club_role_idx on public.profiles(club_role) where club_role is not null;
