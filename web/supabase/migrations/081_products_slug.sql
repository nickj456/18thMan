-- Human-readable slugs for shop product URLs (/shop/<slug> instead of
-- /shop/<uuid>). Slugs are generated from the title at creation time by the
-- app (see web/src/lib/slug.ts) and are immutable afterwards so existing
-- links/emails never break. This migration adds the column and backfills
-- any pre-existing rows with a slug derived the same way (lowercase,
-- non-alphanumeric runs collapsed to a hyphen), disambiguating collisions
-- with a numeric suffix.

alter table public.products add column slug text;

with base as (
  select
    id,
    coalesce(nullif(regexp_replace(regexp_replace(lower(trim(title)), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'), ''), 'product') as base_slug,
    row_number() over (
      partition by regexp_replace(regexp_replace(lower(trim(title)), '[^a-z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')
      order by created_at
    ) as rn
  from public.products
)
update public.products p
set slug = case when base.rn = 1 then base.base_slug else base.base_slug || '-' || base.rn end
from base
where p.id = base.id;

alter table public.products alter column slug set not null;
create unique index products_slug_idx on public.products (slug);
