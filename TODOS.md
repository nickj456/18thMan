# TODOS

## Ship

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

**`115_feedback_question_bank_seed.sql` is non-idempotent and worse than the precedent above**
**Priority:** P4
Final whole-branch review on 2026-08-13 (`worktree-feedback-request-creation`)
noted this seed uses `gen_random_uuid()` rather than fixed UUIDs (unlike
`108_self_assessment_seed.sql`), so a replay doesn't fail loudly on a PK
conflict — it silently duplicates all 18 `player_voice`/`peer_observation`
question rows, doubling every question set. Same fix as the item above (a
new migration with `on conflict do nothing` or fixed UUIDs), not touching
the already-applied 115.

## Completed

**`feedback_requests` INSERT policy had no DB-level guardian-consent check**
Fixed in `worktree-feedback-request-creation` (migration `118_feedback_requests_consent_check.sql`).
Tightened the INSERT policy on `feedback_requests` so `player_voice` rows now
require, at the database level, that `team_id` resolves to a `coaching_groups`
row in the caller's own club AND a `club_guardian_consents` row exists for
that club/season — matching (and now backstopping) the app-level check in
`createFeedbackRequest`. `peer_observation` rows are unaffected (no minor
involved). **Verification caveat:** no local Supabase/Postgres instance or
CLI was available in this environment, so this migration is syntax-reviewed
against the existing schema and this repo's own precedent for bare
enum-string comparisons (`085_assessment_questions.sql`) and season-label
matching (`web/src/lib/season.ts`), but not execution-tested against a real
database. Recommend a manual check after this migration is applied: attempt
a direct PostgREST insert as a coach with `feedback_type = 'player_voice'`
and a `team_id` outside their club (or with no consent on file) and confirm
it's rejected.

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
