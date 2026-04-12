-- Drill approval status
-- New public drills go to 'pending' until an admin approves them.
-- Private and club drills skip approval (they're not in the community library).
-- All existing drills are auto-approved so nothing breaks.

create type public.drill_approval_status as enum ('pending', 'approved', 'rejected');

alter table public.drills
  add column approval_status public.drill_approval_status not null default 'pending';

-- Auto-approve all existing drills
update public.drills set approval_status = 'approved';

-- Future inserts: public drills start as pending, others as approved
-- (The application layer handles this, but we set a sensible DB default of 'pending'
--  for public drills and override to 'approved' for private/club in the action.)

-- Update RLS select policy to exclude pending/rejected drills from the community library.
-- Admins and the drill author always see their own drills regardless of status.
drop policy if exists "drills_select" on public.drills;

create policy "drills_select"
  on public.drills for select
  using (
    public.is_admin()
    or auth.uid() = author_id
    or (
      is_public = true
      and club_id is null
      and approval_status = 'approved'
    )
    or (
      club_id is not null
      and club_id = public.current_user_club_id()
    )
  );
