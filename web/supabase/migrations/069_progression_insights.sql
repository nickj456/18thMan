-- 069_progression_insights.sql
create table public.progression_insights (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.clubs(id),
  scope            text not null,
  session_ids_hash text not null,
  content          text not null,
  generated_at     timestamptz not null default now(),
  unique (club_id, scope, session_ids_hash)
);

alter table public.progression_insights enable row level security;

create policy "pi_select"
  on public.progression_insights for select
  to authenticated
  using (club_id = (select club_id from public.profiles where id = auth.uid()));

create policy "pi_insert"
  on public.progression_insights for insert
  to authenticated
  with check (club_id = (select club_id from public.profiles where id = auth.uid()));

create policy "pi_update"
  on public.progression_insights for update
  to authenticated
  using (club_id = (select club_id from public.profiles where id = auth.uid()));
