-- Fix: community thread messages were invisible to coaches who weren't the thread
-- creator or an explicit participant.
--
-- Root cause: the messages_select policy used a LEFT JOIN with a WHERE clause that
-- referenced the joined table (WHERE c.id = cp.conversation_id). When the user is not
-- a participant, cp is NULL from the LEFT JOIN, so cp.conversation_id is NULL, making
-- the WHERE condition evaluate to NULL (not TRUE). This collapsed the LEFT JOIN into
-- an effective INNER JOIN, meaning only creators/participants could read messages —
-- even in community threads that should be open to all coaches.
--
-- Fix: rewrite the policy to directly check the conversation type and access conditions
-- without relying on a broken LEFT JOIN pattern.

drop policy if exists "messages_select" on public.messages;

create policy "messages_select"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          -- Community threads are readable by any authenticated user
          c.type = 'community'
          -- AI threads: readable by the conversation creator
          or c.created_by = auth.uid()
          -- DM / other threads: must be a participant
          or exists (
            select 1 from public.conversation_participants cp
            where cp.conversation_id = c.id and cp.user_id = auth.uid()
          )
        )
    )
  );
