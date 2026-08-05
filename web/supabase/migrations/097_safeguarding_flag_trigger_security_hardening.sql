-- 097_safeguarding_flag_trigger_security_hardening.sql
-- Fix 5 (important): prevent_safeguarding_flag_evidence_edit (created in
-- 092b_safeguarding_flags_integrity_fixes.sql) lacked `security definer set
-- search_path = ''`, unlike this codebase's established hardened-function
-- convention (see 002_rls_policies.sql's is_admin()). Trigger functions can't be
-- `stable`, but should still be security definer with an empty search_path to avoid
-- search_path hijacking. create or replace is safe here — the existing trigger
-- already calls this function by name, so no drop/recreate of the trigger is needed.

create or replace function public.prevent_safeguarding_flag_evidence_edit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.flagged_text is distinct from OLD.flagged_text
    or NEW.detection_method is distinct from OLD.detection_method
    or NEW.feedback_answer_id is distinct from OLD.feedback_answer_id
  then
    raise exception 'flagged_text, detection_method, and feedback_answer_id are immutable on safeguarding_flags';
  end if;
  return NEW;
end;
$$;
