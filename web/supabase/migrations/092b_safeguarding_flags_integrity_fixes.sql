-- 092b_safeguarding_flags_integrity_fixes.sql
-- Fix 1: Tie reviewed_by to auth.uid() to ensure admins can only attribute reviews to themselves
-- Fix 2: Add immutability constraint on evidence columns (flagged_text, detection_method, feedback_answer_id)

drop policy "Club admins can review flags for their club's coaches" on public.safeguarding_flags;

create policy "Club admins can review flags for their club's coaches"
  on public.safeguarding_flags for update
  using (
    exists (
      select 1 from public.feedback_answers ans
      join public.feedback_responses resp on resp.id = ans.feedback_response_id
      join public.feedback_requests r on r.id = resp.feedback_request_id
      join public.profiles coach on coach.id = r.coach_id
      join public.profiles admin on admin.id = auth.uid()
      where ans.id = safeguarding_flags.feedback_answer_id
        and admin.club_id = coach.club_id
        and admin.club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    (
      exists (
        select 1 from public.feedback_answers ans
        join public.feedback_responses resp on resp.id = ans.feedback_response_id
        join public.feedback_requests r on r.id = resp.feedback_request_id
        join public.profiles coach on coach.id = r.coach_id
        join public.profiles admin on admin.id = auth.uid()
        where ans.id = safeguarding_flags.feedback_answer_id
          and admin.club_id = coach.club_id
          and admin.club_role = 'admin'
      )
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
    and reviewed_by = auth.uid()
  );

create or replace function public.prevent_safeguarding_flag_evidence_edit()
returns trigger language plpgsql as $$
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

create trigger safeguarding_flags_evidence_immutable
  before update on public.safeguarding_flags
  for each row execute function public.prevent_safeguarding_flag_evidence_edit();
