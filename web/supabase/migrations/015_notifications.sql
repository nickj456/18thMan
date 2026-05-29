-- Notifications table
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         text not null,
  data         jsonb not null default '{}',
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx  on public.notifications(user_id, read) where read = false;

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);
