-- Public bucket for shop product preview images (thumbnails shown on /shop).
-- Separate from the private shop-assets bucket, which holds the paid
-- PDF/video content itself.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-previews',
  'shop-previews',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "shop_previews_admin_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'shop-previews' and public.is_admin())
  with check (bucket_id = 'shop-previews' and public.is_admin());

create policy "shop_previews_select"
  on storage.objects for select
  to public
  using (bucket_id = 'shop-previews');
