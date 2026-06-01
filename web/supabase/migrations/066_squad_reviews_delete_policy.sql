-- Enable RLS on squad_reviews (idempotent) and add delete policies.
-- Who can delete a review:
--   1. Platform admin (profiles.role = 'admin')
--   2. Group creator (coaching_groups.created_by = auth.uid())
--   3. Group admin (group_invitations.group_role = 'admin' + accepted)
--   4. Club admin in the group's club (profiles.club_role = 'admin' + matching club_id)

alter table public.squad_reviews enable row level security;

create policy "delete_squad_reviews"
  on public.squad_reviews
  for delete
  using (
    -- platform admin
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
    or
    -- group creator
    (group_id is not null and exists (
      select 1 from public.coaching_groups
      where id = squad_reviews.group_id
        and created_by = auth.uid()
    ))
    or
    -- group admin (accepted invitation with group_role = 'admin')
    (group_id is not null and exists (
      select 1 from public.group_invitations
      where group_id = squad_reviews.group_id
        and user_id = auth.uid()
        and group_role = 'admin'
        and status = 'accepted'
    ))
    or
    -- club admin for the club that owns this group
    (group_id is not null and exists (
      select 1 from public.coaching_groups cg
      join public.profiles p on p.club_id = cg.club_id
      where cg.id = squad_reviews.group_id
        and p.id = auth.uid()
        and p.club_role = 'admin'
    ))
  );
