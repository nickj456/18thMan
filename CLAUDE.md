# 18th Man — Claude Code Instructions

Rugby league coaching platform. Full spec in [SPEC.md](SPEC.md).

---

## Project Overview

**18th Man** is a web app for rugby league coaches to design drills, plan training sessions, and connect with the coaching community. It includes an AI coaching assistant, a visual drill designer, and a community hub.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router, latest) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth & DB | Supabase (Postgres + Auth + Realtime) |
| Drill Designer | React Konva |
| AI Chat | Vercel AI SDK v6 + AI Gateway |
| Deployment | Vercel |

---

## Architecture Rules

### Next.js
- Use **App Router** exclusively — no Pages Router
- Default to **Server Components**; only add `'use client'` when interactivity or browser APIs are required
- Push `'use client'` boundaries as far down the tree as possible
- Use **Server Actions** for mutations (forms, data writes) — not Route Handlers
- Route Handlers are only for public APIs and webhooks
- All request APIs are async: `await cookies()`, `await headers()`, `await params`, `await searchParams`
- Use `proxy.ts` (not `middleware.ts`) for auth checks and redirects — export must be named `proxy`, not `middleware`

### Supabase
- **Auth**: always use Supabase Auth — never roll your own auth
- **Realtime**: use Supabase subscriptions for Direct Messages and Community Discussions
- **RLS**: every table must have Row Level Security policies — never skip RLS
- **Types**: generate types from Supabase schema (`supabase gen types typescript`) and use them throughout
- Never use `@vercel/postgres` or `@vercel/kv` — they are sunset

### AI Chat
- Use **Vercel AI Gateway** with model strings like `'anthropic/claude-sonnet-4-6'` — never hardcode provider API keys
- Use `vercel env pull` to get OIDC credentials locally
- Stream all AI responses — never block on `generateText` for user-facing chat
- Render all AI-generated text using **AI Elements** (`<Message>` / `<MessageResponse>`) — never render raw markdown as `{text}`

### Styling
- Use **shadcn/ui** components — don't build core UI controls from scratch
- shadcn/ui uses **Base UI** — use `render={<Link href="..." />}` instead of `asChild` on Button and other primitives
- Default to **dark mode** (this is a dashboard/tool for coaches)
- Use **zinc/slate** neutral tokens with one accent colour
- Use **Geist Sans** for UI text, **Geist Mono** for code/stats/IDs

### Drill Designer
- Use **React Konva** for the canvas — don't substitute another canvas library
- Desktop-first layout; ensure tablet usability
- Canvas state stored as `canvas_json` (JSONB) in the `drills` table

### Security
- **Never fetch a user-supplied URL directly.** Any server-side fetch of a URL a user gave us (link previews, etc.) must go through `web/src/lib/ssrf.ts`, which validates the resolved IP — and every redirect hop — against private/internal ranges (including IPv4-mapped IPv6). See [TESTING.md](TESTING.md) for the guard's test coverage.
- **Club billing routes require `isClubAdmin()`.** Stripe checkout and portal routes (`web/src/app/api/stripe/`) must verify the caller administers the club before starting or managing a subscription — never trust a `clubId` from the request body alone.
- Global security headers (HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are set once in `web/next.config.ts` — don't duplicate them per-route.
- **`clubs` table has no wildcard SELECT.** `stripe_customer_id`/`stripe_subscription_id` are revoked from the table-level grant, so `select('*')` on `clubs` fails with 42501 for anon/authenticated — always use an explicit column list. Any migration adding a column to `clubs` must extend the grant in `web/supabase/migrations/075_clubs_hide_stripe_columns.sql`.
- **`products` is anon-readable — don't `select('*')` on it.** Unlike `clubs`, `select('*')` on `products` still succeeds for anon (migration 078's `products_select_published_anon` policy is row-scoped, not column-scoped), but it leaks `storage_path`, `stripe_price_id`, and `created_by` to unauthenticated visitors. Public-facing reads (`/shop`, `/shop/[id]`, `/shop/library`) always use an explicit column list.

---

## Roles & Permissions

Three roles: `admin`, `coach`, `viewer`. Stored on the `profiles` table.

- Always check role server-side (never trust client-side role checks alone)
- Use Supabase RLS policies to enforce permissions at the database level
- See full permissions table in [SPEC.md](SPEC.md)

---

## Subscription Tiers & Feature Access

This is separate from `profiles.role` (admin/coach/viewer, above) — a tier is what a coach has *paid for*, independent of their platform role. Tier logic lives in `web/src/lib/subscription.ts` (`getEffectiveTier`, `EffectiveTier = 'free' | 'trial' | 'coach' | 'club'`); the plain numeric limits live in `web/src/lib/subscription-limits.ts` (see the client-import rule below).

| | **Free** | **Trial** (48h, one-time) | **Coach Pro** — £9.99/mo · £89/yr | **Club** — £24.99/mo · £219/yr (per club, covers every coach in it) |
|---|---|---|---|---|
| Drills created | Unlimited to try — first save starts a 48h trial | Unlimited | Unlimited | Unlimited |
| Session plans | 1 | Unlimited | Unlimited | Unlimited |
| AI coaching chat | 5 msgs/day | Unlimited | Unlimited | Unlimited |
| Public drill library | ✅ | ✅ | ✅ | ✅ |
| Community access | ✅ | ✅ | ✅ | ✅ |
| PDF export | ❌ | ✅ | ✅ | ✅ |
| Club-private drills | ❌ | ✅ | ❌ | ✅ |
| Coaching groups | ❌ | ✅ | ❌ | ✅ (up to 5) |
| Collaborative session plans | ❌ | ✅ | ❌ | ✅ |
| AI session guidance (GameSense) | ❌ | ✅ | ❌ | ✅ |
| Multiple coaches covered | — (self only) | — (self only) | — (self only) | ✅ unlimited |

**How a tier is granted** (`getEffectiveTier` resolution order, first match wins):
1. `role = 'admin'` → always `'club'`, no paywall, regardless of payment.
2. A `feature_overrides` row for the user or their club (admin-set escape hatch) — can force `'club'` or `'free'`.
3. `profiles.club_id` is set → `'club'` (membership alone grants it; club creation itself is gated behind the Stripe checkout in `/api/stripe/club-checkout`).
4. `profiles.trial_ends_at` is in the future → `'trial'` (same access as Club). Auto-granted once, 48 hours, triggered when a free-tier coach attempts to save their first drill (`designer-actions.ts`).
5. `profiles.subscription_tier = 'coach'` → `'coach'`.
6. Otherwise → `'free'`.

**Product priority (set 2026-08-26):** free/non-club coaches are the primary conversion target — any new feature should be checked against whether it moves that segment toward paying. Session/drill/chat limits and the upsell CTAs on `/clubs` and `/pricing` exist for this reason; the AI chat's system prompt should stay consistent with them too.

**Keeping this in sync — update ALL of these together whenever a limit, price, or feature changes:**
- This table.
- `web/src/lib/subscription-limits.ts` (the actual enforced numbers) and `web/src/lib/subscription.ts` (tier resolution).
- `web/src/app/pricing/page.tsx` (reads the limit constants directly — don't hardcode numbers there; if a bullet can't reference the constant, update it by hand).
- `web/src/app/api/chat/route.ts`'s `SYSTEM_PROMPT` (the AI coach describes tiers/prices in plain text — it drifted out of sync with the real Club price and was missing Coach Pro entirely before this table existed, so treat this as a known drift risk, not a one-time fix).

**Client-import rule:** `subscription.ts` also exports server-only DB functions (`getEffectiveTier`, `canCreateDrill`, etc.) that depend on `next/headers` via the Supabase server client. A `'use client'` component that imports *anything* from `subscription.ts` — even just a constant — pulls that server-only code into the client bundle and breaks `next build` (dev mode won't catch it). Client components must import limits from `subscription-limits.ts` directly, never from `subscription.ts`.

---

## Database

Schema lives in Supabase. Core tables:

```
profiles              — id, username, display_name, avatar_url, bio, club, coaching_level, role
social_links          — user_id, platform, url
drill_categories      — id, name, slug, order, created_by
drills                — id, title, description, category_id, canvas_json, preview_image_url, author_id, difficulty, age_group, player_count
drill_ratings         — drill_id, user_id, rating, comment
conversations         — id, title, type (ai | dm | community), created_by
conversation_participants — conversation_id, user_id
messages              — id, conversation_id, sender_id, content, created_at
session_plans         — id, title, coach_id, drills_order (jsonb), total_duration
admin_user_notes      — user_id, note, updated_at (admin-only; separate from profiles to keep out of user-readable RLS)
products              — id, title, description, content_type (pdf|video|bundle), price_cents, min_subscription_tier, storage_path, preview_image_url, is_published, created_by
purchases              — id, user_id (nullable), guest_email (nullable — one of the two is always set), product_id, stripe_checkout_session_id, stripe_payment_intent_id, status (completed|refunded), amount_paid_cents
```

Migration files go in `supabase/migrations/`. Always write migrations — never mutate the schema by hand in the dashboard.

---

## Project Structure

Next.js app lives in `web/`. Run all commands from `web/`.

```
web/
src/
app/
  (auth)/           — login, signup, password reset
  (app)/            — authenticated routes
    dashboard/
    drills/
    drills/[id]/
    drills/new/       — drill designer
    sessions/
    chat/
    profile/[username]/
    admin/
  api/              — route handlers (webhooks, public APIs only)
components/
  ui/               — shadcn/ui components
  drills/
  chat/
  designer/
  session/
lib/
  supabase/         — client, server, middleware helpers
  ai/               — AI SDK setup
supabase/
  migrations/
  seed.sql
```

---

## Do / Don't

**Do:**
- Read the current Supabase and Next.js docs before writing integration code — APIs change
- Use Supabase server client (not browser client) in Server Components and Server Actions
- Handle all three conversation types (ai, dm, community) through the shared `conversations` / `messages` schema
- Export PDFs for session plans and drill designer using a server-side approach (avoid client-only PDF libs that inflate bundle size)

**Don't:**
- Don't add `any` types — use the generated Supabase types
- Don't use `useEffect` to fetch data — use Server Components or React Query
- Don't store sensitive data (API keys, tokens) in client-accessible code
- Don't skip loading, empty, and error states — every async UI needs all three
- Don't build custom auth flows — Supabase handles it

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Health Stack

- typecheck: cd web && npx tsc --noEmit
- lint: cd web && npx eslint .

## Testing

- Run: `cd web && npm run test` (Vitest; watch mode: `npm run test:watch`)
- Tests live co-located in `web/src/**` as `*.test.ts(x)`; see [TESTING.md](TESTING.md)
- 100% test coverage is the goal — tests make vibe coding safe
- When writing new functions, write a corresponding test
- When fixing a bug, write a regression test
- When adding error handling, write a test that triggers the error
- When adding a conditional (if/else, switch), write tests for BOTH paths
- Never commit code that makes existing tests fail
