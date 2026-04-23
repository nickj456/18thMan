-- 051_wellbeing_source_url.sql
-- Adds source_url to wellbeing_resources for AI-generated resources.

alter table public.wellbeing_resources
  add column source_url text;
