-- 120_feedback_requests_coach_delete.sql
-- feedback_requests (088) has SELECT/INSERT/UPDATE policies scoped to
-- coach_id = auth.uid() but no DELETE policy, so a coach can't clean up
-- their own stale/test requests at all -- RLS defaults to deny when no
-- policy matches. Deleting a request cascades (already defined in 088:
-- feedback_responses.feedback_request_id references ... on delete cascade,
-- and feedback_answers/safeguarding_flags/response_disputes cascade from
-- there in turn), so this one policy is sufficient for a coach to fully
-- remove one of their own requests and everything under it.

create policy "Coach can delete own feedback requests"
  on public.feedback_requests for delete
  using (coach_id = auth.uid());
