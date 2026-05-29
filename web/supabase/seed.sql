-- ============================================================
-- 18th Man — Development Seed Data
-- Run after migrations in local Supabase dev environment
-- ============================================================

-- Note: Real users must be created via Supabase Auth.
-- This seeds reference data only.

-- Ensure default categories exist (migration handles this, seed is idempotent)
insert into public.drill_categories (name, slug, sort_order)
values
  ('Attack', 'attack', 1),
  ('Defence', 'defence', 2),
  ('Kicking', 'kicking', 3),
  ('Fitness & Conditioning', 'fitness', 4),
  ('Handling & Ball Skills', 'handling', 5),
  ('Set Plays', 'set-plays', 6),
  ('Warm Up', 'warm-up', 7)
on conflict (slug) do nothing;
