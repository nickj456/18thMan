-- ============================================================
-- Migration 045: Private Supabase Storage bucket for video clip annotations
-- ============================================================

-- Create the bucket (private — coaches' footage is proprietary, access via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clip-annotations',
  'clip-annotations',
  false,
  52428800,  -- 50MB limit per file
  array['video/mp4', 'video/webm']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload clips to their own folder
create policy "clip_annotations_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'clip-annotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own clips
create policy "clip_annotations_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'clip-annotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own clips
create policy "clip_annotations_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'clip-annotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to select/read their own clips (needed for signed URL generation)
create policy "clip_annotations_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'clip-annotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
