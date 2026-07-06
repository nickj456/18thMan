-- Admin-only notes on users (separate table keeps them out of user-readable profiles)
create table public.admin_user_notes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note    text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.admin_user_notes enable row level security;

create policy "Admins can manage user notes"
  on public.admin_user_notes
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
