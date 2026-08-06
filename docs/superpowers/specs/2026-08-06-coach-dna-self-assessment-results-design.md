# Coach DNA — Self-Assessment Results Summary (Phase 3, sub-project 2)

## Purpose

The previous sub-project (self-assessment flow) deliberately stopped at a plain "thanks for
completing" screen, because `computeCategoryScore` refuses to produce a score from fewer than 2
active sources — self-assessment alone was always `insufficient_data`, so there was nothing real
to show yet. A coach who just spent 10 minutes answering 24 questions and got nothing back is a
weak product moment, surfaced directly by the coach who used it.

This sub-project gives that coach a real result today, built entirely from their own self-report,
clearly framed as self-only (never presented as if it were a blended 360 score), and structurally
ready to upgrade to a real blended view once Player Voice / Peer Observation data exists later.

**Decision reversal, noted explicitly.** The original master design (`2026-08-05-coach-dna-design.md`,
Phase 3 scope) decided: *"Rule-based text summary from current data; an LLM call is only justified
for summarizing open-text feedback, never for computing the numeric score."* This sub-project
reverses the text-generation half of that decision — the results summary is AI-generated, not
templated — per explicit user instruction during brainstorming. The anti-fabrication half of the
original decision is preserved: the LLM never computes or influences the numeric score. It only
writes prose around numbers already computed by a pure, unit-tested function. Logged via
`gstack-decision-log` (id `01c4cdb2-43eb-4e31-b998-373295afbde5`).

## Existing architecture this builds on

- `web/src/lib/coach-dna/scoring.ts` — `computeCategoryScore`, the blended multi-source scorer.
  **Untouched by this sub-project.** Its 2-source minimum (`scoring.ts:54`,
  `if (activeSources.length < 2) return insufficient_data`) is a deliberate anti-fabrication
  guard from Phase 2 (see prior commits "close NaN fabrication path", "close zero-threshold
  fabrication gap") and stays exactly as-is.
- `assessment_options.category_weights_json` (jsonb `{category_slug: weight}}`) — already
  populated by the 108 seed migration for all 96 options across the 24 self-assessment questions.
- `coach_profiles` table (migration 084) — already has `primary_profile_type`,
  `secondary_profile_type` columns, unused until now.
- `dna_categories` table (migration 083) — 8 categories, each with a `name`, `slug`, and
  `description` already written in a coaching voice (e.g. Teacher: "Explains skills clearly and
  helps players understand the why, not just the how."). These descriptions are useful context to
  pass into the AI prompt, not duplicated by hand.
- AI integration convention: **Groq via the `ai` SDK's `generateText`**, matching every existing
  integration in this app (`admin/content-engine/actions.ts`, `groups/[id]/ai-guidance/actions.ts`,
  `api/chat/route.ts`). Not the Vercel AI Gateway pattern CLAUDE.md describes — no existing
  integration in this codebase actually uses it, so this follows the app's real convention.
- PDF + email convention: `admin/match-report/` — `@react-pdf/renderer`'s `renderToBuffer` to
  build a PDF component, `sendMatchReportEmail` (in `@/lib/email.ts`) to send it as an attachment.
- Admin-gate pattern: matches every other `admin/coach-dna/*` route already built.

## Data model changes

One migration, additive only, no changes to existing columns:

```sql
alter table public.coach_profiles
  add column ai_summary jsonb,              -- { pros: string[], cons: string[], focusAreas: string[], narrative: string }
  add column ai_summary_generated_at timestamptz;
```

`primary_profile_type` / `secondary_profile_type` (already existing, currently always `null`) get
written to for the first time by this sub-project.

No RLS changes needed — `coach_profiles` RLS (from migration 084, unmodified here) already scopes
reads/writes to the owning coach plus admins, which is exactly the access this needs.

## Scoring: self-only category scores (new, pure, unit-tested)

New file `web/src/lib/coach-dna/self-score.ts`, new function `computeSelfOnlyCategoryScores`:

```ts
export interface SelfCategoryScore {
  categorySlug: string
  score: number // 0-100
}

export function computeSelfOnlyCategoryScores(
  responses: { selectedOptionId: string }[],
  options: { id: string; categoryWeights: Record<string, number> }[],
): SelfCategoryScore[]
```

For each of the 8 categories: average the `categoryWeights[categorySlug]` value across every
option the coach actually selected (options that don't weight a given category contribute 0 to
that category's average, not skipped — every question was designed to weight *some* subset of
categories, per the self-assessment design's category-tally requirement). Returns all 8 categories
sorted by score descending is the caller's job, not this function's — it returns the raw list,
unsorted, so it stays a pure data transform with one job.

**This function never touches `computeCategoryScore`, never writes to `coach_scores` or
`coach_category_scores`, and is not "the" Coach DNA score.** It is scoped narrowly to answer "what
does this coach's own self-report say" — a input to the summary, not a replacement for the real
blended scoring pipeline.

**Required test cases:** even weight distribution across a full 24-question set produces a score
per category in range; a category with zero weight in every selected option scores 0, not
undefined; empty responses array returns all 8 categories at 0 (defensive, shouldn't happen given
the flow requires completion, but the function shouldn't crash or divide by zero).

## Archetype derivation

`primary_profile_type` = the category slug with the highest self-only score.
`secondary_profile_type` = the second-highest, **only if** its score is within 15 points of the
primary (otherwise `null` — a coach with one dominant category shouldn't get a manufactured
"secondary type" that isn't meaningfully close). Ties broken by category display order (the fixed
order already used in `dna_categories` seeding), not randomly — deterministic output for the same
input.

Pros = top 3 categories by score. Cons/focus areas = bottom 3 categories by score. (8 categories,
top 3 + bottom 3 leaves 2 "middle" categories unmentioned by design — avoids a summary that reads
as an exhaustive score dump instead of actual insight.)

## AI summary generation

New Server Action `generateSelfAssessmentSummary(coachId: string)` in
`web/src/app/(app)/admin/coach-dna/summary-actions.ts`:

1. Fetch the coach's completed self-assessment attempt's responses + option category weights.
2. Call `computeSelfOnlyCategoryScores`, derive primary/secondary type and pros/cons/focus-areas
   category lists (structured data, computed in TypeScript — never by the LLM).
3. Call Groq (`generateText`, same model as `content-engine`) with a prompt that receives ONLY the
   structured data (category names + descriptions from `dna_categories`, scores, primary/secondary
   type, pros/cons category lists) — never the raw question/answer text, and never asked to
   compute or adjust any number. Prompt instructs: write a short narrative paragraph plus
   bullet-style pros/cons/focus-area text in a coaching voice, grounded strictly in the provided
   categories and scores.
4. Persist the result to `coach_profiles.ai_summary` (jsonb) + `ai_summary_generated_at`, and write
   `primary_profile_type`/`secondary_profile_type`.

**Idempotent by design, not by locking:** the results page only calls this action when
`ai_summary` is null for that coach. Once generated, it's a straight DB read on every subsequent
view — no repeat AI cost, no regeneration on every page load.

## Routes and display

`assessment/[attemptId]/complete/page.tsx` (existing route, currently just a static "thanks"
message) becomes the results display:

1. Server Component checks `coach_profiles.ai_summary` for the logged-in coach.
2. If null: call `generateSelfAssessmentSummary` inline (this is a one-time, non-chat action —
   a brief loading state during the Groq call is acceptable UX here, same pattern as
   `content-engine`'s generate button; this is not the "stream chat responses" case CLAUDE.md's
   AI rules target).
3. Render: primary type (+ secondary if present) as a heading, the AI narrative paragraph, a
   pros section (top 3 categories, each with its `dna_categories.description`), a
   cons/focus-areas section (bottom 3, same), and an "Email me a PDF" button.
4. Explicit self-only framing, always visible: a note stating this reflects self-assessment only
   and will update once player/peer feedback comes in — not a generic disclaimer buried in
   fine print, since misreading a self-only view as a validated 360 result is the exact failure
   mode Phase 2's anti-fabrication guard exists to prevent.

`admin/coach-dna/page.tsx` (existing landing page): when a completed attempt exists, instead of
today's static "you've completed your self-assessment, retaking isn't supported" text, links to
`assessment/[attemptId]/complete` so the same results view is reachable anytime, not just
immediately after finishing. `attemptId` here comes from the coach's own completed attempt row —
no new lookup logic needed, the landing page already queries for it.

## PDF export

New `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx` (React-PDF component, matches
`MatchReportPDF.tsx`'s shape) rendering the same content as the on-screen view: primary/secondary
type, narrative, pros, cons/focus areas.

New `sendCoachDnaSummaryEmail` in `@/lib/email.ts`, matching `sendMatchReportEmail`'s shape —
takes the PDF buffer, sends to the logged-in coach's own account email (never a
club-admin-supplied address; this is the coach's private self-assessment).

New Server Action `emailSelfAssessmentSummaryPDF()`: re-reads the coach's own `coach_profiles.ai_summary`
(no regeneration — PDF renders whatever's already persisted), renders it via `renderToBuffer`,
sends via `sendCoachDnaSummaryEmail`. Triggered by an explicit button click on the results page —
never automatic.

## Error handling

- No completed attempt / attempt belongs to another coach: existing `assessment/[attemptId]/page.tsx`
  ownership pattern (redirect to `/admin/coach-dna`), reused as-is by the completion route.
- Groq call fails during summary generation: catch, show an inline "couldn't generate your summary
  right now, try again" message with a retry button — do not persist a partial/broken `ai_summary`,
  do not silently fall back to a fabricated score.
- PDF/email send fails: catch in the Server Action, surface a toast/inline error — the results
  page itself doesn't depend on email succeeding.

## Testing

- `computeSelfOnlyCategoryScores`: pure function, fully unit-tested per the cases above.
- Archetype derivation (primary/secondary type, pros/cons/focus-area category selection): pure
  function, unit-tested — the "secondary type only if within 15 points" rule and tie-breaking
  order both need explicit test cases.
- `generateSelfAssessmentSummary` Server Action: mock `ai`'s `generateText` and Supabase client,
  matching the existing `actions.test.ts` pattern in this route tree — assert it persists
  `ai_summary` + profile types on success, throws without persisting on Groq failure, and doesn't
  call Groq at all if `ai_summary` already exists (idempotency).
- `emailSelfAssessmentSummaryPDF`: mock `@react-pdf/renderer` and `@/lib/email`, assert it sends
  to the caller's own email and never accepts a different recipient.

## Deferred (future sub-projects)

Regenerating the summary once Player Voice / Peer Observation data makes `computeCategoryScore`
return real blended scores for 2+ categories — the schema (`ai_summary` as a single jsonb blob) is
intentionally simple enough not to block this, but the recompute trigger and the mixed
self-only/blended rendering aren't built now, since neither collector exists yet. Radar chart
visualization is also still deferred, unchanged from the original design.
