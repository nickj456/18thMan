-- Fix: AI chat conversations were created without adding the user to
-- conversation_participants, so message inserts were failing with RLS violation.
-- Add a branch to allow AI conversation creators to post without needing
-- a participant record (AI chats are always 1-on-1 with the creator).

drop policy if exists "messages_insert" on public.messages;

create policy "messages_insert"
  on public.messages for insert
  with check (
    (sender_id = auth.uid() or sender_id is null)
    and (
      -- Community threads: any coach/admin can reply
      (
        public.is_coach_or_admin()
        and exists (
          select 1 from public.conversations
          where id = messages.conversation_id and type = 'community'
        )
      )
      -- AI threads: the conversation creator can send (and receive null-sender AI replies)
      or exists (
        select 1 from public.conversations
        where id = messages.conversation_id
          and type = 'ai'
          and created_by = auth.uid()
      )
      -- DM / other threads: must be a participant
      or exists (
        select 1 from public.conversation_participants
        where conversation_id = messages.conversation_id and user_id = auth.uid()
      )
    )
  );
