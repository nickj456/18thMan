-- 095_audit_fk_set_null_on_delete.sql
-- Fix 3 (important, human-approved): safeguard/audit records must survive deletion of
-- the person they reference. These five foreign keys point from an audit/safeguarding
-- record to the PERSON who reviewed/raised/granted it (not to the feedback data
-- itself) and previously defaulted to NO ACTION, which would block deleting a
-- profile entirely. Switch them to ON DELETE SET NULL so the audit trail persists
-- independent of account lifecycle.
--
-- Out of scope: the deeper cascade chain through the feedback data itself
-- (feedback_requests -> feedback_responses -> feedback_answers -> safeguarding_flags,
-- and feedback_responses -> response_disputes / admin_feedback_access_log) is left
-- untouched — that's a separate retention-policy question, not audit-trail integrity.

-- safeguarding_flags.reviewed_by (already nullable)
alter table public.safeguarding_flags
  drop constraint safeguarding_flags_reviewed_by_fkey;
alter table public.safeguarding_flags
  add constraint safeguarding_flags_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete set null;

-- admin_feedback_access_log.admin_id (currently not null -> must become nullable)
alter table public.admin_feedback_access_log
  alter column admin_id drop not null;
alter table public.admin_feedback_access_log
  drop constraint admin_feedback_access_log_admin_id_fkey;
alter table public.admin_feedback_access_log
  add constraint admin_feedback_access_log_admin_id_fkey
  foreign key (admin_id) references public.profiles(id) on delete set null;

-- response_disputes.raised_by (currently not null -> must become nullable)
alter table public.response_disputes
  alter column raised_by drop not null;
alter table public.response_disputes
  drop constraint response_disputes_raised_by_fkey;
alter table public.response_disputes
  add constraint response_disputes_raised_by_fkey
  foreign key (raised_by) references public.profiles(id) on delete set null;

-- response_disputes.resolved_by (already nullable)
alter table public.response_disputes
  drop constraint response_disputes_resolved_by_fkey;
alter table public.response_disputes
  add constraint response_disputes_resolved_by_fkey
  foreign key (resolved_by) references public.profiles(id) on delete set null;

-- club_guardian_consents.granted_by (currently not null -> must become nullable)
alter table public.club_guardian_consents
  alter column granted_by drop not null;
alter table public.club_guardian_consents
  drop constraint club_guardian_consents_granted_by_fkey;
alter table public.club_guardian_consents
  add constraint club_guardian_consents_granted_by_fkey
  foreign key (granted_by) references public.profiles(id) on delete set null;
