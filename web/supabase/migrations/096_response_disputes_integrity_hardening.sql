-- 096_response_disputes_integrity_hardening.sql
-- Fix 4 (important): response_disputes is the same class of record as
-- safeguarding_flags (a permanent safeguarding-adjacent decision log) but never got
-- the equivalent hardening applied in 092b_safeguarding_flags_integrity_fixes.sql.
-- A club admin resolving a dispute could previously rewrite reason, raised_by,
-- feedback_response_id (repoint to a different response in-club), and resolved_by
-- (attribute the resolution to someone else) all within the same UPDATE.

drop policy "Club admins can resolve disputes for their club's coaches" on public.response_disputes;

create policy "Club admins can resolve disputes for their club's coaches"
  on public.response_disputes for update
  using (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where resp.id = response_disputes.feedback_response_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    (
      exists (
        select 1 from public.feedback_responses resp
        join public.feedback_requests r on r.id = resp.feedback_request_id
        join public.profiles coach on coach.id = r.coach_id
        join public.profiles admin on admin.id = auth.uid()
        where resp.id = response_disputes.feedback_response_id
          and admin.club_id = coach.club_id
          and admin.club_role = 'admin'
      )
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
    and resolved_by = auth.uid()
  );

create or replace function public.prevent_response_dispute_tampering()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if NEW.feedback_response_id is distinct from OLD.feedback_response_id
    or NEW.raised_by is distinct from OLD.raised_by
    or NEW.reason is distinct from OLD.reason
    or NEW.created_at is distinct from OLD.created_at
  then
    raise exception 'feedback_response_id, raised_by, reason, and created_at are immutable on response_disputes';
  end if;
  return NEW;
end;
$$;

create trigger response_disputes_tampering_guard
  before update on public.response_disputes
  for each row execute function public.prevent_response_dispute_tampering();
