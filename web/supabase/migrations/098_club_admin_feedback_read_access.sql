-- 098_club_admin_feedback_read_access.sql
-- Fix 6 (important, human-approved): feedback_responses/feedback_answers SELECT was
-- gated on platform-wide role = 'admin' only — a club admin reviewing a flag or
-- resolving a dispute for their own club's coach could not see the underlying
-- feedback. Extend read access to club admins scoped to their own club, additively
-- (existing policies are left in place).
--
-- Because of 093's column-level GRANT restricting what `authenticated` can SELECT
-- from feedback_responses at all, this new policy only grants row-visibility on top
-- of that restriction — club admins see the same restricted column set as coaches
-- (no device_fingerprint_hash / respondent_id_nullable leak to club admins either).

create policy "Club admins can view feedback responses for their club"
  on public.feedback_responses for select
  using (
    exists (
      select 1 from public.feedback_requests r
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where r.id = feedback_responses.feedback_request_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
  );

create policy "Club admins can view feedback answers for their club"
  on public.feedback_answers for select
  using (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where resp.id = feedback_answers.feedback_response_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
  );
