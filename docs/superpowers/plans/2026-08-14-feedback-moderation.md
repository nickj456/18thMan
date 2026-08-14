# Coach 360 Feedback — Part 4: Moderation & Consent Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin-facing surfaces Part 4 of the [Coach 360 Feedback design spec](../specs/2026-08-12-coach-360-feedback-design.md) describes: a club-admin consent toggle on the existing "My Club" page, a safeguarding queue for reviewing automated flags, and a disputes queue for coaches to contest a response and admins to resolve it. All underlying schema, RLS policies, and immutability triggers already exist and are already merged to `main` (migrations 088–107) — this plan only adds UI pages and server actions that read/write through that existing, already-secured schema. **No new migrations are needed for this plan.**

**Prerequisite:** Parts 1–3 (`worktree-feedback-request-creation`, `worktree-feedback-public-submission`) merged to `main` first — this plan's queues are empty and untestable-by-hand until real requests/responses/flags exist to moderate.

**Architecture:**
- **Consent toggle** lives on `web/src/app/(app)/clubs/page.tsx` (the "My Club" page club-role admins already use to manage members — NOT `web/src/app/(app)/admin/clubs/`, which is platform-admin-only club management and a different audience entirely). A new server action inserts a `club_guardian_consents` row for the current season, relying on the table's `unique (club_id, season_label)` constraint and existing RLS (migration 090) for authorization — no new migration.
- **Safeguarding queue**: `web/src/app/(app)/admin/feedback/safeguarding/page.tsx` + `actions.ts`. Lists `safeguarding_flags` where `status = 'open'`, scoped by RLS (migration 092) to the caller's own club (club admin) or all clubs (platform admin) automatically — the query itself doesn't need manual scoping. Two actions: dismiss (`status = 'dismissed'`, release the response) and confirm (`status = 'reviewed'`, keep held). Every action writes an `admin_feedback_access_log` row per the design spec.
- **Disputes queue**: `web/src/app/(app)/admin/feedback/disputes/page.tsx` + `actions.ts`, same RLS-scoped-list pattern against `response_disputes` where `status = 'open'`. Resolve to `excluded` or `no_action`.
- **Coach-facing dispute trigger**: a "Dispute this response" button added to the coach's feedback responses view. That view doesn't exist yet either (Part 5 adds the results-page integration) — this plan adds a minimal standalone list at `web/src/app/(app)/admin/coach-dna/feedback/[id]/responses/page.tsx` (coach's own responses to one of their requests) purely so disputes have something to attach to; Part 5 may later fold this into the main results page.

**Tech Stack:** Next.js App Router (Server Components, Server Actions), Supabase (RLS does the authorization heavy lifting here — every list query is a plain `select` relying on existing policies), Vitest.

## Global Constraints

- **Do not add manual role/club-scoping logic to the safeguarding or disputes list queries.** RLS (092, 091) already returns exactly the rows a club admin or platform admin should see. Manually re-deriving that scope in application code would duplicate — and risk drifting from — the policy logic. Just `select *` (explicit columns) and trust RLS.
- **`flagged_text`, `detection_method`, and `feedback_answer_id` on `safeguarding_flags` are trigger-immutable** (migration 092's `safeguarding_flags_evidence_immutable`). Only ever update `status`, `reviewed_by`, `reviewed_at`.
- **Every safeguarding/dispute view or action writes `admin_feedback_access_log`.** This is an audit trail, not optional telemetry — include it in the same request as the action, not fire-and-forget.
- **`admin_feedback_access_log` has platform-admin-only SELECT** (migration 092: "Platform admins can view the access log") — this plan does not add a UI to browse the log, just writes to it. Reading it back is out of scope.
- Access gate: reuse the pattern from `web/src/app/(app)/admin/clubs/actions.ts`'s `requireAdmin()` (platform role check) is wrong here — this feature is for `club_role = 'admin'` OR platform `role = 'admin'`, matching `web/src/app/(app)/clubs/actions.ts`'s existing pattern of checking `club_role`. Write a shared `requireFeedbackModerator()` helper once, used by both queues, rather than duplicating the OR-check four times (learn from the existing TODOS.md item about the duplicated admin-gate block in `admin/coach-dna/`).
- All web app commands run from `web/`.

---

### Task 1: Shared moderator-access helper

**Files:**
- Create: `web/src/app/(app)/admin/feedback/require-moderator.ts`
- Create: `web/src/app/(app)/admin/feedback/require-moderator.test.ts`

**Interfaces:**
- Produces: `requireFeedbackModerator(): Promise<{ supabase: SupabaseClient; userId: string; isPlatformAdmin: boolean }>` — redirects to `/login` if unauthenticated, redirects to `/dashboard` if neither `club_role === 'admin'` nor platform `role === 'admin'`. Consumed by Tasks 2 and 3.

- [ ] **Step 1: Write the failing tests**

Cover: redirects unauthenticated to `/login`; redirects a plain coach (`club_role` null, `role` coach) to `/dashboard`; allows a club admin (`club_role = 'admin'`) through with `isPlatformAdmin: false`; allows a platform admin (`role = 'admin'`, no club) through with `isPlatformAdmin: true`. Mock `@/lib/supabase/server` and `next/navigation` following the pattern in `web/src/app/(app)/admin/coach-dna/actions.test.ts`.

- [ ] **Step 2: Run tests to verify they fail** — `cd web && npx vitest run src/app/\(app\)/admin/feedback/require-moderator.test.ts`

- [ ] **Step 3: Write the helper**

```ts
// web/src/app/(app)/admin/feedback/require-moderator.ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireFeedbackModerator() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role, club_role').eq('id', user.id).single()
  const isPlatformAdmin = profile?.role === 'admin'
  if (!isPlatformAdmin && profile?.club_role !== 'admin') redirect('/dashboard')
  return { supabase, userId: user.id, isPlatformAdmin }
}
```

- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Typecheck** — `cd web && npx tsc --noEmit`
- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/admin/feedback/require-moderator.ts" "web/src/app/(app)/admin/feedback/require-moderator.test.ts"
git commit -m "feat(feedback): add shared moderator-access helper for safeguarding/disputes queues"
```

---

### Task 2: Club guardian-consent toggle on the My Club page

**Files:**
- Modify: `web/src/app/(app)/clubs/page.tsx`
- Modify: `web/src/app/(app)/clubs/actions.ts`
- Modify: `web/src/app/(app)/clubs/actions.test.ts` (create if it doesn't exist — check first)

**Interfaces:**
- Produces: `grantGuardianConsent(clubId: string)` server action — consumed by the new toggle's form.
- Consumes: `getCurrentSeasonLabel()` from `web/src/lib/season.ts` (already exists, built in Part 1).

**Context for the implementer:** `ClubPage` already branches on `profile.club_role === 'admin'` to show admin-only sections (line ~102 per the existing file). Add the consent section inside that same branch. Query whether a `club_guardian_consents` row already exists for `(club.id, getCurrentSeasonLabel())` and render either "Consent on file for {season}" (read-only, with who/when if you want to surface `granted_by`/`granted_at`) or a "Confirm guardian consent for {season}" button.

- [ ] **Step 1: Write the failing tests** for `grantGuardianConsent`:
  - rejects when caller is not a club admin (not `club_role = 'admin'` for that club) — expect it to rely on RLS: assert the insert is attempted with `granted_by = auth.uid()` and let RLS reject it (i.e., test that a DB error surfaces as `{ error: ... }`, don't re-implement the authorization check in the action itself — RLS is the source of truth per migration 090).
  - inserts a `club_guardian_consents` row with `club_id`, `season_label: getCurrentSeasonLabel()`, `granted_by: userId` on success
  - returns a friendly (not generic) message when the row already exists (`23505` on the `unique(club_id, season_label)` constraint) rather than erroring — this is an expected, idempotent "already granted" case, not a failure
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement `grantGuardianConsent`** in `web/src/app/(app)/clubs/actions.ts`, following the file's existing action shape (see `acceptClubInvite` for the pattern). Catch `error.code === '23505'` and return `{ error: null, alreadyGranted: true }` rather than treating it as a failure — a coach clicking twice, or two admins confirming near-simultaneously, isn't an error case.
- [ ] **Step 4: Add the read query + UI section to `ClubPage`** inside the existing `club_role === 'admin'` branch: fetch the current season's consent row, render the status + button/form calling `grantGuardianConsent`.
- [ ] **Step 5: Run tests to verify they pass**
- [ ] **Step 6: Typecheck**
- [ ] **Step 7: Commit**

```bash
git add "web/src/app/(app)/clubs/page.tsx" "web/src/app/(app)/clubs/actions.ts" "web/src/app/(app)/clubs/actions.test.ts"
git commit -m "feat(feedback): add club guardian-consent toggle to the My Club page"
```

---

### Task 3: Safeguarding queue

**Files:**
- Create: `web/src/app/(app)/admin/feedback/safeguarding/page.tsx`
- Create: `web/src/app/(app)/admin/feedback/safeguarding/actions.ts`
- Create: `web/src/app/(app)/admin/feedback/safeguarding/actions.test.ts`

**Interfaces:**
- Consumes: `requireFeedbackModerator` (Task 1).
- Produces: `dismissSafeguardingFlag(flagId: string)`, `confirmSafeguardingFlag(flagId: string)`.

**Context for the implementer:** List query: `select id, flagged_text, detection_method, created_at, feedback_answer_id from safeguarding_flags where status = 'open' order by created_at asc` — RLS (migration 092) automatically scopes this to the caller's club (or all clubs for a platform admin), so no manual `club_id` filter is added or needed. For each flag, you'll also want the associated coach/team context for display — join through `feedback_answers → feedback_responses → feedback_requests → profiles(coach)`; a single query with nested selects is fine, follow the join style already used in migration 098's RLS policies (`feedback_responses` → `feedback_requests` → `profiles`) as a guide for the relationship shape, but remember these are just informational reads, not policy definitions.

- [ ] **Step 1: Write the failing tests** for both actions:
  - `dismissSafeguardingFlag`: sets `status = 'dismissed'`, `reviewed_by = userId`, `reviewed_at = now`; also updates the associated `feedback_responses.held_for_review = false` (a dismissed flag means the response should actually become visible — this is the "false positive, release it" path from the design spec); writes an `admin_feedback_access_log` row with `action: 'dismiss_safeguarding_flag'`.
  - `confirmSafeguardingFlag`: sets `status = 'reviewed'`, `reviewed_by`, `reviewed_at`; does **not** touch `held_for_review` (stays hidden permanently per the spec); writes an access-log row with `action: 'confirm_safeguarding_flag'`.
  - both reject (redirect, per `requireFeedbackModerator`) for a non-moderator caller
  - `flagged_text` is never included in any `.update()` payload in either action (regression guard for the immutability trigger — the test should assert on the exact update payload, not just that the call succeeded, since a payload that happens to also touch `flagged_text` unchanged would still trip the trigger on some Postgres versions of `is distinct from` semantics if a client library round-trips it back)
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement `actions.ts`**
- [ ] **Step 4: Build the page** — RLS-scoped list, two buttons per flag calling the actions, empty state ("No flagged content to review"), loading/error states per CLAUDE.md's Do/Don't.
- [ ] **Step 5: Run tests to verify they pass**
- [ ] **Step 6: Typecheck**
- [ ] **Step 7: Commit**

```bash
git add "web/src/app/(app)/admin/feedback/safeguarding/"
git commit -m "feat(feedback): add safeguarding moderation queue"
```

---

### Task 4: Disputes queue

**Files:**
- Create: `web/src/app/(app)/admin/feedback/disputes/page.tsx`
- Create: `web/src/app/(app)/admin/feedback/disputes/actions.ts`
- Create: `web/src/app/(app)/admin/feedback/disputes/actions.test.ts`

**Interfaces:**
- Consumes: `requireFeedbackModerator` (Task 1).
- Produces: `resolveDispute(disputeId: string, resolution: 'excluded' | 'no_action')`.

**Context for the implementer:** List query against `response_disputes where status = 'open'`, RLS-scoped per migration 091 the same way as Task 3. `resolveDispute` sets `status`, `resolved_by: userId`, `resolved_at: now`. When `resolution === 'excluded'`, the design spec says the response is "removed from that coach's results and any score calculation" — Part 5 (scoring wiring) is what actually reads dispute status when building `SourceInput[]`, so this action's job is only to set `status = 'excluded'` correctly; do not attempt to touch `feedback_responses`/`feedback_answers` here, and do not build the scoring-exclusion logic in this plan (it doesn't exist to exclude *from* yet — Part 5 adds it).

- [ ] **Step 1: Write the failing tests**: resolves to `excluded`; resolves to `no_action`; rejects a non-moderator; rejects resolving a dispute not in `open` status (defensive check even though the UI won't offer it — a second admin resolving a tab left open from earlier shouldn't silently double-resolve or overwrite `resolved_by`).
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Build the page**
- [ ] **Step 5: Run tests to verify they pass**
- [ ] **Step 6: Typecheck**
- [ ] **Step 7: Commit**

```bash
git add "web/src/app/(app)/admin/feedback/disputes/"
git commit -m "feat(feedback): add response disputes queue"
```

---

### Task 5: Coach-facing dispute trigger

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/feedback/[id]/responses/page.tsx`
- Create: `web/src/app/(app)/admin/coach-dna/feedback/[id]/responses/DisputeButton.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/feedback/page.tsx` (link each request card to its responses page)
- Create/modify corresponding `actions.ts` + tests

**Interfaces:**
- Produces: `raiseDispute(feedbackResponseId: string, reason: string)` — RLS (migration 091) already enforces the coach can only dispute a response to their own request, and the `unique(feedback_response_id, raised_by)` constraint prevents duplicate disputes on the same response — catch `23505` and surface "You've already disputed this response" rather than a generic error, same pattern as Task 2.

**Context for the implementer:** This is intentionally a minimal, standalone list (coach's own responses to one request, held_for_review = false ones only, per migration 093's existing coach-view policy) — not a redesign of the results page. Each response shows its ratings/comment (respecting the column-grant restrictions from 093 — `device_fingerprint_hash` and `respondent_id_nullable` are already invisible to the `authenticated` role, so a plain `select *` naturally can't leak them) and a "Dispute this response" button that opens a short reason field.

- [ ] **Step 1: Write the failing tests** for `raiseDispute`: creates a dispute with `raised_by = userId`, `status = 'open'`; rejects a duplicate dispute on the same response with a friendly message; rejects when the response doesn't belong to the caller's own request (RLS does the rejection — test that the resulting DB error surfaces as a friendly "not found" rather than leaking the RLS error message).
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Build the page + link from the feedback requests list**
- [ ] **Step 5: Run tests to verify they pass**
- [ ] **Step 6: Typecheck**
- [ ] **Step 7: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/feedback/[id]/responses/" "web/src/app/(app)/admin/coach-dna/feedback/page.tsx"
git commit -m "feat(feedback): let coaches view responses to a request and raise a dispute"
```

---

### Task 6: Full verification

- [ ] **Step 1:** `cd web && npx tsc --noEmit` — no errors.
- [ ] **Step 2:** `cd web && npm run test` — all pass, no regressions.
- [ ] **Step 3: Manual QA (cannot be automated in this environment — report to the human partner instead of claiming it's verified).** Needs real requests/responses/flags/disputes to exist (from Parts 1–3 having actually run end-to-end), so this genuinely cannot be exercised until this branch is tested alongside real data. At minimum, walk through: a club admin sees the consent toggle only for their own club; a platform admin sees flags/disputes across all clubs, a club admin sees only their own; dismissing a flag actually makes the response visible to the coach; confirming does not; a coach can raise exactly one dispute per response.
- [ ] **Step 4: Commit** (only if Step 1–2 required fixes).
