-- ── Page view tracking ────────────────────────────────────────────────────
-- First-party, lightweight page-view log for the admin performance section.
-- Write-once (insert only, own row), admin-read-only. See
-- docs/superpowers/specs/2026-08-02-admin-performance-dashboard-design.md.

create table public.page_views (
  id         uuid primary key default gen_random_uuid(),
  path       text not null,
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index page_views_created_at_idx on public.page_views (created_at desc);
create index page_views_path_idx on public.page_views (path);

alter table public.page_views enable row level security;

create policy "page_views_insert_own"
  on public.page_views for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "page_views_select_admin"
  on public.page_views for select
  to authenticated
  using (public.is_admin());
