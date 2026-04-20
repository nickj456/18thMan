-- ── Weekly Focus ──────────────────────────────────────────────────────────────

create table public.weekly_focuses (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  week_start  date not null,
  topic       text not null,
  description text not null,
  drill_ids   uuid[] not null default '{}',
  next_topic  text,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (club_id, week_start)
);

create index weekly_focuses_club_id_idx on public.weekly_focuses(club_id);

create trigger weekly_focuses_updated_at
  before update on public.weekly_focuses
  for each row execute procedure public.set_updated_at();

create table public.weekly_focus_comments (
  id         uuid primary key default gen_random_uuid(),
  focus_id   uuid not null references public.weekly_focuses(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete restrict,
  content    text not null,
  created_at timestamptz not null default now()
);

create index weekly_focus_comments_focus_id_idx on public.weekly_focus_comments(focus_id);

alter table public.weekly_focuses         enable row level security;
alter table public.weekly_focus_comments  enable row level security;

create policy "weekly_focuses_select"
  on public.weekly_focuses for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and club_id = weekly_focuses.club_id)
  );

create policy "weekly_focuses_insert"
  on public.weekly_focuses for insert to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and club_id = weekly_focuses.club_id and role = 'admin')
  );

create policy "weekly_focuses_update"
  on public.weekly_focuses for update to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and club_id = weekly_focuses.club_id and role = 'admin')
  );

create policy "weekly_focuses_delete"
  on public.weekly_focuses for delete to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and club_id = weekly_focuses.club_id and role = 'admin')
  );

create policy "weekly_focus_comments_select"
  on public.weekly_focus_comments for select to authenticated
  using (
    exists (
      select 1
      from public.weekly_focuses wf
      join public.profiles p on p.club_id = wf.club_id
      where wf.id = weekly_focus_comments.focus_id and p.id = auth.uid()
    )
  );

create policy "weekly_focus_comments_insert"
  on public.weekly_focus_comments for insert to authenticated
  with check (
    exists (
      select 1
      from public.weekly_focuses wf
      join public.profiles p on p.club_id = wf.club_id
      where wf.id = weekly_focus_comments.focus_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
  );

create policy "weekly_focus_comments_delete"
  on public.weekly_focus_comments for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
