-- 089_coach_reflections.sql
create table public.coach_reflections (
  id                  uuid primary key default gen_random_uuid(),
  coach_id            uuid not null references public.profiles(id) on delete cascade,
  session_id_nullable uuid,
  match_id_nullable   uuid,
  reflection_type     text not null,
  answers_json        jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create table public.recommendations (
  id                  uuid primary key default gen_random_uuid(),
  coach_id            uuid not null references public.profiles(id) on delete cascade,
  category_id         uuid not null references public.dna_categories(id),
  recommendation_type text not null,
  title               text not null,
  description         text not null,
  priority            integer not null default 0,
  reason              text not null,
  dismissed_at        timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index coach_reflections_coach_id_idx on public.coach_reflections(coach_id);
create index recommendations_coach_id_idx on public.recommendations(coach_id);

alter table public.coach_reflections enable row level security;
alter table public.recommendations enable row level security;

create policy "Coach can view own reflections"
  on public.coach_reflections for select
  using (coach_id = auth.uid());

create policy "Coach can insert own reflections"
  on public.coach_reflections for insert
  with check (coach_id = auth.uid());

create policy "Coach can update own reflections"
  on public.coach_reflections for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "Coach can view own recommendations"
  on public.recommendations for select
  using (coach_id = auth.uid());

create policy "Coach can update own recommendations"
  on public.recommendations for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
