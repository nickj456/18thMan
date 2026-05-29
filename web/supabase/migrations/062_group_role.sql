-- Add group_role to group_invitations so platform admins can designate group admins.
-- NULL = regular member, 'admin' = group admin (multiple allowed per group).

alter table public.group_invitations
  add column group_role text check (group_role in ('admin', 'member')) default null;
