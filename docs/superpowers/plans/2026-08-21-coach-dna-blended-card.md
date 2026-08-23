# Coach DNA Blended Results Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Once a coach's Coach DNA profile genuinely blends in real feedback (not just their own self-view), auto-refresh the cached summary and offer a branded, downloadable result-card image showing their type, top strength, and development focus.

**Architecture:** Extract the existing (already-working) self+feedback blending computation out of `generateSelfAssessmentSummary` into a reusable pure(ish) function, add a cheap staleness check on top of it (`ensureFreshSummary`), then build a `next/og`-generated image behind a new Route Handler, surfaced via a button + modal on the Coach DNA hub page.

**Tech Stack:** Next.js 16 App Router, `next/og` (`ImageResponse`, built into Next.js — no new dependency), Vitest + Testing Library, existing Supabase clients (`@/lib/supabase/server`, `@/lib/supabase/service`).

**Spec:** `docs/superpowers/specs/2026-08-21-coach-dna-blended-card-design.md`

## Global Constraints

- No new database columns or tables — staleness is re-derived from existing data every time (spec Scope §1).
- `ImageResponse`'s total bundle (JSX + CSS + fonts + images) must stay under 500KB — do not embed the existing `coach-dna-hero.png` (2.3MB) or `LOGO_DATA_URI` (~230KB) directly; recreate the brand mark as lightweight typographic/vector elements (spec Part 4).
- The image Route Handler must never call `redirect()` (from `next/navigation`) — it's fetched by an `<img>` tag, not navigated to; failures become plain `Response` status codes (spec Part 4, Part 2 failure-handling note).
- The card button/image only ever appears for a **blended** profile (`hasBlendedFeedback` true) — never for a self-only result (spec Scope §2).
- Every Coach DNA route's existing `admin`/`coach` role gate and ownership check pattern is preserved as-is; this feature adds to it, never loosens it (CLAUDE.md roles/permissions rule).

---

## Task 1: Extract `computeBlendedArchetype`

**Files:**
- Create: `web/src/lib/coach-dna/blended-archetype.ts`
- Test: `web/src/lib/coach-dna/blended-archetype.test.ts`

**Interfaces:**
- Consumes: `computeSelfOnlyCategoryScores` (`./self-score`), `deriveArchetype`/`ArchetypeResult` (`./archetype`), `fetchBlendInputs` (`./blend-inputs`), `computeCategoryScore`/`SourceInput` (`./scoring`), `getCategoryWeights`/`getSourceThresholds`/`ScoreSource` (`./config`) — all exist today, unchanged.
- Produces: `computeBlendedArchetype(supabase, serviceSupabase, attemptId, coachId, completedAt): Promise<BlendedArchetypeResult>` where `BlendedArchetypeResult = { archetype: ArchetypeResult; sourcedCategories: Record<string, ScoreSource[]> }`. Task 3 (the `generateSelfAssessmentSummary` refactor) and Task 4 (`ensureFreshSummary`) both call this.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/blended-archetype.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  blendInputs: Record<string, { source: string; responses: { value: number; submittedAt: string }[] }[]>
} = { blendInputs: {} }

const fetchBlendInputsMock = vi.fn(async (..._args: unknown[]) => state.blendInputs)
vi.mock('./blend-inputs', () => ({
  fetchBlendInputs: (...args: unknown[]) => fetchBlendInputsMock(...args),
}))

import { computeBlendedArchetype } from './blended-archetype'

const RESPONSES = [{ question_id: 'q1', selected_option: 'opt-1', least_option: 'opt-2' }]
const OPTIONS = [
  { id: 'opt-1', question_id: 'q1', category_weights_json: { teacher: 100 } },
  { id: 'opt-2', question_id: 'q1', category_weights_json: { motivator: 100 } },
]
const COMPLETED_AT = '2026-08-06T00:00:00.000Z'

function makeSupabase(overrides: { responses?: typeof RESPONSES; responsesError?: { message: string } | null } = {}) {
  return {
    from: (table: string) => {
      if (table === 'assessment_responses') {
        return { select: () => ({ eq: async () => ({ data: overrides.responses ?? RESPONSES, error: overrides.responsesError ?? null }) }) }
      }
      throw new Error(`unexpected table on user client: ${table}`)
    },
  }
}

function makeServiceSupabase(overrides: { options?: typeof OPTIONS; optionsError?: { message: string } | null } = {}) {
  return {
    from: (table: string) => {
      if (table === 'assessment_options') {
        return { select: () => ({ in: async () => ({ data: overrides.options ?? OPTIONS, error: overrides.optionsError ?? null }) }) }
      }
      throw new Error(`unexpected table on service client: ${table}`)
    },
  }
}

describe('computeBlendedArchetype', () => {
  beforeEach(() => {
    state.blendInputs = {}
    fetchBlendInputsMock.mockClear()
  })

  it('throws when there are no responses', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      computeBlendedArchetype(makeSupabase({ responses: [] }) as any, makeServiceSupabase() as any, 'attempt-1', 'coach-1', COMPLETED_AT),
    ).rejects.toThrow('No responses found for this completed attempt')
  })

  it('throws when a response is missing its least-pick', async () => {
    await expect(
      computeBlendedArchetype(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeSupabase({ responses: [{ question_id: 'q1', selected_option: 'opt-1', least_option: null }] }) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeServiceSupabase() as any,
        'attempt-1', 'coach-1', COMPLETED_AT,
      ),
    ).rejects.toThrow('This attempt was started before the current assessment format')
  })

  it('propagates a responses read error', async () => {
    await expect(
      computeBlendedArchetype(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeSupabase({ responsesError: { message: 'connection reset' } }) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeServiceSupabase() as any,
        'attempt-1', 'coach-1', COMPLETED_AT,
      ),
    ).rejects.toThrow('connection reset')
  })

  it('propagates an options read error', async () => {
    await expect(
      computeBlendedArchetype(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeSupabase() as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeServiceSupabase({ optionsError: { message: 'connection reset' } }) as any,
        'attempt-1', 'coach-1', COMPLETED_AT,
      ),
    ).rejects.toThrow('connection reset')
  })

  it('marks every category self-only when there is no external feedback', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await computeBlendedArchetype(makeSupabase() as any, makeServiceSupabase() as any, 'attempt-1', 'coach-1', COMPLETED_AT)
    expect(result.archetype.primaryType).toBe('teacher')
    expect(result.sourcedCategories.teacher).toEqual(['self'])
    expect(result.sourcedCategories.motivator).toEqual(['self'])
  })

  it('calls fetchBlendInputs with the service client and coach id', async () => {
    const serviceSupabase = makeServiceSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await computeBlendedArchetype(makeSupabase() as any, serviceSupabase as any, 'attempt-1', 'coach-1', COMPLETED_AT)
    expect(fetchBlendInputsMock).toHaveBeenCalledWith(serviceSupabase, 'coach-1')
  })

  it('blends in a category once its external source clears the sample-size threshold', async () => {
    state.blendInputs = {
      motivator: [{ source: 'player_voice', responses: [
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
      ] }],
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await computeBlendedArchetype(makeSupabase() as any, makeServiceSupabase() as any, 'attempt-1', 'coach-1', COMPLETED_AT)
    expect(result.sourcedCategories.motivator).toEqual(expect.arrayContaining(['self', 'player_voice']))
    expect(result.sourcedCategories.teacher).toEqual(['self'])
  })

  it('does not blend a category whose external source is below the sample-size threshold', async () => {
    state.blendInputs = {
      motivator: [{ source: 'player_voice', responses: [{ value: 100, submittedAt: '2026-08-01T00:00:00.000Z' }] }],
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await computeBlendedArchetype(makeSupabase() as any, makeServiceSupabase() as any, 'attempt-1', 'coach-1', COMPLETED_AT)
    expect(result.sourcedCategories.motivator).toEqual(['self'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/coach-dna/blended-archetype.test.ts`
Expected: FAIL — `blended-archetype.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/blended-archetype.ts
import type { createClient } from '@/lib/supabase/server'
import type { createServiceClient } from '@/lib/supabase/service'
import { computeSelfOnlyCategoryScores } from './self-score'
import { deriveArchetype, type ArchetypeResult } from './archetype'
import { fetchBlendInputs } from './blend-inputs'
import { computeCategoryScore, type SourceInput } from './scoring'
import { getCategoryWeights, getSourceThresholds, type ScoreSource } from './config'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>
type ServiceClient = ReturnType<typeof createServiceClient>

export interface BlendedArchetypeResult {
  archetype: ArchetypeResult
  sourcedCategories: Record<string, ScoreSource[]>
}

/** Self-assessment scores blended with cleared external feedback, category by
 *  category -- the same computation generateSelfAssessmentSummary persists,
 *  extracted so a caller (ensureFreshSummary) can cheaply re-derive it (no AI
 *  call) to check whether a cached summary is stale. */
export async function computeBlendedArchetype(
  supabase: SupabaseClient,
  serviceSupabase: ServiceClient,
  attemptId: string,
  coachId: string,
  completedAt: string,
): Promise<BlendedArchetypeResult> {
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
  const { data: options, error: optionsError } = await serviceSupabase
    .from('assessment_options')
    .select('id, question_id, category_weights_json')
    .in('id', optionIds)
  if (optionsError) throw new Error(optionsError.message)

  const scores = computeSelfOnlyCategoryScores(
    responses.map(r => ({ mostOptionId: r.selected_option as string, leastOptionId: r.least_option as string })),
    (options ?? []).map(o => ({ id: o.id, categoryWeights: o.category_weights_json })),
  )

  const blendInputsByCategory = await fetchBlendInputs(serviceSupabase, coachId)
  const sourcedCategories: Record<string, ScoreSource[]> = {}
  const blendedScores = scores.map(({ categorySlug, score }) => {
    const inputs: SourceInput[] = [
      { source: 'self', responses: [{ value: score, submittedAt: completedAt }] },
      ...(blendInputsByCategory[categorySlug] ?? []),
    ]
    const result = computeCategoryScore(inputs, getCategoryWeights(categorySlug), getSourceThresholds(categorySlug), new Date())
    if (result.status === 'scored') {
      sourcedCategories[categorySlug] = result.activeSources
      return { categorySlug, score: result.blendedScore }
    }
    sourcedCategories[categorySlug] = ['self']
    return { categorySlug, score }
  })

  return { archetype: deriveArchetype(blendedScores), sourcedCategories }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/coach-dna/blended-archetype.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/blended-archetype.ts web/src/lib/coach-dna/blended-archetype.test.ts
git commit -m "feat(coach-dna): extract computeBlendedArchetype for reuse by staleness check"
```

---

## Task 2: `hasBlendedFeedback` and `sourcedCategoriesEqual`

**Files:**
- Create: `web/src/lib/coach-dna/blend-status.ts`
- Test: `web/src/lib/coach-dna/blend-status.test.ts`

**Interfaces:**
- Consumes: `ScoreSource` (`./config`)
- Produces: `hasBlendedFeedback(sourcedCategories: Record<string, string[]> | undefined): boolean` and `sourcedCategoriesEqual(cached: Record<string, string[]> | undefined, fresh: Record<string, ScoreSource[]>): boolean`. Task 4 (`ensureFreshSummary`), Task 8 (image route), and Task 10 (hub page button gating) all import `hasBlendedFeedback`; Task 4 imports `sourcedCategoriesEqual`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/blend-status.test.ts
import { describe, it, expect } from 'vitest'
import { hasBlendedFeedback, sourcedCategoriesEqual } from './blend-status'

describe('hasBlendedFeedback', () => {
  it('is false when sourcedCategories is undefined', () => {
    expect(hasBlendedFeedback(undefined)).toBe(false)
  })

  it('is false when every category is self-only', () => {
    expect(hasBlendedFeedback({ teacher: ['self'], motivator: ['self'] })).toBe(false)
  })

  it('is true when any category has a non-self source', () => {
    expect(hasBlendedFeedback({ teacher: ['self'], motivator: ['self', 'player_voice'] })).toBe(true)
  })
})

describe('sourcedCategoriesEqual', () => {
  it('is false when cached is undefined', () => {
    expect(sourcedCategoriesEqual(undefined, { teacher: ['self'] })).toBe(false)
  })

  it('is true for identical single-source maps', () => {
    expect(sourcedCategoriesEqual({ teacher: ['self'] }, { teacher: ['self'] })).toBe(true)
  })

  it('is false when a category gained a new source', () => {
    expect(sourcedCategoriesEqual({ motivator: ['self'] }, { motivator: ['self', 'player_voice'] })).toBe(false)
  })

  it('ignores source order within a category', () => {
    expect(sourcedCategoriesEqual({ motivator: ['player_voice', 'self'] }, { motivator: ['self', 'player_voice'] })).toBe(true)
  })

  it('is false when the set of categories differs', () => {
    expect(sourcedCategoriesEqual({ teacher: ['self'] }, { teacher: ['self'], motivator: ['self'] })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/coach-dna/blend-status.test.ts`
Expected: FAIL — `blend-status.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/blend-status.ts
import type { ScoreSource } from './config'

/** True once any category has blended in feedback beyond the coach's own
 *  self-view. A missing sourcedCategories (summaries persisted before this
 *  field existed) is treated as self-only, matching SelfAssessmentSummary's
 *  own documented fallback. */
export function hasBlendedFeedback(sourcedCategories: Record<string, string[]> | undefined): boolean {
  if (!sourcedCategories) return false
  return Object.values(sourcedCategories).some(sources => sources.some(s => s !== 'self'))
}

/** Structural equality (unordered per-category source lists) between a
 *  cached summary's sourcedCategories and a freshly computed one -- used to
 *  decide whether a cached summary is stale. */
export function sourcedCategoriesEqual(
  cached: Record<string, string[]> | undefined,
  fresh: Record<string, ScoreSource[]>,
): boolean {
  if (!cached) return false
  const cachedKeys = Object.keys(cached)
  const freshKeys = Object.keys(fresh)
  if (cachedKeys.length !== freshKeys.length) return false

  for (const key of freshKeys) {
    const cachedSources = cached[key]
    const freshSources = fresh[key]
    if (!cachedSources || cachedSources.length !== freshSources.length) return false
    const cachedSet = new Set(cachedSources)
    if (!freshSources.every(s => cachedSet.has(s))) return false
  }
  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/coach-dna/blend-status.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/blend-status.ts web/src/lib/coach-dna/blend-status.test.ts
git commit -m "feat(coach-dna): add hasBlendedFeedback and sourcedCategoriesEqual helpers"
```

---

## Task 3: Refactor `generateSelfAssessmentSummary` to use `computeBlendedArchetype`

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.ts`

**Interfaces:**
- Consumes: `computeBlendedArchetype` (Task 1).
- Produces: no change to `generateSelfAssessmentSummary`'s public signature or behavior — this is a pure internal refactor. Task 4 depends on this file already importing `createServiceClient` at the top (unchanged) and on `generateSelfAssessmentSummary` still being callable the same way.

This task has **no new tests** — its test is the existing, unmodified `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts` suite (22 tests) passing exactly as it does today. That file already mocks `@/lib/coach-dna/blend-inputs` by resolved module path, which `computeBlendedArchetype` also imports (via a relative `./blend-inputs` specifier resolving to the same file) — the mock keeps working unchanged.

- [ ] **Step 1: Run the existing suite to confirm today's baseline passes**

Run: `cd web && npx vitest run src/app/\(app\)/admin/coach-dna/summary-actions.test.ts`
Expected: PASS (22 tests) — this is the regression baseline Step 3 must not break.

- [ ] **Step 2: Refactor the implementation**

In `web/src/app/(app)/admin/coach-dna/summary-actions.ts`, replace the imports:

```ts
// Remove these (now only used inside blended-archetype.ts):
import { computeSelfOnlyCategoryScores } from '@/lib/coach-dna/self-score'
import { deriveArchetype } from '@/lib/coach-dna/archetype'
import { fetchBlendInputs } from '@/lib/coach-dna/blend-inputs'
import { computeCategoryScore, type SourceInput } from '@/lib/coach-dna/scoring'
import { getCategoryWeights, getSourceThresholds, type ScoreSource } from '@/lib/coach-dna/config'

// Add:
import { computeBlendedArchetype } from '@/lib/coach-dna/blended-archetype'
```

Replace this block (the attempt fetch through `deriveArchetype`):

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

  // Blend in cleared external feedback per category. A category stays
  // self-only (both in score and in sourcedCategories) until its external
  // source(s) clear their sample-size threshold -- computeCategoryScore
  // already encodes that via its 'insufficient_data' status.
  const blendInputsByCategory = await fetchBlendInputs(serviceSupabase, user.id)
  const sourcedCategories: Record<string, ScoreSource[]> = {}
  const blendedScores = scores.map(({ categorySlug, score }) => {
    const inputs: SourceInput[] = [
      { source: 'self', responses: [{ value: score, submittedAt: attempt.completed_at as string }] },
      ...(blendInputsByCategory[categorySlug] ?? []),
    ]
    const result = computeCategoryScore(inputs, getCategoryWeights(categorySlug), getSourceThresholds(categorySlug), new Date())
    if (result.status === 'scored') {
      sourcedCategories[categorySlug] = result.activeSources
      return { categorySlug, score: result.blendedScore }
    }
    sourcedCategories[categorySlug] = ['self']
    return { categorySlug, score }
  })

  const archetype = deriveArchetype(blendedScores)
```

with:

```ts
  // `category_weights_json` is revoked from the `authenticated` role (migration
  // 109 closed a scoring-weight leak), so the scoring weights can only be read
  // with the service role. Ownership of this attempt is already verified above,
  // and only the derived scores ever leave this function.
  const serviceSupabase = createServiceClient()
  const { archetype, sourcedCategories } = await computeBlendedArchetype(
    supabase,
    serviceSupabase,
    attemptId,
    user.id,
    attempt.completed_at as string,
  )
```

Everything below this (the AI prompt, `generateText` call, response parsing, and the `coach_profiles` upsert) is unchanged — it already reads `archetype` and `sourcedCategories`, which now come from `computeBlendedArchetype` instead of being computed inline.

- [ ] **Step 3: Run the existing suite to confirm no regression**

Run: `cd web && npx vitest run src/app/\(app\)/admin/coach-dna/summary-actions.test.ts`
Expected: PASS (22 tests, unchanged from Step 1's baseline)

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors (confirms no leftover unused imports or type mismatches from the refactor)

- [ ] **Step 5: Commit**

```bash
git add web/src/app/\(app\)/admin/coach-dna/summary-actions.ts
git commit -m "refactor(coach-dna): generateSelfAssessmentSummary uses computeBlendedArchetype"
```

---

## Task 4: Add `ensureFreshSummary`

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`

**Interfaces:**
- Consumes: `computeBlendedArchetype` (Task 1), `hasBlendedFeedback`/`sourcedCategoriesEqual` (Task 2), `isCurrentSummaryShape` (`@/lib/coach-dna/summary-shape`, existing), `generateSelfAssessmentSummary` (same file).
- Produces: `ensureFreshSummary(attemptId: string, coachId: string): Promise<SelfAssessmentSummary>`. Task 5 (complete page), Task 8 (image route), and Task 10 (hub page) all call this.

- [ ] **Step 1: Add the new mock support and failing tests to `summary-actions.test.ts`**

Add `sourcedCategoriesEqualMock` is not needed (real implementation is fast/pure — use it directly, don't mock it). Add a `cachedAiSummary` field to the shared `state` object and extend the `coach_profiles` branch of the `@/lib/supabase/server` mock to support a read as well as the existing `upsert`. In `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`:

Change the `state` declaration's type and initial value (add one field):

```ts
const state: {
  user: { id: string } | null
  role: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  responses: { question_id: string; selected_option: string | null; least_option: string | null }[]
  responsesError: { message: string } | null
  options: { id: string; question_id: string; category_weights_json: Record<string, number> }[]
  optionsError: { message: string } | null
  aiText: string
  upsertError: { message: string } | null
  blendInputs: Record<string, { source: string; responses: { value: number; submittedAt: string }[] }[]>
  cachedAiSummary: unknown
} = {
  user: null,
  role: 'admin',
  attempt: null,
  responses: [],
  responsesError: null,
  options: [],
  optionsError: null,
  aiText: '',
  upsertError: null,
  blendInputs: {},
  cachedAiSummary: null,
}
```

Change the `coach_profiles` branch inside the `@/lib/supabase/server` mock's `from()`:

```ts
      if (table === 'coach_profiles') {
        return {
          upsert: upsertMock,
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.cachedAiSummary ? { ai_summary: state.cachedAiSummary } : null }) }) }),
        }
      }
```

Add `state.cachedAiSummary = null` to the existing `beforeEach`.

Then add a new describe block at the end of the file (before the final closing of the outer `describe('generateSelfAssessmentSummary', ...)`, or as its own top-level `describe` — either works since the mocks are shared at module scope):

```ts
describe('ensureFreshSummary', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.responses = [{ question_id: 'q1', selected_option: 'opt-1', least_option: 'opt-2' }]
    state.responsesError = null
    state.options = [
      { id: 'opt-1', question_id: 'q1', category_weights_json: { teacher: 100 } },
      { id: 'opt-2', question_id: 'q1', category_weights_json: { motivator: 100 } },
    ]
    state.optionsError = null
    state.aiText = JSON.stringify({
      narrative: 'You lead with clarity and patience.',
      pros: [
        { categorySlug: 'Teacher', text: 'You explain things well.' },
        { categorySlug: 'nonsense', text: 'Your detail work is sharp.' },
        { categorySlug: '', text: 'You lift the room.' },
      ],
      cons: [
        { categorySlug: 'Culture Builder', text: 'Set the tone more explicitly.' },
        { categorySlug: 'nonsense', text: 'Sessions could run tighter.' },
        { categorySlug: '', text: 'Say less, say it clearer.' },
      ],
    })
    state.upsertError = null
    state.blendInputs = {}
    state.cachedAiSummary = null
    upsertMock.mockClear()
    fetchBlendInputsMock.mockClear()
  })

  it('throws when the attempt does not belong to the coach', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: '2026-08-06T00:00:00.000Z' }
    await expect(ensureFreshSummary('attempt-1', 'coach-1')).rejects.toThrow()
  })

  it('throws when the attempt is not completed', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: null }
    await expect(ensureFreshSummary('attempt-1', 'coach-1')).rejects.toThrow()
  })

  it('generates and persists a new summary when nothing is cached yet', async () => {
    state.cachedAiSummary = null
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.primaryType).toBe('teacher')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('regenerates when the cached summary has a stale (pre-resources) shape', async () => {
    state.cachedAiSummary = {
      primaryType: 'teacher',
      secondaryType: null,
      narrative: 'old',
      pros: [{ categorySlug: 'teacher', text: 'old' }],
      cons: [{ categorySlug: 'motivator', text: 'old' }], // missing `resources` -> stale shape
      sourcedCategories: { teacher: ['self'], motivator: ['self'] },
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('returns the cached summary without generating when sourcedCategories already match', async () => {
    state.cachedAiSummary = {
      primaryType: 'teacher',
      secondaryType: null,
      narrative: 'cached narrative',
      pros: [{ categorySlug: 'teacher', text: 'cached' }],
      cons: [{ categorySlug: 'motivator', text: 'cached', resources: [] }],
      sourcedCategories: { teacher: ['self'], technician: ['self'], motivator: ['self'], developer: ['self'], 'game-manager': ['self'], communicator: ['self'], organiser: ['self'], 'culture-builder': ['self'] },
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('cached narrative')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('regenerates when new feedback has blended into a category the cache does not reflect', async () => {
    state.cachedAiSummary = {
      primaryType: 'teacher',
      secondaryType: null,
      narrative: 'cached narrative',
      pros: [{ categorySlug: 'teacher', text: 'cached' }],
      cons: [{ categorySlug: 'motivator', text: 'cached', resources: [] }],
      sourcedCategories: { teacher: ['self'], technician: ['self'], motivator: ['self'], developer: ['self'], 'game-manager': ['self'], communicator: ['self'], organiser: ['self'], 'culture-builder': ['self'] },
    }
    // New player_voice feedback clears the threshold for `motivator` -- the cache above doesn't reflect this yet.
    state.blendInputs = {
      motivator: [{ source: 'player_voice', responses: [
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
        { value: 100, submittedAt: '2026-08-01T00:00:00.000Z' },
      ] }],
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })
})
```

Add the import at the top of the file alongside the existing `generateSelfAssessmentSummary` import:

```ts
import { generateSelfAssessmentSummary, ensureFreshSummary } from './summary-actions'
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd web && npx vitest run src/app/\(app\)/admin/coach-dna/summary-actions.test.ts`
Expected: FAIL — `ensureFreshSummary` is not exported yet.

- [ ] **Step 3: Implement `ensureFreshSummary`**

Add to `web/src/app/(app)/admin/coach-dna/summary-actions.ts` (new imports alongside the existing ones, and the new export at the end of the file):

```ts
import { isCurrentSummaryShape } from '@/lib/coach-dna/summary-shape'
import { sourcedCategoriesEqual } from '@/lib/coach-dna/blend-status'
```

```ts
/** Returns the cached summary if it already reflects current feedback data,
 *  otherwise regenerates it (one AI call) first. Does not perform its own
 *  auth/role check -- callers (the hub page, the /complete page, the card
 *  image route) already ran theirs before calling this, and this function's
 *  call path is reachable from a Route Handler where redirect() does not
 *  behave correctly. Only the data-level ownership/completed-at check is
 *  this function's own responsibility. */
export async function ensureFreshSummary(attemptId: string, coachId: string): Promise<SelfAssessmentSummary> {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== coachId || !attempt.completed_at) {
    throw new Error('This attempt is not a completed attempt belonging to this coach')
  }

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_summary')
    .eq('user_id', coachId)
    .maybeSingle()
  const cached = coachProfile?.ai_summary as SelfAssessmentSummary | null

  const { sourcedCategories } = await computeBlendedArchetype(
    supabase,
    serviceSupabase,
    attemptId,
    coachId,
    attempt.completed_at,
  )

  if (cached && isCurrentSummaryShape(cached) && sourcedCategoriesEqual(cached.sourcedCategories, sourcedCategories)) {
    return cached
  }

  return generateSelfAssessmentSummary(attemptId)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/app/\(app\)/admin/coach-dna/summary-actions.test.ts`
Expected: PASS (28 tests: 22 existing + 6 new)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add web/src/app/\(app\)/admin/coach-dna/summary-actions.ts web/src/app/\(app\)/admin/coach-dna/summary-actions.test.ts
git commit -m "feat(coach-dna): add ensureFreshSummary to auto-refresh stale blended summaries"
```

---

## Task 5: Wire `ensureFreshSummary` into the `/complete` page

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`

**Interfaces:**
- Consumes: `ensureFreshSummary` (Task 4).

No test file exists for this page today (it's a Server Component with no prior coverage) and this task does not add one — it swaps which function is called but does not add any new branch or conditional to the page itself; `ensureFreshSummary`'s own behavior is already fully covered by Task 4's tests.

- [ ] **Step 1: Replace the summary-fetch block**

In `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`, remove the `generateSelfAssessmentSummary` import and the manual cache-check block:

```ts
  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_summary')
    .eq('user_id', user.id)
    .maybeSingle()

  let summary: SelfAssessmentSummary
  let generationFailed = false
  if (coachProfile?.ai_summary && isCurrentSummaryShape(coachProfile.ai_summary)) {
    summary = coachProfile.ai_summary
  } else {
    // The auth/ownership/completed-at checks above already redirect for every
    // condition generateSelfAssessmentSummary itself also redirects on, so by
    // this point the only realistic throw is a genuine generation failure
    // (Groq call, JSON parse, or DB write) — safe to catch broadly here.
    // Still, if generateSelfAssessmentSummary's own redirect() conditions ever
    // drift out of sync with this page's guards, unstable_rethrow ensures a
    // real Next.js redirect propagates instead of being swallowed as a
    // generation failure.
    try {
      summary = await generateSelfAssessmentSummary(attemptId)
    } catch (err) {
      unstable_rethrow(err)
      console.error('[coach-dna] Failed to generate summary:', err)
      generationFailed = true
      summary = { primaryType: '', secondaryType: null, narrative: '', pros: [], cons: [] }
    }
  }
```

with:

```ts
  let summary: SelfAssessmentSummary
  let generationFailed = false
  try {
    summary = await ensureFreshSummary(attemptId, user.id)
  } catch (err) {
    unstable_rethrow(err)
    console.error('[coach-dna] Failed to generate summary:', err)
    generationFailed = true
    summary = { primaryType: '', secondaryType: null, narrative: '', pros: [], cons: [] }
  }
```

Update the import at the top of the file: replace

```ts
import { generateSelfAssessmentSummary } from '../../../summary-actions'
```

with

```ts
import { ensureFreshSummary } from '../../../summary-actions'
```

Also remove the now-unused `isCurrentSummaryShape` import if nothing else on the page uses it (check the rest of the file — `allCategoriesSelfOnly` and `sourceTagFor` from `@/lib/coach-dna/source-label` are unrelated and stay).

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors (confirms the import cleanup left nothing dangling)

- [ ] **Step 3: Manually verify in the browser**

Start the dev server if not already running (`cd web && npm run dev`), sign in, and visit `/admin/coach-dna/assessment/<a completed attempt id>/complete`. Confirm the page renders exactly as before (this is a pure refactor of which function supplies `summary`, not a visual change).

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx"
git commit -m "refactor(coach-dna): /complete page uses ensureFreshSummary, never stale"
```

---

## Task 6: `buildCardData`

**Files:**
- Create: `web/src/lib/coach-dna/card-data.ts`
- Test: `web/src/lib/coach-dna/card-data.test.ts`

**Interfaces:**
- Consumes: `labelFor` (`./categories`, existing), `SelfAssessmentSummary` (`@/lib/supabase/types`, existing).
- Produces: `buildCardData(summary: SelfAssessmentSummary): CoachDnaCardData` where `CoachDnaCardData = { primaryLabel: string; secondaryLabel: string | null; topStrengthLabel: string | null; focusAreaLabel: string | null }`. Task 8 (image route) uses this.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/card-data.test.ts
import { describe, it, expect } from 'vitest'
import { buildCardData } from './card-data'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const BASE_SUMMARY: SelfAssessmentSummary = {
  primaryType: 'motivator',
  secondaryType: null,
  narrative: '',
  pros: [],
  cons: [],
}

describe('buildCardData', () => {
  it('labels the primary type and omits secondary when absent', () => {
    const data = buildCardData(BASE_SUMMARY)
    expect(data.primaryLabel).toBe('Motivator')
    expect(data.secondaryLabel).toBeNull()
  })

  it('labels the secondary type when present', () => {
    const data = buildCardData({ ...BASE_SUMMARY, secondaryType: 'organiser' })
    expect(data.secondaryLabel).toBe('Organiser')
  })

  it('labels the top strength and focus area from the first pro/con', () => {
    const data = buildCardData({
      ...BASE_SUMMARY,
      pros: [{ categorySlug: 'communicator', text: '...' }],
      cons: [{ categorySlug: 'game-manager', text: '...', resources: [] }],
    })
    expect(data.topStrengthLabel).toBe('Communicator')
    expect(data.focusAreaLabel).toBe('Game Manager')
  })

  it('returns null strength/focus when pros/cons are empty', () => {
    const data = buildCardData(BASE_SUMMARY)
    expect(data.topStrengthLabel).toBeNull()
    expect(data.focusAreaLabel).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/coach-dna/card-data.test.ts`
Expected: FAIL — `card-data.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/card-data.ts
import { labelFor } from './categories'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

export interface CoachDnaCardData {
  primaryLabel: string
  secondaryLabel: string | null
  topStrengthLabel: string | null
  focusAreaLabel: string | null
}

/** The handful of facts the branded result-card image shows -- the same
 *  three facts the hub page's condensed snapshot leads with, so the card
 *  and the page always agree. */
export function buildCardData(summary: SelfAssessmentSummary): CoachDnaCardData {
  return {
    primaryLabel: labelFor(summary.primaryType),
    secondaryLabel: summary.secondaryType ? labelFor(summary.secondaryType) : null,
    topStrengthLabel: summary.pros[0] ? labelFor(summary.pros[0].categorySlug) : null,
    focusAreaLabel: summary.cons[0] ? labelFor(summary.cons[0].categorySlug) : null,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/coach-dna/card-data.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/card-data.ts web/src/lib/coach-dna/card-data.test.ts
git commit -m "feat(coach-dna): add buildCardData for the result-card image"
```

---

## Task 7: `loadGoogleFont`

**Files:**
- Create: `web/src/lib/coach-dna/google-font.ts`
- Test: `web/src/lib/coach-dna/google-font.test.ts`

**Interfaces:**
- Consumes: global `fetch`.
- Produces: `loadGoogleFont(family: string, text: string): Promise<ArrayBuffer>`. Task 8 (image route) uses this to get real Barlow Condensed bytes for `ImageResponse`'s `fonts` option (`next/font/google` only produces CSS `@font-face` rules for the DOM, not usable font bytes for Satori).

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/google-font.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadGoogleFont } from './google-font'

describe('loadGoogleFont', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('extracts the truetype font url from the CSS2 response and returns its bytes', async () => {
    const fontBytes = new ArrayBuffer(8)
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `@font-face { font-family: 'Barlow Condensed'; src: url(https://fonts.gstatic.com/font.ttf) format('truetype'); }`,
      })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => fontBytes })

    const result = await loadGoogleFont('Barlow Condensed:ital,wght@1,800', 'Motivator')

    expect(result).toBe(fontBytes)
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://fonts.gstatic.com/font.ttf')
  })

  it('throws when the CSS response is not ok', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce({ ok: false })
    await expect(loadGoogleFont('Barlow Condensed', 'x')).rejects.toThrow('Could not load font CSS')
  })

  it('throws when no truetype/opentype source is found in the CSS', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce({ ok: true, text: async () => 'nonsense' })
    await expect(loadGoogleFont('Barlow Condensed', 'x')).rejects.toThrow('Could not find a truetype/opentype source')
  })

  it('throws when the font file download fails', async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: async () => `src: url(https://fonts.gstatic.com/font.ttf) format('truetype');` })
      .mockResolvedValueOnce({ ok: false })
    await expect(loadGoogleFont('Barlow Condensed', 'x')).rejects.toThrow('Could not download font file')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/coach-dna/google-font.test.ts`
Expected: FAIL — `google-font.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/google-font.ts
/** Fetches a Google Font's TTF/OTF bytes at request time for use with
 *  next/og's ImageResponse, which needs real font bytes -- a next/font/google
 *  import only produces a CSS @font-face rule for the browser, not usable
 *  bytes here. Google's CSS2 endpoint returns a `truetype`/`opentype`
 *  @font-face src for a plain server-side fetch (no browser User-Agent to
 *  negotiate woff2 against) -- the same technique Vercel's own OG-image
 *  examples use, so no font file needs to be vendored into the repo. */
export async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`
  const cssRes = await fetch(cssUrl)
  if (!cssRes.ok) throw new Error(`Could not load font CSS for ${family}`)
  const css = await cssRes.text()

  const match = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/)
  if (!match) throw new Error(`Could not find a truetype/opentype source for ${family}`)

  const fontRes = await fetch(match[1])
  if (!fontRes.ok) throw new Error(`Could not download font file for ${family}`)
  return fontRes.arrayBuffer()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/coach-dna/google-font.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/google-font.ts web/src/lib/coach-dna/google-font.test.ts
git commit -m "feat(coach-dna): add loadGoogleFont for real Barlow Condensed bytes in ImageResponse"
```

---

## Task 8: Card image Route Handler

**Files:**
- Create: `web/src/app/api/coach-dna/card-image/[attemptId]/route.tsx`
- Test: `web/src/app/api/coach-dna/card-image/[attemptId]/route.test.ts`

**Interfaces:**
- Consumes: `ensureFreshSummary` (Task 4, imported from `@/app/(app)/admin/coach-dna/summary-actions`), `hasBlendedFeedback` (Task 2), `buildCardData` (Task 6), `loadGoogleFont` (Task 7), `ImageResponse` (`next/og`), `createClient` (`@/lib/supabase/server`, existing).
- Produces: `GET(request, { params }): Promise<Response>` at `/api/coach-dna/card-image/[attemptId]`. Task 9's `CoachDnaCardDialog` points its `<img>`/download link at this URL.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/app/api/coach-dna/card-image/[attemptId]/route.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  summary: {
    primaryType: string
    secondaryType: string | null
    narrative: string
    pros: { categorySlug: string; text: string }[]
    cons: { categorySlug: string; text: string; resources: unknown[] }[]
    sourcedCategories?: Record<string, string[]>
  } | null
  ensureFreshSummaryError: Error | null
} = {
  user: null,
  role: null,
  attempt: null,
  summary: null,
  ensureFreshSummaryError: null,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: () => ({ single: async () => ({ data: state.role === null ? null : { role: state.role } }) }) }) }
      if (table === 'assessment_attempts') return { select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }) }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

const ensureFreshSummaryMock = vi.fn(async () => {
  if (state.ensureFreshSummaryError) throw state.ensureFreshSummaryError
  return state.summary
})
vi.mock('@/app/(app)/admin/coach-dna/summary-actions', () => ({
  ensureFreshSummary: (...args: unknown[]) => ensureFreshSummaryMock(...args),
}))

vi.mock('@/lib/coach-dna/google-font', () => ({
  loadGoogleFont: async () => new ArrayBuffer(8),
}))

const imageResponseMock = vi.fn((_el: unknown, opts: unknown) => new Response(null, { status: 200 }))
vi.mock('next/og', () => ({
  ImageResponse: (...args: [unknown, unknown]) => imageResponseMock(...args),
}))

import { GET } from './route'

function makeRequest(attemptId: string) {
  return GET(new Request(`http://localhost/api/coach-dna/card-image/${attemptId}`), {
    params: Promise.resolve({ attemptId }),
  })
}

describe('GET /api/coach-dna/card-image/[attemptId]', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.summary = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: '',
      pros: [{ categorySlug: 'communicator', text: '...' }],
      cons: [{ categorySlug: 'game-manager', text: '...', resources: [] }],
      sourcedCategories: { motivator: ['self', 'player_voice'] },
    }
    state.ensureFreshSummaryError = null
    ensureFreshSummaryMock.mockClear()
    imageResponseMock.mockClear()
  })

  it('returns 401 when there is no authenticated user', async () => {
    state.user = null
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(401)
    expect(ensureFreshSummaryMock).not.toHaveBeenCalled()
  })

  it('returns 403 for a viewer role', async () => {
    state.role = 'viewer'
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(403)
  })

  it('returns 404 when the attempt does not belong to the caller', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: '2026-08-06T00:00:00.000Z' }
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(404)
    expect(ensureFreshSummaryMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the attempt is not completed', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: null }
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(404)
  })

  it('returns 404 when the summary is not blended (self-only)', async () => {
    state.summary!.sourcedCategories = { motivator: ['self'] }
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(404)
    expect(imageResponseMock).not.toHaveBeenCalled()
  })

  it('generates a 1200x630 image with Barlow Condensed for a blended profile', async () => {
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(200)
    expect(imageResponseMock).toHaveBeenCalledTimes(1)
    const opts = imageResponseMock.mock.calls[0][1] as { width: number; height: number; fonts: { name: string }[] }
    expect(opts.width).toBe(1200)
    expect(opts.height).toBe(630)
    expect(opts.fonts[0].name).toBe('Barlow Condensed')
  })

  it('returns 500 when ensureFreshSummary throws', async () => {
    state.ensureFreshSummaryError = new Error('groq down')
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/app/api/coach-dna/card-image`
Expected: FAIL — `route.tsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
// web/src/app/api/coach-dna/card-image/[attemptId]/route.tsx
import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { ensureFreshSummary } from '@/app/(app)/admin/coach-dna/summary-actions'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'
import { buildCardData } from '@/lib/coach-dna/card-data'
import { loadGoogleFont } from '@/lib/coach-dna/google-font'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'coach') {
      return new Response('Forbidden', { status: 403 })
    }

    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, coach_id, completed_at')
      .eq('id', attemptId)
      .single()
    if (!attempt || attempt.coach_id !== user.id || !attempt.completed_at) {
      return new Response('Not Found', { status: 404 })
    }

    const summary = await ensureFreshSummary(attemptId, user.id)
    if (!hasBlendedFeedback(summary.sourcedCategories)) {
      return new Response('Not Found', { status: 404 })
    }

    const card = buildCardData(summary)
    const headlineText = `${card.primaryLabel}${card.secondaryLabel ? ` / ${card.secondaryLabel}` : ''}`
    const barlowCondensed = await loadGoogleFont(
      'Barlow Condensed:ital,wght@1,800',
      `${headlineText}COACH DNA`,
    )

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#151517',
            padding: 64,
            color: '#f4f4f5',
            fontFamily: 'Geist, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#e8560a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                color: 'white',
              }}
            >
              18
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>18TH MAN</span>
              <span style={{ fontSize: 10, color: '#a1a1aa', letterSpacing: 3 }}>RUGBY LEAGUE</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 6, color: '#e8560a', fontWeight: 700 }}>
              Coach DNA
            </span>
            <span
              style={{
                fontFamily: 'Barlow Condensed',
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 72,
                textTransform: 'uppercase',
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              {headlineText}
            </span>
            <div style={{ display: 'flex', gap: 48 }}>
              {card.topStrengthLabel && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#34d399', fontWeight: 700 }}>
                    Top strength
                  </span>
                  <span style={{ fontSize: 26, fontWeight: 700 }}>{card.topStrengthLabel}</span>
                </div>
              )}
              {card.focusAreaLabel && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#fb923c', fontWeight: 700 }}>
                    Development focus
                  </span>
                  <span style={{ fontSize: 26, fontWeight: 700 }}>{card.focusAreaLabel}</span>
                </div>
              )}
            </div>
          </div>

          <span style={{ fontSize: 12, color: '#71717a' }}>18thman.app · Coach DNA</span>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [{ name: 'Barlow Condensed', data: barlowCondensed, weight: 800, style: 'italic' }],
      },
    )
  } catch (err) {
    console.error('[coach-dna/card-image] Failed to generate card image:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/app/api/coach-dna/card-image`
Expected: PASS (7 tests)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Manually verify the real image renders**

With the dev server running and signed in as a coach with a blended profile (from the earlier feedback test data, if still present), open `http://localhost:3000/api/coach-dna/card-image/<attemptId>` directly in a browser tab. Confirm a real 1200×630 PNG renders with the Barlow Condensed headline, top strength, development focus, and the "18TH MAN" brand mark — this is the one step in this plan that needs a live look, since `ImageResponse`/Satori's actual pixel output isn't something the mocked unit test can verify.

- [ ] **Step 7: Commit**

```bash
git add "web/src/app/api/coach-dna/card-image/[attemptId]/route.tsx" "web/src/app/api/coach-dna/card-image/[attemptId]/route.test.ts"
git commit -m "feat(coach-dna): add branded Coach DNA card image Route Handler"
```

---

## Task 9: `CoachDnaCardDialog` component

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.tsx`
- Test: `web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.test.tsx`

**Interfaces:**
- Consumes: `Dialog`/`DialogContent`/`DialogTitle` (`@/components/ui/dialog`, existing), `Button` (`@/components/ui/button`, existing).
- Produces: `<CoachDnaCardDialog attemptId={string} />` — a self-contained client component. Task 10 renders this on the hub page.

- [ ] **Step 1: Write the failing tests**

```tsx
// web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CoachDnaCardDialog } from './CoachDnaCardDialog'

describe('CoachDnaCardDialog', () => {
  it('shows the trigger button and keeps the dialog closed initially', () => {
    render(<CoachDnaCardDialog attemptId="attempt-1" />)
    expect(screen.getByRole('button', { name: 'View my Coach DNA card' })).toBeInTheDocument()
    expect(screen.queryByAltText('Your Coach DNA card')).not.toBeInTheDocument()
  })

  it('opens the dialog with the card image and a download link on click', () => {
    render(<CoachDnaCardDialog attemptId="attempt-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'View my Coach DNA card' }))

    const img = screen.getByAltText('Your Coach DNA card') as HTMLImageElement
    expect(img.src).toContain('/api/coach-dna/card-image/attempt-1')

    const downloadLink = screen.getByRole('link', { name: 'Download' })
    expect(downloadLink).toHaveAttribute('href', '/api/coach-dna/card-image/attempt-1')
    expect(downloadLink).toHaveAttribute('download', 'coach-dna-card.png')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/CoachDnaCardDialog.test.tsx"`
Expected: FAIL — `CoachDnaCardDialog.tsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```tsx
// web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export function CoachDnaCardDialog({ attemptId }: { attemptId: string }) {
  const [open, setOpen] = useState(false)
  const imageUrl = `/api/coach-dna/card-image/${attemptId}`

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        View my Coach DNA card
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 bg-black border-zinc-800 overflow-hidden">
          <DialogTitle className="sr-only">Your Coach DNA card</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- server-generated image, not a static asset next/image can optimize */}
          <img src={imageUrl} alt="Your Coach DNA card" className="w-full h-auto block" />
          <div className="p-4 flex justify-end">
            <Button render={<a href={imageUrl} download="coach-dna-card.png" />}>
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/CoachDnaCardDialog.test.tsx"`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.tsx" "web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.test.tsx"
git commit -m "feat(coach-dna): add CoachDnaCardDialog for viewing/downloading the result card"
```

---

## Task 10: Wire it all into the hub page

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/page.test.tsx`

**Interfaces:**
- Consumes: `ensureFreshSummary` (Task 4), `hasBlendedFeedback` (Task 2), `CoachDnaCardDialog` (Task 9), `SelfAssessmentSummary` (`@/lib/supabase/types`, existing).

- [ ] **Step 1: Update `page.tsx`'s summary section**

Replace the inline `summary` type and its population block:

```ts
  let summary: { primaryType: string; secondaryType: string | null; narrative: string; pros: { categorySlug: string; text: string }[]; cons: { categorySlug: string; text: string }[] } | null = null
  if (completed) {
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('ai_summary')
      .eq('user_id', user.id)
      .maybeSingle()
    if (coachProfile?.ai_summary && isCurrentSummaryShape(coachProfile.ai_summary)) {
      summary = coachProfile.ai_summary
    }
  }
```

with:

```ts
  let summary: SelfAssessmentSummary | null = null
  if (completed) {
    try {
      summary = await ensureFreshSummary(completed.id, user.id)
    } catch (err) {
      // ensureFreshSummary can throw (no responses / stale attempt format /
      // a Groq failure regenerating a stale summary). The hub page stays
      // fast and never shows an error for this -- fall back to whatever's
      // already cached, same as before this feature existed. The coach can
      // still reach /complete, which surfaces a real error via its own
      // generationFailed UI and RetryGenerateButton.
      console.error('[coach-dna] Failed to refresh summary on hub page:', err)
      const { data: coachProfile } = await supabase
        .from('coach_profiles')
        .select('ai_summary')
        .eq('user_id', user.id)
        .maybeSingle()
      if (coachProfile?.ai_summary && isCurrentSummaryShape(coachProfile.ai_summary)) {
        summary = coachProfile.ai_summary
      }
    }
  }
```

Update the imports at the top of the file: add

```ts
import { ensureFreshSummary } from './summary-actions'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'
import { CoachDnaCardDialog } from './CoachDnaCardDialog'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'
```

- [ ] **Step 2: Add the card button to the condensed-snapshot JSX**

Immediately after the existing "View full breakdown" `<Link>` (still inside the `completed && summary` branch's `space-y-4` div), add:

```tsx
                {hasBlendedFeedback(summary.sourcedCategories) && (
                  <CoachDnaCardDialog attemptId={completed.id} />
                )}
```

So that branch's closing lines read:

```tsx
                <Link
                  href={`/admin/coach-dna/assessment/${completed.id}/complete`}
                  className="group inline-flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
                >
                  View full breakdown
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                {hasBlendedFeedback(summary.sourcedCategories) && (
                  <CoachDnaCardDialog attemptId={completed.id} />
                )}
              </div>
```

- [ ] **Step 3: Update `page.test.tsx`'s mocks and add new tests**

The existing test file drives the `completed`/summary state entirely through raw Supabase mocks (`coach_profiles.select`). Since the page now calls `ensureFreshSummary` instead, replace that with a direct mock of the function, matching Task 8's pattern.

At the top of `web/src/app/(app)/admin/coach-dna/page.test.tsx`, change the `state` object: remove `aiSummary` and add:

```ts
  ensureFreshSummaryResult: unknown
  ensureFreshSummaryError: Error | null
  fallbackCachedAiSummary: unknown
```

with initial values `null`, `null`, `null` respectively (replacing the old `aiSummary: null` line), and clear `state.ensureFreshSummaryError = null` / reset the other two in the existing `beforeEach` alongside the other resets.

Add the mock (near the top, alongside the existing `vi.mock('next/navigation', ...)` and `vi.mock('@/lib/supabase/server', ...)` calls):

```ts
const ensureFreshSummaryMock = vi.fn(async () => {
  if (state.ensureFreshSummaryError) throw state.ensureFreshSummaryError
  return state.ensureFreshSummaryResult
})
vi.mock('./summary-actions', () => ({
  ensureFreshSummary: (...args: unknown[]) => ensureFreshSummaryMock(...args),
  startAssessment: () => {
    throw new Error('startAssessment should not be called by these tests')
  },
}))
```

Update the `coach_profiles` branch of the `@/lib/supabase/server` mock's `from()` (used only by the fallback path now) to read `state.fallbackCachedAiSummary` instead of `state.aiSummary`:

```ts
      if (table === 'coach_profiles') return makeQuery({ ai_summary: state.fallbackCachedAiSummary })
```

In the existing test `'renders a condensed snapshot when completed with a valid summary'`, change the setup line from `state.aiSummary = {...}` to `state.ensureFreshSummaryResult = {...}` (same object shape — this only changes which mock supplies it; add a `sourcedCategories: { motivator: ['self'] }` field to that object so it's a well-formed, self-only summary). Its assertions are unchanged.

**Remove** the existing test `'falls back to the plain results button when no valid summary has been generated yet'` entirely. It no longer corresponds to a real page-level scenario: `ensureFreshSummary` never returns "nothing" — with nothing cached, it generates and returns a real summary (or throws). That "generate the very first summary" case is already covered by Task 4's `ensureFreshSummary` test `'generates and persists a new summary when nothing is cached yet'`; testing it again here would just be asserting the mock returns what the mock was told to return.

**Replace** the existing test `'falls back to the plain results button for a stale summary shape'` — its original scenario (a cached summary missing `resources`) is now `ensureFreshSummary`'s own responsibility (already covered by Task 4's `'regenerates when the cached summary has a stale (pre-resources) shape'` test) and can no longer be observed from the page, since the page only ever sees `ensureFreshSummary`'s already-validated return value. Repurpose this test slot for the page's *own* new behavior instead — its fallback branch's `isCurrentSummaryShape` check on the directly-read cached value:

```ts
  it('falls back to the plain results button when ensureFreshSummary fails and nothing valid is cached', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryError = new Error('groq down')
    state.fallbackCachedAiSummary = null

    render(await CoachDnaPage())

    expect(screen.getByRole('button', { name: 'View your results' })).toBeInTheDocument()
  })

  it('falls back to the plain results button when ensureFreshSummary fails and the cached fallback has a stale shape', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryError = new Error('groq down')
    // Missing `resources` on cons marks this as a pre-growth-resources shape --
    // the fallback branch's own isCurrentSummaryShape check must reject it too.
    state.fallbackCachedAiSummary = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: '',
      pros: [],
      cons: [{ categorySlug: 'game-manager', text: 'Work on game management' }],
    }

    render(await CoachDnaPage())

    expect(screen.getByRole('button', { name: 'View your results' })).toBeInTheDocument()
  })
```

Add three more new tests after the condensed-snapshot test:

```ts
  it('shows the Coach DNA card button when feedback has blended in', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: 'technician',
      narrative: 'You build trust fast.',
      pros: [{ categorySlug: 'communicator', text: 'Great communicator' }],
      cons: [{ categorySlug: 'game-manager', text: 'Work on game management', resources: [] }],
      sourcedCategories: { motivator: ['self', 'player_voice'] },
    }

    render(await CoachDnaPage())

    expect(screen.getByRole('button', { name: 'View my Coach DNA card' })).toBeInTheDocument()
  })

  it('hides the Coach DNA card button for a self-only summary', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: 'You build trust fast.',
      pros: [{ categorySlug: 'communicator', text: 'Great communicator' }],
      cons: [{ categorySlug: 'game-manager', text: 'Work on game management', resources: [] }],
      sourcedCategories: { motivator: ['self'] },
    }

    render(await CoachDnaPage())

    expect(screen.queryByRole('button', { name: 'View my Coach DNA card' })).not.toBeInTheDocument()
  })

  it('still shows the card button off a fallback-cached summary that is itself already blended', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryError = new Error('groq down')
    state.fallbackCachedAiSummary = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: 'Cached narrative.',
      pros: [{ categorySlug: 'communicator', text: 'Great communicator' }],
      cons: [{ categorySlug: 'game-manager', text: 'Work on game management', resources: [] }],
      sourcedCategories: { motivator: ['self', 'player_voice'] },
    }

    render(await CoachDnaPage())

    expect(screen.getByText(/You're a Motivator coach/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View my Coach DNA card' })).toBeInTheDocument()
  })
```

This last test documents the actual, simple behavior on purpose: the button's `hasBlendedFeedback(summary.sourcedCategories)` check runs uniformly on whichever value ends up in `summary`, whether it came from `ensureFreshSummary` or the fallback read — there is no separate "was this freshly verified" flag. A previously-generated, genuinely blended cached summary is still real data worth showing the button for, even on a request where the refresh attempt itself failed (e.g. a transient Groq outage). The one real consequence — the image Route Handler (Task 8) calls `ensureFreshSummary` again and would hit the same failure, returning `500` — degrades to a broken image in the modal, not a crash, which is an acceptable rare edge case rather than something worth adding special-case code for here.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/page.test.tsx"`
Expected: PASS (15 tests: 12 existing minus the 1 removed test, plus 2 tests replacing the old stale-shape test, plus 3 more new tests = 15)

- [ ] **Step 5: Typecheck and lint**

Run: `cd web && npx tsc --noEmit && npx eslint "src/app/(app)/admin/coach-dna/page.tsx" "src/app/(app)/admin/coach-dna/page.test.tsx"`
Expected: no errors

- [ ] **Step 6: Run the mechanical design detector**

Run: `node .claude/skills/impeccable/scripts/detect.mjs --json "web/src/app/(app)/admin/coach-dna/page.tsx" "web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.tsx"` (from the repo root)
Expected: `[]` or only findings you can justify — fix anything real before moving on (see the design-hook conventions already used earlier in this project's history: prefer the existing `text-xs` micro-label scale over inventing arbitrary sizes).

- [ ] **Step 7: Manually verify the full flow in the browser**

With the dev server running, signed in as a coach with a blended profile (from the earlier test feedback data, if still present): visit `/admin/coach-dna`, confirm the "View my Coach DNA card" button appears on the self-assessment card, click it, confirm the modal opens with the generated image and a working Download button.

- [ ] **Step 8: Run the full test suite**

Run: `cd web && npm run test`
Expected: all tests pass, no regressions anywhere else in the app.

- [ ] **Step 9: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/page.tsx" "web/src/app/(app)/admin/coach-dna/page.test.tsx"
git commit -m "feat(coach-dna): auto-refresh hub summary and offer the Coach DNA card once blended"
```

---

## Self-Review Notes

- **Spec coverage:** Part 1 → Task 1. Part 2 → Tasks 2, 4. Part 3 → Task 10. Part 4 → Tasks 6, 7, 8. Security section → Task 8's ownership/role/blended checks (steps re-derived server-side, never trusting the client). Out-of-scope items (no change to `computeCategoryScore`/`fetchBlendInputs`/`archetype.ts`, no public sharing, no `/complete` visual change) are respected — Tasks 1 and 5 explicitly reuse those modules unchanged.
- **Deviation from the spec, disclosed:** Part 4 of the spec described vendoring a local `.ttf` file read via `fs.readFile`. Task 7 instead fetches the font from Google's CSS2 endpoint at request time (`loadGoogleFont`) — this avoids needing a binary font file checked into the repo, is the same technique Vercel's own `next/og` examples use, and still satisfies the underlying requirement (real Barlow Condensed bytes passed to `ImageResponse`'s `fonts` option). The 500KB bundle-budget constraint from the spec still applies to the JSX/CSS/images `ImageResponse` bundles at build time — the font itself is fetched separately at request time and passed as `ArrayBuffer` data, not bundled, so this also *reduces* bundle-budget risk relative to the vendored-file approach.
- **Type consistency:** `computeBlendedArchetype`'s signature (Task 1) is used identically in Task 3's refactor and Task 4's `ensureFreshSummary`. `ensureFreshSummary(attemptId, coachId)`'s two-argument signature (Task 4) is used identically by Task 5 (`ensureFreshSummary(attemptId, user.id)`), Task 8 (`ensureFreshSummary(attemptId, user.id)`), and Task 10 (`ensureFreshSummary(completed.id, user.id)`). `hasBlendedFeedback`'s single `Record<string, string[]> | undefined` parameter (Task 2) matches `SelfAssessmentSummary['sourcedCategories']`'s real persisted type exactly, so Tasks 8 and 10 pass it straight through with no casting.
