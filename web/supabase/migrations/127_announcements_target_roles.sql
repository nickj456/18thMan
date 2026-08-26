-- Role targeting: null/empty means everyone (unchanged default behavior);
-- a non-empty array restricts the announcement to those roles only. A
-- viewer clicking through to an admin/coach-only page (e.g. Coach DNA) was
-- the concrete bug this fixes -- announcements now respect the same role
-- gating the sidebar nav already uses.
alter table public.announcements
  add column target_roles text[];
