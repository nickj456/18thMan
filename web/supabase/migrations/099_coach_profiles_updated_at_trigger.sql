-- 099_coach_profiles_updated_at_trigger.sql
-- Fix 8 (important, mechanical): every other table in this codebase with an
-- updated_at column has public.set_updated_at() wired up as a before update
-- trigger (see 001_initial_schema.sql for the function, and profiles/drills/
-- session_plans for the trigger pattern). coach_profiles was missing this.

create trigger coach_profiles_updated_at
  before update on public.coach_profiles
  for each row execute procedure public.set_updated_at();
