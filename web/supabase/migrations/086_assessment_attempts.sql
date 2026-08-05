-- 086_assessment_attempts.sql
create table public.assessment_attempts (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references public.profiles(id) on delete cascade,
  assessment_type public.assessment_type not null,
  version         integer not null default 1,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create table public.assessment_responses (
  id                uuid primary key default gen_random_uuid(),
  attempt_id        uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id       uuid not null references public.assessment_questions(id),
  selected_option   uuid references public.assessment_options(id),
  written_response  text,
  response_value    numeric,
  unique (attempt_id, question_id)
);

create index assessment_attempts_coach_id_idx on public.assessment_attempts(coach_id);
create index assessment_responses_attempt_id_idx on public.assessment_responses(attempt_id);

alter table public.assessment_attempts enable row level security;
alter table public.assessment_responses enable row level security;

create policy "Coach can view own attempts"
  on public.assessment_attempts for select
  using (coach_id = auth.uid());

create policy "Coach can insert own attempts"
  on public.assessment_attempts for insert
  with check (coach_id = auth.uid());

create policy "Coach can update own attempts"
  on public.assessment_attempts for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "Coach can view own responses"
  on public.assessment_responses for select
  using (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = assessment_responses.attempt_id and a.coach_id = auth.uid()
    )
  );

create policy "Coach can insert own responses"
  on public.assessment_responses for insert
  with check (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = assessment_responses.attempt_id and a.coach_id = auth.uid()
    )
  );

create policy "Coach can update own responses"
  on public.assessment_responses for update
  using (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = assessment_responses.attempt_id and a.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assessment_attempts a
      where a.id = assessment_responses.attempt_id and a.coach_id = auth.uid()
    )
  );
