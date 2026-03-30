-- ============================================================
-- 18th Man — Row Level Security Policies
-- ============================================================

-- Helper: get current user's role
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Helper: is current user admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  )
$$;

-- Helper: is current user coach or admin?
create or replace function public.is_coach_or_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'coach')
  )
$$;


-- ============================================================
-- PROFILES
-- ============================================================
alter table public.profiles enable row level security;

-- Anyone can read any profile (public profiles)
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- Users can update their own profile
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Prevent self-promotion to admin
    and (role = (select role from public.profiles where id = auth.uid()) or public.is_admin())
  );

-- Admins can update any profile (for role assignment)
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin());


-- ============================================================
-- SOCIAL LINKS
-- ============================================================
alter table public.social_links enable row level security;

create policy "social_links_select_all"
  on public.social_links for select
  using (true);

create policy "social_links_insert_own"
  on public.social_links for insert
  with check (auth.uid() = user_id);

create policy "social_links_update_own"
  on public.social_links for update
  using (auth.uid() = user_id);

create policy "social_links_delete_own"
  on public.social_links for delete
  using (auth.uid() = user_id);


-- ============================================================
-- DRILL CATEGORIES
-- ============================================================
alter table public.drill_categories enable row level security;

create policy "drill_categories_select_all"
  on public.drill_categories for select
  using (true);

create policy "drill_categories_insert_admin"
  on public.drill_categories for insert
  with check (public.is_admin());

create policy "drill_categories_update_admin"
  on public.drill_categories for update
  using (public.is_admin());

create policy "drill_categories_delete_admin"
  on public.drill_categories for delete
  using (public.is_admin());


-- ============================================================
-- DRILLS
-- ============================================================
alter table public.drills enable row level security;

-- Public drills visible to all; private drills only to author/admin
create policy "drills_select"
  on public.drills for select
  using (is_public = true or auth.uid() = author_id or public.is_admin());

-- Coaches and admins can create drills
create policy "drills_insert"
  on public.drills for insert
  with check (public.is_coach_or_admin() and auth.uid() = author_id);

-- Authors and admins can update
create policy "drills_update"
  on public.drills for update
  using (auth.uid() = author_id or public.is_admin());

-- Authors and admins can delete
create policy "drills_delete"
  on public.drills for delete
  using (auth.uid() = author_id or public.is_admin());


-- ============================================================
-- DRILL SAVES
-- ============================================================
alter table public.drill_saves enable row level security;

create policy "drill_saves_select_own"
  on public.drill_saves for select
  using (auth.uid() = user_id);

create policy "drill_saves_insert_own"
  on public.drill_saves for insert
  with check (public.is_coach_or_admin() and auth.uid() = user_id);

create policy "drill_saves_delete_own"
  on public.drill_saves for delete
  using (auth.uid() = user_id);


-- ============================================================
-- DRILL RATINGS
-- ============================================================
alter table public.drill_ratings enable row level security;

create policy "drill_ratings_select_all"
  on public.drill_ratings for select
  using (true);

create policy "drill_ratings_insert_own"
  on public.drill_ratings for insert
  with check (public.is_coach_or_admin() and auth.uid() = user_id);

create policy "drill_ratings_update_own"
  on public.drill_ratings for update
  using (auth.uid() = user_id);

create policy "drill_ratings_delete_own"
  on public.drill_ratings for delete
  using (auth.uid() = user_id);


-- ============================================================
-- CONVERSATIONS
-- ============================================================
alter table public.conversations enable row level security;

-- Participants can see their conversations; community threads are public
create policy "conversations_select"
  on public.conversations for select
  using (
    type = 'community'
    or auth.uid() = created_by
    or exists (
      select 1 from public.conversation_participants
      where conversation_id = id and user_id = auth.uid()
    )
  );

-- Coaches/admins can create conversations
create policy "conversations_insert"
  on public.conversations for insert
  with check (public.is_coach_or_admin() and auth.uid() = created_by);

-- Creator can update title
create policy "conversations_update"
  on public.conversations for update
  using (auth.uid() = created_by or public.is_admin());

-- Creator or admin can delete
create policy "conversations_delete"
  on public.conversations for delete
  using (auth.uid() = created_by or public.is_admin());


-- ============================================================
-- CONVERSATION PARTICIPANTS
-- ============================================================
alter table public.conversation_participants enable row level security;

create policy "conv_participants_select"
  on public.conversation_participants for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.conversations
      where id = conversation_id and type = 'community'
    )
  );

create policy "conv_participants_insert"
  on public.conversation_participants for insert
  with check (public.is_coach_or_admin() and auth.uid() = user_id);

create policy "conv_participants_delete"
  on public.conversation_participants for delete
  using (auth.uid() = user_id or public.is_admin());


-- ============================================================
-- MESSAGES
-- ============================================================
alter table public.messages enable row level security;

-- Can read messages in conversations you participate in, or community threads
create policy "messages_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      left join public.conversation_participants cp
        on cp.conversation_id = c.id and cp.user_id = auth.uid()
      where c.id = conversation_id
        and (c.type = 'community' or cp.user_id is not null or c.created_by = auth.uid())
    )
  );

-- Coaches/admins can send messages in conversations they're part of
create policy "messages_insert"
  on public.messages for insert
  with check (
    public.is_coach_or_admin()
    and (sender_id = auth.uid() or sender_id is null) -- null = AI message
    and exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id and user_id = auth.uid()
    )
  );

-- Admins can delete messages (moderation)
create policy "messages_delete_admin"
  on public.messages for delete
  using (public.is_admin() or sender_id = auth.uid());


-- ============================================================
-- SESSION PLANS
-- ============================================================
alter table public.session_plans enable row level security;

-- Owner sees their own; shared plans visible to all coaches
create policy "session_plans_select"
  on public.session_plans for select
  using (
    auth.uid() = coach_id
    or (is_shared = true and public.is_coach_or_admin())
    or public.is_admin()
  );

create policy "session_plans_insert"
  on public.session_plans for insert
  with check (public.is_coach_or_admin() and auth.uid() = coach_id);

create policy "session_plans_update"
  on public.session_plans for update
  using (auth.uid() = coach_id);

create policy "session_plans_delete"
  on public.session_plans for delete
  using (auth.uid() = coach_id or public.is_admin());
