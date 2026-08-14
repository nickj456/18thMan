# Coach 360 Feedback — Part 5: Notifications & Scoring Blend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the [Coach 360 Feedback design spec](../specs/2026-08-12-coach-360-feedback-design.md)'s Part 5 — wire the already-built, already-unit-tested multi-source scoring blend (`web/src/lib/coach-dna/scoring.ts`) into the live Coach DNA path, so a coach's results actually incorporate cleared player/parent/peer feedback instead of self-assessment alone, and send a threshold-crossing notification email.

**Prerequisite:** Parts 1–4 merged (request creation, public submission, moderation/consent — this plan needs `held_for_review = false` responses and `response_disputes.status = 'excluded'` to actually exist and be excludable).

**Architecture:**
- **New module `web/src/lib/coach-dna/blend-inputs.ts`**: fetches a coach's cleared, non-excluded external feedback and shapes it into `SourceInput[]` per category, ready to hand to `computeCategoryScore` alongside the self input. This is the one genuinely new piece of logic this plan adds — everything downstream of it (`computeCategoryScore`, `getCategoryWeights`, `getSampleSizeConfidence`) already exists and is already tested.
- **`generateSelfAssessmentSummary`** (`web/src/app/(app)/admin/coach-dna/summary-actions.ts`) is extended, not replaced: it still computes `computeSelfOnlyCategoryScores` exactly as today, but now also fetches blend inputs and calls `computeCategoryScore` per category. `deriveArchetype` (which currently takes raw self scores) is fed the **blended** per-category score when a category has `status: 'scored'`, and the **self-only** score when `status: 'insufficient_data'` — this is what makes "categories still below threshold keep showing as self-only" true per the spec, without a separate code path.
- **No new migrations.** `coach_profiles.ai_summary` is JSONB — the `SelfAssessmentSummary` TypeScript type gains an optional field recording which sources were active per category (for the "Includes player feedback" tag), stored as part of the same JSONB blob that's already written today. Score-change-limiting (`applyScoreChangeLimit`'s `previousScore` parameter) is deliberately called with `previousScore: null` in this plan — see Global Constraints below for why that's a scoped, not accidental, omission.
- **Notification email**: a new `sendFeedbackThresholdReachedEmail` in `web/src/lib/email.ts`, sent from inside `submitFeedbackResponse` (`web/src/app/feedback/[token]/actions.ts`, already merged from Part 3) at the exact moment a request's cleared-response count first reaches `minimum_response_threshold` — not on every response after.
- **UI/PDF changes**: `web/src/app/(app)/admin/coach-dna/page.tsx`, `.../assessment/[attemptId]/complete/page.tsx`, and `CoachDnaSummaryPDF.tsx` each currently hardcode the same blanket "self-assessment only" line (grep-verified — exactly these 3 UI spots plus the email template). Replace with a per-category conditional using the new sources field.

**Tech Stack:** Next.js Server Actions, Supabase, Vitest. `computeCategoryScore`/`getCategoryWeights`/`getSampleSizeConfidence` from `web/src/lib/coach-dna/{scoring,config}.ts` (already built, already unit-tested — do not modify their logic, only call them).

## Global Constraints

- **Rating normalization: 1–5 scale → 0–100.** `feedback_answers.numeric_value` for player_voice/peer_observation questions is a 1–5 rating (per migration 115's seed and the design spec's rating-scale question format). `SourceResponse.value` expects 0–100. Convert with `(numeric_value - 1) / 4 * 100` — 1→0, 3→50, 5→100. Get this conversion right in one place (`blend-inputs.ts`) and test it explicitly; do not inline it elsewhere.
- **`respondent_type` → `ScoreSource` mapping is not 1:1 with `feedback_type`.** A `player_voice` feedback *request* produces responses with `respondent_type` of either `'player'` or `'parent'` (the respondent picks at submission time, per Part 3) — these must map to **different** `ScoreSource` values: `'player'` → `'player_voice'`, `'parent'` → `'parent_voice'`. Only `peer_observation` requests are uniform (`respondent_type` is always `'peer_coach'` → `ScoreSource` `'peer_observation'`). Get this mapping wrong and parent feedback silently gets treated as player feedback (or vice versa) with no error.
- **Exclude disputed-and-excluded responses.** A `feedback_response` with an associated `response_disputes` row where `status = 'excluded'` must not contribute to any category's `SourceInput`. Join `response_disputes` and filter it out in `blend-inputs.ts` — do not rely on `held_for_review` alone (a disputed response was already cleared, that's *why* it could be seen and disputed).
- **`previousScore` is deliberately `null` for this plan.** `computeCategoryScore`'s score-change-limiting (`applyScoreChangeLimit`) needs a persisted prior score to do anything; `coach_profiles` has no column for one today, and adding score-history persistence is a real design decision (retention, what counts as "previous" — last generation? last calendar week?) that the design spec doesn't specify. Rather than bolt on undersized persistence, this plan calls `computeCategoryScore(..., null)` explicitly and documents it. **Log a P3 TODO** for persisted score-continuity as a deliberate follow-up, not a bug someone finds later and assumes was missed.
- **`generateSelfAssessmentSummary`'s AI prompt already forbids the model from mentioning data-source caveats** ("Do not mention 'self-assessment only'... that framing is handled elsewhere in the UI") — this remains true; the per-category "Includes player feedback" tag is a UI badge next to each category, not prose the model writes. Do not touch the prompt except to feed it blended (not self-only) score-derived pros/cons ordering where applicable.
- All web app commands run from `web/`.

---

### Task 1: Blend-input fetcher

**Files:**
- Create: `web/src/lib/coach-dna/blend-inputs.ts`
- Create: `web/src/lib/coach-dna/blend-inputs.test.ts`

**Interfaces:**
- Produces: `fetchBlendInputs(supabase: ServiceClient, coachId: string): Promise<Record<string, SourceInput[]>>` — keyed by category slug, each value containing only the external (non-self) `SourceInput`s for that category (`player_voice`, `parent_voice`, `peer_observation` — never `self`, that's added by the caller). Consumed by Task 2.
- Consumes: `ScoreSource`, `SourceInput`, `SourceResponse` types from `./scoring` and `./config`.

**Context for the implementer:** Query shape (service client, since this reads across `feedback_requests`/`feedback_responses`/`feedback_answers`/`response_disputes`/`assessment_questions`/`dna_categories` for one coach — RLS would require a much more expensive per-row policy walk for an aggregate read like this; the caller in Task 2 already verifies `coachId === auth.uid()` before calling, matching the existing `category_weights_json` service-client precedent in `summary-actions.ts`):

```sql
-- shape, not literal Supabase query syntax
select fa.numeric_value, fa.question_id, fr.respondent_type, aq.category_id, dc.slug, resp.submitted_at
from feedback_answers fa
join feedback_responses resp on resp.id = fa.feedback_response_id
join feedback_requests freq on freq.id = resp.feedback_request_id
join assessment_questions aq on aq.id = fa.question_id
join dna_categories dc on dc.id = aq.category_id
where freq.coach_id = :coachId
  and resp.held_for_review = false
  and fa.numeric_value is not null  -- excludes the free-text comment row
  and not exists (
    select 1 from response_disputes rd
    where rd.feedback_response_id = resp.id and rd.status = 'excluded'
  )
```

Group the results by `dc.slug`, and within each group further split by mapped `ScoreSource` (per the Global Constraints mapping) into separate `SourceInput` entries (one per active source, each with its own `responses: SourceResponse[]` built from `{ value: (numeric_value - 1) / 4 * 100, submittedAt: submitted_at }`).

- [ ] **Step 1: Write the failing tests.** Cases: empty result for a coach with no external feedback; correctly maps `respondent_type: 'player'` → source `'player_voice'` and `'parent'` → `'parent_voice'` and `'peer_coach'` → `'peer_observation'`; correctly normalizes rating 1→0, 3→50, 5→100; excludes a response with an `excluded` dispute; does NOT exclude a response with a `no_action` or `open` dispute (only `excluded` filters); excludes the free-text answer row (`numeric_value is null`) from scoring input; groups multiple responses for the same category+source into one `SourceInput` with multiple `SourceResponse` entries, not multiple `SourceInput`s.
- [ ] **Step 2: Run tests to verify they fail** — `cd web && npx vitest run src/lib/coach-dna/blend-inputs.test.ts`
- [ ] **Step 3: Implement `fetchBlendInputs`**
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Typecheck**
- [ ] **Step 6: Commit**

```bash
git add web/src/lib/coach-dna/blend-inputs.ts web/src/lib/coach-dna/blend-inputs.test.ts
git commit -m "feat(feedback): add blend-input fetcher joining cleared external feedback to categories"
```

---

### Task 2: Wire the blend into `generateSelfAssessmentSummary`

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`
- Modify: `web/src/lib/supabase/types.ts` (extend `SelfAssessmentSummary`)
- Modify: `web/src/lib/coach-dna/archetype.ts` (if `deriveArchetype`'s input type needs to change — see below)

**Interfaces:**
- Consumes: `fetchBlendInputs` (Task 1), `computeCategoryScore`, `getCategoryWeights`, `getSourceThresholds` (existing).
- Changes: `SelfAssessmentSummary` gains `sourcedCategories: Record<string, ScoreSource[]>` — for each category slug, which sources (besides self, or including it) actually contributed to its shown score. The UI (Task 3) uses this to decide "Includes player feedback" vs plain.

**Context for the implementer:** `deriveArchetype(scores: SelfCategoryScore[])` currently takes exactly the self-only per-category scores and picks pros/cons/primary/secondary type from them. Keep calling it with **one score per category, whichever is authoritative for that category** — the blended score when `computeCategoryScore` returns `status: 'scored'`, the existing self-only score when it returns `'insufficient_data'`. This is a drop-in replacement value, not a shape change, so `deriveArchetype` itself should need zero changes — build a `blendedOrSelfScores: SelfCategoryScore[]` array in `summary-actions.ts` and pass that instead of the raw self scores, keeping `deriveArchetype` and its own tests completely untouched.

Sequence inside `generateSelfAssessmentSummary`, after the existing `computeSelfOnlyCategoryScores` call:
1. `const blendInputs = await fetchBlendInputs(serviceSupabase, user.id)`
2. For each of the 8 category slugs: build `SourceInput[]` = `[{ source: 'self', responses: [{ value: selfScore, submittedAt: attempt.completed_at }] }, ...(blendInputs[slug] ?? [])]`. (Self is always a single synthetic "response" carrying the already-computed self score — `computeSelfOnlyCategoryScores`' scale (0-100) already matches `SourceResponse.value`'s expected range, so no extra normalization is needed for the self input specifically.)
3. Call `computeCategoryScore(inputs, getCategoryWeights(slug), getSourceThresholds(slug), new Date())` — `previousScore: null` per Global Constraints.
4. Build `blendedOrSelfScores` and `sourcedCategories` from the results.
5. Pass `blendedOrSelfScores` to `deriveArchetype` instead of the raw self scores.
6. Include `sourcedCategories` in the returned/persisted `summary` object.

- [ ] **Step 1: Write the failing tests** in `summary-actions.test.ts` (extend the existing mock setup — check its current shape first, it likely already mocks `assessment_options`/`assessment_responses`; add mocks for `fetchBlendInputs` via `vi.mock('@/lib/coach-dna/blend-inputs', ...)` rather than mocking the underlying tables again, keeping this test focused on the wiring, not re-testing Task 1's query). Cases: a category with zero external feedback shows the self-only score and `sourcedCategories[slug] === ['self']`; a category with enough player_voice responses to clear threshold shows a blended score and `sourcedCategories[slug]` includes `'player_voice'`; a category below threshold falls back to self-only even though some external responses exist (`status: 'insufficient_data'` path); `deriveArchetype` receives the blended (not raw self) scores — assert on what it's called with, not just the final output, so a regression that silently reverts to self-only can't hide behind `deriveArchetype`'s own fallback behavior.
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Typecheck**
- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/summary-actions.ts" "web/src/app/(app)/admin/coach-dna/summary-actions.test.ts" web/src/lib/supabase/types.ts
git commit -m "feat(feedback): blend cleared external feedback into live Coach DNA scoring"
```

---

### Task 3: Per-category UI indicator (replace the blanket disclaimer)

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx`
- Modify: `web/src/lib/email.ts` (`sendCoachDnaSummaryEmail`)
- Update corresponding test files for each

**Context for the implementer:** All 4 spots currently render one hardcoded sentence unconditionally. Per the design spec: a category with `sourcedCategories[slug]` containing more than just `'self'` gets a small "Includes player feedback" (or "...peer feedback", "...parent feedback" — pick the label(s) actually present) tag next to that category; categories still self-only keep the existing per-category framing, and only show the blanket sentence if **every** category is still self-only (preserves today's exact behavior for coaches with zero external feedback yet, which is the common case at first launch).

- [ ] **Step 1: Write the failing tests** for each of the 4 surfaces — assert the blanket line still appears when `sourcedCategories` is all-self (or absent, for backward compatibility with existing `coach_profiles.ai_summary` rows generated before this plan shipped — treat a missing `sourcedCategories` field as all-self, not as an error), and that a per-category tag appears for a category with external sources.
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement each surface**
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Typecheck**
- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/page.tsx" "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx" "web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx" web/src/lib/email.ts
git commit -m "feat(feedback): replace blanket self-assessment-only disclaimer with per-category source indicator"
```

---

### Task 4: Threshold-reached notification email

**Files:**
- Modify: `web/src/lib/email.ts` (add `sendFeedbackThresholdReachedEmail`)
- Modify: `web/src/lib/email.test.ts`
- Modify: `web/src/app/feedback/[token]/actions.ts` (already merged from Part 3 — send the email from inside `submitFeedbackResponse`)
- Modify: `web/src/app/feedback/[token]/actions.test.ts`

**Interfaces:**
- Produces: `sendFeedbackThresholdReachedEmail(to: string, coachDisplayName: string, requestType: FeedbackType): Promise<EmailResult>` — follow the exact pattern of `sendCoachDnaSummaryEmail`/`sendClubAddedEmail` in the same file (layout/heading/para/ctaButton helpers already used throughout).

**Context for the implementer:** In `submitFeedbackResponse`, right after the final `held_for_review = false` update (the "clean, becomes visible" path — a flagged-then-later-cleared response should NOT double-count or re-trigger if it crosses the threshold on release; that path is Task 3 of the *moderation* plan's `dismissSafeguardingFlag`, which also flips `held_for_review = false` and should trigger the same check — see note below) count cleared responses for that `feedback_request_id` (`select count(*) from feedback_responses where feedback_request_id = :id and held_for_review = false`). If the count **exactly equals** `minimum_response_threshold` (not `>=`, to fire exactly once — a `>` check would never fire if two responses clear in the same instant and jump past the threshold in one step, so use `>=` combined with a guard that the count *before* this response's clearing was below threshold, i.e. compare `newCount >= threshold && newCount - 1 < threshold`), fetch the coach's email/display name and send the notification.

**This same threshold check must also run from `dismissSafeguardingFlag`** (Part 4's moderation plan, Task 3) since that's another path by which a response transitions to `held_for_review = false` and could be the one that crosses the threshold. Extract the count-and-maybe-notify logic into a shared helper (`web/src/lib/coach-dna/notify-threshold.ts`) called from both places, rather than duplicating it — flag this as a note for whoever implements Part 4's Task 3 if this plan lands first, or wire it into `dismissSafeguardingFlag` directly as part of this task if Part 4 already merged first.

- [ ] **Step 1: Write the failing tests** for the email function (snapshot-free — assert on subject/key content strings, matching this file's existing test style) and for the wiring in `submitFeedbackResponse`: sends exactly once when the count first reaches threshold; does not send again on subsequent clears past threshold; does not send when count is still below threshold; does not block/fail the submission if the email send itself fails (matches the existing `safeguarding_flags` insert-failure-is-non-blocking pattern already in this file).
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement `sendFeedbackThresholdReachedEmail`, the shared `notify-threshold.ts` helper, and wire it into `submitFeedbackResponse`**
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Typecheck**
- [ ] **Step 6: Commit**

```bash
git add web/src/lib/email.ts web/src/lib/email.test.ts web/src/lib/coach-dna/notify-threshold.ts "web/src/app/feedback/[token]/actions.ts" "web/src/app/feedback/[token]/actions.test.ts"
git commit -m "feat(feedback): send threshold-reached notification email when a request's cleared responses first hit its minimum"
```

---

### Task 5: TODOS.md follow-up

- [ ] Add a P3 TODO: "Persist previous category scores for `applyScoreChangeLimit` continuity" — `computeCategoryScore` is currently always called with `previousScore: null` (Task 2), so a coach's blended score has no smoothing against a single outlier batch of responses. Needs a decision on what "previous" means (last generation timestamp? rolling window?) before implementing — deliberately deferred, see this plan's Global Constraints.
- [ ] Commit: `git commit -m "docs: track deferred score-continuity persistence follow-up"`

---

### Task 6: Full verification

- [ ] **Step 1:** `cd web && npx tsc --noEmit`
- [ ] **Step 2:** `cd web && npm run test`
- [ ] **Step 3: Manual QA (cannot be automated in this environment).** Needs a coach with a completed self-assessment plus real cleared player_voice/peer_observation responses (from Parts 1–4 exercised end-to-end) to see a genuinely blended score. At minimum: confirm a category with cleared external feedback above threshold shows the "Includes X feedback" tag and a score that visibly differs from self-only; confirm a category still below threshold shows exactly today's self-only framing; confirm the threshold email sends once and only once; confirm an `excluded` dispute's response no longer affects the score after re-generating the summary.
- [ ] **Step 4: Commit** (only if Step 1–2 required fixes).
