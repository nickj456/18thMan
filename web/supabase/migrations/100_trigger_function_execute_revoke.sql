-- 100_trigger_function_execute_revoke.sql
-- Fix 5 follow-up: the security advisor flagged prevent_feedback_request_tampering,
-- prevent_response_dispute_tampering, and prevent_safeguarding_flag_evidence_edit as
-- SECURITY DEFINER functions directly callable by anon/authenticated via PostgREST
-- RPC (Postgres grants EXECUTE on new functions to PUBLIC by default). These are
-- trigger functions only ever meant to run as `before update` triggers — Postgres
-- itself rejects calling a trigger-returning function directly, but the dangling
-- EXECUTE grant is still an unnecessary exposed surface. Revoke it; trigger
-- invocation is unaffected because triggers fire under the table owner regardless
-- of EXECUTE grants on the function.
--
-- NOTE: this revoke target (anon, authenticated) turned out to be insufficient —
-- see 101_trigger_function_execute_revoke_public.sql, which revokes from PUBLIC,
-- the role that actually holds the default EXECUTE grant.

revoke execute on function public.prevent_feedback_request_tampering() from anon, authenticated;
revoke execute on function public.prevent_response_dispute_tampering() from anon, authenticated;
revoke execute on function public.prevent_safeguarding_flag_evidence_edit() from anon, authenticated;
