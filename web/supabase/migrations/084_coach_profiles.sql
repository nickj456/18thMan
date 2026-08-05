-- 084_coach_profiles.sql
create table public.coach_profiles (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null unique references public.profiles(id) on delete cascade,
  age_group                   text not null,
  experience_level            text not null,
  primary_profile_type        text,
  secondary_profile_type      text,
  current_focus_category_id   uuid references public.dna_categories(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index coach_profiles_user_id_idx on public.coach_profiles(user_id);

alter table public.coach_profiles enable row level security;

create policy "Coach can view own coach profile"
  on public.coach_profiles for select
  using (user_id = auth.uid());

create policy "Coach can insert own coach profile"
  on public.coach_profiles for insert
  with check (user_id = auth.uid());

create policy "Coach can update own coach profile"
  on public.coach_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
