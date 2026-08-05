-- 102_feedback_request_tampering_guard_allow_team_null.sql
-- Fix A (important, re-review of 094): feedback_requests.team_id references
-- public.coaching_groups(id) on delete set null (088_feedback_requests.sql). When a
-- coaching_groups row is deleted, Postgres performs the SET NULL as a real UPDATE on
-- feedback_requests, which fires the prevent_feedback_request_tampering BEFORE UPDATE
-- trigger added in 094. That trigger currently blocks ANY change to team_id, including
-- this legitimate nulling — so deleting a team with an attached feedback request would
-- fail with a confusing "immutable" error instead of successfully nulling the reference.
--
-- Permit the transition to NULL (team deletion / legitimate un-scoping) while still
-- blocking any attempt to re-point team_id to a different non-null value.

create or replace function public.prevent_feedback_request_tampering()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.anonymous is distinct from OLD.anonymous
    or NEW.token is distinct from OLD.token
    or NEW.feedback_type is distinct from OLD.feedback_type
    or (NEW.team_id is distinct from OLD.team_id and NEW.team_id is not null)
    or NEW.minimum_response_threshold < OLD.minimum_response_threshold
  then
    raise exception 'anonymous, token, feedback_type, team_id are immutable on feedback_requests, and minimum_response_threshold cannot be decreased';
  end if;
  return NEW;
end;
$$;
