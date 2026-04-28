-- Fix FK on delete behavior (migration 052 applied without ON DELETE clauses)

-- notification_id: set null when notification is deleted
alter table public.email_sends
  drop constraint if exists email_sends_notification_id_fkey;
alter table public.email_sends
  add constraint email_sends_notification_id_fkey
  foreign key (notification_id) references public.notifications(id) on delete set null;

-- created_by: set null when admin profile is deleted
alter table public.email_campaigns
  drop constraint if exists email_campaigns_created_by_fkey;
alter table public.email_campaigns
  add constraint email_campaigns_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- Add updated_at to email_campaigns for status transition auditing
alter table public.email_campaigns
  add column if not exists updated_at timestamptz not null default now();
