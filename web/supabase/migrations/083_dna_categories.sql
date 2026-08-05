-- 083_dna_categories.sql
create table public.dna_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null,
  created_at  timestamptz not null default now()
);

alter table public.dna_categories enable row level security;

create policy "Anyone authenticated can read dna categories"
  on public.dna_categories for select
  using (auth.uid() is not null);

create policy "Admins can manage dna categories"
  on public.dna_categories for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

insert into public.dna_categories (name, slug, description) values
  ('Teacher', 'teacher', 'Explains skills clearly and helps players understand the why, not just the how.'),
  ('Technician', 'technician', 'Sharp eye for technical detail in tackling, ball skills, and set piece execution.'),
  ('Motivator', 'motivator', 'Builds energy, confidence, and belief in individuals and the team.'),
  ('Developer', 'developer', 'Focused on long-term player growth over short-term results.'),
  ('Game Manager', 'game-manager', 'Makes sound tactical and in-game decisions under pressure.'),
  ('Communicator', 'communicator', 'Clear, consistent communication with players, parents, and staff.'),
  ('Organiser', 'organiser', 'Sessions and logistics run smoothly and players know what to expect.'),
  ('Culture Builder', 'culture-builder', 'Shapes a team environment players and parents want to be part of.')
on conflict (slug) do nothing;
