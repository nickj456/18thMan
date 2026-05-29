-- Add AI-generated summary to session plans
alter table public.session_plans
  add column if not exists ai_summary jsonb;
