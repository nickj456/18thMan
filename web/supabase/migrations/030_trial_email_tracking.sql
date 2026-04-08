-- Track whether the 24h trial warning email has been sent, so the cron
-- job doesn't re-send it on every hourly run.
alter table public.profiles
  add column trial_warning_sent_at timestamptz;
