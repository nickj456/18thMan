-- 094_feedback_request_tampering_guard.sql
-- Fix 2 (critical): the coach UPDATE policy on feedback_requests permitted rewriting
-- ANY column, including minimum_response_threshold (could be zeroed out, defeating
-- the minimum-threshold safeguard), anonymous (could be flipped false after an
-- anonymous link was already distributed to children), token (could be rotated), and
-- team_id/feedback_type. Only status (pause/resume) was intended to be coach-editable
-- after creation; expires_at is intentionally left mutable (extending a collection
-- window before natural expiry is legitimate coach behaviour).

alter table public.feedback_requests
  add constraint minimum_response_threshold_floor check (minimum_response_threshold >= 3);

create or replace function public.prevent_feedback_request_tampering()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.anonymous is distinct from OLD.anonymous
    or NEW.token is distinct from OLD.token
    or NEW.feedback_type is distinct from OLD.feedback_type
    or NEW.team_id is distinct from OLD.team_id
    or NEW.minimum_response_threshold < OLD.minimum_response_threshold
  then
    raise exception 'anonymous, token, feedback_type, team_id are immutable on feedback_requests, and minimum_response_threshold cannot be decreased';
  end if;
  return NEW;
end;
$$;

create trigger feedback_requests_tampering_guard
  before update on public.feedback_requests
  for each row execute function public.prevent_feedback_request_tampering();
