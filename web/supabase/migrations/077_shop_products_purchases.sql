-- ── Shop: official downloadable coaching content ────────────────────────────
-- Sellable PDFs/videos/plans, either purchased one-time or unlocked by a
-- subscription tier. Reuses the existing subscription_tier enum (023, 028)
-- and per-user Stripe identity (profiles.stripe_customer_id) rather than
-- introducing new billing infra.

create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  description          text,
  content_type         text not null check (content_type in ('pdf', 'video', 'bundle')),
  price_cents          integer check (price_cents is null or price_cents >= 0),
  stripe_price_id      text,
  min_subscription_tier public.subscription_tier,
  storage_path         text not null,
  preview_image_url    text,
  is_published         boolean not null default false,
  created_by           uuid not null references public.profiles(id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- A product must be obtainable somehow: either it has a price, or a tier
  -- unlocks it (or both — subscribers get it free, everyone else can buy it).
  constraint products_obtainable check (price_cents is not null or min_subscription_tier is not null)
);

create index products_published_idx on public.products (is_published, created_at desc);

create table public.purchases (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles(id) on delete cascade,
  product_id                uuid not null references public.products(id) on delete restrict,
  stripe_checkout_session_id text not null,
  stripe_payment_intent_id  text,
  status                    text not null default 'completed' check (status in ('completed', 'refunded')),
  amount_paid_cents         integer not null,
  created_at                timestamptz not null default now()
);

create unique index purchases_session_idx on public.purchases (stripe_checkout_session_id);
create index purchases_user_id_idx on public.purchases (user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.products enable row level security;
alter table public.purchases enable row level security;

create policy "products_select_published_or_admin"
  on public.products for select
  to authenticated
  using (is_published or public.is_admin());

create policy "products_admin_write"
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "purchases_select_own_or_admin"
  on public.purchases for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Purchases are only ever written by the Stripe webhook via the service
-- role, which bypasses RLS entirely — no insert/update policy for
-- authenticated/anon is needed or granted.

-- ── Storage ──────────────────────────────────────────────────────────────
-- Private bucket. Unlike other private buckets in this app, access isn't
-- folder-uid scoped — entitlement is checked in a server action against
-- `purchases` / subscription tier before a signed URL is minted.

insert into storage.buckets (id, name, public)
values ('shop-assets', 'shop-assets', false)
on conflict (id) do nothing;

create policy "shop_assets_admin_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'shop-assets' and public.is_admin())
  with check (bucket_id = 'shop-assets' and public.is_admin());
