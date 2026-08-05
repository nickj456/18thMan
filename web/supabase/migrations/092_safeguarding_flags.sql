-- 092_safeguarding_flags.sql
create type public.safeguarding_flag_status as enum ('open', 'reviewed', 'dismissed');
create type public.flag_detection_method as enum ('automated', 'manual');

create table public.safeguarding_flags (
  id                 uuid primary key default gen_random_uuid(),
  feedback_answer_id uuid not null references public.feedback_answers(id) on delete cascade,
  flagged_text       text not null,
  detection_method   public.flag_detection_method not null,
  status             public.safeguarding_flag_status not null default 'open',
  reviewed_by        uuid references public.profiles(id),
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now()
);

create table public.admin_feedback_access_log (
  id                   uuid primary key default gen_random_uuid(),
  admin_id             uuid not null references public.profiles(id),
  feedback_response_id uuid not null references public.feedback_responses(id) on delete cascade,
  action               text not null,
  accessed_at          timestamptz not null default now()
);

create index safeguarding_flags_answer_id_idx on public.safeguarding_flags(feedback_answer_id);
create index admin_feedback_access_log_response_id_idx on public.admin_feedback_access_log(feedback_response_id);

alter table public.safeguarding_flags enable row level security;
alter table public.admin_feedback_access_log enable row level security;

create policy "Club admins can view flags for their club's coaches"
  on public.safeguarding_flags for select
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
  );

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

create policy "Platform admins can view the access log"
  on public.admin_feedback_access_log for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
