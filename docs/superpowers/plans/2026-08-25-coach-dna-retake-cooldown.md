# Coach DNA Retake Cooldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach retake their Coach DNA self-assessment, gated by a 3-month cooldown from their last completed attempt, with a quiet non-gamified date message before they're eligible.

**Architecture:** A pure eligibility function computes whether a coach can retake and, if not, when — consumed by both the server-side action that creates a new attempt (enforcement) and the hub page (display).

**Tech Stack:** Next.js App Router (Server Components, Server Actions), Supabase (Postgres), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-25-coach-dna-retake-cooldown-design.md`

## Global Constraints

- Cooldown is 3 calendar months from the most recently **completed** attempt's `completed_at` — an in-progress/abandoned attempt never starts or resets this clock.
- Before eligible: a quiet, muted, non-interactive date line ("You can retake this on 12 November 2026") — no countdown, no progress bar, no lock iconography.
- The cooldown is enforced server-side in the action that creates a new attempt, not just hidden client-side.
- No admin-override mechanism in this plan — a separate, already-specified admin capability (`docs/superpowers/specs/2026-08-25-coach-dna-admin-reset-design.md`) achieves the same effect by clearing the coach's completed attempts.

---

### Task 1: `retakeEligibility` — pure eligibility function

**Files:**
- Create: `web/src/lib/coach-dna/retake-eligibility.ts`
- Create: `web/src/lib/coach-dna/retake-eligibility.test.ts`

**Interfaces:**
- Produces: `export interface RetakeEligibility { eligible: boolean; eligibleAt: Date | null }` and `export function retakeEligibility(lastCompletedAt: string | null): RetakeEligibility` — consumed by Task 2 (`actions.ts`) and Task 3 (`page.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/coach-dna/retake-eligibility.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { retakeEligibility } from './retake-eligibility'

describe('retakeEligibility', () => {
  it('is eligible with no prior completed attempt', () => {
    const result = retakeEligibility(null)
    expect(result.eligible).toBe(true)
    expect(result.eligibleAt).toBeNull()
  })

  it('is not eligible the day after completion', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = retakeEligibility(yesterday.toISOString())
    expect(result.eligible).toBe(false)
    expect(result.eligibleAt).not.toBeNull()
  })

  it('is eligible exactly 3 months (or more) after completion', () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 1) // safely past the boundary
    const result = retakeEligibility(threeMonthsAgo.toISOString())
    expect(result.eligible).toBe(true)
    expect(result.eligibleAt).toBeNull()
  })

  it('is not eligible one day before the 3-month mark', () => {
    const almostThreeMonthsAgo = new Date()
    almostThreeMonthsAgo.setMonth(almostThreeMonthsAgo.getMonth() - 3)
    almostThreeMonthsAgo.setDate(almostThreeMonthsAgo.getDate() + 1) // 1 day short
    const result = retakeEligibility(almostThreeMonthsAgo.toISOString())
    expect(result.eligible).toBe(false)
  })

  it('computes eligibleAt as exactly 3 calendar months after completedAt, handling month-length rollover', () => {
    // 30 November + 3 months: February doesn't have day 30, so JS Date
    // normalizes this forward to 2 March, not 28/29 February.
    const result = retakeEligibility('2026-11-30T12:00:00.000Z')
    expect(result.eligible).toBe(false)
    expect(result.eligibleAt).toEqual(new Date('2027-03-02T12:00:00.000Z'))
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/retake-eligibility.test.ts`
Expected: FAIL — `Cannot find module './retake-eligibility'`.

- [ ] **Step 3: Implement `retake-eligibility.ts`**

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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/retake-eligibility.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add web/src/lib/coach-dna/retake-eligibility.ts web/src/lib/coach-dna/retake-eligibility.test.ts
git commit -m "feat(coach-dna): add retakeEligibility pure function"
```

---

### Task 2: Server-side enforcement in `startAssessment`

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/actions.test.ts`

**Interfaces:**
- Consumes: `retakeEligibility(lastCompletedAt: string | null): RetakeEligibility` from `@/lib/coach-dna/retake-eligibility` (Task 1).
- Produces: `startAssessment()` unchanged signature, now throws `'You are not yet eligible to retake this assessment'` when called too soon after a completed attempt — consumed unchanged by Task 3's hub page (already calls it as a form action).

The current `web/src/app/(app)/admin/coach-dna/actions.ts` in full:

```ts
// web/src/app/(app)/admin/coach-dna/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')
  return { supabase, userId: user.id }
}

export async function startAssessment() {
  const { supabase, userId } = await requireAdmin()

  const { data: attempt, error } = await supabase
    .from('assessment_attempts')
    .insert({ coach_id: userId, assessment_type: 'self_assessment', version: 1 })
    .select('id')
    .single()

  if (error || !attempt) throw new Error(error?.message ?? 'Failed to start assessment')

  redirect(`/admin/coach-dna/assessment/${attempt.id}`)
}
```

The current `web/src/app/(app)/admin/coach-dna/actions.test.ts` in full:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  insertError: { message: string } | null
  insertedAttempt: { id: string } | null
} = {
  user: null,
  role: null,
  insertError: null,
  insertedAttempt: null,
}

const insertMock = vi.fn(() => ({
  select: () => ({
    single: async () => ({ data: state.insertedAttempt, error: state.insertError }),
  }),
}))
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

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
        return { insert: insertMock }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { startAssessment } from './actions'

describe('startAssessment', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.insertError = null
    state.insertedAttempt = { id: 'attempt-1' }
    insertMock.mockClear()
    redirectMock.mockClear()
  })

  it('redirects unauthenticated callers to login without creating an attempt', async () => {
    state.user = null

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/login')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'

    // startAssessment redirects to the new attempt on success, so the mocked
    // redirect() throw is the expected outcome here, not a plain return —
    // this only proves the role check let the call reach the insert.
    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalled()
  })

  it('redirects non-coach, non-admin callers to the dashboard without creating an attempt', async () => {
    state.role = 'viewer'

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/dashboard')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('throws when the attempt insert fails', async () => {
    state.insertError = { message: 'insert failed' }
    state.insertedAttempt = null

    await expect(startAssessment()).rejects.toThrow('insert failed')
  })

  it('throws a fallback error when insert returns no error and no attempt', async () => {
    state.insertError = null
    state.insertedAttempt = null

    await expect(startAssessment()).rejects.toThrow('Failed to start assessment')
  })

  it('creates an attempt and redirects to the assessment for a valid admin', async () => {
    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalledWith({ coach_id: 'coach-1', assessment_type: 'self_assessment', version: 1 })
  })
})
```

- [ ] **Step 1: Write the failing tests**

Replace `web/src/app/(app)/admin/coach-dna/actions.test.ts` in full:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  insertError: { message: string } | null
  insertedAttempt: { id: string } | null
  lastCompletedAt: string | null
} = {
  user: null,
  role: null,
  insertError: null,
  insertedAttempt: null,
  lastCompletedAt: null,
}

const insertMock = vi.fn(() => ({
  select: () => ({
    single: async () => ({ data: state.insertedAttempt, error: state.insertError }),
  }),
}))
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

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
          insert: insertMock,
          select: () => ({
            eq: () => ({
              eq: () => ({
                not: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: state.lastCompletedAt ? { completed_at: state.lastCompletedAt } : null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { startAssessment } from './actions'

describe('startAssessment', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.insertError = null
    state.insertedAttempt = { id: 'attempt-1' }
    state.lastCompletedAt = null
    insertMock.mockClear()
    redirectMock.mockClear()
  })

  it('redirects unauthenticated callers to login without creating an attempt', async () => {
    state.user = null

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/login')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('allows a coach-role caller through (not just admin)', async () => {
    state.role = 'coach'

    // startAssessment redirects to the new attempt on success, so the mocked
    // redirect() throw is the expected outcome here, not a plain return —
    // this only proves the role check let the call reach the insert.
    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalled()
  })

  it('redirects non-coach, non-admin callers to the dashboard without creating an attempt', async () => {
    state.role = 'viewer'

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/dashboard')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('throws when the attempt insert fails', async () => {
    state.insertError = { message: 'insert failed' }
    state.insertedAttempt = null

    await expect(startAssessment()).rejects.toThrow('insert failed')
  })

  it('throws a fallback error when insert returns no error and no attempt', async () => {
    state.insertError = null
    state.insertedAttempt = null

    await expect(startAssessment()).rejects.toThrow('Failed to start assessment')
  })

  it('creates an attempt and redirects to the assessment for a valid admin', async () => {
    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalledWith({ coach_id: 'coach-1', assessment_type: 'self_assessment', version: 1 })
  })

  it('allows a first-time start with no prior completed attempt', async () => {
    state.lastCompletedAt = null

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalled()
  })

  it('rejects a retake attempt within the 3-month cooldown, without creating an attempt', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    state.lastCompletedAt = yesterday.toISOString()

    await expect(startAssessment()).rejects.toThrow('You are not yet eligible to retake this assessment')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('allows a retake once the 3-month cooldown has passed', async () => {
    const fourMonthsAgo = new Date()
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4)
    state.lastCompletedAt = fourMonthsAgo.toISOString()

    await expect(startAssessment()).rejects.toThrow('REDIRECT:/admin/coach-dna/assessment/attempt-1')
    expect(insertMock).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/actions.test.ts"`
Expected: FAIL — the new `select` chain on the `assessment_attempts` mock isn't consumed yet, and the three new cooldown-related tests don't yet have corresponding behavior in `startAssessment`.

- [ ] **Step 3: Implement the cooldown check in `actions.ts`**

Replace the full content of `web/src/app/(app)/admin/coach-dna/actions.ts`:

```ts
// web/src/app/(app)/admin/coach-dna/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { retakeEligibility } from '@/lib/coach-dna/retake-eligibility'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')
  return { supabase, userId: user.id }
}

export async function startAssessment() {
  const { supabase, userId } = await requireAdmin()

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

  const { data: attempt, error } = await supabase
    .from('assessment_attempts')
    .insert({ coach_id: userId, assessment_type: 'self_assessment', version: 1 })
    .select('id')
    .single()

  if (error || !attempt) throw new Error(error?.message ?? 'Failed to start assessment')

  redirect(`/admin/coach-dna/assessment/${attempt.id}`)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/actions.test.ts"`
Expected: PASS (9 tests — 6 existing + 3 new).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add "web/src/app/(app)/admin/coach-dna/actions.ts" "web/src/app/(app)/admin/coach-dna/actions.test.ts"
git commit -m "feat(coach-dna): enforce retake cooldown server-side in startAssessment"
```

---

### Task 3: Hub page UI — retake button and cooldown message

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/page.test.tsx`

**Interfaces:**
- Consumes: `retakeEligibility(lastCompletedAt: string | null): RetakeEligibility` from `@/lib/coach-dna/retake-eligibility` (Task 1); `startAssessment` from `./actions` (already imported, Task 2's cooldown check is transparent to this page — it just calls the same action as a form action, same as the existing first-time-start button).

- [ ] **Step 1: Write the failing tests**

In `web/src/app/(app)/admin/coach-dna/page.test.tsx`, update the `state` type declaration for `completed` to carry an optional `completed_at`:

```ts
  completed: { id: string; completed_at?: string } | null
```

Add two new tests, placed after the existing `'renders a condensed snapshot when completed with a valid summary'` test:

```ts
  it('shows a quiet retake button once the cooldown has passed', async () => {
    const fourMonthsAgo = new Date()
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4)
    state.completed = { id: 'attempt-1', completed_at: fourMonthsAgo.toISOString() }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: 'technician',
      narrative: 'You build trust fast.',
      pros: [{ categorySlug: 'communicator', text: 'Great communicator' }],
      cons: [{ categorySlug: 'game-manager', text: 'Work on game management', resources: [] }],
      sourcedCategories: { motivator: ['self'] },
    }

    render(await CoachDnaPage())

    expect(screen.getByRole('button', { name: 'Retake assessment' })).toBeInTheDocument()
  })

  it('shows a quiet date message instead of a retake button during the cooldown', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    state.completed = { id: 'attempt-1', completed_at: yesterday.toISOString() }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: 'technician',
      narrative: 'You build trust fast.',
      pros: [{ categorySlug: 'communicator', text: 'Great communicator' }],
      cons: [{ categorySlug: 'game-manager', text: 'Work on game management', resources: [] }],
      sourcedCategories: { motivator: ['self'] },
    }

    render(await CoachDnaPage())

    expect(screen.queryByRole('button', { name: 'Retake assessment' })).not.toBeInTheDocument()
    expect(screen.getByText(/You can retake this on/)).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/page.test.tsx"`
Expected: FAIL — no element with the accessible name `'Retake assessment'` and no "You can retake this on" text exist yet.

- [ ] **Step 3: Wire the retake UI into `page.tsx`**

Add the import, alongside the existing `import { startAssessment } from './actions'`:

```tsx
import { retakeEligibility } from '@/lib/coach-dna/retake-eligibility'
```

Change the `completed` query's select from `.select('id')` to include `completed_at`:

```tsx
  const { data: completed } = await supabase
    .from('assessment_attempts')
    .select('id, completed_at')
    .eq('coach_id', user.id)
    .eq('assessment_type', 'self_assessment')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
```

After the `summary` computation block (after the closing `}` of the `if (completed) { ... }` block, before the `feedbackRequests` query), add:

```tsx
  const { eligible: retakeEligible, eligibleAt: retakeEligibleAt } = retakeEligibility(completed?.completed_at ?? null)
```

In the JSX, inside the `completed && summary` branch, immediately after the existing `{hasBlendedFeedback(summary.sourcedCategories) && (<CoachDnaCardDialog attemptId={completed.id} />)}` block (still inside the same outer `<div className="space-y-4">`, before its closing `</div>`), add:

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

(Note: on `main` today this trigger component is `CoachDnaCardDialog` — if a different component name is present by the time this task executes, due to other work landing first, insert the new block as the last child before the outer `<div className="space-y-4">`'s closing tag regardless of that component's exact name; the anchor is "last thing in this branch," not the specific sibling component.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/page.test.tsx"`
Expected: PASS (same test count as before this step + 2 new).

- [ ] **Step 5: Run the full test suite**

Run: `cd web && npm run test`
Expected: PASS, full suite green.

- [ ] **Step 6: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add "web/src/app/(app)/admin/coach-dna/page.tsx" "web/src/app/(app)/admin/coach-dna/page.test.tsx"
git commit -m "feat(coach-dna): show retake button or cooldown date on the hub page"
```

---

## Self-Review Notes

**Spec coverage:** Part 1 (eligibility function) → Task 1. Part 2 (server-side enforcement) → Task 2. Part 3 (hub page UI) → Task 3. Testing section's listed cases (no-prior-completion, day-after, exact-boundary, month-rollover, `startAssessment` throw/success, hub button/message) are all covered across the three tasks' test additions.

**Placeholder scan:** No TBD/TODO markers. Every step has complete, copy-pasteable code, including the full current content of both files Task 2 modifies (so the diff is unambiguous even though this plan doesn't use line-anchored partial edits for that task).

**Type consistency:** `RetakeEligibility`/`retakeEligibility` (Task 1) is imported with the identical signature in Task 2 (`actions.ts`) and Task 3 (`page.tsx`). `completed.completed_at` is added consistently to both the real query (Task 3's `page.tsx` change) and the test fixture type (Task 3's `page.test.tsx` change).
