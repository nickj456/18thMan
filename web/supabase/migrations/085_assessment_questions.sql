-- 085_assessment_questions.sql
create type public.assessment_type as enum ('self_assessment', 'player_voice', 'peer_observation');

create table public.assessment_questions (
  id              uuid primary key default gen_random_uuid(),
  assessment_type public.assessment_type not null,
  question_text   text not null,
  question_format text not null,
  age_group       text,
  active          boolean not null default true,
  version         integer not null default 1,
  created_at      timestamptz not null default now(),
  constraint age_group_only_for_player_voice check (
    (assessment_type = 'player_voice' and age_group is not null)
    or (assessment_type <> 'player_voice' and age_group is null)
  )
);

create table public.assessment_options (
  id                    uuid primary key default gen_random_uuid(),
  question_id           uuid not null references public.assessment_questions(id) on delete cascade,
  option_text           text not null,
  category_weights_json jsonb not null default '{}'::jsonb
);

create index assessment_questions_type_idx on public.assessment_questions(assessment_type, active);
create index assessment_options_question_id_idx on public.assessment_options(question_id);

alter table public.assessment_questions enable row level security;
alter table public.assessment_options enable row level security;

create policy "Anyone authenticated can read questions"
  on public.assessment_questions for select
  using (auth.uid() is not null);

create policy "Admins can manage questions"
  on public.assessment_questions for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Anyone authenticated can read options"
  on public.assessment_options for select
  using (auth.uid() is not null);

create policy "Admins can manage options"
  on public.assessment_options for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
