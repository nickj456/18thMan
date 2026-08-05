-- 090_club_guardian_consents.sql
create table public.club_guardian_consents (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs(id) on delete cascade,
  season_label text not null,
  granted_by   uuid not null references public.profiles(id),
  granted_at   timestamptz not null default now(),
  unique (club_id, season_label)
);

create index club_guardian_consents_club_id_idx on public.club_guardian_consents(club_id);

alter table public.club_guardian_consents enable row level security;

create policy "Club admins can view consents for their club"
  on public.club_guardian_consents for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and club_id = club_guardian_consents.club_id
        and club_role = 'admin'
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Club admins can grant consent for their club"
  on public.club_guardian_consents for insert
  with check (
    (
      exists (
        select 1 from public.profiles
        where id = auth.uid()
          and club_id = club_guardian_consents.club_id
          and club_role = 'admin'
      )
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
    and granted_by = auth.uid()
  );
