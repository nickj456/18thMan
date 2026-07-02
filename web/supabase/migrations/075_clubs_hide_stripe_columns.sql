-- ── Restrict billing identifier exposure on clubs ───────────────────────────
-- The clubs_select RLS policy is `using (true)` for authenticated (017) and anon
-- (029, needed so the public /join/[token] page can show a club name). Row-level
-- policies cannot hide individual columns, so every reader could also read
-- stripe_customer_id / stripe_subscription_id.
--
-- Column-level privileges are enforced independently of RLS. Revoke SELECT on the
-- two Stripe identifier columns from the anon and authenticated roles. The
-- service_role (used by all server-side billing code: checkout, portal,
-- club-checkout, the Stripe webhook) bypasses these grants and is unaffected.
--
-- subscription_tier is intentionally left readable — the app uses it for feature
-- gating in the client.

revoke select (stripe_customer_id, stripe_subscription_id)
  on public.clubs
  from anon, authenticated;
