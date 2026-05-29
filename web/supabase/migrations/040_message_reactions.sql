-- Message reactions: thumbs up (like) or heart (love) on community thread messages.
-- One reaction per user per message — clicking the same reaction again removes it,
-- clicking a different one switches it.

create table public.message_reactions (
  message_id  uuid        not null references public.messages(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  reaction    text        not null check (reaction in ('like', 'love')),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_reactions enable row level security;

-- Anyone can read reactions
create policy "reactions_select"
  on public.message_reactions for select
  using (true);

-- Authenticated users can insert their own reactions
create policy "reactions_insert"
  on public.message_reactions for insert
  with check (user_id = auth.uid());

-- Users can update their own reaction (to switch type)
create policy "reactions_update"
  on public.message_reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can delete their own reactions
create policy "reactions_delete"
  on public.message_reactions for delete
  using (user_id = auth.uid());

-- Index for fast lookup by message
create index message_reactions_message_id_idx on public.message_reactions(message_id);
