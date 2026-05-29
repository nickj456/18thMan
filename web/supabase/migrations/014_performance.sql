-- ── 1. Message count on conversations ────────────────────────
-- Replaces fetching all message IDs just to call .length on them

alter table public.conversations
  add column if not exists message_count integer not null default 0;

-- Backfill existing counts
update public.conversations c
set message_count = (
  select count(*) from public.messages m
  where m.conversation_id = c.id
);

-- Trigger to keep it up to date
create or replace function public.sync_conversation_message_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.conversations set message_count = message_count + 1 where id = NEW.conversation_id;
  elsif TG_OP = 'DELETE' then
    update public.conversations set message_count = greatest(message_count - 1, 0) where id = OLD.conversation_id;
  end if;
  return null;
end;
$$;

drop trigger if exists messages_count_trigger on public.messages;
create trigger messages_count_trigger
  after insert or delete on public.messages
  for each row execute function public.sync_conversation_message_count();


-- ── 2. Drill average rating helper ───────────────────────────
-- Replaces fetching all ratings into JS memory for the min_rating filter

create or replace function public.drill_ids_above_rating(min_rating float)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select drill_id
  from public.drill_ratings
  where rating is not null
  group by drill_id
  having avg(rating) >= min_rating
$$;
