# Coach DNA — Self-Assessment Retake Cooldown

## Problem

A coach can currently only start the Coach DNA self-assessment once, ever — the "Start assessment" button on the hub page only renders when there's neither a completed nor an in-progress attempt. There's no retake path at all today, and no policy for one. We want coaches to be able to retake the assessment, but not on demand — a 3-month cooldown from their last completed attempt, with a quiet, non-gamified indication of when they're next eligible.

## Scope

1. A pure eligibility function: given the coach's most recently completed attempt's date, is a retake allowed right now, and if not, when does it become allowed.
2. Server-side enforcement in the action that starts an attempt — the existing `startAssessment` gains a cooldown check, since it's the same mechanism a retake uses.
3. New hub-page UI in the `completed && summary` branch: a quiet "You can retake this on [date]" line before eligibility, a plain "Retake assessment" button once eligible.

**Out of scope:** any UI/mechanism for an admin to override the cooldown — that's what the separate Coach DNA data reset feature (`2026-08-25-coach-dna-admin-reset-design.md`) is for. Deleting a coach's assessment data naturally clears "most recently completed attempt," so the two features compose without this one needing its own override.

## Part 1: Eligibility function

**New file:** `web/src/lib/coach-dna/retake-eligibility.ts`

```ts
const COOLDOWN_MONTHS = 3

export interface RetakeEligibility {
  eligible: boolean
  /** The date retake becomes allowed. Always null when eligible is true. */
  eligibleAt: Date | null
}

/** A coach may retake their self-assessment COOLDOWN_MONTHS after their most
 *  recently COMPLETED attempt — starting-but-abandoning an attempt never
 *  starts or resets this clock, only finishing one does. `lastCompletedAt`
 *  is that attempt's `completed_at` (ISO string), or null if the coach has
 *  never completed one (always eligible in that case). */
export function retakeEligibility(lastCompletedAt: string | null): RetakeEligibility {
  if (!lastCompletedAt) return { eligible: true, eligibleAt: null }
  const eligibleAt = new Date(lastCompletedAt)
  eligibleAt.setMonth(eligibleAt.getMonth() + COOLDOWN_MONTHS)
  const eligible = eligibleAt.getTime() <= Date.now()
  return { eligible, eligibleAt: eligible ? null : eligibleAt }
}
```

`Date.setMonth` normalizes calendar overflow automatically (e.g. completing on 30 November rolls the +3-month date to 2 March, since February doesn't have 30 days) — this is standard JS date arithmetic, not a bug to work around.

## Part 2: Server-side enforcement

**Modify:** `web/src/app/(app)/admin/coach-dna/actions.ts`

`startAssessment` currently just checks role and inserts a row. It becomes the single entry point for both a first-time start (no prior completed attempt, always eligible) and a retake (gated by cooldown) — no need for a second action. Before inserting, fetch the coach's most recently completed attempt and check eligibility server-side, never trusting that the client only shows the button when eligible:

```ts
const { data: lastCompleted } = await supabase
  .from('assessment_attempts')
  .select('completed_at')
  .eq('coach_id', userId)
  .eq('assessment_type', 'self_assessment')
  .not('completed_at', 'is', null)
  .order('completed_at', { ascending: false })
  .limit(1)
  .maybeSingle()

const { eligible } = retakeEligibility(lastCompleted?.completed_at ?? null)
if (!eligible) throw new Error('You are not yet eligible to retake this assessment')
```

## Part 3: Hub page UI

**Modify:** `web/src/app/(app)/admin/coach-dna/page.tsx`

The completed-attempt query currently selects only `id`; add `completed_at`:

```ts
  const { data: completed } = await supabase
    .from('assessment_attempts')
    .select('id, completed_at')
```

Compute eligibility once, alongside the existing `summary`/`completed` logic:

```ts
  const { eligible: retakeEligible, eligibleAt: retakeEligibleAt } = retakeEligibility(completed?.completed_at ?? null)
```

In the `completed && summary` branch, after the existing `{hasBlendedFeedback(...) && <CoachDnaOutcomeReveal ... />}` block, add:

```tsx
                <div className="pt-3 border-t border-zinc-800">
                  {retakeEligible ? (
                    <form action={startAssessment}>
                      <Button type="submit" variant="outline" size="sm">Retake assessment</Button>
                    </form>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      You can retake this on {retakeEligibleAt!.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>
                  )}
                </div>
```

Deliberately plain: no countdown, no progress bar, no lock iconography — a muted date line matches the tone of every other secondary line on this page (e.g. the existing "Based on your self-assessment only" text).

## Testing

- `retake-eligibility.ts`: eligible when no prior completion; not eligible the day after completion; eligible exactly 3 months later; not eligible one day before; a month-rollover case (e.g. 30 November → 2 March, not 30 February).
- `actions.test.ts` (existing file for `startAssessment`): a new test confirms `startAssessment` throws when called with a recent completed attempt in the fixture, and succeeds when there's none or an old one.
- Hub page: check at implementation time whether `page.test.tsx` exists for the current state of this file on `main` (other in-flight work may have added one); if so, extend it with retake-button/date-message tests following its existing conventions; if not, this step is implementation-only.

## Out of scope

- Any change to `assessment_attempts`' schema.
- Any UI change to the `/complete` results page.
- An admin-facing override — covered by the separate reset feature.
