-- Add open and click tracking to email_sends
alter table public.email_sends
  add column if not exists opened_at  timestamptz,
  add column if not exists clicked_at timestamptz;

create index if not exists email_sends_campaign_opened_idx
  on public.email_sends(campaign_id, opened_at)
  where opened_at is not null;
