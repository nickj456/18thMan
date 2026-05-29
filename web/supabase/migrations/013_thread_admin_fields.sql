alter table public.conversations
  add column if not exists is_closed boolean not null default false,
  add column if not exists is_pinned boolean not null default false;

-- Pinned threads first, then by updated_at
create index if not exists conversations_pinned_updated_idx
  on public.conversations (is_pinned desc, updated_at desc)
  where type = 'community';
