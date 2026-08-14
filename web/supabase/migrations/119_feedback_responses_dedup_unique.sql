-- 119_feedback_responses_dedup_unique.sql
-- submitFeedbackResponse() (web/src/app/feedback/[token]/actions.ts) checks
-- for an existing feedback_responses row with the same
-- (feedback_request_id, device_fingerprint_hash) before inserting a new
-- one -- but that check-then-insert has no database backstop, so two
-- near-simultaneous submissions from the same device (double-click, a
-- retried request, a scripted resubmit) can both pass the check before
-- either insert lands, producing two distinct response rows for the same
-- respondent. That silently pads a request's response count past
-- minimum_response_threshold without a second real respondent, undermining
-- the anonymity floor the threshold exists to guarantee.
--
-- Add the missing uniqueness guarantee at the database level. The app
-- catches the resulting unique-violation (23505) and returns the same
-- friendly "already submitted" message it already returns for the
-- check-then-insert path, so this is a silent hardening, not a new
-- user-facing error shape.

alter table public.feedback_responses
  add constraint feedback_responses_request_device_unique
  unique (feedback_request_id, device_fingerprint_hash);
