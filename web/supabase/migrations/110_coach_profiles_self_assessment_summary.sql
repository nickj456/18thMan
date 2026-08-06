-- 110_coach_profiles_self_assessment_summary.sql
alter table public.coach_profiles
  alter column age_group drop not null,
  alter column experience_level drop not null;

alter table public.coach_profiles
  add column ai_summary jsonb,
  add column ai_summary_generated_at timestamptz;
