-- Fix: restrict pi_insert/pi_update to coach and admin roles only,
-- and add WITH CHECK to pi_update so rows can't be moved to another club.

drop policy if exists "pi_insert" on public.progression_insights;
drop policy if exists "pi_update" on public.progression_insights;

create policy "pi_insert"
  on public.progression_insights for insert
  to authenticated
  with check (
    club_id = (select club_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('coach', 'admin')
  );

create policy "pi_update"
  on public.progression_insights for update
  to authenticated
  using (
    club_id = (select club_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('coach', 'admin')
  )
  with check (
    club_id = (select club_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('coach', 'admin')
  );
