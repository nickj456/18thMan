-- Allow coaches/admins to post in any community thread
-- Previously required being in conversation_participants, which blocked replies to seeded threads
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
      -- DM / AI threads: must be a participant
      or exists (
        select 1 from public.conversation_participants
        where conversation_id = messages.conversation_id and user_id = auth.uid()
      )
    )
  );
