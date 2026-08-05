-- 103_response_dispute_tampering_guard_allow_raised_by_null.sql
-- Fix B (important, re-review of 096): response_disputes.raised_by was changed to
-- on delete set null in migration 095, but the prevent_response_dispute_tampering
-- trigger (096) blocks any change to raised_by, including the legitimate SET NULL
-- performed when the raising user's profile is deleted. This defeats the purpose of
-- 095 (letting account deletion succeed while preserving the audit record).
--
-- Permit the transition to NULL (account deletion) while still blocking any attempt to
-- re-point raised_by to a different non-null profile id.

create or replace function public.prevent_response_dispute_tampering()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.feedback_response_id is distinct from OLD.feedback_response_id
    or (NEW.raised_by is distinct from OLD.raised_by and NEW.raised_by is not null)
    or NEW.reason is distinct from OLD.reason
    or NEW.created_at is distinct from OLD.created_at
  then
    raise exception 'feedback_response_id, raised_by, reason, and created_at are immutable on response_disputes';
  end if;
  return NEW;
end;
$$;
