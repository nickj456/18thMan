-- Add YouTube channel attribution to drills
alter table public.drills
  add column youtube_channel_title text,
  add column youtube_channel_id    text;
