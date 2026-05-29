-- Coaching Groups (Phase 2)
-- Groups are scoped within a club; max 5 per club enforced by trigger
-- Any club member (coach or admin) can create a group

create table public.coaching_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  club_id    uuid not null references public.clubs(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null
);

create type public.group_invite_status as enum ('pending', 'accepted', 'declined');

create table public.group_invitations (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.coaching_groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status     public.group_invite_status not null default 'pending',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(group_id, user_id)
);

create index coaching_groups_club_id_idx  on public.coaching_groups(club_id);
create index group_invitations_group_id_idx on public.group_invitations(group_id);
create index group_invitations_user_id_idx  on public.group_invitations(user_id);

-- Max 5 groups per club
create or replace function public.check_club_group_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.coaching_groups where club_id = NEW.club_id) >= 5 then
    raise exception 'A club can have a maximum of 5 coaching groups';
  end if;
  return NEW;
end;
$$;

create trigger enforce_club_group_limit
  before insert on public.coaching_groups
  for each row execute function public.check_club_group_limit();

-- RLS
alter table public.coaching_groups  enable row level security;
alter table public.group_invitations enable row level security;

-- coaching_groups: any club member can read; coach/admin in the club can create; creator/admin can update/delete
create policy "Club members can view their club groups"
  on public.coaching_groups for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and club_id = coaching_groups.club_id
    )
  );

create policy "Coaches and admins can create groups in their club"
  on public.coaching_groups for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and club_id = coaching_groups.club_id
        and role in ('coach', 'admin')
    )
  );

create policy "Creator or admin can update group"
  on public.coaching_groups for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Creator or admin can delete group"
  on public.coaching_groups for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- group_invitations: admin full access; coach in the club can invite/read; user can read+update their own
create policy "Admins have full access to group invitations"
  on public.group_invitations for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Coaches can manage invitations in their club groups"
  on public.group_invitations for all
  using (
    exists (
      select 1 from public.profiles p
      join public.coaching_groups g on g.club_id = p.club_id
      where p.id = auth.uid()
        and p.role = 'coach'
        and g.id = group_invitations.group_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      join public.coaching_groups g on g.club_id = p.club_id
      where p.id = auth.uid()
        and p.role = 'coach'
        and g.id = group_invitations.group_id
    )
  );

create policy "Users can view and update their own group invitations"
  on public.group_invitations for select
  using (user_id = auth.uid());

create policy "Users can update their own group invitations"
  on public.group_invitations for update
  using (user_id = auth.uid());
