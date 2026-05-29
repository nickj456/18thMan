-- ============================================================
-- 18th Man — Initial Schema
-- ============================================================

-- Role enum
create type public.user_role as enum ('admin', 'coach', 'viewer');

-- Conversation type enum
create type public.conversation_type as enum ('ai', 'dm', 'community');

-- Difficulty enum
create type public.drill_difficulty as enum ('beginner', 'intermediate', 'advanced');


-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  display_name    text,
  avatar_url      text,
  bio             text,
  club            text,
  coaching_level  text,
  role            public.user_role not null default 'viewer',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'viewer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- SOCIAL LINKS
-- ============================================================
create table public.social_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  platform   text not null, -- 'twitter', 'facebook', 'instagram', 'youtube', 'linkedin'
  url        text not null,
  created_at timestamptz not null default now(),
  unique(user_id, platform)
);


-- ============================================================
-- DRILL CATEGORIES
-- ============================================================
create table public.drill_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Seed default categories
insert into public.drill_categories (name, slug, sort_order) values
  ('Attack', 'attack', 1),
  ('Defence', 'defence', 2),
  ('Kicking', 'kicking', 3),
  ('Fitness & Conditioning', 'fitness', 4),
  ('Handling & Ball Skills', 'handling', 5),
  ('Set Plays', 'set-plays', 6),
  ('Warm Up', 'warm-up', 7);


-- ============================================================
-- DRILLS
-- ============================================================
create table public.drills (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  category_id       uuid references public.drill_categories(id) on delete set null,
  canvas_json       jsonb,                   -- Konva canvas state
  preview_image_url text,
  author_id         uuid not null references public.profiles(id) on delete cascade,
  difficulty        public.drill_difficulty,
  age_group         text,                    -- e.g. 'Under 12', 'Open Age'
  player_count      text,                    -- e.g. '8-12', 'Full squad'
  is_public         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger drills_updated_at
  before update on public.drills
  for each row execute procedure public.set_updated_at();

create index drills_author_id_idx on public.drills(author_id);
create index drills_category_id_idx on public.drills(category_id);


-- ============================================================
-- DRILL SAVES (personal collections)
-- ============================================================
create table public.drill_saves (
  drill_id   uuid not null references public.drills(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (drill_id, user_id)
);


-- ============================================================
-- DRILL RATINGS & COMMENTS
-- ============================================================
create table public.drill_ratings (
  id         uuid primary key default gen_random_uuid(),
  drill_id   uuid not null references public.drills(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     smallint check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(drill_id, user_id)
);

create trigger drill_ratings_updated_at
  before update on public.drill_ratings
  for each row execute procedure public.set_updated_at();

create index drill_ratings_drill_id_idx on public.drill_ratings(drill_id);


-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  type       public.conversation_type not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- CONVERSATION PARTICIPANTS
-- ============================================================
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conv_participants_user_idx on public.conversation_participants(user_id);


-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid references public.profiles(id) on delete set null, -- null = AI
  content         text not null,
  created_at      timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_created_at_idx on public.messages(created_at);


-- ============================================================
-- SESSION PLANS
-- ============================================================
create table public.session_plans (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  coach_id       uuid not null references public.profiles(id) on delete cascade,
  drills_order   jsonb not null default '[]', -- [{drill_id, duration_minutes, notes}]
  total_duration integer,                     -- minutes
  is_shared      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger session_plans_updated_at
  before update on public.session_plans
  for each row execute procedure public.set_updated_at();

create index session_plans_coach_id_idx on public.session_plans(coach_id);
