# Coach DNA — DISC-Style Forced-Choice Scoring & Delivery Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the buggy self-assessment scoring (which compresses every category into a 0-50 range due to an averaging-denominator bug) with genuine DISC-style forced-choice ("most like me" / "least like me") ipsative scoring, rebuild the question-answer interaction to be instantly responsive, and bring the PDF/email deliverables up to the app's established "Coaching Eye" brand standard.

**Architecture:** Each question now asks for two picks instead of one. A new pure `pickReducer` state machine drives instant client-side highlight feedback before any network call; a rebuilt `answerQuestion` Server Action saves both picks in one round-trip. `computeSelfOnlyCategoryScores` is rewritten from an averaging function to a +1/−1 ipsative tally, naturally bounded to a real 0-100 range. `deriveArchetype`'s secondary-type threshold is retuned for that corrected range. The PDF and email templates are rebuilt against the existing `MatchReportPDF.tsx` / shared email-component patterns already used elsewhere in the app.

**Tech Stack:** Next.js App Router (Server Actions, client components with `useReducer`/`useTransition`), Supabase (Postgres + RLS), Vitest, `@react-pdf/renderer`, existing `@/lib/email.ts` component helpers.

## Global Constraints

- The 8 rugby-coaching categories (Teacher, Technician, Motivator, Developer, Game Manager, Communicator, Organiser, Culture Builder) are unchanged — this plan touches only the scoring mechanic and delivery surfaces, never the taxonomy.
- Question and option content (the 24 questions' scenario text, the 96 options' wording) is reused as-is — no content rewrite in this plan.
- A category is offered as a choosable option in exactly 12 of the 24 questions (verified against the live seed data: 96 options, 12 per category, one category per option at weight 100). The scoring formula is built on this fixed structural constant, not derived from response count at runtime.
- Admin-gate pattern on every route/action: fetch user → `redirect('/login')` if absent → fetch `profiles.role` → `redirect('/dashboard')` if not admin.
- No em dashes in any new UI copy or email content.
- Dark charcoal/zinc, orange `#f97316`/`orange-500` accent on-screen; PDF/email brand color is `#e8560a` (the `MatchReportPDF.tsx`/email-template orange, distinct from the on-screen Tailwind orange — match whichever surface you're building for).
- Never commit code that makes existing tests fail. Every new/changed function gets its test file updated or created.

---

### Task 1: Migration — `least_option` column

**Files:**
- Create: `web/supabase/migrations/111_assessment_responses_least_option.sql`
- Modify: `web/src/lib/supabase/types.ts` (`AssessmentResponse` interface)

**Interfaces:**
- Produces: `assessment_responses.least_option` (uuid, nullable, references `assessment_options(id)`).

**Context for the implementer:** `assessment_responses.selected_option` (existing column) now semantically means "most like me" — it keeps its existing name to avoid touching RLS policies or other code that references it by name, but every new response written from this point forward always has both `selected_option` ("most") and the new `least_option` set together. The column is nullable at the schema level only because pre-migration rows (from before this feature shipped) don't have a least pick and the column must support that; the application layer (Task 4) always writes both.

- [ ] **Step 1: Write the migration**

```sql
-- 111_assessment_responses_least_option.sql
alter table public.assessment_responses
  add column least_option uuid references public.assessment_options(id);
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool (name: `assessment_responses_least_option`) against project `khslkwspsqyopicxufun`, or the Supabase CLI if working outside an MCP-enabled session.

- [ ] **Step 3: Verify**

```sql
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'assessment_responses' and column_name = 'least_option';
```

Expected: one row, `is_nullable = 'YES'`, `data_type = 'uuid'`.

- [ ] **Step 4: Update the TypeScript type**

In `web/src/lib/supabase/types.ts`, find `AssessmentResponse` and add the new field:

```ts
export interface AssessmentResponse {
  id: string
  attempt_id: string
  question_id: string
  selected_option: string | null
  least_option: string | null
  written_response: string | null
  response_value: number | null
}
```

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/supabase/migrations/111_assessment_responses_least_option.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add least_option column for forced-choice scoring"
```

---

### Task 2: Rewrite `computeSelfOnlyCategoryScores` — ipsative scoring

**Files:**
- Modify: `web/src/lib/coach-dna/self-score.ts`
- Modify: `web/src/lib/coach-dna/self-score.test.ts`

**Interfaces:**
- Produces (changed signature): `computeSelfOnlyCategoryScores(responses: { mostOptionId: string; leastOptionId: string }[], options: { id: string; categoryWeights: Record<string, number> }[]): SelfCategoryScore[]`. `SelfCategoryScore` shape unchanged (`{ categorySlug: string; score: number }`). Consumed by Task 3 (unchanged) and Task 7.

**Context for the implementer:** This replaces the entire old averaging implementation and its test file's cases — the old behavior (average weight across all responses) is the bug being fixed, not a variant to preserve. Every existing test in `self-score.test.ts` gets replaced with the cases below.

- [ ] **Step 1: Replace the test file**

```ts
// web/src/lib/coach-dna/self-score.test.ts
import { describe, it, expect } from 'vitest'
import { computeSelfOnlyCategoryScores } from './self-score'

function optionWeighting(id: string, weights: Record<string, number>) {
  return { id, categoryWeights: weights }
}

describe('computeSelfOnlyCategoryScores', () => {
  it('scores 100 for a category always picked as "most" whenever it was offered', () => {
    const options = [
      optionWeighting('teacher-opt', { teacher: 100 }),
      optionWeighting('motivator-opt', { motivator: 100 }),
    ]
    // 12 responses where teacher is the "most" pick, motivator (never teacher) as "least"
    const responses = Array.from({ length: 12 }, () => ({
      mostOptionId: 'teacher-opt',
      leastOptionId: 'motivator-opt',
    }))

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBe(100)
  })

  it('scores 0 for a category always picked as "least" whenever it was offered', () => {
    const options = [
      optionWeighting('teacher-opt', { teacher: 100 }),
      optionWeighting('motivator-opt', { motivator: 100 }),
    ]
    const responses = Array.from({ length: 12 }, () => ({
      mostOptionId: 'motivator-opt',
      leastOptionId: 'teacher-opt',
    }))

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBe(0)
  })

  it('scores 50 (neutral) for an empty responses array, across all 8 categories', () => {
    const result = computeSelfOnlyCategoryScores([], [])
    expect(result).toHaveLength(8)
    expect(result.every(r => r.score === 50)).toBe(true)
  })

  it('lands proportionally between 0 and 100 for a mix of most/least picks', () => {
    const options = [
      optionWeighting('teacher-opt', { teacher: 100 }),
      optionWeighting('motivator-opt', { motivator: 100 }),
    ]
    // teacher picked "most" 3 times, "least" 1 time -> sum = +2 -> (2+12)*100/24
    const responses = [
      ...Array.from({ length: 3 }, () => ({ mostOptionId: 'teacher-opt', leastOptionId: 'motivator-opt' })),
      { mostOptionId: 'motivator-opt', leastOptionId: 'teacher-opt' },
    ]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBeCloseTo((2 + 12) * 100 / 24)
  })

  it('ignores a mostOptionId/leastOptionId with no matching option (defensive, should not crash)', () => {
    const options = [optionWeighting('teacher-opt', { teacher: 100 })]
    const responses = [{ mostOptionId: 'teacher-opt', leastOptionId: 'missing-option' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    // teacher gets +1 (was "most"), no category gets -1 since the least option doesn't resolve
    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBeCloseTo((1 + 12) * 100 / 24)
  })

  it('returns all 8 categories even when responses only touch some of them', () => {
    const options = [optionWeighting('teacher-opt', { teacher: 100 }), optionWeighting('motivator-opt', { motivator: 100 })]
    const responses = [{ mostOptionId: 'teacher-opt', leastOptionId: 'motivator-opt' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result).toHaveLength(8)
    expect(result.map(r => r.categorySlug).sort()).toEqual(
      ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder'].sort(),
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/self-score.test.ts`
Expected: FAIL — the old implementation's signature and behavior don't match the new tests (type errors and/or wrong values).

- [ ] **Step 3: Replace the implementation**

```ts
// web/src/lib/coach-dna/self-score.ts
const CATEGORY_SLUGS = [
  'teacher', 'technician', 'motivator', 'developer',
  'game-manager', 'communicator', 'organiser', 'culture-builder',
] as const

export interface SelfCategoryScore {
  categorySlug: string
  score: number
}

// A category is offered as a choosable option in exactly 12 of the 24
// self-assessment questions (96 options, 12 per category, one category per
// option, per the seed data). Each response can contribute at most +1
// ("most") or -1 ("least") to a category's tally, so the tally across a full
// attempt naturally ranges -12..+12. Rescaling that fixed range to 0-100
// gives a real, undiluted score -- this is why the formula uses the literal
// structural constants (12, 24) rather than responses.length: the scale is a
// property of the question set, not of how many responses happen to be
// passed into this pure function.
const TIMES_EACH_CATEGORY_IS_OFFERED = 12
const TOTAL_QUESTIONS = 24

export function computeSelfOnlyCategoryScores(
  responses: { mostOptionId: string; leastOptionId: string }[],
  options: { id: string; categoryWeights: Record<string, number> }[],
): SelfCategoryScore[] {
  const optionsById = new Map(options.map(o => [o.id, o]))

  return CATEGORY_SLUGS.map(categorySlug => {
    const sum = responses.reduce((total, response) => {
      const mostOption = optionsById.get(response.mostOptionId)
      const leastOption = optionsById.get(response.leastOptionId)
      const isMost = (mostOption?.categoryWeights[categorySlug] ?? 0) > 0
      const isLeast = (leastOption?.categoryWeights[categorySlug] ?? 0) > 0
      return total + (isMost ? 1 : 0) - (isLeast ? 1 : 0)
    }, 0)

    const score = (sum + TIMES_EACH_CATEGORY_IS_OFFERED) * 100 / TOTAL_QUESTIONS
    return { categorySlug, score }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/self-score.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/self-score.ts web/src/lib/coach-dna/self-score.test.ts
git commit -m "fix(coach-dna): replace averaging self-score with ipsative most/least scoring"
```

---

### Task 3: Retune `deriveArchetype`'s secondary-type threshold

**Files:**
- Modify: `web/src/lib/coach-dna/archetype.ts`
- Modify: `web/src/lib/coach-dna/archetype.test.ts`

**Interfaces:**
- Unchanged: `deriveArchetype(scores: SelfCategoryScore[]): ArchetypeResult`. Consumed by Task 7 (unchanged call site).

**Context for the implementer:** The "within 15 points" constant was tuned assuming the (buggy) ~0-50 score range. Task 2 fixed the range to a real 0-100. Retune to 10 points — no other logic in this file changes.

- [ ] **Step 1: Update the failing test**

In `web/src/lib/coach-dna/archetype.test.ts`, find the two tests about the secondary-type threshold and update their fixtures/assertions for the new 10-point cutoff:

```ts
  it('sets secondaryType when the second-highest is within 10 points of the primary', () => {
    const result = deriveArchetype(scores({ teacher: 90, motivator: 80 }))
    expect(result.primaryType).toBe('teacher')
    expect(result.secondaryType).toBe('motivator')
  })

  it('sets secondaryType to null when the second-highest is more than 10 points behind the primary', () => {
    const result = deriveArchetype(scores({ teacher: 90, motivator: 79 }))
    expect(result.secondaryType).toBeNull()
  })
```

Leave every other test in the file (`picks the highest-scoring category as primaryType`, `breaks ties by fixed category display order`, `returns the top 3 categories as pros and bottom 3 as cons`) unchanged — they don't depend on the threshold constant.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/archetype.test.ts`
Expected: FAIL — `sets secondaryType to null...` fails because `90 - 79 = 11 <= 15` still passes under the old constant, so `secondaryType` is `'motivator'`, not `null`.

- [ ] **Step 3: Update the implementation**

In `web/src/lib/coach-dna/archetype.ts`, change the threshold constant:

```ts
export function deriveArchetype(scores: SelfCategoryScore[]): ArchetypeResult {
  const ranked = sortByScoreThenOrder(scores)
  const primary = ranked[0]
  const secondary = ranked[1]

  return {
    primaryType: primary.categorySlug,
    secondaryType: secondary && primary.score - secondary.score <= 10 ? secondary.categorySlug : null,
    pros: ranked.slice(0, 3).map(r => r.categorySlug),
    cons: ranked.slice(-3).reverse().map(r => r.categorySlug),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/archetype.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/archetype.ts web/src/lib/coach-dna/archetype.test.ts
git commit -m "fix(coach-dna): retune secondary-type threshold for the corrected 0-100 score range"
```

---

### Task 4: `answerQuestion` — accept most + least picks

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.test.ts`

**Interfaces:**
- Produces (changed signature): `answerQuestion(attemptId: string, questionId: string, mostOptionId: string, leastOptionId: string): Promise<never>` (always redirects or throws). Consumed by Task 6's `QuestionOptions` client component.

- [ ] **Step 1: Update the test file**

Replace `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.test.ts` in full:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  orderedQuestionIds: string[]
  answeredQuestionIds: string[]
  upsertError: { message: string } | null
  completeError: { message: string } | null
  matchingOptionIds: string[]
  questionsError: { message: string } | null
  responsesError: { message: string } | null
} = {
  user: null,
  role: null,
  attempt: null,
  orderedQuestionIds: [],
  answeredQuestionIds: [],
  upsertError: null,
  completeError: null,
  matchingOptionIds: ['opt-most', 'opt-least'],
  questionsError: null,
  responsesError: null,
}

const upsertMock = vi.fn(async () => ({ error: state.upsertError }))
const updateMock = vi.fn(() => ({ eq: async () => ({ error: state.completeError }) }))
const revalidateMock = vi.fn()
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidateMock(...args),
}))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role } }) }) }) }
      }
      if (table === 'assessment_attempts') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }),
          update: updateMock,
        }
      }
      if (table === 'assessment_options') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({ data: state.matchingOptionIds.map(id => ({ id })) }),
            }),
          }),
        }
      }
      if (table === 'assessment_questions') {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: state.orderedQuestionIds.map(id => ({ id })), error: state.questionsError }),
            }),
          }),
        }
      }
      if (table === 'assessment_responses') {
        return {
          select: () => ({
            eq: async () => ({
              data: state.answeredQuestionIds.map(id => ({ question_id: id })),
              error: state.responsesError,
            }),
          }),
          upsert: upsertMock,
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { answerQuestion } from './actions'

describe('answerQuestion', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: null }
    state.orderedQuestionIds = ['q1', 'q2', 'q3']
    state.answeredQuestionIds = []
    state.upsertError = null
    state.completeError = null
    state.matchingOptionIds = ['opt-most', 'opt-least']
    state.questionsError = null
    state.responsesError = null
    upsertMock.mockClear()
    updateMock.mockClear()
    revalidateMock.mockClear()
    redirectMock.mockClear()
  })

  it('rejects identical most and least picks without writing a response', async () => {
    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-most')).rejects.toThrow(
      'Most and least picks must be different options',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('saves both picks in one upsert', async () => {
    state.answeredQuestionIds = ['q1']

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:')

    expect(upsertMock).toHaveBeenCalledWith(
      { attempt_id: 'attempt-1', question_id: 'q1', selected_option: 'opt-most', least_option: 'opt-least' },
      { onConflict: 'attempt_id,question_id' },
    )
  })

  it('revalidates the assessment route so a revisited question shows the freshly saved answer', async () => {
    state.answeredQuestionIds = ['q1']

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:')

    expect(revalidateMock).toHaveBeenCalledWith('/admin/coach-dna/assessment/attempt-1')
  })

  it('redirects to the next unanswered question when the attempt is incomplete', async () => {
    state.answeredQuestionIds = ['q1']

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1?q=q2',
    )
  })

  it('marks the attempt complete and redirects to the completion screen on the last question', async () => {
    state.answeredQuestionIds = ['q1', 'q2', 'q3']

    await expect(answerQuestion('attempt-1', 'q3', 'opt-most', 'opt-least')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1/complete',
    )
    expect(updateMock).toHaveBeenCalledWith({ completed_at: expect.any(String) })
  })

  it('rejects answering an attempt that belongs to a different coach', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: null }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects to the completion screen instead of mutating an already-completed attempt', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-01T00:00:00.000Z' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow(
      'REDIRECT:/admin/coach-dna/assessment/attempt-1/complete',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects unauthenticated callers to login without writing a response', async () => {
    state.user = null

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:/login')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects non-admin callers to the dashboard without writing a response', async () => {
    state.role = 'coach'

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:/dashboard')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('redirects to Coach DNA home when the attempt does not exist', async () => {
    state.attempt = null

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('REDIRECT:/admin/coach-dna')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('rejects when one or both options do not belong to the given question', async () => {
    state.matchingOptionIds = ['opt-most'] // only one of the two resolves

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-from-another-question')).rejects.toThrow(
      'Selected options do not belong to this question',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws when saving the response fails', async () => {
    state.upsertError = { message: 'upsert failed' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('upsert failed')
    expect(revalidateMock).not.toHaveBeenCalled()
  })

  it('throws instead of silently completing the attempt when the questions query errors', async () => {
    state.questionsError = { message: 'questions query failed' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('questions query failed')
    expect(updateMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalledWith(expect.stringContaining('/complete'))
  })

  it('throws instead of silently completing the attempt when the responses query errors', async () => {
    state.responsesError = { message: 'responses query failed' }

    await expect(answerQuestion('attempt-1', 'q1', 'opt-most', 'opt-least')).rejects.toThrow('responses query failed')
    expect(updateMock).not.toHaveBeenCalled()
    expect(redirectMock).not.toHaveBeenCalledWith(expect.stringContaining('/complete'))
  })

  it('throws when marking the attempt complete fails', async () => {
    state.answeredQuestionIds = ['q1', 'q2', 'q3']
    state.completeError = { message: 'update failed' }

    await expect(answerQuestion('attempt-1', 'q3', 'opt-most', 'opt-least')).rejects.toThrow('update failed')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.test.ts"`
Expected: FAIL — `answerQuestion` still takes 3 args and the mock shape (`.eq().eq().maybeSingle()`) no longer matches.

- [ ] **Step 3: Update the implementation**

```ts
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getQuestionProgress } from '@/lib/coach-dna/assessment-progress'

async function requireOwnAttempt(attemptId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()

  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  if (attempt.completed_at) redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)
  return { supabase, userId: user.id }
}

export async function answerQuestion(
  attemptId: string,
  questionId: string,
  mostOptionId: string,
  leastOptionId: string,
) {
  if (mostOptionId === leastOptionId) {
    throw new Error('Most and least picks must be different options')
  }

  const { supabase } = await requireOwnAttempt(attemptId)

  const { data: matchingOptions } = await supabase
    .from('assessment_options')
    .select('id')
    .eq('question_id', questionId)
    .in('id', [mostOptionId, leastOptionId])
  if ((matchingOptions ?? []).length !== 2) {
    throw new Error('Selected options do not belong to this question')
  }

  const { error: upsertError } = await supabase
    .from('assessment_responses')
    .upsert(
      { attempt_id: attemptId, question_id: questionId, selected_option: mostOptionId, least_option: leastOptionId },
      { onConflict: 'attempt_id,question_id' },
    )
  if (upsertError) throw new Error(upsertError.message)

  const { data: orderedQuestions, error: questionsError } = await supabase
    .from('assessment_questions')
    .select('id')
    .eq('assessment_type', 'self_assessment')
    .order('display_order', { ascending: true })
  if (questionsError) throw new Error(questionsError.message)

  const { data: responses, error: responsesError } = await supabase
    .from('assessment_responses')
    .select('question_id')
    .eq('attempt_id', attemptId)
  if (responsesError) throw new Error(responsesError.message)

  const progress = getQuestionProgress(orderedQuestions ?? [], (responses ?? []).map(r => r.question_id))

  // Bust the client Router Cache for this route so navigating "Back" to a
  // question already visited earlier in the session re-fetches the freshly
  // saved answer instead of reusing the stale pre-answer render.
  revalidatePath(`/admin/coach-dna/assessment/${attemptId}`)

  if (progress.isComplete) {
    const { error: completeError } = await supabase
      .from('assessment_attempts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', attemptId)
    if (completeError) throw new Error(completeError.message)
    redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)
  }

  redirect(`/admin/coach-dna/assessment/${attemptId}?q=${progress.nextQuestion!.id}`)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.test.ts"`
Expected: PASS (14/14)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: errors in `OptionCard.tsx`/`page.tsx` are EXPECTED at this point (Task 6 rebuilds them to match the new signature) — confirm the only errors are in those two files, calling `answerQuestion` with the old 3-argument shape.

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.ts" "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/actions.test.ts"
git commit -m "feat(coach-dna): extend answerQuestion to save most and least picks together"
```

---

### Task 5: `pickReducer` — pure most/least selection state machine

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/pickReducer.ts`
- Test: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/pickReducer.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `pickReducer(state: PickState, action: PickAction): PickState`, `interface PickState { mostId: string | null; leastId: string | null }`, `type PickAction = { type: 'tap'; optionId: string }`. Consumed by Task 6's `QuestionOptions` component.

**Context for the implementer:** This is the tap-handling logic for the question page, extracted as a pure function so the interaction rules (documented in the spec) are unit-testable without rendering a component. Behavior: tapping the option currently marked "most" or "least" clears that mark. Tapping an unmarked option fills "most" first, then "least". Tapping a third option once both marks are already placed on two other options reassigns "most" to the new tap and leaves "least" untouched.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/pickReducer.test.ts
import { describe, it, expect } from 'vitest'
import { pickReducer, type PickState } from './pickReducer'

const empty: PickState = { mostId: null, leastId: null }

describe('pickReducer', () => {
  it('sets the first tap as "most"', () => {
    const result = pickReducer(empty, { type: 'tap', optionId: 'A' })
    expect(result).toEqual({ mostId: 'A', leastId: null })
  })

  it('sets the second tap (on a different option) as "least"', () => {
    const state: PickState = { mostId: 'A', leastId: null }
    const result = pickReducer(state, { type: 'tap', optionId: 'B' })
    expect(result).toEqual({ mostId: 'A', leastId: 'B' })
  })

  it('clears "most" when tapping the option currently marked most', () => {
    const state: PickState = { mostId: 'A', leastId: null }
    const result = pickReducer(state, { type: 'tap', optionId: 'A' })
    expect(result).toEqual({ mostId: null, leastId: null })
  })

  it('clears "least" when tapping the option currently marked least', () => {
    const state: PickState = { mostId: 'A', leastId: 'B' }
    const result = pickReducer(state, { type: 'tap', optionId: 'B' })
    expect(result).toEqual({ mostId: 'A', leastId: null })
  })

  it('reassigns "most" to a third option when both marks are already placed, leaving "least" untouched', () => {
    const state: PickState = { mostId: 'A', leastId: 'B' }
    const result = pickReducer(state, { type: 'tap', optionId: 'C' })
    expect(result).toEqual({ mostId: 'C', leastId: 'B' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/assessment/[attemptId]/pickReducer.test.ts"`
Expected: FAIL — `Cannot find module './pickReducer'`

- [ ] **Step 3: Write the implementation**

```ts
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/pickReducer.ts
export interface PickState {
  mostId: string | null
  leastId: string | null
}

export type PickAction = { type: 'tap'; optionId: string }

export function pickReducer(state: PickState, action: PickAction): PickState {
  const { optionId } = action

  if (state.mostId === optionId) return { ...state, mostId: null }
  if (state.leastId === optionId) return { ...state, leastId: null }
  if (state.mostId === null) return { ...state, mostId: optionId }
  if (state.leastId === null) return { ...state, leastId: optionId }

  // Both marks already placed on two other options: the new tap becomes the
  // "most" pick, and "least" stays where it was.
  return { mostId: optionId, leastId: state.leastId }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/assessment/[attemptId]/pickReducer.test.ts"`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/pickReducer.ts" "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/pickReducer.test.ts"
git commit -m "feat(coach-dna): add pure pickReducer for most/least tap handling"
```

---

### Task 6: Question page UI — most/least selection

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/OptionCard.tsx`
- Create: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/QuestionOptions.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/page.tsx`

**Interfaces:**
- Consumes: `answerQuestion` (Task 4), `pickReducer`/`PickState`/`PickAction` (Task 5).
- Produces: `QuestionOptions` client component, consumed by `page.tsx` (this task only).

- [ ] **Step 1: Rewrite `OptionCard.tsx` as a presentational component**

```tsx
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/OptionCard.tsx
import { Card } from '@/components/ui/card'

export function OptionCard({
  optionText,
  mark,
  onTap,
}: {
  optionText: string
  mark: 'most' | 'least' | null
  onTap: () => void
}) {
  return (
    <button type="button" onClick={onTap} className="w-full text-left">
      <Card
        className={`p-4 transition-colors hover:bg-zinc-800/60 cursor-pointer ${
          mark === 'most' ? 'ring-2 ring-orange-500 bg-zinc-800/40' : ''
        } ${mark === 'least' ? 'ring-2 ring-zinc-500 bg-zinc-900/60' : ''}`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-200">{optionText}</p>
          {mark === 'most' && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400 shrink-0">
              Most like me
            </span>
          )}
          {mark === 'least' && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 shrink-0">
              Least like me
            </span>
          )}
        </div>
      </Card>
    </button>
  )
}
```

- [ ] **Step 2: Write `QuestionOptions.tsx`**

```tsx
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/QuestionOptions.tsx
'use client'

import { useReducer, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { OptionCard } from './OptionCard'
import { pickReducer, type PickState } from './pickReducer'
import { answerQuestion } from './actions'

export function QuestionOptions({
  attemptId,
  questionId,
  options,
  initialMostId,
  initialLeastId,
}: {
  attemptId: string
  questionId: string
  options: { id: string; optionText: string }[]
  initialMostId: string | null
  initialLeastId: string | null
}) {
  const initialState: PickState = { mostId: initialMostId, leastId: initialLeastId }
  const [state, dispatch] = useReducer(pickReducer, initialState)
  const [isPending, startTransition] = useTransition()

  const canContinue = state.mostId !== null && state.leastId !== null

  return (
    <div className="space-y-3">
      {options.map(option => (
        <OptionCard
          key={option.id}
          optionText={option.optionText}
          mark={state.mostId === option.id ? 'most' : state.leastId === option.id ? 'least' : null}
          onTap={() => dispatch({ type: 'tap', optionId: option.id })}
        />
      ))}

      <div className="flex items-center gap-3 pt-2">
        <Button
          disabled={!canContinue || isPending}
          onClick={() => {
            const { mostId, leastId } = state
            if (!mostId || !leastId) return
            startTransition(() => {
              answerQuestion(attemptId, questionId, mostId, leastId)
            })
          }}
        >
          {isPending ? 'Saving...' : 'Continue'}
        </Button>
        {!canContinue && (
          <p className="text-xs text-zinc-500">Pick your most and least like you.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update `page.tsx`**

```tsx
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getQuestionProgress, getPreviousQuestionId } from '@/lib/coach-dna/assessment-progress'
import { QuestionOptions } from './QuestionOptions'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Coach DNA — Self-Assessment' }

export default async function AssessmentQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { attemptId } = await params
  const { q } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  if (attempt.completed_at) redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)

  const { data: orderedQuestions } = await supabase
    .from('assessment_questions')
    .select('id')
    .eq('assessment_type', 'self_assessment')
    .order('display_order', { ascending: true })
  const questions = orderedQuestions ?? []

  const { data: responses } = await supabase
    .from('assessment_responses')
    .select('question_id, selected_option, least_option')
    .eq('attempt_id', attemptId)
  const answeredIds = (responses ?? []).map(r => r.question_id)

  const progress = getQuestionProgress(questions, answeredIds)
  const currentQuestionId = q && questions.some(quest => quest.id === q) ? q : progress.nextQuestion?.id

  if (!currentQuestionId) redirect(`/admin/coach-dna/assessment/${attemptId}/complete`)

  const position = questions.findIndex(quest => quest.id === currentQuestionId) + 1
  const previousQuestionId = getPreviousQuestionId(questions, currentQuestionId)
  const existingResponse = (responses ?? []).find(r => r.question_id === currentQuestionId)

  const { data: question } = await supabase
    .from('assessment_questions')
    .select('id, question_text')
    .eq('id', currentQuestionId)
    .single()

  // SECURITY: select only id and option_text. Never add the hidden scoring/weighting
  // column to this query — that data must not reach the client.
  const { data: options } = await supabase
    .from('assessment_options')
    .select('id, option_text')
    .eq('question_id', currentQuestionId)

  if (!question) redirect('/admin/coach-dna')

  return (
    <div className="space-y-6 max-w-2xl">
      {previousQuestionId ? (
        <Link
          href={`/admin/coach-dna/assessment/${attemptId}?q=${previousQuestionId}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={12} /> Back
        </Link>
      ) : (
        <Link
          href="/admin/coach-dna"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={12} /> Exit
        </Link>
      )}

      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
          Question {position} of {questions.length}
        </p>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${(position / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <h1 className="app-heading text-xl">{question.question_text}</h1>

      <QuestionOptions
        attemptId={attemptId}
        questionId={currentQuestionId}
        options={(options ?? []).map(o => ({ id: o.id, optionText: o.option_text }))}
        initialMostId={existingResponse?.selected_option ?? null}
        initialLeastId={existingResponse?.least_option ?? null}
      />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full coach-dna test suite**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna"`
Expected: all pass, no regressions from the `OptionCard`/`page.tsx` rewrite (neither has its own test file, so this confirms nothing else in the directory broke).

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/OptionCard.tsx" \
  "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/QuestionOptions.tsx" \
  "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/page.tsx"
git commit -m "feat(coach-dna): rebuild question page for instant-feedback most/least selection"
```

---

### Task 7: `summary-actions.ts` — consume most/least responses

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`

**Interfaces:**
- Consumes: `computeSelfOnlyCategoryScores` (Task 2, new signature).
- Unchanged: `generateSelfAssessmentSummary(attemptId: string): Promise<SelfAssessmentSummary>`.

**Context for the implementer:** The only change is how responses are fetched and mapped into `computeSelfOnlyCategoryScores`'s new `{ mostOptionId, leastOptionId }[]` shape — everything else in this file (auth, ownership, Groq call, validation, upsert) is unchanged.

- [ ] **Step 1: Update the test file's fixtures and mocks**

In `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`, the `state.responses` fixture and the `assessment_responses` mock need a `least_option` field, and a new test for the "incomplete response" guard. Find the existing state declaration and `beforeEach`, and update:

```ts
// In the state type declaration, change:
  responses: { question_id: string; selected_option: string }[]
// to:
  responses: { question_id: string; selected_option: string | null; least_option: string | null }[]
```

```ts
// In beforeEach, change:
    state.responses = [{ question_id: 'q1', selected_option: 'opt-1' }]
// to:
    state.responses = [{ question_id: 'q1', selected_option: 'opt-1', least_option: 'opt-2' }]
```

```ts
// In the options fixture, add a second option so opt-2 (the least pick) resolves too:
    state.options = [
      { id: 'opt-1', question_id: 'q1', category_weights_json: { teacher: 100 } },
      { id: 'opt-2', question_id: 'q1', category_weights_json: { motivator: 100 } },
    ]
```

Add one new test, alongside the existing "no responses found" test:

```ts
  it('throws when a response is missing its least-pick (pre-migration attempt)', async () => {
    state.responses = [{ question_id: 'q1', selected_option: 'opt-1', least_option: null }]

    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow(
      'This attempt was started before the current assessment format',
    )
    expect(upsertMock).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/summary-actions.test.ts"`
Expected: FAIL — the new test has no matching guard yet, and the changed fixtures don't match `computeSelfOnlyCategoryScores`'s old signature.

- [ ] **Step 3: Update the implementation**

In `web/src/app/(app)/admin/coach-dna/summary-actions.ts`, replace the responses-fetch-through-scoring block:

```ts
  const { data: responses, error: responsesError } = await supabase
    .from('assessment_responses')
    .select('question_id, selected_option, least_option')
    .eq('attempt_id', attemptId)
  if (responsesError) throw new Error(responsesError.message)
  if (!responses || responses.length === 0) throw new Error('No responses found for this completed attempt')

  const incompleteResponse = responses.find(r => !r.selected_option || !r.least_option)
  if (incompleteResponse) {
    throw new Error('This attempt was started before the current assessment format and cannot be scored. Please retake the assessment.')
  }

  const optionIds = Array.from(
    new Set(responses.flatMap(r => [r.selected_option as string, r.least_option as string])),
  )
  // `category_weights_json` is revoked from the `authenticated` role (migration
  // 109 closed a scoring-weight leak), so the scoring weights can only be read
  // with the service role. Ownership of this attempt is already verified above,
  // and only the derived scores ever leave this function.
  const serviceSupabase = createServiceClient()
  const { data: options, error: optionsError } = await serviceSupabase
    .from('assessment_options')
    .select('id, question_id, category_weights_json')
    .in('id', optionIds)
  if (optionsError) throw new Error(optionsError.message)

  const scores = computeSelfOnlyCategoryScores(
    responses.map(r => ({ mostOptionId: r.selected_option as string, leastOptionId: r.least_option as string })),
    (options ?? []).map(o => ({ id: o.id, categoryWeights: o.category_weights_json })),
  )
  const archetype = deriveArchetype(scores)
```

Everything below this block (the prompt, the Groq call, validation, the upsert) is unchanged — do not modify it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/summary-actions.test.ts"`
Expected: PASS (all tests, including the new one)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/summary-actions.ts" "web/src/app/(app)/admin/coach-dna/summary-actions.test.ts"
git commit -m "feat(coach-dna): score summaries from most/least responses"
```

---

### Task 8: PDF redesign — match the Coaching Eye brand standard

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts` (if it asserts on old text/structure — see Step 3)

**Interfaces:**
- Unchanged: `CoachDnaSummaryPDF({ data: SelfAssessmentSummary })`.

**Context for the implementer:** This mirrors `web/src/app/(app)/admin/match-report/MatchReportPDF.tsx`'s established visual pattern (already in this codebase — read it in full before starting, it's the reference). The Coach DNA PDF is a single page (no multi-page cover/section split needed, since there's much less content than a match report), but reuses the same palette, header treatment, bordered detail table, and colored comment-block pattern.

- [ ] **Step 1: Write the new PDF component**

```tsx
// web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { labelFor } from '@/lib/coach-dna/categories'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const E      = '#e8560a'
const DARK   = '#111827'
const MID    = '#374151'
const MUTED  = '#6b7280'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE  = '#ffffff'
const GREEN  = '#059669'
const AMBER  = '#d97706'

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, paddingBottom: 56, fontSize: 10, fontFamily: 'Helvetica', color: DARK },

  header: {
    backgroundColor: E,
    paddingHorizontal: 44,
    paddingTop: 44,
    paddingBottom: 36,
  },
  eyeLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 6 },

  body: { paddingHorizontal: 44, paddingTop: 32 },

  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 2.5, marginBottom: 12 },

  detailTable: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 8, marginBottom: 24 },
  detailRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  detailRowLast: { flexDirection: 'row' },
  detailKey: {
    width: 130, paddingVertical: 11, paddingHorizontal: 16, fontSize: 9, color: MUTED,
    borderRightWidth: 1, borderRightColor: BORDER, borderRightStyle: 'solid', backgroundColor: LIGHT,
  },
  detailValue: { flex: 1, paddingVertical: 11, paddingHorizontal: 16, fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK },

  narrative: { fontSize: 10.5, color: MID, lineHeight: 1.6, marginBottom: 24 },

  commentBlock: { marginBottom: 14 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  commentDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  commentLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', letterSpacing: 2 },
  commentBody: {
    fontSize: 9.5, color: MID, lineHeight: 1.6, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: LIGHT, borderRadius: 5, borderLeftWidth: 3, borderLeftStyle: 'solid',
  },

  footer: {
    position: 'absolute', bottom: 20, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: E, letterSpacing: 1.5 },
  footerMeta: { fontSize: 6.5, color: MUTED },

  confidential: { marginTop: 8, fontSize: 7.5, color: '#9ca3af', textAlign: 'center' },
})

function CommentBlock({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <View style={s.commentBlock}>
      <View style={s.commentHeaderRow}>
        <View style={[s.commentDot, { backgroundColor: color }]} />
        <Text style={[s.commentLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[s.commentBody, { borderLeftColor: color }]}>{text}</Text>
    </View>
  )
}

export function CoachDnaSummaryPDF({ data }: { data: SelfAssessmentSummary }) {
  const typeLine = `${labelFor(data.primaryType)}${data.secondaryType ? ` / ${labelFor(data.secondaryType)}` : ''} Coach`
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const rows = [
    { key: 'Coach Type', value: typeLine },
    { key: 'Completed', value: today },
    { key: 'Data Source', value: 'Self-Assessment Only' },
  ]

  return (
    <Document title="Coach DNA — Self-Assessment Results" author="18th Man Coach DNA">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.eyeLabel}>COACH DNA</Text>
          <Text style={s.title}>{typeLine}</Text>
          <Text style={s.subtitle}>Self-Assessment Results</Text>
        </View>

        <View style={s.body}>
          <Text style={s.sectionLabel}>SUMMARY</Text>

          <View style={s.detailTable}>
            {rows.map(({ key, value }, i) => (
              <View key={key} style={i === rows.length - 1 ? s.detailRowLast : s.detailRow}>
                <Text style={s.detailKey}>{key}</Text>
                <Text style={s.detailValue}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.narrative}>{data.narrative}</Text>

          {data.pros.map(pro => (
            <CommentBlock key={pro.categorySlug} label={labelFor(pro.categorySlug).toUpperCase()} text={pro.text} color={GREEN} />
          ))}
          {data.cons.map(con => (
            <CommentBlock key={con.categorySlug} label={labelFor(con.categorySlug).toUpperCase()} text={con.text} color={AMBER} />
          ))}

          <Text style={s.confidential}>
            This reflects your self-assessment only and will update as player and peer feedback comes in.
          </Text>
        </View>

        <View style={s.footer}>
          <Text style={s.footerBrand}>COACH DNA · 18TH MAN</Text>
          <Text style={s.footerMeta}>{today}</Text>
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Check the existing PDF-related test for brittle assertions**

Read `web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts`. If any test asserts on the PDF component's internal rendered text (it likely doesn't — the existing tests mock `@react-pdf/renderer`'s `renderToBuffer` entirely and never actually render `CoachDnaSummaryPDF`'s JSX), no changes are needed. If you find an assertion that would break with the new structure, update it to match, but do not weaken the assertion's intent.

- [ ] **Step 4: Run the coach-dna test suite**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna"`
Expected: all pass, no regressions.

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx"
git commit -m "feat(coach-dna): redesign summary PDF to match the Coaching Eye brand standard"
```

---

### Task 9: Email redesign — featureList + CTA button

**Files:**
- Modify: `web/src/lib/email.ts`
- Modify: `web/src/lib/email.test.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/pdf-actions.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts`

**Interfaces:**
- Produces (changed signature): `sendCoachDnaSummaryEmail(to: string, summary: SelfAssessmentSummary, pdfBuffer: Buffer): Promise<EmailResult>` (was `(to: string, primaryType: string, pdfBuffer: Buffer)` — now takes the whole summary so the email can build `featureList`s from `pros`/`cons`, not just the type label).

**Context for the implementer:** `web/src/lib/email.ts` already defines `featureList`, `ctaButton`, `heading`, `para`, `divider`, `greeting`, `sign`, `esc`, and `SITE_URL` — this task only adds imports/usage in `sendCoachDnaSummaryEmail`, it doesn't touch any of those shared helpers. `labelFor` (from `@/lib/coach-dna/categories`) is safe to import into `email.ts` — it's a pure, dependency-free function.

- [ ] **Step 1: Update the failing email test**

In `web/src/lib/email.test.ts`, find the `sendCoachDnaSummaryEmail` describe block and update it for the new signature:

```ts
describe('sendCoachDnaSummaryEmail', () => {
  beforeEach(() => {
    sendMock.mockReset()
    process.env.RESEND_API_KEY = 're_test_key'
  })

  const summary = {
    primaryType: 'teacher',
    secondaryType: 'motivator',
    narrative: 'You lead with clarity.',
    pros: [{ categorySlug: 'teacher', text: 'You explain things well.' }],
    cons: [{ categorySlug: 'organiser', text: 'Sessions could run tighter.' }],
  }

  it('sends the PDF as an attachment to the coach\'s own email', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_456' }, error: null })
    const result = await sendCoachDnaSummaryEmail('coach@example.com', summary, Buffer.from('fake-pdf'))
    expect(result).toEqual({ success: true, messageId: 'msg_456' })
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'coach@example.com',
      attachments: [{ filename: 'coach-dna-self-assessment.pdf', content: Buffer.from('fake-pdf') }],
    }))
  })

  it('includes the strengths and focus areas as feature lists in the email body', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_789' }, error: null })
    await sendCoachDnaSummaryEmail('coach@example.com', summary, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('You explain things well.'),
    }))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('Sessions could run tighter.'),
    }))
  })

  it('includes a CTA link back to the results page on-site', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_012' }, error: null })
    await sendCoachDnaSummaryEmail('coach@example.com', summary, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('/admin/coach-dna'),
    }))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/lib/email.test.ts`
Expected: FAIL — `sendCoachDnaSummaryEmail` still takes a `primaryType: string` second argument, not a summary object, so the test's second argument shape mismatches and the featureList/CTA assertions find nothing.

- [ ] **Step 3: Update the implementation**

In `web/src/lib/email.ts`, add the import near the top (alongside other imports) and replace `sendCoachDnaSummaryEmail`:

```ts
import { labelFor } from '@/lib/coach-dna/categories'
```

```ts
export async function sendCoachDnaSummaryEmail(
  to: string,
  summary: { primaryType: string; secondaryType: string | null; pros: { categorySlug: string; text: string }[]; cons: { categorySlug: string; text: string }[] },
  pdfBuffer: Buffer,
): Promise<EmailResult> {
  const typeLine = `${esc(labelFor(summary.primaryType))}${summary.secondaryType ? ` / ${esc(labelFor(summary.secondaryType))}` : ''}`

  const html = layout(`
    ${heading(`You're a ${typeLine} coach.`)}
    ${divider()}
    ${greeting('')}
    ${para('Your Coach DNA self-assessment results are attached to this email as a PDF, and summarised below.')}
    ${featureList(summary.pros.map(pro => `${esc(labelFor(pro.categorySlug))}: ${esc(pro.text)}`))}
    ${para('Focus areas:')}
    ${featureList(summary.cons.map(con => `${esc(labelFor(con.categorySlug))}: ${esc(con.text)}`))}
    ${para('This reflects your self-assessment only, and will update as player and peer feedback comes in.')}
    ${ctaButton('View your full results', `${SITE_URL}/admin/coach-dna`)}
    ${sign()}
  `)

  return send(
    to,
    `You're a ${typeLine} coach — your Coach DNA results`,
    html,
    [{ filename: 'coach-dna-self-assessment.pdf', content: pdfBuffer }],
  )
}
```

- [ ] **Step 4: Run the email test to verify it passes**

Run: `cd web && npx vitest run src/lib/email.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Update the call site**

In `web/src/app/(app)/admin/coach-dna/pdf-actions.tsx`, the call to `sendCoachDnaSummaryEmail` currently passes a pre-computed label string. Update it to pass the whole `summary` object, and remove the now-unused `labelFor` import if nothing else in the file uses it:

```tsx
    const pdfBuffer = await renderToBuffer(<CoachDnaSummaryPDF data={summary} /> as any)
    return await sendCoachDnaSummaryEmail(user.email!, summary, Buffer.from(pdfBuffer))
```

`labelFor` is only referenced in the `const primaryLabel = labelFor(summary.primaryType)` line being removed here — delete that line and the `import { labelFor } from '@/lib/coach-dna/categories'` line at the top of the file too, since nothing else in `pdf-actions.tsx` uses it.

- [ ] **Step 6: Update `pdf-actions.test.ts`**

Two changes needed. First, `state.summary` in this file is shaped `{ ai_summary: {...} }` (mocking the `coach_profiles` row, not the summary itself) — the assertion needs to reference `state.summary.ai_summary`, the actual `SelfAssessmentSummary` object. Update the `sends the PDF to the caller's own account email` test:

```ts
  it('sends the PDF to the caller\'s own account email', async () => {
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: true })
    expect(sendEmailMock).toHaveBeenCalledWith(
      'coach@example.com',
      (state.summary as { ai_summary: unknown }).ai_summary,
      expect.any(Buffer),
    )
  })
```

Second, delete the `maps a hyphenated category slug to its display label before sending` test entirely. That behavior (mapping `primaryType` through `labelFor` before it reaches the email) moved inside `sendCoachDnaSummaryEmail` itself as of this task — `pdf-actions.tsx` no longer calls `labelFor` at all, so asserting on a mapped label at this call site no longer makes sense. The equivalent coverage now lives in Task 9 Step 1's `email.test.ts` tests, which assert on the real `sendCoachDnaSummaryEmail` implementation.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/pdf-actions.test.ts"`
Expected: PASS (all tests)

- [ ] **Step 8: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add web/src/lib/email.ts web/src/lib/email.test.ts \
  "web/src/app/(app)/admin/coach-dna/pdf-actions.tsx" \
  "web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts"
git commit -m "feat(coach-dna): redesign summary email with feature lists and a results CTA"
```

---

### Task 10: Full verification

**Files:**
- None created — this task verifies Tasks 1-9 together.

- [ ] **Step 1: Run the full test suite and typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npm run test`
Expected: all existing tests plus every changed/new test file from Tasks 1-9 pass, no regressions.

- [ ] **Step 2: Confirm the RLS/data-exposure guarantee still holds**

Run: `cd web && grep -rn "category_weights_json" "src/app/(app)/admin/coach-dna/"`
Expected: matches ONLY in `summary-actions.ts` (server-side, via the service client) and test files that mock it. If it appears in `page.tsx`, `OptionCard.tsx`, `QuestionOptions.tsx`, or any client component, that is a leak — stop and fix before proceeding.

- [ ] **Step 3: Manual QA (cannot be automated in this environment — report to the human partner instead of claiming it's verified)**

This needs a logged-in admin coach to click through the full flow. Do NOT claim this "works" without doing this:
1. Start a fresh self-assessment (or reset the existing one so it can be retaken — the current schema has no retake flow, so this likely means clearing the existing attempt's rows directly, which the human partner should do or approve).
2. Answer a question: confirm tapping an option gives instant visual feedback (no wait for network), confirm the "most" and "least" marks look visually distinct, confirm tapping a marked option clears it, confirm tapping a third option after both marks are set reassigns "most" correctly.
3. Confirm "Continue" is disabled until both picks are made, and only fires one network request per question.
4. Complete all 24 questions, confirm the results page shows a primary/secondary type, narrative, strengths, and focus areas that feel like a more differentiated, confident read than before (the specific thing being fixed).
5. Click "Email me a PDF" — confirm the email arrives with the new brand-matched PDF attached, feature-list-formatted strengths/focus areas in the email body, and a working "View your full results" button.
6. Revisit `/admin/coach-dna` → "View your results" — confirm it still shows the same summary without regenerating.

If Playwright MCP tools or admin credentials are not available, explicitly report that manual QA was NOT performed and ask the human partner to click through the flow themselves before considering this plan done.

- [ ] **Step 4: Commit (only if Step 1-2 required fixes)**

If any step required a fix, commit it with an appropriate message. If everything passed cleanly, skip this step.
