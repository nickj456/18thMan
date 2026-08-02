# Admin App Performance Section — Design

**Date:** 2026-08-02
**Status:** Approved

## Purpose

Nick wants visibility into 18th Man's performance — sign-ups, activity, revenue, and page traffic — from inside the app itself, admin-only. This supersedes the earlier standalone-dashboard direction (see `2026-07-30-metrics-dashboard-design.md` / the separate `18th-man-dashboard` repo, which remains a working but now-secondary artifact): rather than a second app with its own auth and Supabase client, this embeds the same reporting directly into 18th Man's existing admin panel, reusing its auth, RLS conventions, and UI.

## Scope decision

Everything from the standalone dashboard's scope (growth, activity, revenue) plus one new piece: **page-level traffic** (which pages are being visited). The standalone dashboard deliberately left this to Vercel Analytics, but Vercel Analytics has no simple embeddable API on Nick's plan — pulling that data into a custom admin page isn't practical. Since it needs to live in this admin section anyway, this spec adds lightweight first-party page-view tracking rather than linking out to a separate Vercel screen.

## Architecture

A new route, `web/src/app/(app)/admin/performance/page.tsx`, following the exact structure of the existing admin sub-pages (`/admin/users`, `/admin/clubs`, `/admin/wellbeing`, etc.):
- Same auth gate as `web/src/app/(app)/admin/page.tsx`: fetch the user, redirect to `/login` if absent, fetch `profiles.role`, redirect to `/dashboard` if not `'admin'`.
- Same visual language: zinc/dark theme, card-based sections, `lucide-react` icons — no new UI kit.
- Linked from a new panel card on `/admin` (icon, label "App Performance", description), inserted into the existing `panels` array in `web/src/app/(app)/admin/page.tsx`.

**Data access:** every query on this page uses the app's existing service-role client, `web/src/lib/supabase/service.ts` (already used by the Stripe webhook and a few server actions), rather than the normal per-request authenticated client. Rationale: most tables the page reads already have an admin RLS bypass (`drills`, `session_plans`, `clubs`, `products`, `purchases`), but `messages` does not — private DM/AI-thread messages are only visible to their participants, not admins, under RLS. An RLS-respecting query would silently undercount "messages sent," which is exactly the kind of quietly-wrong number a metrics page must not produce. Since `/admin/performance` is already gated to `role === 'admin'` before any query runs, using the service client uniformly for this page removes that gap without weakening any RLS policy elsewhere in the app.

**Charts:** Recharts, already a project dependency and already used in `web/src/app/(app)/analyst/progression/components/PlayerDossier.tsx` — match its existing dark-theme styling conventions rather than introducing new ones.

## Sections on `/admin/performance`

### 1. Growth
- Sign-ups per day (from `profiles.created_at`)
- Cumulative user count
- Breakdown by role: coach / viewer / admin

### 2. Activity
- Drills created per day (`drills.created_at`)
- Session plans created per day (`session_plans.created_at`)
- Messages sent per day (`messages.created_at`, all conversation types — labelled accordingly, since this includes AI-chat messages, not only coach-to-coach)
- Total podcast plays (`podcasts.play_count` — a running counter with no per-play timestamp, so this is a single total, not a time series, same constraint noted in the original standalone-dashboard spec)

### 3. Revenue
- Purchases per day and revenue by product (`purchases`, `products`), completed purchases only, displayed in **GBP** (`Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })` — 18th Man charges in GBP per its Stripe checkout config)
- Active club subscriptions (`clubs.subscription_tier = 'club'`)
- Active Coach Pro subscriptions (`profiles.subscription_tier = 'coach'`) — a separate tile, since club and individual coach subscriptions are two distinct revenue lines

### 4. Page Views (new)
- Top pages by view count, trailing 30 days
- Page views per day, trailing 30 days

## Page-view tracking (new)

**Table** (new migration, `web/supabase/migrations/082_page_views.sql`):
```sql
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
```
No update/delete policies — page views are write-once, admin-read-only.

**Tracking mechanism:**
- A new client component, `web/src/components/analytics/PageViewTracker.tsx`, mounted once in the `(app)` route group's layout (only authenticated app pages are tracked — marketing/login pages are out of scope for "app performance").
- Uses `usePathname()` from `next/navigation`. On mount and on every path change, fires `navigator.sendBeacon('/api/track-page-view', JSON.stringify({ path }))` — fire-and-forget, never blocks navigation, never awaited.
- A new Route Handler, `web/src/app/api/track-page-view/route.ts`, reads `path` from the request body, resolves the current user via the normal authenticated Supabase server client (from cookies), and inserts a `page_views` row scoped to that user — using the authenticated client (not service role), so the RLS insert policy (`user_id = auth.uid()`) is the actual enforcement, not app-layer trust. If there's no authenticated user, the handler no-ops (no row, no error) rather than tracking anonymous traffic.

**Deliberate exception to "don't use `useEffect` to fetch data":** `PageViewTracker` uses `useEffect` + `usePathname()`, which is the CLAUDE.md rule's one legitimate exception — this isn't fetching data for the page to render, it's a fire-and-forget outbound analytics beacon, the same pattern Vercel Analytics' own script uses. Noted explicitly so it isn't flagged as a violation during review.

## Error handling and rendering conventions

Carried over from the standalone dashboard build, where these were found to matter in practice:
- Every list-returning query paginates past Supabase's default 1000-row PostgREST cap (a shared pagination helper, not per-query hand-rolled loops) — or uses `select(..., { count: 'exact', head: true })` instead where only a total is needed, never an unbounded `select()`.
- Every section renders inside its own `<Suspense>` boundary with a loading skeleton, and its own try/catch, so one failing query shows an inline error for that section only — it never blanks the rest of the page.
- The page is dynamically rendered (no static caching of live metrics) — Next.js Server Components in the `(app)` route group are already dynamically rendered by default here (they read the authenticated user via cookies on every request), so no extra directive is needed, unlike the standalone dashboard which had to add `export const dynamic = 'force-dynamic'` explicitly.

## Testing

Pure aggregation/formatting logic (day-bucketing, revenue summing, currency formatting) is extracted into small functions under `web/src/lib/metrics/` and unit-tested with fixture data, mirroring the approach validated in the standalone dashboard build. Page-level components are not unit-tested, consistent with the rest of the `/admin` section, which has no page-level tests today.

## Out of scope for v1

- Historical data export
- Alerting / scheduled reports
- Tracking anonymous (logged-out) traffic
- Filtering page views by device/browser/referrer — path + timestamp + user only
