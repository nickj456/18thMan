-- 052_email_system.sql

-- ── email_preferences ──────────────────────────────────────────────────────────
create table public.email_preferences (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  category   text not null,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, category)
);
create index email_preferences_user_id_idx on public.email_preferences(user_id);
alter table public.email_preferences enable row level security;
create policy "Users can manage own email preferences"
  on public.email_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── email_campaigns ────────────────────────────────────────────────────────────
create table public.email_campaigns (
  id              uuid primary key default gen_random_uuid(),
  type            text not null,
  trigger_type    text not null,
  subject         text not null default '',
  body_html       text not null default '',
  cta_label       text,
  cta_url         text,
  segment         text not null default 'all',
  status          text not null default 'draft',
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  test_sent_at    timestamptz,
  resend_batch_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index email_campaigns_status_idx on public.email_campaigns(status, scheduled_at);
create index email_campaigns_trigger_type_status_idx on public.email_campaigns(trigger_type, status);
alter table public.email_campaigns enable row level security;
create policy "Admins can manage email campaigns"
  on public.email_campaigns for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── email_campaign_items ───────────────────────────────────────────────────────
create table public.email_campaign_items (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  item_type   text not null,
  item_id     uuid not null,
  item_title  text not null,
  item_url    text not null,
  created_at  timestamptz not null default now()
);
create index email_campaign_items_campaign_id_idx on public.email_campaign_items(campaign_id);
alter table public.email_campaign_items enable row level security;
create policy "Admins can manage campaign items"
  on public.email_campaign_items for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── email_sends ────────────────────────────────────────────────────────────────
create table public.email_sends (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id),
  campaign_id       uuid references public.email_campaigns(id),
  notification_id   uuid references public.notifications(id) on delete set null,
  category          text not null,
  sent_at           timestamptz not null default now(),
  resend_message_id text
);
create index email_sends_user_id_idx on public.email_sends(user_id, sent_at desc);
create index email_sends_campaign_id_idx on public.email_sends(campaign_id);
alter table public.email_sends enable row level security;
create policy "Admins can view email sends"
  on public.email_sends for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── notification_email_log ─────────────────────────────────────────────────────
create table public.notification_email_log (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  sent_at          timestamptz not null default now(),
  notification_ids uuid[] not null default '{}',
  is_burst         boolean not null default false
);
create index notification_email_log_user_sent_idx on public.notification_email_log(user_id, sent_at desc);
alter table public.notification_email_log enable row level security;
-- No user-facing policies: this table is accessed only via the service role client

-- ── email_settings ─────────────────────────────────────────────────────────────
create table public.email_settings (
  id                        uuid primary key default gen_random_uuid(),
  burst_threshold           int not null default 3,
  burst_window_minutes      int not null default 5,
  batch_threshold_drill     int not null default 5,
  batch_threshold_podcast   int not null default 3,
  batch_threshold_wellbeing int not null default 3,
  updated_at                timestamptz not null default now()
);
insert into public.email_settings (id) values (gen_random_uuid());
alter table public.email_settings enable row level security;
create policy "Admins can manage email settings"
  on public.email_settings for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
