-- 093_feedback_responses_column_grants_and_review_gate.sql
-- Fix 1 (critical): feedback_responses exposed device_fingerprint_hash and
-- respondent_id_nullable to any role with row-level SELECT access (coach, admin),
-- allowing correlation of anonymous responses across surveys by device fingerprint.
-- Column-level GRANTs restrict what authenticated can actually SELECT, following the
-- precedent in 075_clubs_hide_stripe_columns.sql. device_fingerprint_hash and
-- respondent_id_nullable become invisible to anon/authenticated entirely (including
-- admins querying via the anon/authenticated key) — only service-role code (rate
-- limiting / dedup) should ever read those columns.
--
-- Fix 7 (cheap partial fix): a response held for review (e.g. suspected near-duplicate
-- spam) must be invisible to the coach until an admin clears it. Recreate the two
-- existing coach-facing SELECT policies with an added held_for_review = false guard.
-- This does not apply to admin policies — admins must see held-for-review items to
-- triage them.

revoke select on public.feedback_responses from anon, authenticated;

grant select (id, feedback_request_id, respondent_type, submitted_at, held_for_review)
  on public.feedback_responses to authenticated;

drop policy "Coach can view responses to own requests" on public.feedback_responses;

create policy "Coach can view responses to own requests"
  on public.feedback_responses for select
  using (
    held_for_review = false
    and exists (
      select 1 from public.feedback_requests r
      where r.id = feedback_responses.feedback_request_id and r.coach_id = auth.uid()
    )
  );

drop policy "Coach can view answers to own requests" on public.feedback_answers;

create policy "Coach can view answers to own requests"
  on public.feedback_answers for select
  using (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      where resp.id = feedback_answers.feedback_response_id
        and r.coach_id = auth.uid()
        and resp.held_for_review = false
    )
  );
