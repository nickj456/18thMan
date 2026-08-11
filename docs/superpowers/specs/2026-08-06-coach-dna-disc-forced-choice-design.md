# Coach DNA — DISC-Style Forced-Choice Scoring & Delivery Polish (Phase 3, sub-project 3)

## Purpose

The self-assessment results summary (previous sub-project) shipped with a genuine scoring bug:
`computeSelfOnlyCategoryScores` averages each category's weight across all 24 responses, but the
seed data (96 options, 12 per category, one category per option) only ever offers a given category
as a choice in 12 of the 24 questions. Every category's real ceiling is therefore 50/100, not
100/100 — scores compress into a narrow band, and the "secondary type within 15 points" threshold
(written assuming a 0-100 range) fires far more often than intended. This was confirmed against a
real completed assessment: the coach received "Culture Builder / Communicator" as a close primary/
secondary pair and reported the breakdown didn't feel accurate.

Rather than patch the averaging denominator, this sub-project replaces the scoring mechanic
entirely with a DISC-style forced-choice ("most like me" / "least like me") format — genuine
ipsative scoring instead of independent per-question averages, which is both more methodologically
defensible (the user explicitly asked for "a framework to hold ourselves to," citing DISC/Big Five/
MSSA) and structurally immune to the dilution bug, since ipsative scores are naturally bounded and
don't depend on getting the averaging denominator right.

This sub-project also addresses two other pieces of user feedback gathered in the same
conversation: the question-answer interaction feels slow (full round-trip per click, no optimistic
feedback), and the PDF/email deliverables don't match the app's established "Coaching Eye" brand
standard (they were built to a much plainer bar than `match-report`'s PDF/email, which predates
this feature).

**Explicitly out of scope, per user decision:** rewriting the 24 questions' or 96 options' content.
The existing scenario text is reused as-is under the new most/least mechanic — a good instrument
worth revisiting once the new mechanic is live and specific questions can be judged on how they
feel to answer twice (most and least), not before.

**The 8 rugby-coaching categories (Teacher, Technician, Motivator, Developer, Game Manager,
Communicator, Organiser, Culture Builder) are unchanged.** Per explicit user decision, DISC anchors
the *methodology* (forced-choice structure), not the *categories* — the existing taxonomy is more
actionable for a coach than generic personality trait labels would be.

## Existing architecture this builds on

- `web/src/lib/coach-dna/self-score.ts` — `computeSelfOnlyCategoryScores`, the buggy averaging
  function. **Replaced** by this sub-project (see Scoring below), not patched.
- `web/src/lib/coach-dna/archetype.ts` — `deriveArchetype`. The primary/secondary/pros/cons
  derivation logic is reused conceptually but its thresholds need retuning against the new score
  range (see Archetype below).
- `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.ts` — `answerQuestion`, the
  existing single-pick Server Action. Extended (not replaced) to accept both picks per question.
- `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/OptionCard.tsx` — the existing
  single-select card component. Rebuilt as a client component tracking both picks locally before
  submit (see Question UI below).
- `web/src/app/(app)/admin/match-report/MatchReportPDF.tsx` — the established "Coaching Eye" PDF
  brand reference: orange (`#e8560a`) hero header with an eyebrow label, dark section headers,
  bordered detail tables, colored `CommentBlock`s with a left-border accent, consistent footer
  branding, confidentiality note. `CoachDnaSummaryPDF.tsx` (sub-project 2) predates this standard
  and is rebuilt to match it.
- `web/src/lib/email.ts` — shared email chrome (`layout`, `heading`, `para`, `featureList`,
  `divider`, `greeting`, `sign`, `esc`) already used by every transactional email in the app,
  including `sendMatchReportEmail`. `sendCoachDnaSummaryEmail` already uses these helpers but
  underuses them (plain paragraphs where `featureList` and a CTA button would match the
  established pattern).
- `web/src/lib/supabase/types.ts` — `SelfAssessmentSummary` type (sub-project 2). Reused, values
  change but the shape (`primaryType`, `secondaryType`, `narrative`, `pros`, `cons`) does not.
- `coach_profiles.ai_summary`/`ai_summary_generated_at` (sub-project 2 migration). Reused as-is —
  regenerating a summary under the new mechanic is just a fresh write to the same columns.

## Data model changes

`assessment_responses` currently has one option reference per row (`selected_option`, semantically
"the pick"). Add a second column for the paired "least" pick, and rename the existing column's
*meaning* (not its name, to avoid an unnecessary breaking rename) to "most":

```sql
alter table public.assessment_responses
  add column least_option uuid references public.assessment_options(id);
```

`selected_option` stays as the column name (avoids touching RLS policies or other code that
references it by name) but now represents "most like me." `least_option` is nullable at the schema
level (existing self-assessment rows have no least pick, and the column must support that), but the
save flow (below) always writes both together for new answers — a null `least_option` on a
post-migration row would only happen if a write partially failed, which the application layer
prevents by submitting both picks in one action call.

No changes to `assessment_options`, `assessment_questions`, `dna_categories`, or the 8-category
taxonomy.

## Scoring: ipsative forced-choice (replaces `computeSelfOnlyCategoryScores`)

New function, same file (`web/src/lib/coach-dna/self-score.ts`), same exported name (the plan will
show whether this is an in-place rewrite or a new function — it's the same public contract:
category scores in, from responses):

```ts
export interface SelfCategoryScore {
  categorySlug: string
  score: number // 0-100
}

export function computeSelfOnlyCategoryScores(
  responses: { mostOptionId: string; leastOptionId: string }[],
  options: { id: string; categoryWeights: Record<string, number> }[],
): SelfCategoryScore[]
```

For each of the 8 categories: find every response where an option weighting that category
(weight 100, per the existing seed data's one-category-per-option shape) was picked as "most"
(+1) or "least" (−1). Sum across all responses. This sum naturally ranges from −12 to +12 (a
category is offered in exactly 12 of 24 questions, per the existing seed data's even 12-per-category
split), since a category can be picked "most" or "least" at most once per question it appears in
and can't be both in the same question (most and least are always two different options).
Rescale linearly: `score = (sum + 12) * 100 / 24`, giving a proper 0-100 range where 50 is neutral
(never chosen as most or least, or chosen equally often as each).

**Required test cases:** always picking a category's option as "most" whenever offered scores 100;
always picking it as "least" scores 0; never encountering it as an option (defensive, shouldn't
happen given the seed data) scores 50 (neutral); mixed most/least picks land proportionally between;
empty responses array returns all 8 categories at 50 (neutral, not 0 — 0 would incorrectly read as
"strongly avoided" when the real answer is "no data").

## Question page — most/least selection UI

**Client-side interaction** (new client component wrapping the 4 `OptionCard`s, replacing the
current per-card `<form>` submit): local React state tracks `mostId` and `leastId` for the current
question. Tapping a card:
- If neither is set, or tapping a card that's currently neither: sets it as `most` if `most` is
  unset, otherwise sets it as `least` if `least` is unset and the card isn't already `most`.
- Tapping the card currently marked `most` or `least` clears that mark (lets the coach change their
  mind without an explicit "clear" control).
- Tapping a third card when both `most` and `least` are already set on two others: reassigns `most`
  to the new card (most recent tap wins for "most"; the previous "most" becomes unmarked, "least"
  is untouched) — simplest predictable behavior, avoids needing a delete-then-pick two-step.

A "Continue" control appears once both `mostId` and `leastId` are set (distinct from each other by
construction, since a card can only hold one mark at a time) and calls `answerQuestion` once with
both IDs — one network round-trip per question, not one per tap. The two marks get visually
distinct treatment: solid orange ring for "most," a muted outline (existing zinc palette, not a new
color, since this is a rugby coaching app, not a traffic-light UI) with a small "least" label for
"least." Immediate visual feedback on tap (local state) means the coach never waits on the network
to see their pick register — this is what fixes the responsiveness complaint, not a perf
optimization on the existing single-click flow.

**Server Action**: `answerQuestion(attemptId, questionId, mostOptionId, leastOptionId)` — extends
the existing signature (adds one parameter), validates both options belong to the question (extends
the existing single-option validation added in sub-project 2's security review), upserts both into
`assessment_responses` in one write, then proceeds through the same completion/progress logic
already in place.

## Archetype derivation — retuned thresholds

`deriveArchetype`'s core shape (primary = highest score, secondary = second-highest if within
threshold, pros = top 3, cons = bottom 3) is reused. The "within 15 points" secondary-type
threshold was tuned for a score range that was actually ~0-50 in practice (the bug); against the
new, properly 0-100 range, retune to 10 points (10% of the true range, roughly proportional to the
old constant's intent before the range was miscalibrated). This is a tuning constant, not a
structural change, and easy to adjust after seeing real results against it.

## PDF redesign

`CoachDnaSummaryPDF.tsx` rebuilt to match `MatchReportPDF.tsx`'s established structure:
- Orange (`#e8560a`) hero header with an eyebrow label ("COACH DNA"), the coach's primary/secondary
  type as the large title (matching `coverTitle`'s treatment), subtitle "Self-Assessment Results."
- A bordered detail table (assessment completion date; "Self-Assessment Only" as a row, making the
  self-only framing visible in the PDF too, not just on-screen) matching `matchTable`'s style.
- Strengths and focus areas as colored `CommentBlock`-style sections (green left-border for
  strengths, amber for focus areas — reusing the exact pattern and colors already defined in
  `MatchReportPDF.tsx`, not inventing a new palette).
- Footer branding matching the existing `Footer` component's shape ("COACH DNA · 18TH MAN" /
  completion date).
- Same confidentiality note style as the cover page ("This report is confidential...").

## Email redesign

`sendCoachDnaSummaryEmail` (`web/src/lib/email.ts`) reworked to use the existing shared components
more fully:
- Heading built around the primary type: "You're a {Primary}{ / Secondary} coach" instead of a
  generic "Your results are ready."
- `featureList` (checkmark rows, already used by other emails) for strengths, a second `featureList`
  for focus areas — replacing the current plain paragraphs.
- A CTA button (existing `ctaButton` helper, already defined in this file but unused by this
  specific email) linking to the results page on-site, alongside the PDF attachment — so the coach
  isn't solely dependent on opening the PDF to revisit their results.
- Self-only framing note kept, matching the on-screen and PDF disclaimer language.

## Error handling

- Unchanged patterns from sub-project 2 (auth, admin-role, ownership, not-yet-completed, DB read/
  write errors, AI response validation) — none of that logic changes here.
- New: `answerQuestion` must reject a submission where `mostOptionId === leastOptionId` (can't be
  the same option) — defensive, since the client-side interaction structurally prevents this, but
  the Server Action is a real trust boundary and must not assume the client behaved.
- New: if a coach somehow reaches the question UI with only one pick made (e.g. a stale client after
  a deploy), "Continue" simply doesn't appear — no error state needed, just an unmet precondition.

## Testing

- `computeSelfOnlyCategoryScores` (ipsative version): pure function, all cases in the Scoring
  section above, replacing the old test file's cases entirely (the old averaging behavior is gone,
  not a variant to keep testing).
- `deriveArchetype`: existing tests updated for the new 10-point threshold constant; tie-breaking
  and pros/cons slicing logic unchanged, so those tests are otherwise reused.
- `answerQuestion`: extended tests for the two-option-write path, the both-must-be-provided
  precondition, the "must belong to this question" validation extended to both options, and the
  new "can't be the same option twice" rejection.
- Question-page client interaction: the tap-state-machine (most/least/reassign/clear) is pure
  enough to unit test in isolation if extracted as a small hook/reducer rather than inlined in the
  component — worth doing during planning so the interaction logic isn't only covered by (harder to
  write) component-level tests.
- PDF/email: existing test patterns from sub-project 2 (mock `@react-pdf/renderer`, mock
  `@/lib/email`) extended to assert the new structural elements render (detail table row count,
  both `featureList` calls, CTA button href) rather than just presence of the old text.

## Deferred (future sub-projects)

Question/option content rewrite (explicitly deferred by user decision above). Regenerating
existing coaches' summaries under the new mechanic if any exist from before this ships — out of
scope since this is still an admin-only preview feature with effectively one real completed
attempt at time of writing; that attempt's answers don't carry a "least" pick and can't be
rescored under the new mechanic, so the practical resolution is: the coach retakes the assessment,
not a data migration. Not building an explicit "retake" flow is itself still deferred from the
original sub-project 1 design and remains deferred here.
