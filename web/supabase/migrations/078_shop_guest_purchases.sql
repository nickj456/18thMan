-- ── Shop: guest purchases ────────────────────────────────────────────────
-- Allows the shop catalog/product pages to be reached without an account
-- (e.g. a social media link straight to a product), with guest checkout
-- fulfilled by emailing a signed download link instead of relying on a
-- logged-in session. Mirrors the existing account-less 'analysis' paid
-- flow, which already identifies the payer purely via
-- session.customer_details.email (see web/src/app/api/webhooks/stripe/route.ts).

alter table public.purchases
  alter column user_id drop not null,
  add column guest_email text;

alter table public.purchases
  add constraint purchases_owner check (user_id is not null or guest_email is not null);

-- Anonymous visitors need to read published products to browse/buy from a
-- shared link before creating an account. Mirrors clubs_select_by_token in
-- migration 029, added for the same pre-login-page reason.
create policy "products_select_published_anon"
  on public.products for select
  to anon
  using (is_published);
