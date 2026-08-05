-- 088_feedback_requests.sql
create type public.feedback_type as enum ('player_voice', 'peer_observation');
create type public.respondent_type as enum ('player', 'parent', 'peer_coach');
create type public.feedback_request_status as enum ('active', 'paused', 'expired');

create table public.feedback_requests (
  id                           uuid primary key default gen_random_uuid(),
  coach_id                     uuid not null references public.profiles(id) on delete cascade,
  feedback_type                public.feedback_type not null,
  team_id                      uuid references public.coaching_groups(id) on delete set null,
  token                        text not null unique,
  anonymous                    boolean not null default true,
  expires_at                   timestamptz not null,
  minimum_response_threshold   integer not null default 3,
  status                       public.feedback_request_status not null default 'active',
  created_at                   timestamptz not null default now()
);

create table public.feedback_responses (
  id                        uuid primary key default gen_random_uuid(),
  feedback_request_id      uuid not null references public.feedback_requests(id) on delete cascade,
  respondent_type           public.respondent_type not null,
  respondent_id_nullable     uuid references public.profiles(id),
  submitted_at               timestamptz not null default now(),
  held_for_review            boolean not null default false,
  device_fingerprint_hash    text not null
);

create table public.feedback_answers (
  id                    uuid primary key default gen_random_uuid(),
  feedback_response_id  uuid not null references public.feedback_responses(id) on delete cascade,
  question_id           uuid not null references public.assessment_questions(id),
  numeric_value         numeric,
  written_value         text
);

create index feedback_requests_coach_id_idx on public.feedback_requests(coach_id);
create index feedback_requests_token_idx on public.feedback_requests(token);
create index feedback_responses_request_id_idx on public.feedback_responses(feedback_request_id);
create index feedback_answers_response_id_idx on public.feedback_answers(feedback_response_id);

alter table public.feedback_requests enable row level security;
alter table public.feedback_responses enable row level security;
alter table public.feedback_answers enable row level security;

create policy "Coach can view own feedback requests"
  on public.feedback_requests for select
  using (coach_id = auth.uid());

create policy "Coach can create own feedback requests"
  on public.feedback_requests for insert
  with check (coach_id = auth.uid());

create policy "Coach can update own feedback requests"
  on public.feedback_requests for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "Coach can view responses to own requests"
  on public.feedback_responses for select
  using (
    exists (
      select 1 from public.feedback_requests r
      where r.id = feedback_responses.feedback_request_id and r.coach_id = auth.uid()
    )
  );

create policy "Admins can view all feedback responses"
  on public.feedback_responses for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Coach can view answers to own requests"
  on public.feedback_answers for select
  using (
    exists (
      select 1 from public.feedback_responses resp
      join public.feedback_requests r on r.id = resp.feedback_request_id
      where resp.id = feedback_answers.feedback_response_id and r.coach_id = auth.uid()
    )
  );

create policy "Admins can view all feedback answers"
  on public.feedback_answers for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
