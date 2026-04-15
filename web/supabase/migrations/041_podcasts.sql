-- Podcast library: coaches share and discover rugby league coaching podcasts.
-- External links only (Spotify / Apple / YouTube) — no audio stored on 18th Man.
-- Any authenticated coach can publish immediately (no approval step).
-- Transcripts are optional; if provided, AI auto-generates summary + tags.

create table public.podcasts (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  description      text,
  ai_summary       text,                           -- AI-generated from transcript
  cover_image_url  text,
  external_url     text        not null,           -- Spotify / Apple / YouTube
  transcript       text,                           -- optional; unlocks AI features
  duration_text    text,                           -- e.g. "45 min" — free-form
  uploaded_by      uuid        not null references public.profiles(id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Full-text search across title, description, transcript
alter table public.podcasts
  add column search_vector tsvector
    generated always as (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(ai_summary, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(transcript, '')), 'D')
    ) stored;

create index podcasts_search_idx on public.podcasts using gin(search_vector);
create index podcasts_uploaded_by_idx on public.podcasts(uploaded_by);
create index podcasts_created_at_idx on public.podcasts(created_at desc);

-- Auto-update updated_at
create trigger podcasts_updated_at
  before update on public.podcasts
  for each row execute function public.set_updated_at();

alter table public.podcasts enable row level security;

-- Any authenticated user can read podcasts
create policy "podcasts_select"
  on public.podcasts for select
  using (auth.uid() is not null);

-- Coaches and admins can publish immediately
create policy "podcasts_insert"
  on public.podcasts for insert
  with check (
    uploaded_by = auth.uid()
    and public.is_coach_or_admin()
  );

-- Uploader or admin can edit
create policy "podcasts_update"
  on public.podcasts for update
  using (
    uploaded_by = auth.uid()
    or public.is_coach_or_admin()
  )
  with check (
    uploaded_by = auth.uid()
    or public.is_coach_or_admin()
  );

-- Uploader or admin can delete
create policy "podcasts_delete"
  on public.podcasts for delete
  using (
    uploaded_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ─── Tags ────────────────────────────────────────────────────────────────────

create table public.podcast_tags (
  podcast_id  uuid  not null references public.podcasts(id) on delete cascade,
  tag         text  not null,
  source      text  not null check (source in ('ai', 'manual')) default 'manual',
  primary key (podcast_id, tag)
);

create index podcast_tags_tag_idx on public.podcast_tags(tag);

alter table public.podcast_tags enable row level security;

create policy "podcast_tags_select"
  on public.podcast_tags for select
  using (true);

-- Uploader or admin inserts manual tags
create policy "podcast_tags_insert"
  on public.podcast_tags for insert
  with check (
    exists (
      select 1 from public.podcasts p
      where p.id = podcast_id
        and (p.uploaded_by = auth.uid() or public.is_coach_or_admin())
    )
  );

create policy "podcast_tags_delete"
  on public.podcast_tags for delete
  using (
    exists (
      select 1 from public.podcasts p
      where p.id = podcast_id
        and (p.uploaded_by = auth.uid() or public.is_coach_or_admin())
    )
  );

-- ─── Reactions ───────────────────────────────────────────────────────────────

create table public.podcast_reactions (
  podcast_id  uuid        not null references public.podcasts(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  reaction    text        not null check (reaction in ('like', 'love')),
  created_at  timestamptz not null default now(),
  primary key (podcast_id, user_id)
);

create index podcast_reactions_podcast_id_idx on public.podcast_reactions(podcast_id);

alter table public.podcast_reactions enable row level security;

create policy "podcast_reactions_select"
  on public.podcast_reactions for select
  using (true);

create policy "podcast_reactions_insert"
  on public.podcast_reactions for insert
  with check (user_id = auth.uid());

create policy "podcast_reactions_update"
  on public.podcast_reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "podcast_reactions_delete"
  on public.podcast_reactions for delete
  using (user_id = auth.uid());

-- ─── Comments ────────────────────────────────────────────────────────────────

create table public.podcast_comments (
  id          uuid        primary key default gen_random_uuid(),
  podcast_id  uuid        not null references public.podcasts(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null,
  created_at  timestamptz not null default now()
);

create index podcast_comments_podcast_id_idx on public.podcast_comments(podcast_id);

alter table public.podcast_comments enable row level security;

create policy "podcast_comments_select"
  on public.podcast_comments for select
  using (auth.uid() is not null);

create policy "podcast_comments_insert"
  on public.podcast_comments for insert
  with check (user_id = auth.uid());

create policy "podcast_comments_delete"
  on public.podcast_comments for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
