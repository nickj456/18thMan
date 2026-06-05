-- Fix infinite recursion in group_invitations RLS policies.
-- Migration 073 created policies that query group_invitations from within
-- group_invitations policies, causing Postgres to loop indefinitely.
--
-- Fix: use a SECURITY DEFINER function that runs as the function owner
-- (bypassing RLS on group_invitations), which breaks the recursion.

-- Drop the recursive policies from migration 073
drop policy if exists "group_admins_can_invite_to_their_group"             on public.group_invitations;
drop policy if exists "group_admins_can_update_invitations_in_their_group" on public.group_invitations;
drop policy if exists "group_admins_can_remove_from_their_group"           on public.group_invitations;
drop policy if exists "group_admins_can_read_group_invitations"            on public.group_invitations;

-- Security-definer helper: checks whether the current user holds group_role='admin'
-- for the given group, running as the function owner to bypass RLS and avoid recursion.
create or replace function public.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_invitations
    where group_id   = p_group_id
      and user_id    = auth.uid()
      and status     = 'accepted'
      and group_role = 'admin'
  )
$$;

-- Recreate policies using the helper (no self-reference in the policy body)
create policy "group_admins_can_invite_to_their_group"
  on public.group_invitations for insert
  with check (
    public.is_group_admin(group_invitations.group_id)
  );

create policy "group_admins_can_update_invitations_in_their_group"
  on public.group_invitations for update
  using (
    public.is_group_admin(group_invitations.group_id)
  );

create policy "group_admins_can_remove_from_their_group"
  on public.group_invitations for delete
  using (
    public.is_group_admin(group_invitations.group_id)
  );

create policy "group_admins_can_read_group_invitations"
  on public.group_invitations for select
  using (
    public.is_group_admin(group_invitations.group_id)
  );
