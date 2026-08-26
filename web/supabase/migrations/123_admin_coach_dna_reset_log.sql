-- Audit trail for admin-initiated Coach DNA data resets, mirroring the
-- existing admin_feedback_access_log precedent (migration 092) for the same
-- reason: this touches safeguarding-adjacent data (player/parent/peer
-- feedback), so a destructive admin action here should leave a record.
create table public.admin_coach_dna_reset_log (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references public.profiles(id) on delete set null,
  coach_id   uuid not null references public.profiles(id) on delete cascade,
  reason     text not null,
  created_at timestamptz not null default now()
);

create index admin_coach_dna_reset_log_coach_id_idx on public.admin_coach_dna_reset_log(coach_id);

alter table public.admin_coach_dna_reset_log enable row level security;

create policy "Admins can view the reset log"
  on public.admin_coach_dna_reset_log for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

comment on column public.admin_coach_dna_reset_log.admin_id is 'Nullable via ON DELETE SET NULL when the admin account is later deleted; must always be non-null on insert — enforced by the service-role write path, not a DB constraint, since a CHECK cannot distinguish insert-time from post-hoc nulling.';
