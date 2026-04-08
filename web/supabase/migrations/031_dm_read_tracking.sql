-- Add last_read_at to conversation_participants so we can show unread counts on DMs
alter table public.conversation_participants
  add column last_read_at timestamptz not null default now();

-- Index for efficient unread queries
create index conv_participants_last_read_idx
  on public.conversation_participants(conversation_id, user_id, last_read_at);
