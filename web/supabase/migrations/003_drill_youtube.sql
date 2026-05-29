-- Add YouTube + AI guide fields to drills
alter table public.drills
  add column if not exists youtube_url text,
  add column if not exists ai_guide    jsonb;
