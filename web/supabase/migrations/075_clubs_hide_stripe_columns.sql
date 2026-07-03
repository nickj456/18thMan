-- ── Restrict billing identifier exposure on clubs ───────────────────────────
-- The clubs_select RLS policy is `using (true)` for authenticated (017) and anon
-- (029, needed so the public /join/[token] page can show a club name). Row-level
-- policies cannot hide individual columns, so every reader could also read
-- stripe_customer_id / stripe_subscription_id.
--
-- IMPORTANT: a column-level REVOKE alone is a no-op while the role still holds a
-- table-level SELECT grant (PostgreSQL evaluates privileges additively). Supabase
-- grants table-level SELECT on public tables to anon/authenticated by default, so
-- we must revoke the table-level privilege and re-grant an explicit column list.
--
-- Consequences:
--   * `select('*')` on clubs from anon/authenticated now fails with 42501 — all
--     app queries use explicit column lists (verified at ship time).
--   * Future `alter table clubs add column` migrations MUST extend this grant.
--
-- service_role keeps its own table-level grant and is unaffected; all billing
-- code (checkout, portal, webhook) reads Stripe columns through it.
-- subscription_tier stays readable — the app uses it for client feature gating.

revoke select on public.clubs from anon, authenticated;

grant select (
  id,
  name,
  slug,
  created_by,
  created_at,
  subscription_tier,
  max_members,
  invite_token,
  max_groups
) on public.clubs to anon, authenticated;
