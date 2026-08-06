# Coach DNA — Self-Assessment Results Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a coach finishes the 24-question self-assessment, show them a real result — a primary/secondary "coach type," an AI-written narrative, pros, and focus areas — computed entirely from their own self-report, persisted so it's revisitable, with an opt-in "email me a PDF" action.

**Architecture:** A new pure scoring function (`computeSelfOnlyCategoryScores`) averages each self-assessment answer's `category_weights_json` per category — separate from and untouched by the existing multi-source `computeCategoryScore`, which keeps its 2-source-minimum anti-fabrication guard exactly as-is. A pure archetype/pros-cons derivation function turns those 8 scores into primary/secondary type + pros/cons lists. A Server Action feeds that structured data (never raw Q&A, never asked to compute scores) to Groq to write the narrative, then persists everything to two new `coach_profiles` columns plus the two existing-but-unused `primary_profile_type`/`secondary_profile_type` columns. The existing `assessment/[attemptId]/complete` page renders it; a new PDF+email path mirrors the existing `match-report` pattern.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), Vitest, `ai` SDK + `@ai-sdk/groq` (matches every existing AI integration in this app), `@react-pdf/renderer`, Resend (via existing `@/lib/email.ts`).

## Global Constraints

- `computeCategoryScore` (`web/src/lib/coach-dna/scoring.ts`) and its 2-active-source minimum are never modified by this plan.
- The AI call receives only pre-computed structured data (category names/descriptions/scores, primary/secondary type, pros/cons category lists) — never raw question/answer text, and the prompt never asks it to compute or adjust a number.
- AI integration follows the app's actual convention: `createGroq({ apiKey: process.env.GROQ_API_KEY })` + `generateText`, matching `admin/content-engine/actions.ts`. Not the Vercel AI Gateway pattern.
- PDF/email follows the existing `admin/match-report` pattern: `@react-pdf/renderer`'s `renderToBuffer`, sent via a new function in `@/lib/email.ts` mirroring `sendMatchReportEmail`.
- Admin-gate pattern on every route/action: fetch user → `redirect('/login')` if absent → fetch `profiles.role` → `redirect('/dashboard')` if not `'admin'`.
- No em dashes in any UI copy or AI-prompt-authored text (repo-wide brand rule, confirmed via the self-assessment flow's existing commit history).
- Dark charcoal/zinc, orange `#f97316`/`orange-500` accent, Geist Sans — matches every other `admin/coach-dna/*` page already built.
- Never commit code that makes existing tests fail. Every new function gets a co-located test file.

---

### Task 1: Migration — `coach_profiles` summary columns

**Files:**
- Create: `web/supabase/migrations/110_coach_profiles_self_assessment_summary.sql`
- Modify: `web/src/lib/supabase/types.ts` (`CoachProfile` interface, ~line 178)

**Interfaces:**
- Produces: `coach_profiles.ai_summary` (jsonb, nullable), `coach_profiles.ai_summary_generated_at` (timestamptz, nullable). `coach_profiles.age_group`/`experience_level` become nullable.

**Context for the implementer:** `coach_profiles` (migration 084) currently requires `age_group` and `experience_level` `NOT NULL` with no default, and nothing in the app populates them yet — grep confirms zero application code touches this table today. This plan is the first thing that will ever insert a row into it, and it has no source for those two values, so they must become nullable or every insert in this plan fails a NOT NULL constraint. This is a narrow, justified fix to an existing table blocking this feature, not a redesign.

- [ ] **Step 1: Write the migration**

```sql
-- 110_coach_profiles_self_assessment_summary.sql
alter table public.coach_profiles
  alter column age_group drop not null,
  alter column experience_level drop not null;

alter table public.coach_profiles
  add column ai_summary jsonb,
  add column ai_summary_generated_at timestamptz;
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool (name: `coach_profiles_self_assessment_summary`) against project `khslkwspsqyopicxufun`, or run it via the Supabase CLI if working outside an MCP-enabled session. Confirm success before continuing.

- [ ] **Step 3: Verify**

Run this query (via Supabase MCP `execute_sql` or the CLI) and confirm `age_group`/`experience_level` show `is_nullable = 'YES'` and the two new columns exist:

```sql
select column_name, is_nullable, data_type
from information_schema.columns
where table_name = 'coach_profiles'
and column_name in ('age_group', 'experience_level', 'ai_summary', 'ai_summary_generated_at')
order by column_name;
```

- [ ] **Step 4: Update the TypeScript type**

In `web/src/lib/supabase/types.ts`, find the `CoachProfile` interface (~line 178) and update it:

```ts
export interface CoachProfile {
  id: string
  user_id: string
  age_group: string | null
  experience_level: string | null
  primary_profile_type: string | null
  secondary_profile_type: string | null
  current_focus_category_id: string | null
  ai_summary: SelfAssessmentSummary | null
  ai_summary_generated_at: string | null
  created_at: string
  updated_at: string
}

export interface SelfAssessmentSummary {
  primaryType: string
  secondaryType: string | null
  narrative: string
  pros: { categorySlug: string; text: string }[]
  cons: { categorySlug: string; text: string }[]
}
```

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors (nothing consumes `CoachProfile` yet, so this only validates the type syntax itself).

- [ ] **Step 6: Commit**

```bash
git add web/supabase/migrations/110_coach_profiles_self_assessment_summary.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add self-assessment summary columns to coach_profiles"
```

---

### Task 2: `computeSelfOnlyCategoryScores` pure function

**Files:**
- Create: `web/src/lib/coach-dna/self-score.ts`
- Test: `web/src/lib/coach-dna/self-score.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `computeSelfOnlyCategoryScores(responses, options): SelfCategoryScore[]`, `interface SelfCategoryScore { categorySlug: string; score: number }`. Consumed by Task 3 and Task 4.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/self-score.test.ts
import { describe, it, expect } from 'vitest'
import { computeSelfOnlyCategoryScores } from './self-score'

const CATEGORIES = ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']

function optionWeighting(id: string, weights: Record<string, number>) {
  return { id, categoryWeights: weights }
}

describe('computeSelfOnlyCategoryScores', () => {
  it('returns all 8 categories even when responses only touch some of them', () => {
    const options = [optionWeighting('opt-1', { teacher: 100 })]
    const responses = [{ selectedOptionId: 'opt-1' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result).toHaveLength(8)
    expect(result.map(r => r.categorySlug).sort()).toEqual([...CATEGORIES].sort())
  })

  it('averages weight across every selected option, treating an unweighted category as 0 for that option', () => {
    const options = [
      optionWeighting('opt-1', { teacher: 100 }),
      optionWeighting('opt-2', { teacher: 0, motivator: 100 }),
    ]
    const responses = [{ selectedOptionId: 'opt-1' }, { selectedOptionId: 'opt-2' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBe(50) // (100 + 0) / 2
    expect(result.find(r => r.categorySlug === 'motivator')?.score).toBe(50) // (0 + 100) / 2
    expect(result.find(r => r.categorySlug === 'organiser')?.score).toBe(0) // never weighted, never selected
  })

  it('returns all 8 categories at 0 for an empty responses array', () => {
    const result = computeSelfOnlyCategoryScores([], [])
    expect(result).toHaveLength(8)
    expect(result.every(r => r.score === 0)).toBe(true)
  })

  it('ignores a selectedOptionId that has no matching option (defensive, should not crash)', () => {
    const options = [optionWeighting('opt-1', { teacher: 100 })]
    const responses = [{ selectedOptionId: 'opt-1' }, { selectedOptionId: 'missing-option' }]

    const result = computeSelfOnlyCategoryScores(responses, options)

    expect(result.find(r => r.categorySlug === 'teacher')?.score).toBe(50) // (100 + 0) / 2, missing option treated as 0 across every category
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/self-score.test.ts`
Expected: FAIL — `Cannot find module './self-score'`

- [ ] **Step 3: Write the implementation**

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

export function computeSelfOnlyCategoryScores(
  responses: { selectedOptionId: string }[],
  options: { id: string; categoryWeights: Record<string, number> }[],
): SelfCategoryScore[] {
  const optionsById = new Map(options.map(o => [o.id, o]))

  return CATEGORY_SLUGS.map(categorySlug => {
    if (responses.length === 0) return { categorySlug, score: 0 }

    const total = responses.reduce((sum, response) => {
      const option = optionsById.get(response.selectedOptionId)
      const weight = option?.categoryWeights[categorySlug] ?? 0
      return sum + weight
    }, 0)

    return { categorySlug, score: total / responses.length }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/self-score.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/self-score.ts web/src/lib/coach-dna/self-score.test.ts
git commit -m "feat(coach-dna): add computeSelfOnlyCategoryScores pure function"
```

---

### Task 3: Archetype and pros/cons derivation

**Files:**
- Create: `web/src/lib/coach-dna/archetype.ts`
- Test: `web/src/lib/coach-dna/archetype.test.ts`

**Interfaces:**
- Consumes: `SelfCategoryScore` from Task 2 (`web/src/lib/coach-dna/self-score.ts`).
- Produces: `deriveArchetype(scores: SelfCategoryScore[]): ArchetypeResult`, `interface ArchetypeResult { primaryType: string; secondaryType: string | null; pros: string[]; cons: string[] }`. Consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/archetype.test.ts
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

  it('sets secondaryType when the second-highest is within 15 points of the primary', () => {
    const result = deriveArchetype(scores({ teacher: 90, motivator: 80 }))
    expect(result.primaryType).toBe('teacher')
    expect(result.secondaryType).toBe('motivator')
  })

  it('sets secondaryType to null when the second-highest is more than 15 points behind the primary', () => {
    const result = deriveArchetype(scores({ teacher: 90, motivator: 70 }))
    expect(result.secondaryType).toBeNull()
  })

  it('breaks ties by fixed category display order, not randomly', () => {
    // teacher comes before technician in CATEGORY_SLUGS order
    const result = deriveArchetype(scores({ teacher: 80, technician: 80 }))
    expect(result.primaryType).toBe('teacher')
  })

  it('returns the top 3 categories as pros and bottom 3 as cons, sorted by score', () => {
    const result = deriveArchetype(scores({
      teacher: 90, motivator: 85, developer: 80,
      technician: 20, organiser: 15, communicator: 10,
      'game-manager': 50, 'culture-builder': 50,
    }))
    expect(result.pros).toEqual(['teacher', 'motivator', 'developer'])
    expect(result.cons).toEqual(['communicator', 'organiser', 'technician'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/archetype.test.ts`
Expected: FAIL — `Cannot find module './archetype'`

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/archetype.ts
import type { SelfCategoryScore } from './self-score'

const CATEGORY_ORDER = [
  'teacher', 'technician', 'motivator', 'developer',
  'game-manager', 'communicator', 'organiser', 'culture-builder',
]

export interface ArchetypeResult {
  primaryType: string
  secondaryType: string | null
  pros: string[]
  cons: string[]
}

function sortByScoreThenOrder(scores: SelfCategoryScore[]): SelfCategoryScore[] {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return CATEGORY_ORDER.indexOf(a.categorySlug) - CATEGORY_ORDER.indexOf(b.categorySlug)
  })
}

export function deriveArchetype(scores: SelfCategoryScore[]): ArchetypeResult {
  const ranked = sortByScoreThenOrder(scores)
  const primary = ranked[0]
  const secondary = ranked[1]

  return {
    primaryType: primary.categorySlug,
    secondaryType: secondary && primary.score - secondary.score <= 15 ? secondary.categorySlug : null,
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
git commit -m "feat(coach-dna): add deriveArchetype pros/cons/type derivation"
```

---

### Task 4: `generateSelfAssessmentSummary` Server Action

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/summary-actions.ts`
- Test: `web/src/app/(app)/admin/coach-dna/summary-actions.test.ts`

**Interfaces:**
- Consumes: `computeSelfOnlyCategoryScores` (Task 2), `deriveArchetype` (Task 3), `SelfAssessmentSummary` type (Task 1, `@/lib/supabase/types`).
- Produces: `generateSelfAssessmentSummary(attemptId: string): Promise<SelfAssessmentSummary>`. Throws on failure (auth, missing attempt, Groq failure, DB write failure) — never returns a partial/fabricated summary. Consumed by Task 5.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/app/(app)/admin/coach-dna/summary-actions.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  responses: { question_id: string; selected_option: string }[]
  options: { id: string; question_id: string; category_weights_json: Record<string, number> }[]
  aiText: string
  upsertError: { message: string } | null
} = {
  user: null,
  attempt: null,
  responses: [],
  options: [],
  aiText: '',
  upsertError: null,
}

const upsertMock = vi.fn(async () => ({ error: state.upsertError }))

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => () => 'mock-model',
}))
vi.mock('ai', () => ({
  generateText: async () => ({ text: state.aiText }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'assessment_attempts') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }) }
      }
      if (table === 'assessment_responses') {
        return { select: () => ({ eq: async () => ({ data: state.responses }) }) }
      }
      if (table === 'assessment_options') {
        return { select: () => ({ in: async () => ({ data: state.options }) }) }
      }
      if (table === 'coach_profiles') {
        return { upsert: upsertMock }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { generateSelfAssessmentSummary } from './summary-actions'

describe('generateSelfAssessmentSummary', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.responses = [{ question_id: 'q1', selected_option: 'opt-1' }]
    state.options = [{ id: 'opt-1', question_id: 'q1', category_weights_json: { teacher: 100 } }]
    state.aiText = JSON.stringify({
      narrative: 'You lead with clarity and patience.',
      pros: [{ categorySlug: 'teacher', text: 'You explain things well.' }],
      cons: [{ categorySlug: 'organiser', text: 'Sessions could run tighter.' }],
    })
    state.upsertError = null
    upsertMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/login')
  })

  it('rejects an attempt that does not belong to the caller', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'someone-else', completed_at: '2026-08-06T00:00:00.000Z' }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('REDIRECT:/admin/coach-dna')
  })

  it('rejects an attempt that is not yet completed', async () => {
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: null }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('not completed')
  })

  it('persists and returns the summary on success', async () => {
    const result = await generateSelfAssessmentSummary('attempt-1')

    expect(result.primaryType).toBe('teacher')
    expect(result.narrative).toBe('You lead with clarity and patience.')
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'coach-1',
        primary_profile_type: 'teacher',
      }),
      expect.objectContaining({ onConflict: 'user_id' }),
    )
  })

  it('throws without persisting when Groq returns unparseable output', async () => {
    state.aiText = 'not json'
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow()
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('throws when the DB write fails', async () => {
    state.upsertError = { message: 'db down' }
    await expect(generateSelfAssessmentSummary('attempt-1')).rejects.toThrow('db down')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/summary-actions.test.ts"`
Expected: FAIL — `Cannot find module './summary-actions'`

- [ ] **Step 3: Write the implementation**

```ts
// web/src/app/(app)/admin/coach-dna/summary-actions.ts
'use server'

import { redirect } from 'next/navigation'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import { computeSelfOnlyCategoryScores } from '@/lib/coach-dna/self-score'
import { deriveArchetype } from '@/lib/coach-dna/archetype'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const CATEGORY_LABELS: Record<string, string> = {
  teacher: 'Teacher', technician: 'Technician', motivator: 'Motivator', developer: 'Developer',
  'game-manager': 'Game Manager', communicator: 'Communicator', organiser: 'Organiser', 'culture-builder': 'Culture Builder',
}

export async function generateSelfAssessmentSummary(attemptId: string): Promise<SelfAssessmentSummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== user.id) redirect('/admin/coach-dna')
  if (!attempt.completed_at) throw new Error('This attempt is not completed yet')

  const { data: responses } = await supabase
    .from('assessment_responses')
    .select('question_id, selected_option')
    .eq('attempt_id', attemptId)

  const optionIds = (responses ?? []).map(r => r.selected_option).filter((id): id is string => id !== null)
  const { data: options } = await supabase
    .from('assessment_options')
    .select('id, question_id, category_weights_json')
    .in('id', optionIds)

  const scores = computeSelfOnlyCategoryScores(
    (responses ?? []).map(r => ({ selectedOptionId: r.selected_option ?? '' })),
    (options ?? []).map(o => ({ id: o.id, categoryWeights: o.category_weights_json })),
  )
  const archetype = deriveArchetype(scores)

  const prompt = `You are writing a short self-assessment summary for a rugby league coach, based on their own self-reported scores across 8 coaching categories. Write in a direct, encouraging coaching voice. No em dashes. No fluff.

Their primary coaching type: ${CATEGORY_LABELS[archetype.primaryType]}
${archetype.secondaryType ? `Their secondary type: ${CATEGORY_LABELS[archetype.secondaryType]}` : ''}

Their strongest categories (write one short encouraging sentence for each, referencing what that category means): ${archetype.pros.map(slug => CATEGORY_LABELS[slug]).join(', ')}
Their growth-area categories (write one short constructive sentence for each): ${archetype.cons.map(slug => CATEGORY_LABELS[slug]).join(', ')}

Do not invent scores or claim data you were not given. Do not mention "self-assessment only" or any caveats about data sources — that framing is handled elsewhere in the UI, not by you.

Respond with ONLY a valid JSON object, no markdown fences, no explanation. Shape:
{"narrative":"one paragraph, 2-4 sentences","pros":[{"categorySlug":"...","text":"one sentence"}],"cons":[{"categorySlug":"...","text":"one sentence"}]}`

  const { text } = await generateText({ model: groq('llama-3.3-70b-versatile'), prompt })

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Could not generate your summary right now')
  const parsed = JSON.parse(text.slice(start, end + 1)) as { narrative: string; pros: { categorySlug: string; text: string }[]; cons: { categorySlug: string; text: string }[] }

  const summary: SelfAssessmentSummary = {
    primaryType: archetype.primaryType,
    secondaryType: archetype.secondaryType,
    narrative: parsed.narrative,
    pros: parsed.pros,
    cons: parsed.cons,
  }

  const { error: upsertError } = await supabase
    .from('coach_profiles')
    .upsert(
      {
        user_id: user.id,
        primary_profile_type: archetype.primaryType,
        secondary_profile_type: archetype.secondaryType,
        ai_summary: summary,
        ai_summary_generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  if (upsertError) throw new Error(upsertError.message)

  return summary
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/summary-actions.test.ts"`
Expected: PASS (6/6)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/summary-actions.ts" "web/src/app/(app)/admin/coach-dna/summary-actions.test.ts"
git commit -m "feat(coach-dna): add generateSelfAssessmentSummary server action"
```

---

### Task 5: Results page

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx`
- Create: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/RetryGenerateButton.tsx`

**Interfaces:**
- Consumes: `generateSelfAssessmentSummary` (Task 4), `SelfAssessmentSummary` type (Task 1).

- [ ] **Step 1: Write `RetryGenerateButton.tsx`**

The spec requires: "Groq call fails during summary generation: catch, show an inline 'couldn't generate your summary right now, try again' message with a retry button — do not persist a partial/broken `ai_summary`." `generateSelfAssessmentSummary` already guarantees the no-partial-persist half (Task 4: the DB upsert only runs after the AI response parses successfully). This component provides the retry button:

```tsx
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/RetryGenerateButton.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { generateSelfAssessmentSummary } from '../../summary-actions'

export function RetryGenerateButton({ attemptId }: { attemptId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await generateSelfAssessmentSummary(attemptId)
            router.refresh()
          } catch {
            // Swallow here — the button just stays clickable for another attempt.
            // The page itself already shows the "couldn't generate" message.
          }
        })
      }}
    >
      {isPending ? 'Trying again...' : 'Try again'}
    </Button>
  )
}
```

- [ ] **Step 2: Write `page.tsx`**

```tsx
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { generateSelfAssessmentSummary } from '../../summary-actions'
import { EmailSummaryButton } from './EmailSummaryButton'
import { RetryGenerateButton } from './RetryGenerateButton'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const CATEGORY_LABELS: Record<string, string> = {
  teacher: 'Teacher', technician: 'Technician', motivator: 'Motivator', developer: 'Developer',
  'game-manager': 'Game Manager', communicator: 'Communicator', organiser: 'Organiser', 'culture-builder': 'Culture Builder',
}

export const metadata = { title: 'Coach DNA — Your Results' }

export default async function AssessmentCompletePage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params

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
  if (!attempt || attempt.coach_id !== user.id || !attempt.completed_at) redirect('/admin/coach-dna')

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_summary')
    .eq('user_id', user.id)
    .maybeSingle()

  let summary: SelfAssessmentSummary
  let generationFailed = false
  if (coachProfile?.ai_summary) {
    summary = coachProfile.ai_summary
  } else {
    // The auth/ownership/completed-at checks above already redirect for every
    // condition generateSelfAssessmentSummary itself also redirects on, so by
    // this point the only realistic throw is a genuine generation failure
    // (Groq call, JSON parse, or DB write) — safe to catch broadly here.
    try {
      summary = await generateSelfAssessmentSummary(attemptId)
    } catch (err) {
      console.error('[coach-dna] Failed to generate summary:', err)
      generationFailed = true
      summary = { primaryType: '', secondaryType: null, narrative: '', pros: [], cons: [] }
    }
  }

  if (generationFailed) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Couldn&apos;t generate your results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400">
              Something went wrong generating your summary. Your answers are saved, so it&apos;s
              safe to try again.
            </p>
            <RetryGenerateButton attemptId={attemptId} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <CardTitle>
              You&apos;re a {CATEGORY_LABELS[summary.primaryType]}
              {summary.secondaryType ? ` / ${CATEGORY_LABELS[summary.secondaryType]}` : ''} coach
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">
            Based on your self-assessment only. This updates once player and peer feedback comes in.
          </p>
          <p className="text-sm text-zinc-300">{summary.narrative}</p>

          <div>
            <h2 className="text-sm font-semibold text-emerald-400 mb-2">Strengths</h2>
            <ul className="space-y-1.5">
              {summary.pros.map(pro => (
                <li key={pro.categorySlug} className="text-sm text-zinc-400">
                  <span className="text-zinc-200 font-medium">{CATEGORY_LABELS[pro.categorySlug]}:</span> {pro.text}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-orange-400 mb-2">Focus areas</h2>
            <ul className="space-y-1.5">
              {summary.cons.map(con => (
                <li key={con.categorySlug} className="text-sm text-zinc-400">
                  <span className="text-zinc-200 font-medium">{CATEGORY_LABELS[con.categorySlug]}:</span> {con.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button render={<Link href="/admin/coach-dna" />}>Back to Coach DNA</Button>
            <EmailSummaryButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: exactly one error, `Cannot find module './EmailSummaryButton'` (built in Task 7). `RetryGenerateButton` and `summary-actions` already exist from Step 1 and Task 4. Confirm no other errors before continuing.

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx" \
  "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/RetryGenerateButton.tsx"
git commit -m "feat(coach-dna): render self-assessment results on the completion page"
```

---

### Task 6: Landing page links to results anytime

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/page.tsx`

**Interfaces:**
- Consumes: nothing new.

- [ ] **Step 1: Update the completed-state branch**

In `web/src/app/(app)/admin/coach-dna/page.tsx`, the `completed` query currently only selects `id` and renders static text with no link. Change the select and the render branch:

```tsx
const { data: completed } = await supabase
  .from('assessment_attempts')
  .select('id')
  .eq('coach_id', user.id)
  .eq('assessment_type', 'self_assessment')
  .not('completed_at', 'is', null)
  .order('completed_at', { ascending: false })
  .limit(1)
  .maybeSingle()
```

And in the JSX, replace:

```tsx
{completed ? (
  <p className="text-sm text-zinc-400">
    You&apos;ve completed your self-assessment. Retaking it isn&apos;t supported yet.
  </p>
) : inProgress ? (
```

with:

```tsx
{completed ? (
  <Button render={<Link href={`/admin/coach-dna/assessment/${completed.id}/complete`} />}>
    View your results
  </Button>
) : inProgress ? (
```

This page does not currently import `next/link`. Add the import at the top of the file:

```tsx
import Link from 'next/link'
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/page.tsx"
git commit -m "feat(coach-dna): link completed self-assessment to results page"
```

---

### Task 7: PDF export and email

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx`
- Create: `web/src/app/(app)/admin/coach-dna/pdf-actions.ts`
- Create: `web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts`
- Create: `web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/EmailSummaryButton.tsx`
- Modify: `web/src/lib/email.ts`
- Modify: `web/src/lib/email.test.ts`

**Interfaces:**
- Consumes: `SelfAssessmentSummary` type (Task 1).
- Produces: `emailSelfAssessmentSummaryPDF(): Promise<{ success: boolean; error?: string }>` — client-invoked Server Action, `EmailSummaryButton` client component.

- [ ] **Step 1: Add `sendCoachDnaSummaryEmail` to `@/lib/email.ts`**

Add near `sendMatchReportEmail` (uses the same `send()` helper, `layout`/`heading`/`para`/`divider`/`greeting`/`sign` helpers already defined in this file):

```ts
export async function sendCoachDnaSummaryEmail(
  to: string,
  primaryType: string,
  pdfBuffer: Buffer,
): Promise<EmailResult> {
  const html = layout(`
    ${heading('Your Coach DNA self-assessment results.')}
    ${divider()}
    ${greeting('')}
    ${para(`Your self-assessment results (you're a <strong style="color:#ffffff;">${primaryType}</strong> coach) are attached to this email as a PDF.`)}
    ${para('This reflects your self-assessment only, and will update as player and peer feedback comes in.')}
    ${sign()}
  `)

  return send(
    to,
    'Your Coach DNA self-assessment results',
    html,
    [{ filename: 'coach-dna-self-assessment.pdf', content: pdfBuffer }],
  )
}
```

- [ ] **Step 2: Write the failing email test**

Add to `web/src/lib/email.test.ts` (same file, same `sendMock`/`Resend` mock already set up at the top — do not duplicate the `vi.mock` blocks):

```ts
import { sendCoachDnaSummaryEmail } from './email'

describe('sendCoachDnaSummaryEmail', () => {
  beforeEach(() => {
    sendMock.mockReset()
    process.env.RESEND_API_KEY = 're_test_key'
  })

  it('sends the PDF as an attachment to the coach\'s own email', async () => {
    sendMock.mockResolvedValue({ data: { id: 'msg_456' }, error: null })
    const result = await sendCoachDnaSummaryEmail('coach@example.com', 'Teacher', Buffer.from('fake-pdf'))
    expect(result).toEqual({ success: true, messageId: 'msg_456' })
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'coach@example.com',
      attachments: [{ filename: 'coach-dna-self-assessment.pdf', content: Buffer.from('fake-pdf') }],
    }))
  })
})
```

- [ ] **Step 3: Run the email test to verify it fails, then passes**

Run: `cd web && npx vitest run src/lib/email.test.ts`
First run (before Step 1's implementation is saved) expected: FAIL. After Step 1 is in place: PASS.

- [ ] **Step 4: Write `CoachDnaSummaryPDF.tsx`**

Mirror the structure of `web/src/app/(app)/admin/match-report/MatchReportPDF.tsx` (palette constants, `StyleSheet.create`, `Document`/`Page`/`Text`/`View`) but far simpler — one page, no cover/footer complexity needed:

```tsx
// web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

const E = '#e8560a'
const DARK = '#111827'
const MUTED = '#6b7280'

const s = StyleSheet.create({
  page: { padding: 44, fontSize: 11, fontFamily: 'Helvetica', color: DARK },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: E, marginBottom: 12 },
  narrative: { marginBottom: 20, lineHeight: 1.5 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 8, marginTop: 16 },
  item: { marginBottom: 6, lineHeight: 1.4 },
  itemLabel: { fontFamily: 'Helvetica-Bold' },
  disclaimer: { marginTop: 24, fontSize: 9, color: MUTED },
})

const CATEGORY_LABELS: Record<string, string> = {
  teacher: 'Teacher', technician: 'Technician', motivator: 'Motivator', developer: 'Developer',
  'game-manager': 'Game Manager', communicator: 'Communicator', organiser: 'Organiser', 'culture-builder': 'Culture Builder',
}

export function CoachDnaSummaryPDF({ data }: { data: SelfAssessmentSummary }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>
          {CATEGORY_LABELS[data.primaryType]}{data.secondaryType ? ` / ${CATEGORY_LABELS[data.secondaryType]}` : ''} Coach
        </Text>
        <Text style={s.narrative}>{data.narrative}</Text>

        <Text style={s.sectionTitle}>Strengths</Text>
        {data.pros.map(pro => (
          <Text key={pro.categorySlug} style={s.item}>
            <Text style={s.itemLabel}>{CATEGORY_LABELS[pro.categorySlug]}: </Text>{pro.text}
          </Text>
        ))}

        <Text style={s.sectionTitle}>Focus areas</Text>
        {data.cons.map(con => (
          <View key={con.categorySlug}>
            <Text style={s.item}>
              <Text style={s.itemLabel}>{CATEGORY_LABELS[con.categorySlug]}: </Text>{con.text}
            </Text>
          </View>
        ))}

        <Text style={s.disclaimer}>
          This reflects your self-assessment only and will update as player and peer feedback comes in.
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 5: Write the failing action test**

```ts
// web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string; email?: string } | null
  summary: unknown
  sendResult: { success: boolean; error?: string }
} = { user: null, summary: null, sendResult: { success: true } }

const sendEmailMock = vi.fn(async () => state.sendResult)

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: async () => new Uint8Array([1, 2, 3]),
}))
vi.mock('@/lib/email', () => ({
  sendCoachDnaSummaryEmail: (...args: unknown[]) => sendEmailMock(...args),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.summary }) }) }),
    }),
  }),
}))

import { emailSelfAssessmentSummaryPDF } from './pdf-actions'

describe('emailSelfAssessmentSummaryPDF', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1', email: 'coach@example.com' }
    state.summary = { ai_summary: { primaryType: 'teacher', secondaryType: null, narrative: 'x', pros: [], cons: [] } }
    state.sendResult = { success: true }
    sendEmailMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(emailSelfAssessmentSummaryPDF()).rejects.toThrow('REDIRECT:/login')
  })

  it('returns an error when no summary exists yet', async () => {
    state.summary = null
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: false, error: 'No results to send yet.' })
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('sends the PDF to the caller\'s own account email', async () => {
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: true })
    expect(sendEmailMock).toHaveBeenCalledWith('coach@example.com', 'teacher', expect.any(Buffer))
  })

  it('surfaces the email send failure', async () => {
    state.sendResult = { success: false, error: 'send failed' }
    const result = await emailSelfAssessmentSummaryPDF()
    expect(result).toEqual({ success: false, error: 'send failed' })
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/pdf-actions.test.ts"`
Expected: FAIL — `Cannot find module './pdf-actions'`

- [ ] **Step 7: Write `pdf-actions.ts`**

```ts
// web/src/app/(app)/admin/coach-dna/pdf-actions.ts
'use server'

import { redirect } from 'next/navigation'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { sendCoachDnaSummaryEmail } from '@/lib/email'
import { CoachDnaSummaryPDF } from './CoachDnaSummaryPDF'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

export async function emailSelfAssessmentSummaryPDF(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_summary')
    .eq('user_id', user.id)
    .maybeSingle()

  const summary = coachProfile?.ai_summary as SelfAssessmentSummary | undefined
  if (!summary) return { success: false, error: 'No results to send yet.' }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(<CoachDnaSummaryPDF data={summary} /> as any)
    return await sendCoachDnaSummaryEmail(user.email!, summary.primaryType, Buffer.from(pdfBuffer))
  } catch (err) {
    console.error('[coach-dna] Failed to generate or send summary PDF:', err)
    return { success: false, error: 'Failed to send your PDF. Please try again.' }
  }
}
```

Rename the file to `.tsx` if the build requires JSX in a `.ts` file — check `match-report/actions.tsx`, which uses the same `.tsx` extension for exactly this reason (JSX inside a Server Action file). Use `pdf-actions.tsx`, not `pdf-actions.ts`, and update the test import path and the `page.tsx`/`EmailSummaryButton.tsx` imports accordingly.

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/pdf-actions.test.ts"`
Expected: PASS (4/4)

- [ ] **Step 9: Write `EmailSummaryButton.tsx`**

```tsx
// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/EmailSummaryButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { emailSelfAssessmentSummaryPDF } from '../../pdf-actions'

export function EmailSummaryButton() {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        disabled={isPending || status === 'sent'}
        onClick={() => {
          startTransition(async () => {
            const result = await emailSelfAssessmentSummaryPDF()
            if (result.success) {
              setStatus('sent')
            } else {
              setStatus('error')
              setError(result.error ?? 'Something went wrong.')
            }
          })
        }}
      >
        {status === 'sent' ? 'PDF sent' : isPending ? 'Sending...' : 'Email me a PDF'}
      </Button>
      {status === 'error' && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 10: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add web/src/lib/email.ts web/src/lib/email.test.ts \
  "web/src/app/(app)/admin/coach-dna/CoachDnaSummaryPDF.tsx" \
  "web/src/app/(app)/admin/coach-dna/pdf-actions.tsx" \
  "web/src/app/(app)/admin/coach-dna/pdf-actions.test.ts" \
  "web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/EmailSummaryButton.tsx"
git commit -m "feat(coach-dna): add PDF export and opt-in email delivery for results"
```

---

### Task 8: Full verification

**Files:**
- None created — this task verifies Tasks 1-7 together.

- [ ] **Step 1: Run the full test suite and typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npm run test`
Expected: all existing tests plus every new test file from Tasks 2-4 and 7 pass, no regressions.

- [ ] **Step 2: Confirm the RLS/data-exposure guarantee still holds**

Run: `cd web && grep -rn "category_weights_json" "src/app/(app)/admin/coach-dna/"`
Expected: matches ONLY in `summary-actions.ts` (which reads it server-side to compute scores — never returns it to the client, only returns the derived `SelfAssessmentSummary`) and test files that mock it. If it appears in any `page.tsx` or client component, that is a leak — stop and fix before proceeding.

- [ ] **Step 3: Manual QA (cannot be automated in this environment — report to the human partner instead of claiming it's verified)**

This needs a logged-in admin coach who has already completed the self-assessment (or completes it fresh) to confirm end-to-end. Do NOT claim this "works" without doing this. If Playwright MCP tools or admin credentials are available:
1. Log in as an admin, complete a self-assessment (or use one already completed).
2. Confirm the completion page shows a primary type, narrative, strengths, and focus areas — not a blank/error state.
3. Confirm the self-only disclaimer text is visible, not buried.
4. Click "Email me a PDF," confirm it reports success and the email arrives with a readable PDF attachment.
5. Navigate to `/admin/coach-dna` and back — confirm "View your results" reaches the same summary without regenerating (no second Groq call — check by confirming the narrative text is byte-identical between visits).

If Playwright MCP tools or admin credentials are not available, explicitly report that manual QA was NOT performed and ask the human partner to click through the flow themselves before considering this plan done.

- [ ] **Step 4: Commit (only if Step 1-2 required fixes)**

If any step required a fix, commit it with an appropriate message. If everything passed cleanly, skip this step.
