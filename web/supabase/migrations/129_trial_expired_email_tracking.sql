-- Track whether the trial-ended email has been sent, so the trial-expiry
-- cron can use a wide lookback window (it runs once a day) without
-- re-sending on the next run. Mirrors trial_warning_sent_at (migration 030).
alter table public.profiles
  add column if not exists trial_expired_email_sent_at timestamptz;
