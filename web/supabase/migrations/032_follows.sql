-- Follows: user A follows user B
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

-- Anyone can see follows (used for counts on profiles)
create policy "Follows are publicly readable"
  on public.follows for select using (true);

-- Users can only manage their own follows
create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- Indexes for fast lookups
create index if not exists follows_follower_idx on public.follows(follower_id);
create index if not exists follows_following_idx on public.follows(following_id);

-- Add new notification types for follows/drills
-- (notifications table already exists from migration 015)
-- No schema change needed — the type column is text and data is jsonb
