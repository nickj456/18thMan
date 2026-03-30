-- ============================================================
-- Migration 005: Supabase Storage bucket for drill preview images
-- ============================================================

-- Create the bucket (public so preview images can be displayed without auth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'drill-previews',
  'drill-previews',
  true,
  2097152,  -- 2MB limit per file
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own previews
create policy "drill_previews_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'drill-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update/delete their own previews
create policy "drill_previews_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'drill-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "drill_previews_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'drill-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read (bucket is public so this is mostly for RLS completeness)
create policy "drill_previews_select"
  on storage.objects for select
  to public
  using (bucket_id = 'drill-previews');
