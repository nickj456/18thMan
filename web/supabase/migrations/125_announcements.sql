-- Site-wide dismissible announcements (e.g. "check out Coach DNA"), shown as
-- a pop-up modal to every logged-in user until they dismiss it. Only the
-- most-recently-created row with active = true is ever shown -- no need to
-- enforce a single-active-row invariant at the database level.
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null,
  link_url   text,
  link_label text,
  active     boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

create policy "Active announcements are visible to any authenticated user"
  on public.announcements for select
  using (
    active = true
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can create announcements"
  on public.announcements for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update announcements"
  on public.announcements for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Per-user dismissal record, so dismissing an announcement on one device
-- keeps it dismissed everywhere for that user.
create table public.announcement_dismissals (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  dismissed_at    timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcement_dismissals enable row level security;

create policy "Users can view their own dismissals"
  on public.announcement_dismissals for select
  using (user_id = auth.uid());

create policy "Users can dismiss announcements for themselves"
  on public.announcement_dismissals for insert
  with check (user_id = auth.uid());
