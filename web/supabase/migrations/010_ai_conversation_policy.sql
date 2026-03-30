-- Allow any authenticated user to create their own AI conversation
-- (previously restricted to coach/admin only)
drop policy if exists "conversations_insert" on public.conversations;

create policy "conversations_insert"
  on public.conversations for insert
  with check (
    auth.uid() = created_by
    and (
      type = 'ai'  -- anyone can create their own AI chat
      or public.is_coach_or_admin()  -- coaches/admins can create community threads
    )
  );
