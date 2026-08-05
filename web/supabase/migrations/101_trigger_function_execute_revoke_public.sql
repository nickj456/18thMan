-- 101_trigger_function_execute_revoke_public.sql
-- Follow-up to 100_trigger_function_execute_revoke.sql: `revoke execute ... from
-- anon, authenticated` was a no-op because Postgres grants EXECUTE on new functions
-- to the PUBLIC pseudo-role by default, and anon/authenticated inherit through
-- PUBLIC rather than holding a direct grant (privileges are evaluated additively,
-- same lesson as the table-level SELECT revoke in 075_clubs_hide_stripe_columns.sql
-- -- a role-level revoke does nothing while the broader PUBLIC grant remains).
-- Verified via has_function_privilege('anon', ..., 'EXECUTE') still returning true
-- after 100 was applied. Revoke from PUBLIC directly this time.

revoke execute on function public.prevent_feedback_request_tampering() from public;
revoke execute on function public.prevent_response_dispute_tampering() from public;
revoke execute on function public.prevent_safeguarding_flag_evidence_edit() from public;
