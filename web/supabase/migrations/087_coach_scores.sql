-- 087_coach_scores.sql
create type public.score_source_type as enum ('self', 'player_voice', 'peer_observation', 'parent_voice');
create type public.coach_score_status as enum ('scored', 'insufficient_data');

create table public.coach_scores (
  id                   uuid primary key default gen_random_uuid(),
  coach_id             uuid not null references public.profiles(id) on delete cascade,
  category_id          uuid not null references public.dna_categories(id),
  source_type          public.score_source_type not null,
  score                numeric not null,
  sample_size          integer not null default 0,
  calculation_version  integer not null default 1,
  calculated_at        timestamptz not null default now(),
  unique (coach_id, category_id, source_type, calculation_version)
);

create table public.coach_category_scores (
  id                          uuid primary key default gen_random_uuid(),
  coach_id                    uuid not null references public.profiles(id) on delete cascade,
  category_id                 uuid not null references public.dna_categories(id),
  status                      public.coach_score_status not null,
  blended_score               numeric,
  insufficient_data_message   text,
  calculation_version         integer not null default 1,
  calculated_at               timestamptz not null default now(),
  unique (coach_id, category_id),
  constraint blended_score_matches_status check (
    (status = 'scored' and blended_score is not null)
    or (status = 'insufficient_data' and blended_score is null)
  )
);

create index coach_scores_coach_id_idx on public.coach_scores(coach_id);
create index coach_category_scores_coach_id_idx on public.coach_category_scores(coach_id);

alter table public.coach_scores enable row level security;
alter table public.coach_category_scores enable row level security;

create policy "Coach can view own scores"
  on public.coach_scores for select
  using (coach_id = auth.uid());

create policy "Coach can view own category scores"
  on public.coach_category_scores for select
  using (coach_id = auth.uid());
