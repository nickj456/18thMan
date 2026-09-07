# TODOS

## Ship

**Landing page pricing card hardcodes "Up to 3 session plans" for Free — actual limit is 1**
**Priority:** P2
`/document-release` on 2026-09-07 (landing redesign, v1.12.0.0) found
`web/src/components/landing/PricingSection.tsx` lists `'Up to 3 session plans'`
as a Free-tier bullet, but `FREE_SESSION_LIMIT` in `web/src/lib/subscription-limits.ts`
is `1`, and `/pricing` (`web/src/app/pricing/page.tsx`) correctly derives its
Free-tier bullet from that constant. This is a pre-existing bug carried over
verbatim from the old homepage (confirmed present on `main` before the
redesign, at the equivalent spot in the old `page.tsx`) — the redesign didn't
introduce it, just relocated the same hardcoded string into the new
`PricingSection.tsx`. A coach who signs up expecting 3 session plans off the
homepage copy hits the cap at 1. Fix: derive the bullet from
`FREE_SESSION_LIMIT` the same way `/pricing` does, instead of a literal string.

**"Match Analyst desktop app" isn't in CLAUDE.md's Subscription Tiers table or `/pricing`'s feature lists**
**Priority:** P3
`/document-release` on 2026-09-07 (landing redesign, v1.12.0.0) found that
Match Analyst access is genuinely gated in code — `web/src/app/analyst/page.tsx`
sets `canDownload = isInClub || tier !== 'free'`, and the new homepage
`PricingSection.tsx` now advertises "Match Analyst desktop app" as a Coach
Pro/Club perk (bullet + footer line), matching that gate correctly. But
`COACH_FEATURES`/`CLUB_FEATURES` in `web/src/app/pricing/page.tsx` — the
designated source of truth per CLAUDE.md's "Keeping this in sync" note — never
lists it, and it's not a row in CLAUDE.md's Subscription Tiers & Feature
Access table either. Pre-existing gap (the gating predates this branch), but
now that the homepage prominently sells it, `/pricing` undersells its own
paid tiers. Add it to both.

**New `PricingSection.tsx` (monthly/yearly toggle) has no test file**
**Priority:** P3
`/document-release` on 2026-09-07 (landing redesign, v1.12.0.0) found
`web/src/components/landing/PricingSection.tsx` (214 lines, stateful toggle)
shipped with no `PricingSection.test.tsx`, while sibling components in the
same directory (`DownloadForm.tsx`, `MobileMenu.tsx`) both have one. Per
CLAUDE.md/TESTING.md's "write a corresponding test for new functions"
convention. Worth covering: monthly vs. yearly price/label swap, and that all
three plan cards render with their CTAs.

**Document the new `get_landing_stats()` anon-accessible RPC in CLAUDE.md's Security section**
**Priority:** P4
`/document-release` on 2026-09-07 (landing redesign, v1.12.0.0) added
`web/supabase/migrations/129_landing_stats_rpc.sql`: a `SECURITY DEFINER`
function granted to `anon` and `authenticated` that bypasses RLS on
`profiles`/`drills`/`session_plans` to return three aggregate counts for the
homepage scoreboard. The migration's own comment explains the scoping (counts
only, no row-level data), and it looks fine, but CLAUDE.md's Security section
already tracks this exact class of thing (the `clubs`/`products` anon-access
carve-outs) — this RPC should get the same one-line treatment there so the
next SECURITY DEFINER function added to the schema has a documented pattern
to match against, rather than each one being a one-off judgment call.

**Set up Playwright E2E coverage for browser-only flows**
**Priority:** P2
Coverage audit on 2026-07-06 (v1.8.0.3) found 9 code paths that need a real
browser to test meaningfully: drill designer canvas interactions (equipment
placement, resize, fullscreen save), the Stripe checkout/portal auth+payment
journey, and the admin content-engine/users-table UI. Vitest + Testing
Library now covers everything unit-testable (SSRF guard, Stripe route
authorization, admin actions, mobile nav, lead-magnet form — 62 tests). This
item tracks adding Playwright for the remaining browser-dependent flows.

**Add `sizes` prop to `next/image fill` usages across drill/session cards**
**Priority:** P3
`/qa` on 2026-07-12 (health score 83→99) found that `DrillCard` and related
drill-preview/YouTube-thumbnail images use `fill` without a `sizes` prop
(Next.js performance warning — forces loading the largest possible image
regardless of render size), plus a recurring `/logo.png` aspect-ratio CSS
warning. No functional impact; deferred as low severity. See
`.gstack/qa-reports/qa-report-18thman-2026-07-12.md` (ISSUE-004).

## Coach DNA

**Prevent duplicate in-progress self-assessment attempts from concurrent starts**
**Priority:** P3
Adversarial review on 2026-08-06 (`/ship`, v1.10.0.0) found `startAssessment` has
no guard against a double-click/double-submit creating two orphaned in-progress
`assessment_attempts` rows for the same coach. Low impact for the current
admin-only preview (single tester), but worth a unique partial index
(`coach_id, assessment_type where completed_at is null`) before this opens up
beyond admin preview.

**`answerQuestion` has no cross-check that questionId belongs to the attempt's assessment_type**
**Priority:** P3
Adversarial review on 2026-08-06 (`/ship`, v1.10.0.0) flagged that today this is
inert (only `self_assessment` attempts exist), but the self-assessment design
doc already scopes `player_voice` and `peer_observation` as future sub-projects
sharing the same `assessment_attempts`/`assessment_responses` tables and
actions shape. Add the cross-check before those land, or a coach could answer
a peer-observation question against a self-assessment attempt.

**Extract the repeated admin+role-check block in the coach-dna route tree into a shared helper**
**Priority:** P4
Maintainability review on 2026-08-06 (`/ship`, v1.10.0.0) found the
"get user → redirect /login → fetch profile role → redirect /dashboard" block
duplicated across 5 files under `admin/coach-dna/`. Low risk today (each copy
is identical and correct), but any future change to the admin gate needs to
touch all 5. This pattern likely repeats across other `admin/*` routes too —
worth a repo-wide sweep, not just this feature, if tackled.

**Add `on conflict do nothing` to the self-assessment seed migration**
**Priority:** P4
Data-migration review on 2026-08-06 (`/ship`, v1.10.0.0) noted
`108_self_assessment_seed.sql` inserts fixed-UUID rows with no conflict
handling, unlike the sibling `083_dna_categories.sql` seed. Not fixed in place
since the migration is already applied to prod (never edit an applied
migration) — if idempotent re-seeding is ever needed (branch resets, local
dev fixtures), add it as a new migration rather than editing this one.

**Persist previous category scores for `applyScoreChangeLimit` continuity**
**Priority:** P3
`worktree-feedback-scoring-wiring` (Part 5 of the coach 360-feedback loop)
wires `computeCategoryScore` into the live results path but always calls it
with `previousScore: null`, so the score-change-limiting logic
(`applyScoreChangeLimit`, already built and tested in `limits.ts`) never
actually smooths anything — a single new batch of external feedback can move
a category's shown score by its full raw delta with no continuity guard.
`coach_profiles` has no column to store a prior score, and adding one is a
real design decision (what counts as "previous" — last generation? a rolling
window?) the design spec doesn't specify, so this was deliberately deferred
rather than bolted on. Needs a decision before implementing.

**`115_feedback_question_bank_seed.sql` is non-idempotent and worse than the precedent above**
**Priority:** P4
Final whole-branch review on 2026-08-13 (`worktree-feedback-request-creation`)
noted this seed uses `gen_random_uuid()` rather than fixed UUIDs (unlike
`108_self_assessment_seed.sql`), so a replay doesn't fail loudly on a PK
conflict — it silently duplicates all 18 `player_voice`/`peer_observation`
question rows, doubling every question set. Same fix as the item above (a
new migration with `on conflict do nothing` or fixed UUIDs), not touching
the already-applied 115.

## Nav

**Simplify per-NavItem `isActive` boilerplate in app-sidebar.tsx**
**Priority:** P4
Maintainability review on 2026-08-17 (`/ship`, coach-dna-hero-and-nav) found
~15 `NavItem` entries define `isActive: (p) => p === href`, a plain restatement
of the item's own `href`. Defaulting to exact-match when `isActive` is omitted,
and only requiring an explicit override for the prefix-matching items
(my-reviews, shop, analyst, admin/*, game-plans, analyze), would roughly halve
the boilerplate. Pre-existing pattern from before this session, not a bug —
deferred as a cleanup, not a ship blocker.

## Completed

**Race condition let two concurrent submissions from the same device both pass `feedback_responses` dedup check**
Fixed in `worktree-feedback-public-submission` (migration `119_feedback_responses_dedup_unique.sql`).
`submitFeedbackResponse`'s pre-insert existence check (query for an existing
row with the same `feedback_request_id` + `device_fingerprint_hash`) had a
TOCTOU gap — two near-simultaneous submissions could both pass the check
before either insert landed, producing two response rows for one
respondent and silently padding a request's count past
`minimum_response_threshold` (the anonymity floor). Added a unique
constraint on `(feedback_request_id, device_fingerprint_hash)`; the action
now catches the resulting `23505` and returns the same friendly
"already submitted" message. Regression test added in `actions.test.ts`.
**Applied and confirmed live** on 2026-08-14 via direct DB inspection —
`feedback_responses_request_device_unique` constraint verified present.

**`feedback_requests` INSERT policy had no DB-level guardian-consent check**
Fixed in `worktree-feedback-request-creation` (migration `118_feedback_requests_consent_check.sql`).
Tightened the INSERT policy on `feedback_requests` so `player_voice` rows now
require, at the database level, that `team_id` resolves to a `coaching_groups`
row in the caller's own club AND a `club_guardian_consents` row exists for
that club/season — matching (and now backstopping) the app-level check in
`createFeedbackRequest`. `peer_observation` rows are unaffected (no minor
involved). **Applied and confirmed live** on 2026-08-14 via direct DB
inspection — the policy's `with_check` expression matches the migration
exactly, and both 118/119 were behind the last-applied migration until this
session caught the gap and applied both directly to the `18th-man`
Supabase project.

**Nested `<a>` tags in DrillCard broke HTML validity on every drill-grid page**
Fixed by `/qa` on 2026-07-12, `feat/landing-page-redesign` (commit 185f340).
`DrillCard`'s author-profile and YouTube-channel links were nested inside
the card's outer drill-detail `Link`, causing a React hydration error on
/drills, /sessions, /chat/ai, /clubs, /groups, /weekly-focus, /podcasts,
and /wellbeing, and an undefined real click target for the author link
(browsers silently reparent invalid nested anchors). Both inner links are
now non-anchor elements that navigate imperatively via `router.push`.

**Base UI `nativeButton` console warning on `Button render={<Link/>}`**
Fixed by `/qa` on 2026-07-12, `feat/landing-page-redesign` (commit 80590e9).
The shared `Button` component now defaults `nativeButton={false}` whenever
a `render` target is supplied, matching the documented `render={<Link/>}`
pattern in CLAUDE.md. Confirmed fixed on /podcasts and /wellbeing.

**Invalid regex on signup username `pattern` attribute**
Fixed by `/qa` on 2026-07-12, `feat/landing-page-redesign` (commit c2e2ee4).
Escaped the trailing hyphen in `[a-z0-9_-]+` → `[a-z0-9_\-]+`, which
Chromium's stricter `pattern`-attribute validation was rejecting, silently
disabling native client-side validation on the signup form.
