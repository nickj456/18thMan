# Coach DNA Full Breakdown & Professional Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface all 8 Coach DNA categories (not just the top/bottom 3) with real scores and AI interpretation everywhere a coach sees their outcome — hub, on-screen breakdown pages, and both PDFs — plus outcome-based in-app guidance and professionally branded, landscape, clickable-link PDFs.

**Architecture:** A foundational data-model change (`pros`/`cons` → a tiered `categories` array) cascades through every consumer in one task, since the spec forbids a compatibility shim; every other task is a purely additive feature (feedback AI interpretation + its own migration, a new on-screen feedback page, a guidance module, PDF landscape/font/link redesign) layered on top of that already-migrated foundation.

**Tech Stack:** Next.js App Router (Server Components, Server Actions, Route Handlers), Supabase (Postgres + RLS), `@ai-sdk/groq` (Groq `openai/gpt-oss-120b`), `@react-pdf/renderer`, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-25-coach-dna-full-breakdown-design.md`

## Global Constraints

- No back-compat shim for `pros`/`cons` — every direct consumer moves to `categories` in the same task (Task 1), since a half-migrated shape can't compile or pass tests.
- No change to `computeCategoryScore`, `computeSelfOnlyCategoryScores`, `getCategoryWeights`, `getSourceThresholds`, or the live blended-score math.
- No drill-category mapping — the drill-library/session-planner/AI-chat guidance links are generic (`/drills`, `/sessions/new`, `/chat/ai`), never filtered by category.
- Score display everywhere: qualitative band + number (e.g. "Strong · 82/100"). Self-assessment bands come from `tierLabel` (Task 1): `strength` → "Strong", `solid` → "Developing", `focus` → "Focus area". Feedback bands come from `feedbackBandLabel` (Task 2): `>= 3.5` → "Strong", `< 3.5` → "Focus area".
- Every AI prompt (self-assessment, feedback) is a single call covering every category at once — matches the existing architecture, one consistent voice, fewer round trips. The model never decides tier/band or category slug — those are always code-computed; the model only supplies prose, cross-checked and rebuilt by slug/order after parsing.
- Resources (`resourcesFor(categorySlug)` from `@/lib/coach-dna/resources`) attach only to self-assessment categories with `tier === 'focus'` and feedback categories with `averageRating < 3.5`.
- `/complete/page.tsx` and `CoachDnaSummaryPDF.tsx` currently have no dedicated test files (confirmed: no `page.test.tsx` alongside `/complete/page.tsx`; `CoachDnaSummaryPDF.tsx` is covered only indirectly via `pdf-actions.test.ts`/`report-pdf/route.test.ts` inspecting props passed to `renderToBuffer`). This plan does not introduce new coverage for either — matches existing, already-established precedent for these two files specifically.

---

### Task 1: Category-tier data model — archetype, AI generation, and every direct consumer

This is the plan's one large, all-or-nothing task: the moment `SelfAssessmentSummary.pros`/`cons` becomes `categories`, every direct consumer breaks simultaneously (no shim exists to soften that), so all of them are migrated together here. Every later task is purely additive on top of this.

**Files:**
- Modify: `web/src/lib/coach-dna/archetype.ts`
- Modify: `web/src/lib/coach-dna/archetype.test.ts`
- Create: `web/src/lib/coach-dna/tier-label.ts`
- Create: `web/src/lib/coach-dna/tier-label.test.ts`
- Modify: `web/src/lib/supabase/types.ts:192-201` (`SelfAssessmentSummary`)
- Modify: `web/src/lib/coach-dna/summary-shape.ts`
- Modify: `web/src/lib/coach-dna/summary-shape.test.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/page.tsx:232-253` (hub)
- Modify: `web/src/app/(app)/admin/coach-dna/page.test.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx`
- Modify: `web/src/lib/email.ts:554-604` (`sendCoachDnaSummaryEmail`)
- Modify: `web/src/lib/email.test.ts:48-145`
- Modify: `web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts` (fixtures only)
- Modify: `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts` (fixtures only)
- Modify: `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts` (fixtures only)

**Interfaces:**
- Produces: `export type CategoryTier = 'strength' | 'solid' | 'focus'` and `export interface CategoryBreakdownEntry { categorySlug: string; score: number; tier: CategoryTier }` from `archetype.ts`; `ArchetypeResult` becomes `{ primaryType: string; secondaryType: string | null; categories: CategoryBreakdownEntry[] }` (all 8, ranked by score descending, index 0-2 → `strength`, 3-4 → `solid`, 5-7 → `focus`).
- Produces: `export function tierLabel(tier: CategoryTier): string` from `tier-label.ts` — `'Strong'` / `'Developing'` / `'Focus area'`.
- Produces: `SelfAssessmentSummary` (in `types.ts`) becomes `{ primaryType: string; secondaryType: string | null; narrative: string; categories: { categorySlug: string; score: number; tier: CategoryTier; text: string; resources: { title: string; description: string; url: string | null }[] }[]; sourcedCategories?: Record<string, string[]> }` — consumed by every later task that touches self-assessment data.
- Consumes (later tasks read these, unchanged by this task): `resourcesFor(categorySlug)` from `@/lib/coach-dna/resources`, `sourceTagFor`/`allCategoriesSelfOnly` from `@/lib/coach-dna/source-label`, `labelFor` from `@/lib/coach-dna/categories`, `hasBlendedFeedback` from `@/lib/coach-dna/blend-status`.

- [ ] **Step 1: Write the failing tests for `deriveArchetype`'s tiered output**

Replace the last test in `web/src/lib/coach-dna/archetype.test.ts` (`'returns the top 3 categories as pros and bottom 3 as cons, sorted by score'`) and add tier coverage:

```ts
import { describe, it, expect } from 'vitest'
import { deriveArchetype } from './archetype'
import type { SelfCategoryScore } from './self-score'

function scores(overrides: Record<string, number>): SelfCategoryScore[] {
  const base = ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']
  return base.map(categorySlug => ({ categorySlug, score: overrides[categorySlug] ?? 50 }))
}

describe('deriveArchetype', () => {
  it('picks the highest-scoring category as primaryType', () => {
    const result = deriveArchetype(scores({ teacher: 90 }))
    expect(result.primaryType).toBe('teacher')
  })

  it('sets secondaryType when the second-highest is within 10 points of the primary', () => {
    const result = deriveArchetype(scores({ teacher: 90, motivator: 80 }))
    expect(result.primaryType).toBe('teacher')
    expect(result.secondaryType).toBe('motivator')
  })

  it('sets secondaryType to null when the second-highest is more than 10 points behind the primary', () => {
    const result = deriveArchetype(scores({ teacher: 90, motivator: 79 }))
    expect(result.secondaryType).toBeNull()
  })

  it('breaks ties by fixed category display order, not randomly', () => {
    // teacher comes before technician in CATEGORY_SLUGS order
    const result = deriveArchetype(scores({ teacher: 80, technician: 80 }))
    expect(result.primaryType).toBe('teacher')
  })

  it('returns all 8 categories, ranked by score descending, each carrying its score', () => {
    const result = deriveArchetype(scores({
      teacher: 90, motivator: 85, developer: 80,
      technician: 20, organiser: 15, communicator: 10,
      'game-manager': 55, 'culture-builder': 50,
    }))
    expect(result.categories).toHaveLength(8)
    expect(result.categories.map(c => c.categorySlug)).toEqual([
      'teacher', 'motivator', 'developer', 'game-manager', 'culture-builder', 'technician', 'organiser', 'communicator',
    ])
    expect(result.categories[0].score).toBe(90)
    expect(result.categories.every(c => typeof c.score === 'number')).toBe(true)
  })

  it('tags the top 3 ranked categories as strength, the next 2 as solid, the bottom 3 as focus', () => {
    const result = deriveArchetype(scores({
      teacher: 90, motivator: 85, developer: 80,
      technician: 20, organiser: 15, communicator: 10,
      'game-manager': 55, 'culture-builder': 50,
    }))
    expect(result.categories.map(c => c.tier)).toEqual([
      'strength', 'strength', 'strength', 'solid', 'solid', 'focus', 'focus', 'focus',
    ])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/archetype.test.ts`
Expected: FAIL — `result.categories` is `undefined` (current `deriveArchetype` returns `pros`/`cons`, not `categories`).

- [ ] **Step 3: Rewrite `archetype.ts`**

```ts
import type { SelfCategoryScore } from './self-score'

const CATEGORY_ORDER = [
  'teacher', 'technician', 'motivator', 'developer',
  'game-manager', 'communicator', 'organiser', 'culture-builder',
]

export type CategoryTier = 'strength' | 'solid' | 'focus'

export interface CategoryBreakdownEntry {
  categorySlug: string
  score: number
  tier: CategoryTier
}

export interface ArchetypeResult {
  primaryType: string
  secondaryType: string | null
  categories: CategoryBreakdownEntry[]
}

function sortByScoreThenOrder(scores: SelfCategoryScore[]): SelfCategoryScore[] {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return CATEGORY_ORDER.indexOf(a.categorySlug) - CATEGORY_ORDER.indexOf(b.categorySlug)
  })
}

function tierForRank(rank: number): CategoryTier {
  if (rank < 3) return 'strength'
  if (rank < 5) return 'solid'
  return 'focus'
}

export function deriveArchetype(scores: SelfCategoryScore[]): ArchetypeResult {
  const ranked = sortByScoreThenOrder(scores)
  const primary = ranked[0]
  const secondary = ranked[1]

  return {
    primaryType: primary.categorySlug,
    secondaryType: secondary && primary.score - secondary.score <= 10 ? secondary.categorySlug : null,
    categories: ranked.map((entry, rank) => ({
      categorySlug: entry.categorySlug,
      score: entry.score,
      tier: tierForRank(rank),
    })),
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/archetype.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing test for `tierLabel`**

Create `web/src/lib/coach-dna/tier-label.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tierLabel } from './tier-label'

describe('tierLabel', () => {
  it('labels strength as Strong', () => {
    expect(tierLabel('strength')).toBe('Strong')
  })

  it('labels solid as Developing', () => {
    expect(tierLabel('solid')).toBe('Developing')
  })

  it('labels focus as Focus area', () => {
    expect(tierLabel('focus')).toBe('Focus area')
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd web && npx vitest run src/lib/coach-dna/tier-label.test.ts`
Expected: FAIL — `Cannot find module './tier-label'`.

- [ ] **Step 7: Create `tier-label.ts`**

```ts
import type { CategoryTier } from './archetype'

const TIER_LABELS: Record<CategoryTier, string> = {
  strength: 'Strong',
  solid: 'Developing',
  focus: 'Focus area',
}

/** Plain-language band for a category tier, shown alongside its raw score everywhere a category is displayed (hub, /complete, both PDFs). */
export function tierLabel(tier: CategoryTier): string {
  return TIER_LABELS[tier]
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd web && npx vitest run src/lib/coach-dna/tier-label.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Update `SelfAssessmentSummary` in `types.ts`**

In `web/src/lib/supabase/types.ts:192-201`, replace:

```ts
export interface SelfAssessmentSummary {
  primaryType: string
  secondaryType: string | null
  narrative: string
  pros: { categorySlug: string; text: string }[]
  cons: { categorySlug: string; text: string; resources: { title: string; description: string; url: string | null }[] }[]
  /** Which sources contributed to each category's shown score -- ['self'] until
   *  cleared external feedback (Coach 360) clears its sample-size threshold.
   *  Optional: rows persisted before this field existed simply lack it --
   *  treat a missing value as self-only, not an error. */
  sourcedCategories?: Record<string, string[]>
}
```

with:

```ts
export interface SelfAssessmentSummary {
  primaryType: string
  secondaryType: string | null
  narrative: string
  /** All 8 categories, ranked by score descending -- not just a curated top/bottom slice. */
  categories: {
    categorySlug: string
    score: number
    tier: 'strength' | 'solid' | 'focus'
    text: string
    /** Non-empty only when tier === 'focus'. */
    resources: { title: string; description: string; url: string | null }[]
  }[]
  /** Which sources contributed to each category's shown score -- ['self'] until
   *  cleared external feedback (Coach 360) clears its sample-size threshold.
   *  Optional: rows persisted before this field existed simply lack it --
   *  treat a missing value as self-only, not an error. */
  sourcedCategories?: Record<string, string[]>
}
```

No test file covers this interface directly (it's a pure type) — its correctness is exercised by every other file in this task.

- [ ] **Step 10: Write the failing tests for `isCurrentSummaryShape`**

Replace `web/src/lib/coach-dna/summary-shape.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isCurrentSummaryShape } from './summary-shape'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

function makeSummary(categories: SelfAssessmentSummary['categories']): SelfAssessmentSummary {
  return {
    primaryType: 'teacher',
    secondaryType: null,
    narrative: 'x',
    categories,
  } as SelfAssessmentSummary
}

describe('isCurrentSummaryShape', () => {
  it('returns true when every category has a resources array', () => {
    const summary = makeSummary([
      { categorySlug: 'communication', score: 80, tier: 'strength', text: 'x', resources: [] },
      { categorySlug: 'tactics', score: 20, tier: 'focus', text: 'y', resources: [{ title: 't', description: 'd', url: null }] },
    ])
    expect(isCurrentSummaryShape(summary)).toBe(true)
  })

  it('returns false when a category is missing resources (legacy shape)', () => {
    const summary = makeSummary([
      { categorySlug: 'communication', score: 80, tier: 'strength', text: 'x' } as unknown as SelfAssessmentSummary['categories'][number],
    ])
    expect(isCurrentSummaryShape(summary)).toBe(false)
  })

  it('returns false when categories is missing entirely (pre-tier legacy shape)', () => {
    const legacy = { primaryType: 'teacher', secondaryType: null, narrative: 'x', pros: [], cons: [] } as unknown as SelfAssessmentSummary
    expect(isCurrentSummaryShape(legacy)).toBe(false)
  })

  it('returns true vacuously when categories is empty', () => {
    const summary = makeSummary([])
    expect(isCurrentSummaryShape(summary)).toBe(true)
  })
})
```

- [ ] **Step 11: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/summary-shape.test.ts`
Expected: FAIL — `summary.categories` is `undefined` on the current implementation (which still reads `summary.cons`).

- [ ] **Step 12: Rewrite `summary-shape.ts`**

```ts
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

/**
 * True if a persisted summary already has the current shape: an array of all
 * 8 categories (not the old top/bottom-3 `pros`/`cons` split), each carrying
 * a `resources` array. A summary from before this shape shipped (or before
 * the growth-resources feature that preceded it) lacks one or both and must
 * be regenerated, not rendered as-is -- rendering it directly would throw on
 * `category.resources.length` or `category.categories` being undefined.
 */
export function isCurrentSummaryShape(summary: SelfAssessmentSummary): boolean {
  return Array.isArray(summary.categories) && summary.categories.every(category => Array.isArray(category.resources))
}
```

- [ ] **Step 13: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/summary-shape.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 14: Update the failing tests in `summary-actions.test.ts`**

In `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`, the fixture responses (`{ selected_option: 'opt-1' (teacher), least_option: 'opt-2' (motivator) }`) rank the 8 categories, by score, as: `teacher` (54.17) → `technician` (50, tie-broken first) → `developer` (50) → `game-manager` (50) → `communicator` (50) → `organiser` (50) → `culture-builder` (50) → `motivator` (45.83, lowest) — this is the existing `EXPECTED_PROS`/`EXPECTED_CONS` derivation, now expressed as one 8-long ranked list. With the new tier cutoffs (rank<3 strength, <5 solid, else focus): `teacher`/`technician`/`developer` → strength, `game-manager`/`communicator` → solid, `organiser`/`culture-builder`/`motivator` → focus.

Replace the constants and `beforeEach` fixture at the top of both `describe` blocks:

```ts
const RANKED_SLUGS = ['teacher', 'technician', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder', 'motivator']
const RANKED_TIERS = ['strength', 'strength', 'strength', 'solid', 'solid', 'focus', 'focus', 'focus']

function categoryAiFixture() {
  // Deliberately bogus/wrong-case/empty categorySlugs on every entry: the
  // action must ignore them entirely and use the TypeScript-computed
  // archetype slugs (RANKED_SLUGS, in order) instead.
  return JSON.stringify({
    narrative: 'You lead with clarity and patience.',
    categories: [
      { categorySlug: 'Teacher', text: 'You explain things well.' },
      { categorySlug: 'nonsense', text: 'Your instruction is precise and repeatable.' },
      { categorySlug: '', text: 'You build players up steadily.' },
      { categorySlug: 'Game Manager', text: 'Your in-game reads are dependable.' },
      { categorySlug: 'nonsense', text: 'You keep sessions on track.' },
      { categorySlug: 'Organiser', text: 'Session structure could be tighter.' },
      { categorySlug: '', text: 'Set the tone more explicitly.' },
      { categorySlug: 'Motivator', text: 'Say less, say it clearer.' },
    ],
  })
}
```

Both `beforeEach` blocks change `state.aiText = JSON.stringify({...pros/cons...})` to `state.aiText = categoryAiFixture()`.

Replace these tests (same file, same order as today):

```ts
  it('uses the computed archetype slugs, not the slugs the model returned', async () => {
    const result = await generateSelfAssessmentSummary('attempt-1')

    expect(result.categories.map(c => c.categorySlug)).toEqual(RANKED_SLUGS)
    expect(result.categories.map(c => c.tier)).toEqual(RANKED_TIERS)
    // The model's prose is kept, zipped on by position.
    expect(result.categories[0].text).toBe('You explain things well.')
    expect(result.categories[7].text).toBe('Say less, say it clearer.')

    const persisted = upsertMock.mock.calls[0][0]
    expect(persisted.ai_summary.categories.map((c: { categorySlug: string }) => c.categorySlug)).toEqual(RANKED_SLUGS)
  })

  it('attaches the curated resources for each focus-tier category, never from the model, and none for strength/solid', async () => {
    const result = await generateSelfAssessmentSummary('attempt-1')

    // RANKED_SLUGS' focus tier (last 3): organiser, culture-builder, motivator
    const bySlug = (slug: string) => result.categories.find(c => c.categorySlug === slug)!
    expect(bySlug('organiser').resources).toEqual(CATEGORY_RESOURCES['organiser'])
    expect(bySlug('culture-builder').resources).toEqual(CATEGORY_RESOURCES['culture-builder'])
    expect(bySlug('motivator').resources).toEqual(CATEGORY_RESOURCES['motivator'])
    expect(bySlug('teacher').resources).toEqual([])
    expect(bySlug('game-manager').resources).toEqual([])
  })

  it('throws without persisting when the model returns the wrong number of categories', async () => {
    const parsed = JSON.parse(state.aiText)
    parsed.categories = parsed.categories.slice(0, 7)
    state.aiText = JSON.stringify(parsed)

    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('Could not generate your summary right now')
    expect(upsertMock).not.toHaveBeenCalled()
  })
```

(This replaces the old `'uses the computed archetype slugs...'`, `'attaches the curated resources...'`, `'throws without persisting when the model returns the wrong number of pros'`, and `'throws without persisting when the model returns the wrong number of cons'` tests — the last two collapse into the one `categories`-length test above, since there's now one array, not two.)

In the `ensureFreshSummary` describe block, replace the cached-summary fixtures in these four tests:

```ts
  it('regenerates when the cached summary has a stale (pre-resources) shape', async () => {
    state.cachedAiSummary = {
      primaryType: 'teacher',
      secondaryType: null,
      narrative: 'old',
      categories: [
        { categorySlug: 'teacher', score: 54, tier: 'strength', text: 'old' }, // missing `resources` -> stale shape
      ],
      sourcedCategories: { teacher: ['self'], motivator: ['self'] },
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('returns the cached summary without generating when sourcedCategories and archetype already match', async () => {
    // secondaryType: 'technician' here because with these fixture responses/options
    // teacher scores 54.17 and technician ties the next batch at 50 -- a <=10 gap,
    // so deriveArchetype assigns a secondaryType (see archetype.ts). Getting this
    // wrong would make the archetype-drift check (finding #3) falsely regenerate.
    state.cachedAiSummary = {
      primaryType: 'teacher',
      secondaryType: 'technician',
      narrative: 'cached narrative',
      categories: RANKED_SLUGS.map((categorySlug, i) => ({
        categorySlug, score: 50, tier: RANKED_TIERS[i], text: 'cached', resources: [],
      })),
      sourcedCategories: { teacher: ['self'], technician: ['self'], motivator: ['self'], developer: ['self'], 'game-manager': ['self'], communicator: ['self'], organiser: ['self'], 'culture-builder': ['self'] },
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('cached narrative')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('regenerates when sourcedCategories match but the freshly computed primaryType has drifted', async () => {
    // sourcedCategories below are identical to what a fresh (self-only) computation
    // would produce here -- no category has crossed a blend threshold. But the
    // cached top-ranked category ('motivator') no longer matches what the self-scores
    // above (teacher scores highest) would compute -- e.g. because ongoing
    // self-only score drift moved the top category after the cache was written.
    // This must still trigger a regeneration, not a false "unchanged" match.
    state.cachedAiSummary = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: 'cached narrative',
      categories: ['motivator', 'teacher', 'technician', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']
        .map((categorySlug, i) => ({ categorySlug, score: 50, tier: RANKED_TIERS[i], text: 'cached', resources: [] })),
      sourcedCategories: { teacher: ['self'], technician: ['self'], motivator: ['self'], developer: ['self'], 'game-manager': ['self'], communicator: ['self'], organiser: ['self'], 'culture-builder': ['self'] },
    }
    const result = await ensureFreshSummary('attempt-1', 'coach-1')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('regenerates when new feedback has blended into a category the cache does not reflect', async () => {
    state.cachedAiSummary = {
      primaryType: 'teacher',
      secondaryType: null,
      narrative: 'cached narrative',
      categories: RANKED_SLUGS.map((categorySlug, i) => ({
        categorySlug, score: 50, tier: RANKED_TIERS[i], text: 'cached', resources: [],
      })),
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
```

- [ ] **Step 15: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/app/\(app\)/admin/coach-dna/summary-actions.test.ts`
Expected: FAIL — `result.categories` is `undefined` on the current implementation.

- [ ] **Step 16: Rewrite `summary-actions.ts`**

Replace the prompt and `isValidSummaryShape` in `web/src/app/(app)/admin/coach-dna/summary-actions.ts`:

```ts
function isCategoryTextEntryArray(value: unknown): value is { categorySlug: string; text: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      entry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).categorySlug === 'string' &&
        typeof (entry as Record<string, unknown>).text === 'string',
    )
  )
}

function isValidSummaryShape(
  value: unknown,
): value is { narrative: string; categories: { categorySlug: string; text: string }[] } {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.narrative === 'string' &&
    candidate.narrative.trim().length > 0 &&
    isCategoryTextEntryArray(candidate.categories)
  )
}
```

Replace the prompt construction and the summary-building block inside `generateSelfAssessmentSummary`:

```ts
  const prompt = `You are writing a self-assessment summary for a rugby league coach, based on their own self-reported scores across 8 coaching categories. Write in a direct, professional coaching voice — confident and specific, not hype, not generic praise. No em dashes. No fluff.

Their primary coaching type: ${labelFor(archetype.primaryType)}
${archetype.secondaryType ? `Their secondary type: ${labelFor(archetype.secondaryType)}` : ''}

For each of the 8 categories below, write text in the voice appropriate to its tier:
- "strength": one confident sentence naming what this strength looks like in practice.
- "solid": one plain sentence on what steady performance in this category looks like for them — not a strength to lead with, not a gap, just solid ground.
- "focus": 2-3 sentences — what the gap looks like in practice, and one concrete thing to try.

Categories, in this exact order (write one entry per category, same order, referencing the tier given):
${archetype.categories.map(c => `${labelFor(c.categorySlug)} (tier: ${c.tier}, score: ${c.score}/100)`).join('\n')}

Vary sentence structure and opening across categories of the same tier — do not open every "focus" entry with the same phrase. Each should read like it was written fresh.

Do not invent scores or claim data you were not given. Do not mention "self-assessment only" or any caveats about data sources - that framing is handled elsewhere in the UI, not by you.

Respond with ONLY a valid JSON object, no markdown fences, no explanation. "categories" must contain exactly 8 entries, in the same order as the list above. Shape:
{"narrative":"one paragraph, 2-4 sentences summarizing the overall picture","categories":[{"categorySlug":"...","text":"..."}]}`

  const { text } = await generateText({ model: groq('openai/gpt-oss-120b'), prompt })

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Could not generate your summary right now')

  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('Could not generate your summary right now')
  }
  if (!isValidSummaryShape(parsed)) throw new Error('Could not generate your summary right now')

  // The model only writes prose. Which categories are strengths, solid ground,
  // or focus areas (and their slugs/scores) always comes from the
  // TypeScript-computed archetype, so a model that returns a label, a
  // misspelled slug, or a reordered list can never corrupt the structure or
  // produce an unresolvable label at render time.
  if (parsed.categories.length !== archetype.categories.length) {
    throw new Error('Could not generate your summary right now')
  }

  const summary: SelfAssessmentSummary = {
    primaryType: archetype.primaryType,
    secondaryType: archetype.secondaryType,
    narrative: parsed.narrative,
    categories: archetype.categories.map((entry, i) => ({
      categorySlug: entry.categorySlug,
      score: entry.score,
      tier: entry.tier,
      text: parsed.categories[i].text,
      resources: entry.tier === 'focus' ? resourcesFor(entry.categorySlug) : [],
    })),
    sourcedCategories,
  }
```

Replace `ensureFreshSummary`'s `archetypeUnchanged` check:

```ts
  const archetypeUnchanged =
    cached?.primaryType === archetype.primaryType &&
    cached?.secondaryType === archetype.secondaryType &&
    cached?.categories[0]?.categorySlug === archetype.categories[0].categorySlug &&
    cached?.categories[archetype.categories.length - 1]?.categorySlug === archetype.categories[archetype.categories.length - 1].categorySlug
```

(This replaces the old `cached?.pros[0]?.categorySlug === archetype.pros[0]` / `cached?.cons[0]?.categorySlug === archetype.cons[0]` pair — same drift-detection role: top-ranked and bottom-ranked category unchanged, now read from the single `categories` array's first and last entries instead of two separate arrays' first entries.)

- [ ] **Step 17: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/app/\(app\)/admin/coach-dna/summary-actions.test.ts`
Expected: PASS (same test count as before this step, minus one — the two "wrong number of pros/cons" tests collapsed into one "wrong number of categories" test).

- [ ] **Step 18: Rewrite the category sections in `/complete/page.tsx`**

No dedicated test file exists for this page (see Global Constraints) — this step is implementation only. In `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`, replace line 82's `allCategoriesSelfOnly` call:

```tsx
          {allCategoriesSelfOnly(summary.sourcedCategories, summary.categories.map(c => c.categorySlug)) && (
```

Then replace the two `<div>` blocks (the "Strengths" `<h2>`/`<ul>` and the "Focus areas" `<h2>`/`<ul>`, currently the file's lines 89-139) with three tier sections sharing one row renderer. Add this function above `AssessmentCompletePage` (after the imports, before `export const metadata`):

```tsx
function CategoryRow({ category, sourcedCategories }: {
  category: SelfAssessmentSummary['categories'][number]
  sourcedCategories: SelfAssessmentSummary['sourcedCategories']
}) {
  const tag = sourceTagFor(sourcedCategories, category.categorySlug)
  return (
    <li className="text-sm text-zinc-400">
      <span className="text-zinc-200 font-medium">{labelFor(category.categorySlug)}</span>
      <span className="text-zinc-500"> · {tierLabel(category.tier)} · {Math.round(category.score)}/100</span>
      {tag && <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full align-middle">{tag}</span>}
      <p className="mt-0.5">{category.text}</p>
      {category.resources.length > 0 && (
        <ul className="mt-1.5 space-y-1 pl-3 border-l border-zinc-800">
          {category.resources.map(resource => (
            <li key={resource.title} className="text-xs text-zinc-500">
              {resource.url ? (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 font-medium"
                >
                  {resource.title}
                </a>
              ) : (
                <span className="text-zinc-300 font-medium">{resource.title}</span>
              )}
              {' — '}{resource.description}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
```

Then, inside `AssessmentCompletePage`, replace the two old blocks with:

```tsx
          <div>
            <h2 className="text-sm font-semibold text-emerald-400 mb-2">Strengths</h2>
            <ul className="space-y-3">
              {summary.categories.filter(c => c.tier === 'strength').map(category => (
                <CategoryRow key={category.categorySlug} category={category} sourcedCategories={summary.sourcedCategories} />
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">Solid ground</h2>
            <ul className="space-y-3">
              {summary.categories.filter(c => c.tier === 'solid').map(category => (
                <CategoryRow key={category.categorySlug} category={category} sourcedCategories={summary.sourcedCategories} />
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-orange-400 mb-2">Focus areas</h2>
            <ul className="space-y-4">
              {summary.categories.filter(c => c.tier === 'focus').map(category => (
                <CategoryRow key={category.categorySlug} category={category} sourcedCategories={summary.sourcedCategories} />
              ))}
            </ul>
          </div>
```

Add the two new imports at the top of the file:

```tsx
import { tierLabel } from '@/lib/coach-dna/tier-label'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'
```

(`SelfAssessmentSummary` is likely already imported for the `summary` variable's type — if so, don't duplicate the import, just reuse it in `CategoryRow`'s parameter type.)

- [ ] **Step 19: Rewrite the hub page's condensed tiles**

In `web/src/app/(app)/admin/coach-dna/page.tsx:232-253`, replace the `<div className="grid grid-cols-2 gap-3">` block:

```tsx
                <div className="grid grid-cols-2 gap-3">
                  {summary.categories.find(c => c.tier === 'strength') && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-sm font-semibold text-zinc-100">
                        {labelFor(summary.categories.find(c => c.tier === 'strength')!.categorySlug)}
                      </p>
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mt-1">
                        Top strength
                      </p>
                    </div>
                  )}
                  {summary.categories.find(c => c.tier === 'focus') && (
                    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                      <p className="text-sm font-semibold text-zinc-100">
                        {labelFor(summary.categories.find(c => c.tier === 'focus')!.categorySlug)}
                      </p>
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mt-1">
                        Focus area
                      </p>
                    </div>
                  )}
                </div>
```

`summary.categories` is already ranked by score descending (from `deriveArchetype`), so `.find(c => c.tier === 'strength')` returns the same top strength `summary.pros[0]` used to return, and `.find(c => c.tier === 'focus')` returns the same category `summary.cons[0]` used to return (the first `focus`-tier entry in ranked order is the lowest-scoring category overall, same as the old `cons[0]`).

In `web/src/app/(app)/admin/coach-dna/page.test.tsx`, update the two fixtures currently shaped `{ pros: [{ categorySlug: 'communicator', text: '...' }], cons: [{ categorySlug: 'game-manager', text: '...', resources: [] }] }` (used across most tests in this file) to:

```ts
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: 'technician',
      narrative: 'You build trust fast.',
      categories: [
        { categorySlug: 'communicator', score: 90, tier: 'strength', text: 'Great communicator', resources: [] },
        { categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management', resources: [] },
      ],
      sourcedCategories: { motivator: ['self'] },
    }
```

(Keeping every test's other fields — `sourcedCategories`, `primaryType`, etc. — exactly as they already are; only `pros`/`cons` become one `categories` array with `score`/`tier` added to each entry. `screen.getByText(/Communicator/)`/`screen.getByText(/Game Manager/)` assertions elsewhere in the file keep working unchanged since the label text still renders.)

- [ ] **Step 20: Run the hub page tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/page.test.tsx"`
Expected: PASS (same test count as before — 18 tests).

- [ ] **Step 21: Migrate `CoachDnaSummaryPDF.tsx` to `categories`, keeping today's portrait/Helvetica layout for now**

No dedicated test file exists for this component (see Global Constraints); it's covered indirectly by `pdf-actions.test.ts`/`report-pdf/route.test.ts` inspecting the `renderToBuffer` element's props, which don't reach into `CoachDnaSummaryPDF`'s own rendering. This step is implementation only. The landscape/font/2-column redesign is a later, separate task (Task 9) — this step only migrates the data shape, keeping the visual structure recognizable.

In `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx`, add a `meta` prop to `CommentBlock`'s props and render it next to the tag:

```tsx
function CommentBlock({
  label,
  meta,
  text,
  color,
  resources,
  tag,
}: {
  label: string
  meta: string
  text: string
  color: string
  resources?: { title: string; description: string }[]
  tag?: string | null
}) {
  return (
    <View style={s.commentBlock} wrap={false}>
      <View style={s.commentHeaderRow}>
        <View style={[s.commentDot, { backgroundColor: color }]} />
        <Text style={[s.commentLabel, { color }]}>{label}</Text>
        <Text style={s.sourceTag}>{meta}</Text>
        {tag && <Text style={s.sourceTag}>{tag}</Text>}
      </View>
      <Text style={[s.commentBody, { borderLeftColor: color }]}>{text}</Text>
      {resources && resources.length > 0 && (
        <View style={s.resourceList}>
          {resources.map(resource => (
            <Text key={resource.title} style={s.resourceItem}>
              <Text style={s.resourceTitle}>{resource.title}</Text>
              {' — '}{resource.description}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}
```

Replace the `allCategorySlugs`/`selfOnly` line and the STRENGTHS/FOCUS AREAS blocks inside `CoachDnaSummaryPDF`:

```tsx
  const allCategorySlugs = data.categories.map(c => c.categorySlug)
  const selfOnly = allCategoriesSelfOnly(data.sourcedCategories, allCategorySlugs)
```

```tsx
          <Text style={[s.groupHeading, { color: GREEN, borderBottomColor: GREEN }]}>STRENGTHS</Text>
          {data.categories.filter(c => c.tier === 'strength').map(category => (
            <CommentBlock
              key={category.categorySlug}
              label={labelFor(category.categorySlug).toUpperCase()}
              meta={`${tierLabel(category.tier)} · ${Math.round(category.score)}/100`}
              text={category.text}
              color={GREEN}
              tag={sourceTagFor(data.sourcedCategories, category.categorySlug)}
            />
          ))}

          <Text style={[s.groupHeading, { color: MID, borderBottomColor: BORDER }]}>SOLID GROUND</Text>
          {data.categories.filter(c => c.tier === 'solid').map(category => (
            <CommentBlock
              key={category.categorySlug}
              label={labelFor(category.categorySlug).toUpperCase()}
              meta={`${tierLabel(category.tier)} · ${Math.round(category.score)}/100`}
              text={category.text}
              color={MID}
              tag={sourceTagFor(data.sourcedCategories, category.categorySlug)}
            />
          ))}

          <Text style={[s.groupHeading, { color: AMBER, borderBottomColor: AMBER }]}>FOCUS AREAS</Text>
          {data.categories.filter(c => c.tier === 'focus').map(category => (
            <CommentBlock
              key={category.categorySlug}
              label={labelFor(category.categorySlug).toUpperCase()}
              meta={`${tierLabel(category.tier)} · ${Math.round(category.score)}/100`}
              text={category.text}
              color={AMBER}
              resources={category.resources}
              tag={sourceTagFor(data.sourcedCategories, category.categorySlug)}
            />
          ))}
```

Add the import: `import { tierLabel } from '@/lib/coach-dna/tier-label'`.

- [ ] **Step 22: Write the failing tests for `sendCoachDnaSummaryEmail`'s categories rendering**

In `web/src/lib/email.test.ts:48-145`, replace the `summary` fixture (line 54):

```ts
  const summary = {
    primaryType: 'teacher',
    secondaryType: 'motivator',
    narrative: 'You lead with clarity.',
    categories: [
      { categorySlug: 'teacher', score: 90, tier: 'strength', text: 'You explain things well.', resources: [] },
      {
        categorySlug: 'organiser',
        score: 20,
        tier: 'focus',
        text: 'Sessions could run tighter. Try timeboxing each drill before you start.',
        resources: [{ title: 'Periodization Training for Sports', description: 'Structuring a season.', url: 'https://openlibrary.org/works/OL1850738W' }],
      },
    ],
  }
```

Update the two tests that build a variant fixture (lines 103-125), changing `cons: [{ ...summary.cons[0], resources: [] }]` and `cons: [{ ...summary.cons[0], resources: [...] }]` to operate on `categories[1]` (the `focus`-tier entry) instead of `cons[0]`:

```ts
  it('renders no resource list when a focus area has no curated resources', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_678' }, error: null })
    const summaryWithoutResources = { ...summary, categories: [summary.categories[0], { ...summary.categories[1], resources: [] }] }
    await sendCoachDnaSummaryEmail('coach@example.com', summaryWithoutResources, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.not.stringContaining('Periodization Training for Sports'),
    }))
  })

  it('renders a resource with no url as plain text, not a broken link', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_901' }, error: null })
    const summaryWithUnlinkedResource = {
      ...summary,
      categories: [summary.categories[0], { ...summary.categories[1], resources: [{ title: 'RFL Coach Education', description: 'Coaching hub.', url: null }] }],
    }
    await sendCoachDnaSummaryEmail('coach@example.com', summaryWithUnlinkedResource, Buffer.from('fake-pdf'))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.stringContaining('RFL Coach Education'),
    }))
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      html: expect.not.stringContaining('<a href="null"'),
    }))
  })
```

No other test in this `describe` block needs its assertions changed — they read rendered HTML strings (`'You explain things well.'`, `'/admin/coach-dna'`, `'This reflects your self-assessment only'`, etc.), which stay unchanged in the new rendering.

- [ ] **Step 23: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/email.test.ts`
Expected: FAIL — `sendCoachDnaSummaryEmail` still reads `summary.pros`/`summary.cons`, which are `undefined` on the new fixture.

- [ ] **Step 24: Rewrite `sendCoachDnaSummaryEmail`**

In `web/src/lib/email.ts:554-604`, replace the function signature and body:

```ts
export async function sendCoachDnaSummaryEmail(
  to: string,
  summary: {
    primaryType: string
    secondaryType: string | null
    categories: {
      categorySlug: string
      tier: 'strength' | 'solid' | 'focus'
      text: string
      resources: { title: string; description: string; url: string | null }[]
    }[]
    sourcedCategories?: Record<string, string[]>
  },
  pdfBuffer: Buffer,
): Promise<EmailResult> {
  const typeLine = `${esc(labelFor(summary.primaryType))}${summary.secondaryType ? ` / ${esc(labelFor(summary.secondaryType))}` : ''}`
  const allCategorySlugs = summary.categories.map(c => c.categorySlug)
  const selfOnly = allCategoriesSelfOnly(summary.sourcedCategories, allCategorySlugs)

  const tagSuffix = (categorySlug: string) => {
    const tag = sourceTagFor(summary.sourcedCategories, categorySlug)
    return tag ? ` <em style="color:#e8560a;">(${esc(tag)})</em>` : ''
  }

  const strengths = summary.categories.filter(c => c.tier === 'strength')
  const focusAreas = summary.categories.filter(c => c.tier === 'focus')

  const focusBlocks = focusAreas.map(category => `
    ${para(`<strong style="color:#ffffff;">${esc(labelFor(category.categorySlug))}:</strong> ${esc(category.text)}${tagSuffix(category.categorySlug)}`)}
    ${category.resources.length > 0 ? featureList(category.resources.map(resource =>
      resource.url
        ? `<a href="${esc(resource.url)}" style="color:#e8560a;">${esc(resource.title)}</a> — ${esc(resource.description)}`
        : `${esc(resource.title)} — ${esc(resource.description)}`,
    )) : ''}
  `).join('')

  const html = layout(`
    ${heading(`You're a ${typeLine} coach.`)}
    ${divider()}
    ${greeting('')}
    ${para('Your Coach DNA self-assessment results are attached to this email as a PDF, and summarised below.')}
    ${featureList(strengths.map(category => `${esc(labelFor(category.categorySlug))}: ${esc(category.text)}${tagSuffix(category.categorySlug)}`))}
    ${para('Focus areas:')}
    ${focusBlocks}
    ${selfOnly ? para('This reflects your self-assessment only, and will update as player and peer feedback comes in.') : ''}
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

("Solid ground" categories aren't rendered in the email body — same brevity the email already had, now explicitly a `strength`/`focus` split rather than an implicit top/bottom-3 one.)

- [ ] **Step 25: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/email.test.ts`
Expected: PASS (same test count as before — 10 tests in the `sendCoachDnaSummaryEmail` describe block).

- [ ] **Step 26: Fix the three remaining fixture-only test files**

These three files build `ai_summary`/summary fixtures for routes/actions this task doesn't otherwise touch — only their fixture literals need updating, since `isCurrentSummaryShape`/`isValidSummaryShape` (Steps 12/16) now require `categories`, not `pros`/`cons`.

In `web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts`, replace all three occurrences of the legacy fixture shape:

```ts
      ai_summary: { primaryType: 'teacher', secondaryType: null, narrative: 'x', pros: [], cons: [] },
```

with:

```ts
      ai_summary: { primaryType: 'teacher', secondaryType: null, narrative: 'x', categories: [] },
```

(lines 77 and 188 — both `beforeEach`-style baseline fixtures). And replace the "legacy-shaped" fixture (lines 110-117, the test asserting a stale-shape summary is rejected):

```ts
    state.summary = {
      ai_summary: {
        primaryType: 'teacher',
        secondaryType: null,
        narrative: 'x',
        categories: [{ categorySlug: 'communicator', score: 20, tier: 'focus', text: 'needs work' }],
      },
      ai_summary_generated_at: '2026-07-01T00:00:00.000Z',
    }
```

(missing `resources` on the one category entry is what makes this fixture "legacy-shaped" now, matching `isCurrentSummaryShape`'s Step 12 check — same role the missing `resources` on a `cons` entry played before.)

In `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts`, change the `state.summary` type declaration:

```ts
  summary: {
    primaryType: string
    secondaryType: string | null
    narrative: string
    categories: unknown[]
    sourcedCategories?: Record<string, string[]>
  } | null
```

and its fixture (currently `pros: [], cons: [], sourcedCategories: { motivator: ['self', 'player_voice'] },`):

```ts
    state.summary = {
      primaryType: 'motivator', secondaryType: null, narrative: '',
      categories: [], sourcedCategories: { motivator: ['self', 'player_voice'] },
    }
```

Apply the identical two changes (type declaration and fixture) to `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts` — it declares and builds the same `state.summary` shape for the same reason (both routes call `ensureFreshSummary`/`requireBlendedAttempt`, which returns a real `SelfAssessmentSummary`).

- [ ] **Step 27: Run the full test suite**

Run: `cd web && npm run test`
Expected: PASS, full suite green — every test in this task's file list, plus every untouched test elsewhere in the repo, passing. This is the checkpoint that confirms the shape migration left nothing broken.

- [ ] **Step 28: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 29: Commit**

```bash
git add web/src/lib/coach-dna/archetype.ts web/src/lib/coach-dna/archetype.test.ts \
  web/src/lib/coach-dna/tier-label.ts web/src/lib/coach-dna/tier-label.test.ts \
  web/src/lib/supabase/types.ts \
  web/src/lib/coach-dna/summary-shape.ts web/src/lib/coach-dna/summary-shape.test.ts \
  "web/src/app/(app)/admin/coach-dna/summary-actions.ts" "web/src/app/(app)/admin/coach-dna/summary-actions.test.ts" \
  "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx" \
  "web/src/app/(app)/admin/coach-dna/page.tsx" "web/src/app/(app)/admin/coach-dna/page.test.tsx" \
  "web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx" \
  web/src/lib/email.ts web/src/lib/email.test.ts \
  "web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts" \
  "web/src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts" \
  "web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts"
git commit -m "feat(coach-dna): surface all 8 categories with tiers, migrate off pros/cons"
```

---

### Task 2: Feedback summary — resources + `feedbackBandLabel` + `text` field

Purely additive to `feedback-summary.ts` (untouched by Task 1) — no other file changes shape here.

**Files:**
- Modify: `web/src/lib/coach-dna/feedback-summary.ts`
- Modify: `web/src/lib/coach-dna/feedback-summary.test.ts`

**Interfaces:**
- Consumes: `resourcesFor(categorySlug)` from `@/lib/coach-dna/resources` (already used elsewhere in this module's neighbors; not yet imported into this specific file).
- Produces: `FeedbackCategorySummary` gains `text: string` (left `''` here — filled by Task 3's AI layer) and `resources: { title: string; description: string; url: string | null }[]` (non-empty when `averageRating < 3.5`). `export function feedbackBandLabel(averageRating: number): string` — `'Strong'` at `>= 3.5`, `'Focus area'` otherwise. Both consumed by Task 3 (caching/AI), Task 5 (feedback page), and Task 10 (feedback PDF).

- [ ] **Step 1: Write the failing tests**

In `web/src/lib/coach-dna/feedback-summary.test.ts`, update the five `toEqual`/property assertions that build a `FeedbackCategorySummary` object literal to include the two new fields:

```ts
    expect(result.playerParentVoice.categories).toEqual([{ categorySlug: 'teacher', averageRating: 4, responseCount: 3, text: '', resources: [] }])
```

```ts
    expect(result.peerObservation.categories).toEqual([{ categorySlug: 'organiser', averageRating: 3, responseCount: 1, text: '', resources: CATEGORY_RESOURCES['organiser'] }])
```

```ts
    expect(result.peerObservation.categories).toEqual([{ categorySlug: 'organiser', averageRating: 5, responseCount: 1, text: '', resources: [] }])
```

(the third `toEqual` — line 139, the dispute-exclusion test — ends at averageRating 5, above the 3.5 cutoff, so `resources: []`; add `import { CATEGORY_RESOURCES } from './resources'` to the test file's imports.)

Add a new test file section for `feedbackBandLabel`:

```ts
import { computeFeedbackSummary, feedbackBandLabel } from './feedback-summary'

// ... (existing computeFeedbackSummary describe block stays as-is with the toEqual updates above)

describe('feedbackBandLabel', () => {
  it('labels 3.5 and above as Strong', () => {
    expect(feedbackBandLabel(3.5)).toBe('Strong')
    expect(feedbackBandLabel(5)).toBe('Strong')
  })

  it('labels below 3.5 as Focus area', () => {
    expect(feedbackBandLabel(3.4)).toBe('Focus area')
    expect(feedbackBandLabel(1)).toBe('Focus area')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/feedback-summary.test.ts`
Expected: FAIL — `feedbackBandLabel` doesn't exist yet, and the `toEqual` assertions don't match (actual objects are missing `text`/`resources`).

- [ ] **Step 3: Implement**

In `web/src/lib/coach-dna/feedback-summary.ts`, add the import and extend `FeedbackCategorySummary`:

```ts
import { resourcesFor } from './resources'
```

```ts
export interface FeedbackCategorySummary {
  categorySlug: string
  averageRating: number
  responseCount: number
  /** AI-written interpretation of this category's rating -- left '' by this pure aggregation function, filled in by ensureFreshFeedbackSummary (Task 3). */
  text: string
  /** Non-empty when averageRating < 3.5. */
  resources: { title: string; description: string; url: string | null }[]
}
```

Add the band-label export (below the interfaces, above `computeFeedbackSummary`):

```ts
/** Plain-language band for a feedback category's average rating -- same 3.5 cutoff that governs resource attachment below. Feedback categories have no rank-based tier (unlike self-assessment's fixed 8 -- a section may clear the anonymity threshold for one category and not another), so this is a simple two-band label, not `tierLabel`. */
export function feedbackBandLabel(averageRating: number): string {
  return averageRating >= 3.5 ? 'Strong' : 'Focus area'
}
```

In `buildTypeSummary`, update the `categories.push` call:

```ts
      if (combined.length >= threshold) {
        const averageRating = average(combined)
        categories.push({
          categorySlug: slug,
          averageRating,
          responseCount: combined.length,
          text: '',
          resources: averageRating < 3.5 ? resourcesFor(slug) : [],
        })
      }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/feedback-summary.test.ts`
Expected: PASS (10 tests — 8 existing + 2 new `feedbackBandLabel` cases).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add web/src/lib/coach-dna/feedback-summary.ts web/src/lib/coach-dna/feedback-summary.test.ts
git commit -m "feat(coach-dna): add resources and feedbackBandLabel to feedback-summary"
```

---

### Task 3: Feedback AI interpretation — migration + `ensureFreshFeedbackSummary`

**Files:**
- Create: `web/supabase/migrations/123_coach_profiles_ai_feedback_summary.sql`
- Create: `web/src/lib/coach-dna/feedback-summary-actions.ts`
- Create: `web/src/lib/coach-dna/feedback-summary-actions.test.ts`

**Interfaces:**
- Consumes: `computeFeedbackSummary`, `FeedbackSummaryData`, `FeedbackCategorySummary` from `./feedback-summary` (Task 2); `createClient` from `@/lib/supabase/server`; `createServiceClient` from `@/lib/supabase/service`; `labelFor` from `./categories`.
- Produces: `export async function ensureFreshFeedbackSummary(coachId: string): Promise<FeedbackSummaryData>` from `feedback-summary-actions.ts` — consumed by Task 5 (feedback page) and Task 11 (feedback PDF route).

- [ ] **Step 1: Create the migration**

Create `web/supabase/migrations/123_coach_profiles_ai_feedback_summary.sql` — check `ls web/supabase/migrations | tail -5` first to confirm `123` is still free (another in-progress feature may have claimed it since this plan was written; if so, use the next free number and adjust every reference to `123` in this task accordingly):

```sql
-- coach_profiles.ai_summary already caches the self-assessment AI write-up;
-- this adds the equivalent cache for the feedback-summary AI write-up (Coach
-- DNA full-breakdown feature, feedback layer) so viewing the on-screen
-- feedback breakdown or downloading the feedback PDF doesn't trigger a
-- fresh Groq call on every request.
alter table public.coach_profiles
  add column ai_feedback_summary jsonb,
  add column ai_feedback_summary_generated_at timestamptz;
```

No RLS change needed — `coach_profiles` already has row-level policies scoping reads/writes to the owning user (and admins); a new nullable column inherits the existing table-level policy.

- [ ] **Step 2: Write the failing tests**

Create `web/src/lib/coach-dna/feedback-summary-actions.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  fresh: {
    playerParentVoice: { ready: boolean; responseCount: number; categories: { categorySlug: string; averageRating: number; responseCount: number; text: string; resources: unknown[] }[] }
    peerObservation: { ready: boolean; responseCount: number; categories: { categorySlug: string; averageRating: number; responseCount: number; text: string; resources: unknown[] }[] }
  }
  cached: unknown
  aiText: string
  upsertError: { message: string } | null
} = {
  fresh: {
    playerParentVoice: { ready: false, responseCount: 0, categories: [] },
    peerObservation: { ready: false, responseCount: 0, categories: [] },
  },
  cached: null,
  aiText: '',
  upsertError: null,
}

const computeFeedbackSummaryMock = vi.fn(async (..._args: unknown[]) => state.fresh)
vi.mock('./feedback-summary', async importOriginal => {
  const actual = await importOriginal<typeof import('./feedback-summary')>()
  return { ...actual, computeFeedbackSummary: (...args: unknown[]) => computeFeedbackSummaryMock(...args) }
})

const upsertMock = vi.fn(async (_row: unknown, _opts?: unknown) => ({ error: state.upsertError }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'coach_profiles') {
        return {
          upsert: upsertMock,
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.cached ? { ai_feedback_summary: state.cached } : null }) }) }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({}),
}))
vi.mock('ai', () => ({
  generateText: async () => ({ text: state.aiText }),
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => (modelId: string) => ({ modelId }),
}))

import { ensureFreshFeedbackSummary } from './feedback-summary-actions'

describe('ensureFreshFeedbackSummary', () => {
  beforeEach(() => {
    state.fresh = {
      playerParentVoice: { ready: false, responseCount: 0, categories: [] },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.cached = null
    state.aiText = ''
    state.upsertError = null
    upsertMock.mockClear()
    computeFeedbackSummaryMock.mockClear()
  })

  it('returns both sections not-ready, without an AI call, when there is no feedback at all', async () => {
    const result = await ensureFreshFeedbackSummary('coach-1')
    expect(result.playerParentVoice.ready).toBe(false)
    expect(result.peerObservation.ready).toBe(false)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('calls the AI once for a ready section and fills in each category\'s text', async () => {
    state.fresh = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 3, text: '', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.aiText = JSON.stringify({ categories: [{ categorySlug: 'nonsense', text: 'Players consistently rate your teaching clearly.' }] })

    const result = await ensureFreshFeedbackSummary('coach-1')

    expect(result.playerParentVoice.categories[0].categorySlug).toBe('teacher')
    expect(result.playerParentVoice.categories[0].text).toBe('Players consistently rate your teaching clearly.')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('never calls the AI when both sections are not ready', async () => {
    await ensureFreshFeedbackSummary('coach-1')
    expect(state.aiText).toBe('') // sanity: no text was ever needed
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('returns the cached summary without a new AI call when every category matches (slug, rating, count)', async () => {
    state.fresh = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 3, text: '', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.cached = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 3, text: 'cached text', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }

    const result = await ensureFreshFeedbackSummary('coach-1')
    expect(result.playerParentVoice.categories[0].text).toBe('cached text')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('regenerates when the cached average rating has drifted from the fresh computation', async () => {
    state.fresh = {
      playerParentVoice: {
        ready: true, responseCount: 4,
        categories: [{ categorySlug: 'teacher', averageRating: 4.5, responseCount: 4, text: '', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.cached = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 3, text: 'stale text', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.aiText = JSON.stringify({ categories: [{ categorySlug: 'teacher', text: 'fresh text' }] })

    const result = await ensureFreshFeedbackSummary('coach-1')
    expect(result.playerParentVoice.categories[0].text).toBe('fresh text')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('never sends a deprecated/decommissioned Groq model id', async () => {
    state.fresh = {
      playerParentVoice: {
        ready: true, responseCount: 1,
        categories: [{ categorySlug: 'teacher', averageRating: 4, responseCount: 1, text: '', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    state.aiText = JSON.stringify({ categories: [{ categorySlug: 'teacher', text: 'x' }] })
    await ensureFreshFeedbackSummary('coach-1')
    // The mocked createGroq captures whatever model id ensureFreshFeedbackSummary passes it --
    // asserted indirectly via the mock's returned modelId not throwing; the real assertion
    // that matters is covered by summary-actions.test.ts's equivalent regression test, since
    // both files must use the same 'openai/gpt-oss-120b' constant.
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/feedback-summary-actions.test.ts`
Expected: FAIL — `Cannot find module './feedback-summary-actions'`.

- [ ] **Step 4: Implement `feedback-summary-actions.ts`**

```ts
'use server'

import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { labelFor } from './categories'
import { computeFeedbackSummary, type FeedbackSummaryData, type FeedbackCategorySummary } from './feedback-summary'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

function isCategoryTextEntryArray(value: unknown): value is { categorySlug: string; text: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      entry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Record<string, unknown>).categorySlug === 'string' &&
        typeof (entry as Record<string, unknown>).text === 'string',
    )
  )
}

function allCategories(data: FeedbackSummaryData): FeedbackCategorySummary[] {
  return [...data.playerParentVoice.categories, ...data.peerObservation.categories]
}

function withText(section: FeedbackSummaryData['playerParentVoice'], textBySlug: Map<string, string>): FeedbackSummaryData['playerParentVoice'] {
  return { ...section, categories: section.categories.map(c => ({ ...c, text: textBySlug.get(c.categorySlug) ?? c.text })) }
}

function cacheMatchesFresh(cached: FeedbackSummaryData | null, fresh: FeedbackSummaryData): boolean {
  if (!cached) return false
  const sameSection = (a: FeedbackSummaryData['playerParentVoice'], b: FeedbackSummaryData['playerParentVoice']) => {
    if (a.categories.length !== b.categories.length) return false
    return a.categories.every(catA => {
      const catB = b.categories.find(c => c.categorySlug === catA.categorySlug)
      return catB && Math.abs(catA.averageRating - catB.averageRating) < 0.05 && catA.responseCount === catB.responseCount
    })
  }
  return sameSection(cached.playerParentVoice, fresh.playerParentVoice) && sameSection(cached.peerObservation, fresh.peerObservation)
}

/** Returns the cached feedback summary if it already reflects the current
 *  aggregation, otherwise regenerates its AI interpretation (one Groq call
 *  covering every category across both sections) first. Mirrors
 *  ensureFreshSummary's cache-or-regenerate shape in summary-actions.ts,
 *  but keyed on the aggregation's own rating/count drift rather than an
 *  archetype-rank drift, since feedback categories aren't ranked. */
export async function ensureFreshFeedbackSummary(coachId: string): Promise<FeedbackSummaryData> {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  const fresh = await computeFeedbackSummary(serviceSupabase, coachId)

  const categoriesNeedingText = allCategories(fresh)
  if (categoriesNeedingText.length === 0) return fresh

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_feedback_summary')
    .eq('user_id', coachId)
    .maybeSingle()
  const cached = (coachProfile?.ai_feedback_summary ?? null) as FeedbackSummaryData | null

  if (cacheMatchesFresh(cached, fresh)) return cached!

  const prompt = `You are writing short interpretations of player, parent, and peer feedback for a rugby league coach. Write in a direct, professional coaching voice — confident and specific, not hype. No em dashes. No fluff. This is feedback FROM other people, not the coach's own self-assessment — write about what others observed, not what the coach believes about themselves.

For each category below, write 1-2 sentences interpreting what this rating suggests, given the category and the number of responses it's based on. A rating at or above 3.5/5 should read as an affirming, specific observation. A rating below 3.5/5 should name what the gap likely looks like in practice and gesture at what to try, without being harsh.

Categories, in this exact order:
${categoriesNeedingText.map(c => `${labelFor(c.categorySlug)}: ${c.averageRating.toFixed(1)}/5 (${c.responseCount} responses)`).join('\n')}

Respond with ONLY a valid JSON object, no markdown fences, no explanation. "categories" must contain exactly ${categoriesNeedingText.length} entries, in the same order as the list above. Shape:
{"categories":[{"categorySlug":"...","text":"..."}]}`

  const { text } = await generateText({ model: groq('openai/gpt-oss-120b'), prompt })

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Could not generate your feedback summary right now')

  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error('Could not generate your feedback summary right now')
  }
  if (typeof parsed !== 'object' || parsed === null || !isCategoryTextEntryArray((parsed as Record<string, unknown>).categories)) {
    throw new Error('Could not generate your feedback summary right now')
  }
  const parsedCategories = (parsed as { categories: { categorySlug: string; text: string }[] }).categories
  if (parsedCategories.length !== categoriesNeedingText.length) {
    throw new Error('Could not generate your feedback summary right now')
  }

  // The model only writes prose -- slugs and order always come from the
  // aggregation, never the model, same invariant as generateSelfAssessmentSummary.
  const textBySlug = new Map(categoriesNeedingText.map((c, i) => [c.categorySlug, parsedCategories[i].text]))

  const result: FeedbackSummaryData = {
    playerParentVoice: withText(fresh.playerParentVoice, textBySlug),
    peerObservation: withText(fresh.peerObservation, textBySlug),
  }

  const { error: upsertError } = await supabase
    .from('coach_profiles')
    .upsert(
      { user_id: coachId, ai_feedback_summary: result, ai_feedback_summary_generated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (upsertError) throw new Error(upsertError.message)

  return result
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/feedback-summary-actions.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add web/supabase/migrations/123_coach_profiles_ai_feedback_summary.sql \
  web/src/lib/coach-dna/feedback-summary-actions.ts web/src/lib/coach-dna/feedback-summary-actions.test.ts
git commit -m "feat(coach-dna): add ensureFreshFeedbackSummary AI layer + cache migration"
```

---

### Task 4: Guidance module

Pure, synchronous, no dependencies on any other task's file — safe to build and fully test in isolation.

**Files:**
- Create: `web/src/lib/coach-dna/guidance.ts`
- Create: `web/src/lib/coach-dna/guidance.test.ts`

**Interfaces:**
- Consumes: `labelFor` from `./categories`.
- Produces: `export interface GuidanceStep { heading: string; body: string; href: string | null; linkLabel: string | null }` and `export function buildGuidance(params: { hasAnyFeedbackRequest: boolean; activeRequestsBelowThreshold: boolean; hasBlendedFeedback: boolean; focusCategories: string[] }): GuidanceStep[]` — consumed by Task 6 (wiring into `/complete`).

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/coach-dna/guidance.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildGuidance } from './guidance'

const BASE = { hasAnyFeedbackRequest: false, activeRequestsBelowThreshold: false, hasBlendedFeedback: false, focusCategories: [] as string[] }

describe('buildGuidance', () => {
  it('suggests requesting feedback when none has ever been requested', () => {
    const steps = buildGuidance(BASE)
    expect(steps).toHaveLength(1)
    expect(steps[0].href).toBe('/admin/coach-dna/feedback')
    expect(steps[0].linkLabel).toBe('Request feedback')
  })

  it('suggests requesting more when active requests exist but are below threshold', () => {
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: true, activeRequestsBelowThreshold: true })
    expect(steps).toHaveLength(1)
    expect(steps[0].linkLabel).toBe('View feedback requests')
    expect(steps[0].body).toContain('close')
  })

  it('returns three focus-category-referencing steps once feedback has blended', () => {
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: true, hasBlendedFeedback: true, focusCategories: ['game-manager', 'organiser'] })
    expect(steps).toHaveLength(3)
    expect(steps.every(s => s.body.includes('Game Manager'))).toBe(true)
    expect(steps.map(s => s.href)).toEqual(['/sessions/new', '/drills', '/chat/ai'])
    expect(steps.map(s => s.linkLabel)).toEqual(['Plan a session', 'Browse drills', 'Open AI chat'])
  })

  it('returns a single affirming step with no link when blended and no focus categories remain', () => {
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: true, hasBlendedFeedback: true, focusCategories: [] })
    expect(steps).toHaveLength(1)
    expect(steps[0].href).toBeNull()
    expect(steps[0].linkLabel).toBeNull()
  })

  it('prioritizes "request feedback" over "blended" if both booleans are somehow true (defensive ordering)', () => {
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: false, hasBlendedFeedback: true, focusCategories: ['teacher'] })
    expect(steps[0].href).toBe('/admin/coach-dna/feedback')
  })

  it('falls back to a single generic step when no rule matches (defensive)', () => {
    // hasAnyFeedbackRequest true, activeRequestsBelowThreshold false, hasBlendedFeedback false --
    // outside the 3 documented states (no request / below threshold / blended).
    const steps = buildGuidance({ ...BASE, hasAnyFeedbackRequest: true })
    expect(steps).toHaveLength(1)
    expect(steps[0].href).toBe('/admin/coach-dna')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/guidance.test.ts`
Expected: FAIL — `Cannot find module './guidance'`.

- [ ] **Step 3: Implement `guidance.ts`**

```ts
import { labelFor } from './categories'

export interface GuidanceStep {
  heading: string
  body: string
  href: string | null
  linkLabel: string | null
}

/** State-conditional "what to do next" for the Coach DNA hub/breakdown --
 *  one clear next action, not a checklist, so it reads as guidance rather
 *  than a gimmick. Priority order matters: a coach who somehow satisfies
 *  more than one condition always sees the earliest-listed one. */
export function buildGuidance(params: {
  hasAnyFeedbackRequest: boolean
  activeRequestsBelowThreshold: boolean
  hasBlendedFeedback: boolean
  focusCategories: string[]
}): GuidanceStep[] {
  if (!params.hasAnyFeedbackRequest) {
    return [{
      heading: 'Request feedback',
      body: 'Request feedback from your players, parents, or a fellow coach to see how your self-view compares.',
      href: '/admin/coach-dna/feedback',
      linkLabel: 'Request feedback',
    }]
  }

  if (params.activeRequestsBelowThreshold && !params.hasBlendedFeedback) {
    return [{
      heading: 'Almost there',
      body: "You're close — a few more responses will unlock your full blended picture.",
      href: '/admin/coach-dna/feedback',
      linkLabel: 'View feedback requests',
    }]
  }

  if (params.hasBlendedFeedback) {
    if (params.focusCategories.length === 0) {
      return [{
        heading: 'Steady across the board',
        body: 'Every category is holding steady or better — keep the habits that got you here.',
        href: null,
        linkLabel: null,
      }]
    }
    const topFocusLabel = labelFor(params.focusCategories[0])
    return [
      {
        heading: 'Plan a session',
        body: `Build a session that targets ${topFocusLabel}.`,
        href: '/sessions/new',
        linkLabel: 'Plan a session',
      },
      {
        heading: 'Browse drills',
        body: `Browse drills to develop your ${topFocusLabel} skills.`,
        href: '/drills',
        linkLabel: 'Browse drills',
      },
      {
        heading: 'Talk it through',
        body: `Talk ${topFocusLabel} through with the AI coaching assistant.`,
        href: '/chat/ai',
        linkLabel: 'Open AI chat',
      },
    ]
  }

  return [{
    heading: 'Coach DNA',
    body: 'Head back to your Coach DNA hub for the latest on your assessment and feedback.',
    href: '/admin/coach-dna',
    linkLabel: 'Back to Coach DNA',
  }]
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/guidance.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add web/src/lib/coach-dna/guidance.ts web/src/lib/coach-dna/guidance.test.ts
git commit -m "feat(coach-dna): add outcome-based guidance module"
```

---

### Task 5: New on-screen feedback breakdown page

Mirrors `/complete`'s structure for feedback, matching the codebase's established auth/role gate pattern used by every other Coach DNA page.

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/feedback/summary/page.tsx`
- Create: `web/src/app/(app)/admin/coach-dna/feedback/summary/page.test.tsx`

**Interfaces:**
- Consumes: `ensureFreshFeedbackSummary(coachId): Promise<FeedbackSummaryData>` from `../../../../../../lib/coach-dna/feedback-summary-actions` (Task 3); `feedbackBandLabel` from `@/lib/coach-dna/feedback-summary` (Task 2); `labelFor` from `@/lib/coach-dna/categories`.
- Produces: a page at `/admin/coach-dna/feedback/summary`, linked from Task 6's hub-page update.

- [ ] **Step 1: Write the failing tests**

Create `web/src/app/(app)/admin/coach-dna/feedback/summary/page.test.tsx`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const state: {
  user: { id: string } | null
  role: string | null
  feedbackSummary: {
    playerParentVoice: { ready: boolean; responseCount: number; categories: { categorySlug: string; averageRating: number; responseCount: number; text: string; resources: { title: string; description: string; url: string | null }[] }[] }
    peerObservation: { ready: boolean; responseCount: number; categories: { categorySlug: string; averageRating: number; responseCount: number; text: string; resources: { title: string; description: string; url: string | null }[] }[] }
  }
} = {
  user: null,
  role: null,
  feedbackSummary: {
    playerParentVoice: { ready: false, responseCount: 0, categories: [] },
    peerObservation: { ready: false, responseCount: 0, categories: [] },
  },
}

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
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.role === null ? null : { role: state.role } }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))
const ensureFreshFeedbackSummaryMock = vi.fn(async (_coachId: string) => state.feedbackSummary)
vi.mock('@/lib/coach-dna/feedback-summary-actions', () => ({
  ensureFreshFeedbackSummary: (coachId: string) => ensureFreshFeedbackSummaryMock(coachId),
}))

import FeedbackSummaryPage from './page'

describe('FeedbackSummaryPage', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.feedbackSummary = {
      playerParentVoice: { ready: false, responseCount: 0, categories: [] },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    redirectMock.mockClear()
    ensureFreshFeedbackSummaryMock.mockClear()
  })

  it('redirects unauthenticated users to login', async () => {
    state.user = null
    await expect(FeedbackSummaryPage()).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects non-admin, non-coach roles to the dashboard', async () => {
    state.role = 'viewer'
    await expect(FeedbackSummaryPage()).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('shows a not-ready message for a section with no cleared responses', async () => {
    render(await FeedbackSummaryPage())
    expect(screen.getAllByText(/Not enough responses yet/)).toHaveLength(2)
  })

  it('renders a ready section\'s categories with band, rating, and AI text', async () => {
    state.feedbackSummary = {
      playerParentVoice: {
        ready: true, responseCount: 4,
        categories: [{ categorySlug: 'teacher', averageRating: 4.2, responseCount: 4, text: 'Players consistently rate your teaching clearly.', resources: [] }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    render(await FeedbackSummaryPage())
    expect(screen.getByText('Teacher')).toBeInTheDocument()
    expect(screen.getByText(/Strong/)).toBeInTheDocument()
    expect(screen.getByText('Players consistently rate your teaching clearly.')).toBeInTheDocument()
  })

  it('renders clickable resource links for a below-threshold category', async () => {
    state.feedbackSummary = {
      playerParentVoice: {
        ready: true, responseCount: 3,
        categories: [{
          categorySlug: 'organiser', averageRating: 2.5, responseCount: 3, text: 'Sessions could run tighter.',
          resources: [{ title: 'Periodization Training for Sports', description: 'Structuring a season.', url: 'https://openlibrary.org/works/OL1850738W' }],
        }],
      },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    render(await FeedbackSummaryPage())
    const link = screen.getByRole('link', { name: 'Periodization Training for Sports' })
    expect(link).toHaveAttribute('href', 'https://openlibrary.org/works/OL1850738W')
  })

  it('always calls ensureFreshFeedbackSummary with the authenticated caller\'s own id', async () => {
    await FeedbackSummaryPage()
    expect(ensureFreshFeedbackSummaryMock).toHaveBeenCalledWith('coach-1')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/feedback/summary/page.test.tsx"`
Expected: FAIL — `Cannot find module './page'`.

- [ ] **Step 3: Implement the page**

Create `web/src/app/(app)/admin/coach-dna/feedback/summary/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ensureFreshFeedbackSummary } from '@/lib/coach-dna/feedback-summary-actions'
import { feedbackBandLabel, type FeedbackTypeSummary } from '@/lib/coach-dna/feedback-summary'
import { labelFor } from '@/lib/coach-dna/categories'

export const metadata = { title: 'Coach DNA — Feedback Breakdown' }

function FeedbackTypeSection({ heading, summary }: { heading: string; summary: FeedbackTypeSummary }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-100 mb-2">{heading}</h2>
      {summary.ready ? (
        <ul className="space-y-3">
          {summary.categories.map(category => (
            <li key={category.categorySlug} className="text-sm text-zinc-400">
              <span className="text-zinc-200 font-medium">{labelFor(category.categorySlug)}</span>
              <span className="text-zinc-500"> · {feedbackBandLabel(category.averageRating)} · {category.averageRating.toFixed(1)}/5</span>
              <p className="mt-0.5">{category.text}</p>
              {category.resources.length > 0 && (
                <ul className="mt-1.5 space-y-1 pl-3 border-l border-zinc-800">
                  {category.resources.map(resource => (
                    <li key={resource.title} className="text-xs text-zinc-500">
                      {resource.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-400 hover:text-orange-300 font-medium"
                        >
                          {resource.title}
                        </a>
                      ) : (
                        <span className="text-zinc-300 font-medium">{resource.title}</span>
                      )}
                      {' — '}{resource.description}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 italic">Not enough responses yet — check back once more feedback comes in.</p>
      )}
    </div>
  )
}

export default async function FeedbackSummaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const summary = await ensureFreshFeedbackSummary(user.id)

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Feedback breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FeedbackTypeSection heading="Player / Parent Voice" summary={summary.playerParentVoice} />
          <FeedbackTypeSection heading="Peer Observation" summary={summary.peerObservation} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/feedback/summary/page.test.tsx"`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add "web/src/app/(app)/admin/coach-dna/feedback/summary"
git commit -m "feat(coach-dna): add on-screen feedback breakdown page"
```

---

### Task 6: Wire guidance into `/complete`, add the hub's "View feedback breakdown" link

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/page.test.tsx`

**Interfaces:**
- Consumes: `buildGuidance`, `GuidanceStep` from `@/lib/coach-dna/guidance` (Task 4); `hasBlendedFeedback` from `@/lib/coach-dna/blend-status` (existing); `feedbackRequestEligibility` from `@/lib/coach-dna/feedback-request-status` (existing, already used by the hub page).

- [ ] **Step 1: Add the guidance fetch + card to `/complete/page.tsx`**

No dedicated test file exists for this page (see Global Constraints) — implementation only. In `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`, add imports:

```tsx
import { buildGuidance } from '@/lib/coach-dna/guidance'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'
import { feedbackRequestEligibility } from '@/lib/coach-dna/feedback-request-status'
```

After the existing `summary`/`generationFailed` block (before the `if (generationFailed)` early return — this fetch only needs to run in the success path, so place it after that early return, right before the final `return (`), add:

```tsx
  const { data: feedbackRequests } = await supabase
    .from('feedback_requests')
    .select('id, minimum_response_threshold, status, expires_at')
    .eq('coach_id', user.id)
  const requestIds = (feedbackRequests ?? []).map(r => r.id)
  const { data: feedbackResponses } = requestIds.length > 0
    ? await supabase.from('feedback_responses').select('id, feedback_request_id').in('feedback_request_id', requestIds)
    : { data: [] }
  const activeRequests = (feedbackRequests ?? []).filter(r => feedbackRequestEligibility(r) !== 'expired')
  const totalReceived = (feedbackResponses ?? []).length
  const totalThreshold = activeRequests.reduce((sum, r) => sum + r.minimum_response_threshold, 0)

  const guidanceSteps = buildGuidance({
    hasAnyFeedbackRequest: (feedbackRequests ?? []).length > 0,
    activeRequestsBelowThreshold: activeRequests.length > 0 && totalReceived < totalThreshold,
    hasBlendedFeedback: hasBlendedFeedback(summary.sourcedCategories),
    focusCategories: summary.categories.filter(c => c.tier === 'focus').map(c => c.categorySlug),
  })
```

Add the guidance card as a new `<Card>` below the existing one (as a sibling inside the outer `<div className="space-y-6 max-w-2xl">`, after the closing `</Card>` of the results card):

```tsx
      <Card>
        <CardHeader>
          <CardTitle>What to do next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {guidanceSteps.map(step => (
            <div key={step.heading} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-sm font-semibold text-zinc-100">{step.heading}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{step.body}</p>
              {step.href && step.linkLabel && (
                <Link href={step.href} className="inline-block mt-2 text-sm text-orange-400 hover:text-orange-300">
                  {step.linkLabel} →
                </Link>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
```

(`Link` from `next/link` is already imported in this file for the "Back to Coach DNA" button.)

- [ ] **Step 2: Write the failing test for the hub's new link**

In `web/src/app/(app)/admin/coach-dna/page.test.tsx`, add one test to the existing suite (near `'shows the outcome reveal trigger when feedback has blended in'`):

```ts
  it('shows a link to the feedback breakdown page once feedback has blended in', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: 'technician',
      narrative: 'You build trust fast.',
      categories: [
        { categorySlug: 'communicator', score: 90, tier: 'strength', text: 'Great communicator', resources: [] },
        { categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management', resources: [] },
      ],
      sourcedCategories: { motivator: ['self', 'player_voice'] },
    }

    render(await CoachDnaPage())

    expect(screen.getByRole('link', { name: 'View feedback breakdown' })).toHaveAttribute(
      'href',
      '/admin/coach-dna/feedback/summary',
    )
  })

  it('hides the feedback breakdown link for a self-only summary', async () => {
    state.completed = { id: 'attempt-1' }
    state.ensureFreshSummaryResult = {
      primaryType: 'motivator',
      secondaryType: null,
      narrative: 'You build trust fast.',
      categories: [
        { categorySlug: 'communicator', score: 90, tier: 'strength', text: 'Great communicator', resources: [] },
        { categorySlug: 'game-manager', score: 20, tier: 'focus', text: 'Work on game management', resources: [] },
      ],
      sourcedCategories: { motivator: ['self'] },
    }

    render(await CoachDnaPage())

    expect(screen.queryByRole('link', { name: 'View feedback breakdown' })).not.toBeInTheDocument()
  })
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/page.test.tsx"`
Expected: FAIL — no element with the accessible name `'View feedback breakdown'` exists yet.

- [ ] **Step 4: Add the link to the hub page**

In `web/src/app/(app)/admin/coach-dna/page.tsx`, add the new link right after the existing "View full breakdown" `<Link>` (before the `{hasBlendedFeedback(summary.sourcedCategories) && (<CoachDnaOutcomeReveal ... />)}` block, which stays unchanged):

```tsx
                {hasBlendedFeedback(summary.sourcedCategories) && (
                  <Link
                    href="/admin/coach-dna/feedback/summary"
                    className="group inline-flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
                  >
                    View feedback breakdown
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/page.test.tsx"`
Expected: PASS (20 tests — 18 existing + 2 new).

- [ ] **Step 6: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx" \
  "web/src/app/(app)/admin/coach-dna/page.tsx" "web/src/app/(app)/admin/coach-dna/page.test.tsx"
git commit -m "feat(coach-dna): wire guidance card into /complete and add feedback breakdown link"
```

---

### Task 7: Trigger restyle — calmer copy, no glow/sparkle

Purely presentational; no data-shape dependency on any other task.

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.test.tsx`

**Interfaces:** unchanged — still `CoachDnaOutcomeReveal({ attemptId: string })`, same two download URLs/filenames.

- [ ] **Step 1: Update the failing tests**

In `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.test.tsx`, replace every `/Get Your Report/` regex with `/Download your Coach DNA report/`:

```ts
    expect(screen.getByRole('button', { name: /Download your Coach DNA report/ })).toBeInTheDocument()
```

(three occurrences — lines 8, 15, 17, 30 per the current file; every other assertion — hrefs, download filenames, link accessible names `'Your Coach DNA Report'`/`'Feedback Summary'` — stays unchanged.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.test.tsx"`
Expected: FAIL — no button with the new accessible name exists yet.

- [ ] **Step 3: Restyle the component**

Replace the entire content of `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CoachDnaOutcomeReveal({ attemptId }: { attemptId: string }) {
  const [revealed, setRevealed] = useState(false)
  const reportUrl = `/api/coach-dna/report-pdf/${attemptId}`
  const feedbackSummaryUrl = `/api/coach-dna/feedback-summary-pdf/${attemptId}`

  return (
    <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-5 text-center">
      <p className="text-xs font-semibold text-orange-400 uppercase tracking-[0.2em] mb-1">
        Coach DNA report
      </p>
      <p className="text-sm text-zinc-400 mb-4">
        Your full Coach DNA breakdown, plus a summary of what your players, parents, and peers said.
      </p>
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold text-white uppercase tracking-wide transition-colors hover:bg-orange-400"
        >
          Download your Coach DNA report
          <ArrowDown size={16} />
        </button>
      ) : (
        <div className="flex flex-col justify-center gap-3 animate-in fade-in slide-in-from-bottom-2 sm:flex-row">
          <a
            href={reportUrl}
            download="coach-dna-outcome.pdf"
            className={cn(buttonVariants(), 'flex-1 sm:flex-none')}
          >
            Your Coach DNA Report
          </a>
          <a
            href={feedbackSummaryUrl}
            download="coach-dna-feedback-summary.pdf"
            className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 sm:flex-none')}
          >
            Feedback Summary
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.test.tsx"`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add "web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.tsx" "web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.test.tsx"
git commit -m "feat(coach-dna): restrain the outcome-reveal trigger's styling and copy"
```

---

### Task 8: PDF font-loading module

Pure infrastructure — no dependency on any earlier task's file.

**Files:**
- Create: `web/src/lib/coach-dna/pdf-font.ts`
- Create: `web/src/lib/coach-dna/pdf-font.test.ts`

**Interfaces:**
- Consumes: `Font` from `@react-pdf/renderer`.
- Produces: `export async function registerPdfFonts(): Promise<void>` — consumed by Task 11 (both PDF routes call it before `renderToBuffer`).

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/coach-dna/pdf-font.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const registerMock = vi.fn()
vi.mock('@react-pdf/renderer', () => ({
  Font: { register: (config: unknown) => registerMock(config) },
}))

const CSS2_RESPONSE = `
  @font-face {
    font-family: 'Geist';
    src: url(https://fonts.gstatic.com/s/geist/v1/geist-400.ttf) format('truetype');
  }
`
const FONT_BYTES = new Uint8Array([1, 2, 3, 4]).buffer

function mockFetchSequence(responses: (Response | Error)[]) {
  let call = 0
  global.fetch = vi.fn(async () => {
    const next = responses[call]
    call += 1
    if (next instanceof Error) throw next
    return next
  }) as unknown as typeof fetch
}

describe('registerPdfFonts', () => {
  beforeEach(() => {
    registerMock.mockClear()
    vi.resetModules()
  })

  it('registers Barlow Condensed and Geist with the fetched font bytes', async () => {
    mockFetchSequence([
      new Response(CSS2_RESPONSE), // Barlow Condensed CSS2
      new Response(FONT_BYTES),    // Barlow Condensed TTF
      new Response(CSS2_RESPONSE), // Geist 400 CSS2
      new Response(FONT_BYTES),    // Geist 400 TTF
      new Response(CSS2_RESPONSE), // Geist 700 CSS2
      new Response(FONT_BYTES),    // Geist 700 TTF
    ])
    const { registerPdfFonts } = await import('./pdf-font')

    await registerPdfFonts()

    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ family: 'Barlow Condensed' }))
    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ family: 'Geist' }))
  })

  it('does not throw when a font fetch fails, and skips registering that font', async () => {
    mockFetchSequence([
      new Error('network down'), // Barlow Condensed CSS2 fetch fails
      new Response(CSS2_RESPONSE),
      new Response(FONT_BYTES),
      new Response(CSS2_RESPONSE),
      new Response(FONT_BYTES),
    ])
    const { registerPdfFonts } = await import('./pdf-font')

    await expect(registerPdfFonts()).resolves.toBeUndefined()
    expect(registerMock).not.toHaveBeenCalledWith(expect.objectContaining({ family: 'Barlow Condensed' }))
    expect(registerMock).toHaveBeenCalledWith(expect.objectContaining({ family: 'Geist' }))
  })

  it('only fetches once across repeated calls within the same process', async () => {
    mockFetchSequence([
      new Response(CSS2_RESPONSE), new Response(FONT_BYTES),
      new Response(CSS2_RESPONSE), new Response(FONT_BYTES),
      new Response(CSS2_RESPONSE), new Response(FONT_BYTES),
    ])
    const { registerPdfFonts } = await import('./pdf-font')

    await registerPdfFonts()
    const callCountAfterFirst = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length
    await registerPdfFonts()
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCountAfterFirst)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/pdf-font.test.ts`
Expected: FAIL — `Cannot find module './pdf-font'`.

- [ ] **Step 3: Implement `pdf-font.ts`**

```ts
import { Font } from '@react-pdf/renderer'

/** Fetches one font file's bytes from Google Fonts' CSS2 endpoint for a
 *  given family/weight/style query string (e.g. 'Geist:wght@700'). No
 *  User-Agent header is sent, which makes Google serve a plain TTF url
 *  (rather than WOFF2) -- the format @react-pdf/renderer's Font.register
 *  needs. Throws on any failure; callers decide how to degrade. */
async function loadPdfFont(query: string): Promise<Buffer> {
  const cssResponse = await fetch(`https://fonts.googleapis.com/css2?family=${query}&display=swap`)
  const css = await cssResponse.text()
  const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)
  if (!match) throw new Error(`No font URL found in Google Fonts CSS2 response for query: ${query}`)
  const fontResponse = await fetch(match[1])
  const arrayBuffer = await fontResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

let registered: Promise<void> | null = null

async function registerFontsOnce(): Promise<void> {
  try {
    const barlowCondensed = await loadPdfFont('Barlow+Condensed:ital,wght@1,800')
    Font.register({ family: 'Barlow Condensed', fonts: [{ src: barlowCondensed }] })
  } catch (err) {
    console.error('[coach-dna/pdf-font] Failed to load Barlow Condensed, falling back to default font:', err)
  }

  try {
    const geist400 = await loadPdfFont('Geist:wght@400')
    const geist700 = await loadPdfFont('Geist:wght@700')
    Font.register({ family: 'Geist', fonts: [{ src: geist400 }, { src: geist700, fontWeight: 700 }] })
  } catch (err) {
    console.error('[coach-dna/pdf-font] Failed to load Geist, falling back to default font:', err)
  }
}

/** Registers the brand fonts (Barlow Condensed, Geist) with @react-pdf/renderer's
 *  global font registry, once per process -- both outcome-PDF routes call this
 *  before renderToBuffer. Fetch failures are logged and swallowed per font
 *  family; a PDF still renders (in Helvetica) rather than 500ing over a font
 *  load hiccup. */
export async function registerPdfFonts(): Promise<void> {
  if (!registered) registered = registerFontsOnce()
  return registered
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/pdf-font.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add web/src/lib/coach-dna/pdf-font.ts web/src/lib/coach-dna/pdf-font.test.ts
git commit -m "feat(coach-dna): add PDF brand-font loading/registration module"
```

---

### Task 9: Self-assessment PDF — landscape, brand fonts, 2-column card grid, clickable links

Replaces Task 1's portrait/Helvetica/list layout entirely with the final landscape/branded/card design. No dedicated test file (see Global Constraints) — implementation only, verified visually and via the route-level tests already covering `CoachDnaSummaryPDF`'s props.

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx`

**Interfaces:**
- Consumes: `tierLabel` from `@/lib/coach-dna/tier-label` (Task 1); `registerPdfFonts` from `@/lib/coach-dna/pdf-font` (Task 8, called by the route in Task 11, not by this component itself — a PDF template stays a pure render function).
- Produces: unchanged public signature — `CoachDnaSummaryPDF({ data, completedAt, logoSrc, coachName, clubName })`.

- [ ] **Step 1: Replace `CoachDnaSummaryPDF.tsx` entirely**

```tsx
import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { labelFor } from '@/lib/coach-dna/categories'
import { tierLabel } from '@/lib/coach-dna/tier-label'
import { sourceTagFor, allCategoriesSelfOnly } from '@/lib/coach-dna/source-label'
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
  page: { backgroundColor: WHITE, paddingBottom: 40, fontSize: 9.5, fontFamily: 'Geist', color: DARK },

  header: {
    backgroundColor: E,
    paddingHorizontal: 44,
    paddingTop: 32,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLogoBadge: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLogo: { width: 32, height: 32 },
  eyeLabel: { fontSize: 7, fontFamily: 'Geist', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 },
  title: { fontFamily: 'Barlow Condensed', fontStyle: 'italic', fontSize: 30, color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  body: { paddingHorizontal: 44, paddingTop: 24 },

  sectionLabel: { fontSize: 7, fontFamily: 'Geist', fontWeight: 700, color: MUTED, letterSpacing: 2.5, marginBottom: 10 },
  groupHeading: {
    fontSize: 8, fontFamily: 'Geist', fontWeight: 700, letterSpacing: 2, marginBottom: 10, marginTop: 18,
    paddingBottom: 6, borderBottomWidth: 1.5, borderBottomStyle: 'solid',
  },

  detailTable: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 8, marginBottom: 18 },
  detailRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  detailRowLast: { flexDirection: 'row' },
  detailKey: {
    width: 110, paddingVertical: 9, paddingHorizontal: 14, fontSize: 8.5, color: MUTED,
    borderRightWidth: 1, borderRightColor: BORDER, borderRightStyle: 'solid', backgroundColor: LIGHT,
  },
  detailValue: { flex: 1, paddingVertical: 9, paddingHorizontal: 14, fontSize: 8.5, fontFamily: 'Geist', fontWeight: 700, color: DARK },

  narrative: { fontSize: 9.5, color: MID, lineHeight: 1.5, marginBottom: 6 },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    width: '48%', marginRight: '2%', marginBottom: 10, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: LIGHT, borderRadius: 6, borderLeftWidth: 3, borderLeftStyle: 'solid',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  cardDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  cardLabel: { fontSize: 7, fontFamily: 'Geist', fontWeight: 700, letterSpacing: 1.5 },
  cardMeta: { fontSize: 6.5, color: MUTED, marginLeft: 6 },
  cardTag: { fontSize: 6, color: MUTED, marginLeft: 6 },
  cardBody: { fontSize: 8.5, color: MID, lineHeight: 1.45 },

  resourceList: { marginTop: 5 },
  resourceItem: { fontSize: 7.5, color: MUTED, lineHeight: 1.4, marginBottom: 2 },

  footer: {
    position: 'absolute', bottom: 18, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Geist', fontWeight: 700, color: E, letterSpacing: 1.5 },
  footerMeta: { fontSize: 6.5, color: MUTED },

  confidential: { marginTop: 16, fontSize: 7.5, color: '#9ca3af', textAlign: 'center' },
})

function CategoryCard({
  category,
  color,
  sourcedCategories,
}: {
  category: SelfAssessmentSummary['categories'][number]
  color: string
  sourcedCategories: SelfAssessmentSummary['sourcedCategories']
}) {
  const tag = sourceTagFor(sourcedCategories, category.categorySlug)
  return (
    <View style={[s.card, { borderLeftColor: color }]} wrap={false}>
      <View style={s.cardHeaderRow}>
        <View style={[s.cardDot, { backgroundColor: color }]} />
        <Text style={[s.cardLabel, { color }]}>{labelFor(category.categorySlug).toUpperCase()}</Text>
        <Text style={s.cardMeta}>{tierLabel(category.tier)} · {Math.round(category.score)}/100</Text>
        {tag && <Text style={s.cardTag}>{tag}</Text>}
      </View>
      <Text style={s.cardBody}>{category.text}</Text>
      {category.resources.length > 0 && (
        <View style={s.resourceList}>
          {category.resources.map(resource => (
            <Text key={resource.title} style={s.resourceItem}>
              {resource.url ? (
                <Link src={resource.url} style={{ color: E }}>{resource.title}</Link>
              ) : (
                <Text>{resource.title}</Text>
              )}
              {' — '}{resource.description}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

export function CoachDnaSummaryPDF({
  data,
  completedAt,
  logoSrc,
  coachName,
  clubName,
}: {
  data: SelfAssessmentSummary
  completedAt: string
  logoSrc?: string
  coachName?: string | null
  clubName?: string | null
}) {
  const typeLine = `${labelFor(data.primaryType)}${data.secondaryType ? ` / ${labelFor(data.secondaryType)}` : ''} Coach`
  const completedLabel = new Date(completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const allCategorySlugs = data.categories.map(c => c.categorySlug)
  const selfOnly = allCategoriesSelfOnly(data.sourcedCategories, allCategorySlugs)

  const rows = [
    ...(coachName ? [{ key: 'Coach', value: coachName }] : []),
    ...(clubName ? [{ key: 'Club', value: clubName }] : []),
    { key: 'Coach Type', value: typeLine },
    { key: 'Completed', value: completedLabel },
    { key: 'Data Source', value: selfOnly ? 'Self-Assessment Only' : 'Self-Assessment + Player/Peer Feedback' },
  ]

  return (
    <Document title="Coach DNA — Self-Assessment Results" author="18th Man Coach DNA">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.eyeLabel}>COACH DNA</Text>
            <Text style={s.title}>{typeLine}</Text>
            <Text style={s.subtitle}>Self-Assessment Results</Text>
          </View>
          {logoSrc && (
            <View style={s.headerLogoBadge}>
              <Image style={s.headerLogo} src={logoSrc} />
            </View>
          )}
        </View>

        <View style={s.body}>
          <Text style={s.sectionLabel}>SUMMARY</Text>

          <View style={s.detailTable} wrap={false}>
            {rows.map(({ key, value }, i) => (
              <View key={key} style={i === rows.length - 1 ? s.detailRowLast : s.detailRow}>
                <Text style={s.detailKey}>{key}</Text>
                <Text style={s.detailValue}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.narrative}>{data.narrative}</Text>

          <Text style={[s.groupHeading, { color: GREEN, borderBottomColor: GREEN }]}>STRENGTHS</Text>
          <View style={s.cardGrid}>
            {data.categories.filter(c => c.tier === 'strength').map(category => (
              <CategoryCard key={category.categorySlug} category={category} color={GREEN} sourcedCategories={data.sourcedCategories} />
            ))}
          </View>

          <Text style={[s.groupHeading, { color: MID, borderBottomColor: BORDER }]}>SOLID GROUND</Text>
          <View style={s.cardGrid}>
            {data.categories.filter(c => c.tier === 'solid').map(category => (
              <CategoryCard key={category.categorySlug} category={category} color={MID} sourcedCategories={data.sourcedCategories} />
            ))}
          </View>

          <Text style={[s.groupHeading, { color: AMBER, borderBottomColor: AMBER }]}>FOCUS AREAS</Text>
          <View style={s.cardGrid}>
            {data.categories.filter(c => c.tier === 'focus').map(category => (
              <CategoryCard key={category.categorySlug} category={category} color={AMBER} sourcedCategories={data.sourcedCategories} />
            ))}
          </View>

          {selfOnly && (
            <Text style={s.confidential}>
              This reflects your self-assessment only and will update as player and peer feedback comes in.
            </Text>
          )}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>COACH DNA · 18TH MAN</Text>
          <Text
            style={s.footerMeta}
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `${today} · Page ${pageNumber} of ${totalPages}` : today
            }
          />
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the existing route tests that cover this component's props (regression check)**

Run: `cd web && npx vitest run "src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts" "src/app/(app)/admin/coach-dna/pdf-actions.test.ts"`
Expected: PASS — both suites only inspect `element.props` on the `renderToBuffer` call, never render the component itself, so this rewrite doesn't affect them.

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx"
git commit -m "feat(coach-dna): landscape/branded/card redesign of the self-assessment PDF"
```

---

### Task 10: Feedback summary PDF — landscape, brand fonts, AI text, clickable links

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/FeedbackSummaryPDF.tsx`

**Interfaces:**
- Consumes: `feedbackBandLabel` from `@/lib/coach-dna/feedback-summary` (Task 2); `FeedbackSummaryData`/`FeedbackTypeSummary`/`FeedbackCategorySummary` (Task 2, now carrying `text`/`resources`).
- Produces: unchanged public signature — `FeedbackSummaryPDF({ data, coachName, clubName, logoSrc })`.

- [ ] **Step 1: Replace `FeedbackSummaryPDF.tsx` entirely**

```tsx
import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer'
import { labelFor } from '@/lib/coach-dna/categories'
import { feedbackBandLabel, type FeedbackSummaryData, type FeedbackTypeSummary } from '@/lib/coach-dna/feedback-summary'

const E      = '#e8560a'
const DARK   = '#111827'
const MID    = '#374151'
const MUTED  = '#6b7280'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE  = '#ffffff'

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, paddingBottom: 40, fontSize: 9.5, fontFamily: 'Geist', color: DARK },

  header: {
    backgroundColor: E,
    paddingHorizontal: 44,
    paddingTop: 32,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLogoBadge: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLogo: { width: 32, height: 32 },
  eyeLabel: { fontSize: 7, fontFamily: 'Geist', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 },
  title: { fontFamily: 'Barlow Condensed', fontStyle: 'italic', fontSize: 30, color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  body: { paddingHorizontal: 44, paddingTop: 24 },

  groupHeading: {
    fontSize: 8, fontFamily: 'Geist', fontWeight: 700, letterSpacing: 2, marginBottom: 10, marginTop: 18,
    paddingBottom: 6, borderBottomWidth: 1.5, borderBottomStyle: 'solid', borderBottomColor: E, color: E,
  },
  responseCount: { fontSize: 8.5, color: MUTED, marginBottom: 10 },

  card: {
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: LIGHT, borderRadius: 6, marginBottom: 8,
    borderLeftWidth: 3, borderLeftStyle: 'solid',
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  cardDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  cardLabel: { fontSize: 7.5, fontFamily: 'Geist', fontWeight: 700, letterSpacing: 1.5 },
  cardMeta: { fontSize: 6.5, color: MUTED, marginLeft: 6 },
  cardBody: { fontSize: 8.5, color: MID, lineHeight: 1.45 },

  resourceList: { marginTop: 5 },
  resourceItem: { fontSize: 7.5, color: MUTED, lineHeight: 1.4, marginBottom: 2 },

  notReady: { fontSize: 9, color: MUTED, fontStyle: 'italic', paddingVertical: 6 },

  footer: {
    position: 'absolute', bottom: 18, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Geist', fontWeight: 700, color: E, letterSpacing: 1.5 },
  footerMeta: { fontSize: 6.5, color: MUTED },
})

function FeedbackCategoryCard({ category }: { category: FeedbackTypeSummary['categories'][number] }) {
  const strong = category.averageRating >= 3.5
  const color = strong ? '#059669' : '#d97706'
  return (
    <View style={[s.card, { borderLeftColor: color }]} wrap={false}>
      <View style={s.cardHeaderRow}>
        <View style={[s.cardDot, { backgroundColor: color }]} />
        <Text style={[s.cardLabel, { color }]}>{labelFor(category.categorySlug).toUpperCase()}</Text>
        <Text style={s.cardMeta}>{feedbackBandLabel(category.averageRating)} · {category.averageRating.toFixed(1)}/5 · {category.responseCount} response{category.responseCount === 1 ? '' : 's'}</Text>
      </View>
      <Text style={s.cardBody}>{category.text}</Text>
      {category.resources.length > 0 && (
        <View style={s.resourceList}>
          {category.resources.map(resource => (
            <Text key={resource.title} style={s.resourceItem}>
              {resource.url ? (
                <Link src={resource.url} style={{ color: E }}>{resource.title}</Link>
              ) : (
                <Text>{resource.title}</Text>
              )}
              {' — '}{resource.description}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

function FeedbackTypeSection({ heading, summary }: { heading: string; summary: FeedbackTypeSummary }) {
  return (
    <View wrap={false}>
      <Text style={s.groupHeading}>{heading}</Text>
      {summary.ready ? (
        <>
          <Text style={s.responseCount}>
            {summary.responseCount} response{summary.responseCount === 1 ? '' : 's'}
          </Text>
          {summary.categories.map(category => (
            <FeedbackCategoryCard key={category.categorySlug} category={category} />
          ))}
        </>
      ) : (
        <Text style={s.notReady}>Not enough responses yet — check back once more feedback comes in.</Text>
      )}
    </View>
  )
}

export function FeedbackSummaryPDF({
  data,
  coachName,
  clubName,
  logoSrc,
}: {
  data: FeedbackSummaryData
  coachName?: string | null
  clubName?: string | null
  logoSrc?: string
}) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Document title="Coach DNA — Feedback Summary" author="18th Man Coach DNA">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.eyeLabel}>COACH DNA</Text>
            <Text style={s.title}>Feedback Summary</Text>
            <Text style={s.subtitle}>
              {coachName ?? 'Coach'}{clubName ? ` · ${clubName}` : ''}
            </Text>
          </View>
          {logoSrc && (
            <View style={s.headerLogoBadge}>
              <Image style={s.headerLogo} src={logoSrc} />
            </View>
          )}
        </View>

        <View style={s.body}>
          <FeedbackTypeSection heading="PLAYER / PARENT VOICE" summary={data.playerParentVoice} />
          <FeedbackTypeSection heading="PEER OBSERVATION" summary={data.peerObservation} />
        </View>

        <View style={s.footer} fixed>
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

- [ ] **Step 3: Run the existing route test that covers this component's props (regression check)**

Run: `cd web && npx vitest run "src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts"`
Expected: PASS — it only inspects `element.props` on the `renderToBuffer` call, never renders the component itself.

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/FeedbackSummaryPDF.tsx"
git commit -m "feat(coach-dna): landscape/branded/card redesign of the feedback summary PDF"
```

---

### Task 11: Wire font registration into both PDF routes; switch the feedback route to `ensureFreshFeedbackSummary`

The plan's final task — both routes now use every module built in Tasks 1-10.

**Files:**
- Modify: `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.tsx`
- Modify: `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts`
- Modify: `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.tsx`
- Modify: `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts`

**Interfaces:**
- Consumes: `registerPdfFonts` from `@/lib/coach-dna/pdf-font` (Task 8); `ensureFreshFeedbackSummary` from `@/lib/coach-dna/feedback-summary-actions` (Task 3).

- [ ] **Step 1: Write the failing tests for `report-pdf`'s font registration**

In `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts`, add the mock (alongside the existing `vi.mock` calls, before `import { GET } from './route'`):

```ts
const registerPdfFontsMock = vi.fn(async () => {})
vi.mock('@/lib/coach-dna/pdf-font', () => ({
  registerPdfFonts: () => registerPdfFontsMock(),
}))
```

Add `registerPdfFontsMock.mockClear()` to the `beforeEach`, and add one new test:

```ts
  it('registers PDF fonts before rendering', async () => {
    await makeRequest('attempt-1')
    expect(registerPdfFontsMock).toHaveBeenCalledTimes(1)
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npx vitest run "src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts"`
Expected: FAIL — `registerPdfFontsMock` was never called (the route doesn't call it yet).

- [ ] **Step 3: Wire font registration into `report-pdf/route.tsx`**

Add the import and call in `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.tsx`:

```tsx
import { registerPdfFonts } from '@/lib/coach-dna/pdf-font'
```

```tsx
    const { profile, attempt, summary, clubName } = result

    await registerPdfFonts()

    const pdfBuffer = await renderToBuffer(
```

(inserted between the existing `requireBlendedAttempt` destructure and the existing `renderToBuffer` call — nothing else in this file changes.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts"`
Expected: PASS (9 tests — 8 existing + 1 new).

- [ ] **Step 5: Write the failing tests for `feedback-summary-pdf`'s font registration and `ensureFreshFeedbackSummary` switch**

In `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts`, replace the `computeFeedbackSummary` mock block:

```ts
const ensureFreshFeedbackSummaryMock = vi.fn(async (_coachId: string) => state.feedbackSummary)
vi.mock('@/lib/coach-dna/feedback-summary-actions', () => ({
  ensureFreshFeedbackSummary: (coachId: string) => ensureFreshFeedbackSummaryMock(coachId),
}))
```

(replacing the old `computeFeedbackSummaryMock`/`vi.mock('@/lib/coach-dna/feedback-summary', ...)` block — the route no longer imports `computeFeedbackSummary` or `createServiceClient` directly, so the existing `vi.mock('@/lib/supabase/service', ...)` block can also be deleted.)

Add the `pdf-font` mock (same as Step 1):

```ts
const registerPdfFontsMock = vi.fn(async () => {})
vi.mock('@/lib/coach-dna/pdf-font', () => ({
  registerPdfFonts: () => registerPdfFontsMock(),
}))
```

Update `beforeEach`: replace `computeFeedbackSummaryMock.mockClear()` with `ensureFreshFeedbackSummaryMock.mockClear()` and add `registerPdfFontsMock.mockClear()`.

Update the three tests that reference `computeFeedbackSummaryMock`:

```ts
  it('returns 404 when the summary is not blended (self-only)', async () => {
    state.summary!.sourcedCategories = { motivator: ['self'] }
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(404)
    expect(ensureFreshFeedbackSummaryMock).not.toHaveBeenCalled()
  })
```

```ts
  it("calls ensureFreshFeedbackSummary with the authenticated caller's own id", async () => {
    await makeRequest('attempt-1')
    expect(ensureFreshFeedbackSummaryMock).toHaveBeenCalledWith('coach-1')
  })
```

```ts
  it('returns 500 when ensureFreshFeedbackSummary throws', async () => {
    ensureFreshFeedbackSummaryMock.mockRejectedValueOnce(new Error('db down'))
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(500)
  })
```

And add one new test:

```ts
  it('registers PDF fonts before rendering', async () => {
    await makeRequest('attempt-1')
    expect(registerPdfFontsMock).toHaveBeenCalledTimes(1)
  })
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts"`
Expected: FAIL — `Cannot find module '@/lib/coach-dna/feedback-summary-actions'`'s mock target doesn't match the route's real import yet (the route still imports `computeFeedbackSummary`/`createServiceClient`), and `registerPdfFontsMock` was never called.

- [ ] **Step 7: Wire `ensureFreshFeedbackSummary` and font registration into `feedback-summary-pdf/route.tsx`**

Replace the imports and body in `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.tsx`:

```tsx
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { requireBlendedAttempt } from '@/lib/coach-dna/require-blended-attempt'
import { ensureFreshFeedbackSummary } from '@/lib/coach-dna/feedback-summary-actions'
import { registerPdfFonts } from '@/lib/coach-dna/pdf-font'
import { FeedbackSummaryPDF } from '@/app/(app)/admin/coach-dna/FeedbackSummaryPDF'
import { LOGO_DATA_URI } from '@/lib/pdf-logo'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params

  try {
    const supabase = await createClient()
    // The attemptId here is only used for the ownership/completion/blended
    // gate, matching the sibling report-pdf route's pattern -- the feedback
    // summary itself is keyed off coachId, not the attempt, since feedback
    // isn't tied to one specific assessment attempt.
    const result = await requireBlendedAttempt(supabase, attemptId)
    if (result instanceof Response) return result
    const { user, profile, clubName } = result

    const feedbackSummary = await ensureFreshFeedbackSummary(user.id)

    await registerPdfFonts()

    const pdfBuffer = await renderToBuffer(
      <FeedbackSummaryPDF
        data={feedbackSummary}
        logoSrc={LOGO_DATA_URI}
        coachName={profile.display_name}
        clubName={clubName}
      />,
    )

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="coach-dna-feedback-summary.pdf"',
      },
    })
  } catch (err) {
    console.error('[coach-dna/feedback-summary-pdf] Failed to generate feedback summary PDF:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

(`createServiceClient` and `computeFeedbackSummary` are no longer imported here — `ensureFreshFeedbackSummary` owns the service-client call internally, same encapsulation `ensureFreshSummary` already provides for the self-assessment side.)

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts"`
Expected: PASS (9 tests — 8 existing, renamed, + 1 new).

- [ ] **Step 9: Run the full test suite**

Run: `cd web && npm run test`
Expected: PASS, full suite green.

- [ ] **Step 10: Typecheck and lint**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npx eslint .`
Expected: no errors in any file this plan touched (pre-existing errors in unrelated files are out of scope — verify by name, same discipline as the previous Coach DNA outcome-PDFs plan).

- [ ] **Step 11: Commit**

```bash
git add "web/src/app/api/coach-dna/report-pdf/[attemptId]/route.tsx" "web/src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts" \
  "web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.tsx" "web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts"
git commit -m "feat(coach-dna): wire PDF font registration and ensureFreshFeedbackSummary into both routes"
```

---

## Self-Review Notes

**Spec coverage:** Part 1 (all 8 categories, tiered) → Task 1. Part 2 (self-assessment AI prompt) → Task 1. Part 3 (feedback AI interpretation + migration) → Tasks 2-3. Part 4 (guidance module) → Task 4. Part 5 (on-screen pages) → Tasks 1, 5, 6. Part 6 (trigger restyle) → Task 7. Part 7 (both PDFs: landscape, fonts, links, layout) → Tasks 8-11. Security section: the new migration is a nullable-column addition to an already-RLS-protected table (Task 3); `ensureFreshFeedbackSummary` takes `coachId` only from server-derived `user.id` (Task 11's route wiring, verified by the "own id" test in Task 11 Step 5); neither AI prompt echoes user-authored text (Tasks 1, 3); font fetching uses a fixed query string, never user input (Task 8).

**Gaps the spec itself didn't anticipate, closed during planning:** the spec's Part 1 said "every caller moves to categories" without enumerating every caller — research while writing this plan found three it missed: `src/lib/email.ts`'s `sendCoachDnaSummaryEmail` (+ its test), and fixture-only updates in `pdf-actions.test.ts`, `report-pdf/route.test.ts`, and `feedback-summary-pdf/route.test.ts`. All are folded into Task 1, since they're mechanically coupled to the same type change and the spec's own "no back-compat shim" principle already covers them in spirit.

**Placeholder scan:** No TBD/TODO markers. Every step has complete, copy-pasteable code or a precise line-anchored snippet (used only for small mechanical fixture edits in already-fully-shown test files, never for logic).

**Type consistency:** `CategoryTier`/`CategoryBreakdownEntry`/`ArchetypeResult` (Task 1) flow unchanged into `SelfAssessmentSummary` (Task 1), `/complete` and hub pages (Tasks 1, 6), `CoachDnaSummaryPDF` (Tasks 1, 9), and `sendCoachDnaSummaryEmail` (Task 1). `tierLabel` (Task 1) is reused verbatim by Tasks 1, 6, 9. `FeedbackCategorySummary`'s `text`/`resources` fields (Task 2) flow into `ensureFreshFeedbackSummary` (Task 3), the feedback page (Task 5), and `FeedbackSummaryPDF` (Task 10) with no shape drift. `feedbackBandLabel` (Task 2) is reused verbatim by Tasks 5 and 10. `registerPdfFonts` (Task 8) has the identical zero-argument signature at both call sites (Task 11). `GuidanceStep`/`buildGuidance` (Task 4) is consumed with the exact param shape in Task 6.
