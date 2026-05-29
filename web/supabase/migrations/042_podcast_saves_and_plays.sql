-- Play count on podcasts
alter table public.podcasts
  add column play_count integer not null default 0;

-- Bookmarks / saves
create table public.podcast_saves (
  podcast_id  uuid        not null references public.podcasts(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (podcast_id, user_id)
);

create index podcast_saves_user_id_idx on public.podcast_saves(user_id);

alter table public.podcast_saves enable row level security;

create policy "podcast_saves_select"
  on public.podcast_saves for select
  using (user_id = auth.uid());

create policy "podcast_saves_insert"
  on public.podcast_saves for insert
  with check (user_id = auth.uid());

create policy "podcast_saves_delete"
  on public.podcast_saves for delete
  using (user_id = auth.uid());
