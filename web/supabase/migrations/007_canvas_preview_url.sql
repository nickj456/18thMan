-- Migration 007: Separate canvas preview from YouTube thumbnail
alter table drills
  add column if not exists canvas_preview_url text;

-- Move existing preview_image_url values that are Supabase storage URLs into canvas_preview_url
-- (YouTube thumbnails stay in preview_image_url)
update drills
  set canvas_preview_url = preview_image_url,
      preview_image_url = null
  where preview_image_url like '%supabase.co%';
