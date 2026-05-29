create table public.help_chat_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.help_chat_requests enable row level security;

-- Users can insert their own rows (route handler uses service role to read)
create policy "users can insert own help requests"
  on public.help_chat_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Index for fast per-user time-window queries
create index help_chat_requests_user_created
  on public.help_chat_requests (user_id, created_at desc);
