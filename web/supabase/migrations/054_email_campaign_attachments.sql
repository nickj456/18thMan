-- Add attachments column to email_campaigns
-- Each attachment: { type: 'file'|'session_plan', url: string, filename: string }
alter table public.email_campaigns
  add column if not exists attachments jsonb not null default '[]';

-- Create email-assets storage bucket (public read, admin write)
insert into storage.buckets (id, name, public)
values ('email-assets', 'email-assets', true)
on conflict (id) do nothing;

create policy "Public read email assets"
  on storage.objects for select
  using (bucket_id = 'email-assets');

create policy "Admins can upload email assets"
  on storage.objects for insert
  with check (
    bucket_id = 'email-assets' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete email assets"
  on storage.objects for delete
  using (
    bucket_id = 'email-assets' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
