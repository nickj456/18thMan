-- Scope progression_insights to the analyst who generated them.
-- Previously club-wide; now each coach only sees their own AI insights.

alter table public.progression_insights
  add column if not exists created_by uuid references public.profiles(id);

-- Table is new so no rows exist to backfill — safe to make not null immediately.
alter table public.progression_insights
  alter column created_by set not null;

-- Replace the club-level unique constraint with a per-user one.
alter table public.progression_insights
  drop constraint if exists progression_insights_club_id_scope_session_ids_hash_key;

alter table public.progression_insights
  add constraint progression_insights_user_scope_hash_key
  unique (club_id, created_by, scope, session_ids_hash);

-- Select: only the generating analyst sees their own insights.
drop policy if exists "pi_select" on public.progression_insights;

create policy "pi_select"
  on public.progression_insights for select
  to authenticated
  using (created_by = auth.uid());

-- Insert: analyst sets their own created_by, club must match, role must be coach/admin.
drop policy if exists "pi_insert" on public.progression_insights;

create policy "pi_insert"
  on public.progression_insights for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and club_id = (select club_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('coach', 'admin')
  );

-- Update: only the creator can overwrite their own insight.
drop policy if exists "pi_update" on public.progression_insights;

create policy "pi_update"
  on public.progression_insights for update
  to authenticated
  using (
    created_by = auth.uid()
    and (select role from public.profiles where id = auth.uid()) in ('coach', 'admin')
  )
  with check (
    created_by = auth.uid()
    and club_id = (select club_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('coach', 'admin')
  );
