-- Drip sequence tracking for leads
alter table public.leads
  add column if not exists drip_week         int  not null default 0,
  add column if not exists last_drip_at      timestamptz,
  add column if not exists drip_unsubscribed boolean not null default false;

-- Index for the daily cron query
create index if not exists leads_drip_pending_idx
  on public.leads (drip_week, last_drip_at)
  where drip_unsubscribed = false;
