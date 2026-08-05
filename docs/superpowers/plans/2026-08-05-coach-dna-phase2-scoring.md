# Coach DNA — Phase 2 Score Calculation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Coach DNA score calculation engine as a pure, fully unit-tested TypeScript module (`web/src/lib/coach-dna/scoring.ts`) that turns raw per-source responses into per-category blended scores or an explicit `INSUFFICIENT_DATA` state — with zero database or network access in the module itself.

**Architecture:** One pure-function module mirroring the existing `web/src/lib/match-analysis/aggregate.ts` pattern: plain exported functions and types, no classes, no I/O. A small schema fix (Task 1) closes a gap discovered while designing this module — `assessment_questions` currently has no way to say which `dna_category` a Player Voice / Peer Observation question belongs to. Everything else is pure logic plus `scoring.test.ts`, following this repo's TDD convention (see `web/src/lib/metrics/growth.test.ts` for the house style: `describe`/`it`/`expect`, plain typed fixture arrays, `toEqual`).

**Tech Stack:** TypeScript, Vitest (`describe`/`it`/`expect`). Task 1's migration is applied via the `claude.ai Supabase` MCP tools (`apply_migration`, `execute_sql`), same as Phase 1.

## Global Constraints

- This module is pure — no `createClient()`/`createServiceClient()` calls, no `fetch`, no `Date.now()` internal to the exported functions (always take `now: Date` as a parameter so tests are deterministic).
- No `any` types anywhere.
- Reflection data (`coach_reflections`) is never read by this module and never contributes to a score — do not add a code path that touches it (design doc, Phase 2, explicit rule).
- Weight redistribution must be proportional to configured weights, not even, and must always sum to 100 (within floating-point tolerance) across every active-source subset that has at least one source with non-zero configured weight.
- `INSUFFICIENT_DATA` is returned whenever fewer than two sources are active for a category — never a fabricated number.
- Every new function is covered by tests written before the implementation (TDD): write the failing test, confirm it fails for the right reason, implement, confirm it passes.
- Migration files never mutate the schema outside `web/supabase/migrations/`; every table/column change goes through the Supabase MCP tools, same as Phase 1.
- Follow the existing `web/src/lib/supabase/types.ts` hand-maintained interface style for any type changes (plain `export interface`, snake_case fields, `| null` for nullable columns).

---

### Task 1: Schema fix — `assessment_questions.category_id`

**Files:**
- Create: `web/supabase/migrations/106_assessment_questions_category_id.sql`
- Modify: `web/src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `AssessmentQuestion.category_id: string | null` (extends the existing interface from Phase 1).

**Context:** `feedback_answers` (Player Voice / Peer Observation responses) has no link to `assessment_options`, unlike `assessment_responses` (self-assessment). Self-assessment's category mapping is intentionally hidden per-option (`assessment_options.category_weights_json`), matching the "no reveal of which category each answer affects" requirement. Player Voice and Peer Observation questions are simple single-category rating questions ("does your coach explain things clearly?" → Teacher) and need a direct mapping. Resolved with the user: add a nullable `category_id` FK on `assessment_questions`, populated only for `assessment_type IN ('player_voice', 'peer_observation')`, mirroring the existing `age_group` nullable-by-type pattern from Phase 1.

- [ ] **Step 1: Write the migration**

```sql
-- 106_assessment_questions_category_id.sql
alter table public.assessment_questions
  add column category_id uuid references public.dna_categories(id);

alter table public.assessment_questions
  add constraint category_id_only_for_feedback_types check (
    (assessment_type in ('player_voice', 'peer_observation') and category_id is not null)
    or (assessment_type = 'self_assessment' and category_id is null)
  );

create index assessment_questions_category_id_idx on public.assessment_questions(category_id);
```

- [ ] **Step 2: Apply the migration**

Use `mcp__claude_ai_Supabase__apply_migration` with `name: "assessment_questions_category_id"` and the SQL above.

- [ ] **Step 3: Verify the check constraint**

Use `mcp__claude_ai_Supabase__execute_sql`:
```sql
insert into public.assessment_questions (assessment_type, question_text, question_format, age_group, category_id)
values ('player_voice', 'test', 'five_point_scale', 'U10', null);
```
Expected: error violating `category_id_only_for_feedback_types` (a `player_voice` question must have a non-null `category_id`). This confirms the new rule is enforced at the database level.

- [ ] **Step 4: Update the TypeScript type**

In `web/src/lib/supabase/types.ts`, find the existing `AssessmentQuestion` interface (added in Phase 1, positioned after `DnaCategory`/near `AssessmentType`) and add the new field:

```ts
export interface AssessmentQuestion {
  id: string
  assessment_type: AssessmentType
  question_text: string
  question_format: string
  age_group: string | null
  category_id: string | null
  active: boolean
  version: number
  created_at: string
}
```

- [ ] **Step 5: Commit**

```bash
git add web/supabase/migrations/106_assessment_questions_category_id.sql web/src/lib/supabase/types.ts
git commit -m "feat(coach-dna): add assessment_questions.category_id for player_voice/peer_observation mapping"
```

---

### Task 2: Weight and threshold configuration

**Files:**
- Create: `web/src/lib/coach-dna/config.ts`
- Test: `web/src/lib/coach-dna/config.test.ts`

**Interfaces:**
- Produces: `ScoreSource` type, `CategoryWeightConfig` interface, `getCategoryWeights(categorySlug: string): CategoryWeightConfig`, `getSourceThresholds(categorySlug: string): CategoryWeightConfig` (same shape, reused for minimum-response counts), `SOURCE_LABELS: Record<ScoreSource, string>`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/config.test.ts
import { describe, it, expect } from 'vitest'
import { getCategoryWeights, getSourceThresholds, SOURCE_LABELS } from './config'

describe('getCategoryWeights', () => {
  it('returns the default weight split for a category with no override', () => {
    expect(getCategoryWeights('teacher')).toEqual({
      self: 25,
      player_voice: 35,
      peer_observation: 30,
      parent_voice: 10,
    })
  })

  it('returns the Technician override', () => {
    expect(getCategoryWeights('technician')).toEqual({
      self: 25,
      player_voice: 15,
      peer_observation: 60,
      parent_voice: 0,
    })
  })

  it('returns the Culture Builder override', () => {
    expect(getCategoryWeights('culture-builder')).toEqual({
      self: 15,
      player_voice: 40,
      peer_observation: 25,
      parent_voice: 20,
    })
  })

  it('every weight config sums to 100', () => {
    for (const slug of ['teacher', 'technician', 'motivator', 'developer', 'game-manager', 'communicator', 'organiser', 'culture-builder']) {
      const weights = getCategoryWeights(slug)
      const sum = weights.self + weights.player_voice + weights.peer_observation + weights.parent_voice
      expect(sum).toBe(100)
    }
  })
})

describe('getSourceThresholds', () => {
  it('returns the default minimum response thresholds', () => {
    expect(getSourceThresholds('teacher')).toEqual({
      self: 1,
      player_voice: 3,
      peer_observation: 1,
      parent_voice: 3,
    })
  })
})

describe('SOURCE_LABELS', () => {
  it('has a human-readable label for every source', () => {
    expect(SOURCE_LABELS).toEqual({
      self: 'Self-Assessment',
      player_voice: 'Player Voice',
      peer_observation: 'Peer Coach',
      parent_voice: 'Parent Voice',
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/config.test.ts`
Expected: FAIL — `Cannot find module './config'`.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/config.ts

// ── Sources ──────────────────────────────────────────────────────────────

export type ScoreSource = 'self' | 'player_voice' | 'peer_observation' | 'parent_voice'

export const SOURCES: ScoreSource[] = ['self', 'player_voice', 'peer_observation', 'parent_voice']

export const SOURCE_LABELS: Record<ScoreSource, string> = {
  self: 'Self-Assessment',
  player_voice: 'Player Voice',
  peer_observation: 'Peer Coach',
  parent_voice: 'Parent Voice',
}

// ── Weight configuration ────────────────────────────────────────────────

export interface CategoryWeightConfig {
  self: number
  player_voice: number
  peer_observation: number
  parent_voice: number
}

const DEFAULT_WEIGHTS: CategoryWeightConfig = {
  self: 25,
  player_voice: 35,
  peer_observation: 30,
  parent_voice: 10,
}

const WEIGHT_OVERRIDES: Record<string, CategoryWeightConfig> = {
  technician: { self: 25, player_voice: 15, peer_observation: 60, parent_voice: 0 },
  'culture-builder': { self: 15, player_voice: 40, peer_observation: 25, parent_voice: 20 },
}

export function getCategoryWeights(categorySlug: string): CategoryWeightConfig {
  return WEIGHT_OVERRIDES[categorySlug] ?? DEFAULT_WEIGHTS
}

// ── Minimum response thresholds ─────────────────────────────────────────

const DEFAULT_THRESHOLDS: CategoryWeightConfig = {
  self: 1,
  player_voice: 3,
  peer_observation: 1,
  parent_voice: 3,
}

const THRESHOLD_OVERRIDES: Record<string, CategoryWeightConfig> = {}

export function getSourceThresholds(categorySlug: string): CategoryWeightConfig {
  return THRESHOLD_OVERRIDES[categorySlug] ?? DEFAULT_THRESHOLDS
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/config.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/config.ts web/src/lib/coach-dna/config.test.ts
git commit -m "feat(coach-dna): add per-category weight and threshold configuration"
```

---

### Task 3: Weight redistribution

**Files:**
- Create: `web/src/lib/coach-dna/redistribute.ts`
- Test: `web/src/lib/coach-dna/redistribute.test.ts`

**Interfaces:**
- Consumes: `ScoreSource`, `CategoryWeightConfig` from Task 2 (`./config`).
- Produces: `redistributeWeights(weights: CategoryWeightConfig, activeSources: ScoreSource[]): Partial<Record<ScoreSource, number>>`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/redistribute.test.ts
import { describe, it, expect } from 'vitest'
import { redistributeWeights } from './redistribute'
import { getCategoryWeights } from './config'
import type { ScoreSource } from './config'

describe('redistributeWeights', () => {
  it('returns the original weights unchanged when all sources are active', () => {
    const weights = getCategoryWeights('teacher')
    const active: ScoreSource[] = ['self', 'player_voice', 'peer_observation', 'parent_voice']
    expect(redistributeWeights(weights, active)).toEqual({
      self: 25,
      player_voice: 35,
      peer_observation: 30,
      parent_voice: 10,
    })
  })

  it('redistributes proportionally, not evenly, when one source is missing', () => {
    const weights = getCategoryWeights('teacher') // self 25 / player 35 / peer 30 / parent 10
    const active: ScoreSource[] = ['self', 'player_voice', 'peer_observation']
    const result = redistributeWeights(weights, active)
    // active weight sum = 25 + 35 + 30 = 90; each scaled by 100/90
    expect(result.self).toBeCloseTo((25 / 90) * 100, 5)
    expect(result.player_voice).toBeCloseTo((35 / 90) * 100, 5)
    expect(result.peer_observation).toBeCloseTo((30 / 90) * 100, 5)
    expect(result.parent_voice).toBeUndefined()
    // proportional, not even — player_voice (originally largest) must still be largest after redistribution
    expect(result.player_voice!).toBeGreaterThan(result.self!)
    expect(result.player_voice!).toBeGreaterThan(result.peer_observation!)
  })

  it('redistributes across two sources when two are missing', () => {
    const weights = getCategoryWeights('teacher')
    const active: ScoreSource[] = ['player_voice', 'peer_observation']
    const result = redistributeWeights(weights, active)
    expect(result.player_voice).toBeCloseTo((35 / 65) * 100, 5)
    expect(result.peer_observation).toBeCloseTo((30 / 65) * 100, 5)
  })

  it('every weight configuration sums to 100 across every non-empty active-source subset with nonzero weight', () => {
    const allSources: ScoreSource[] = ['self', 'player_voice', 'peer_observation', 'parent_voice']
    const subsets: ScoreSource[][] = [
      allSources,
      ['self', 'player_voice', 'peer_observation'],
      ['self', 'player_voice', 'parent_voice'],
      ['self', 'peer_observation', 'parent_voice'],
      ['player_voice', 'peer_observation', 'parent_voice'],
      ['self', 'player_voice'],
      ['player_voice', 'peer_observation'],
    ]
    for (const slug of ['teacher', 'technician', 'culture-builder']) {
      const weights = getCategoryWeights(slug)
      for (const subset of subsets) {
        const activeWeightSum = subset.reduce((sum, s) => sum + weights[s], 0)
        if (activeWeightSum === 0) continue // covered by the zero-weight test below
        const result = redistributeWeights(weights, subset)
        const total = Object.values(result).reduce((a, b) => a + (b ?? 0), 0)
        expect(total).toBeCloseTo(100, 5)
      }
    }
  })

  it('returns an empty object when every active source has zero configured weight', () => {
    const weights = getCategoryWeights('technician') // parent_voice: 0
    const result = redistributeWeights(weights, ['parent_voice'])
    expect(result).toEqual({})
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/redistribute.test.ts`
Expected: FAIL — `Cannot find module './redistribute'`.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/redistribute.ts
import type { CategoryWeightConfig, ScoreSource } from './config'

export function redistributeWeights(
  weights: CategoryWeightConfig,
  activeSources: ScoreSource[],
): Partial<Record<ScoreSource, number>> {
  const activeWeightSum = activeSources.reduce((sum, s) => sum + weights[s], 0)
  if (activeWeightSum === 0) return {}

  const result: Partial<Record<ScoreSource, number>> = {}
  for (const s of activeSources) {
    result[s] = (weights[s] / activeWeightSum) * 100
  }
  return result
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/redistribute.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/redistribute.ts web/src/lib/coach-dna/redistribute.test.ts
git commit -m "feat(coach-dna): add proportional weight redistribution for missing sources"
```

---

### Task 4: Recency-weighted average and outlier capping

**Files:**
- Create: `web/src/lib/coach-dna/response-scoring.ts`
- Test: `web/src/lib/coach-dna/response-scoring.test.ts`

**Interfaces:**
- Produces: `SourceResponse { value: number; submittedAt: string }`, `computeRecencyWeightedAverage(responses: SourceResponse[], now: Date): number`, `capOutliers(responses: SourceResponse[], maxDeviationFromMedian?: number): SourceResponse[]`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/response-scoring.test.ts
import { describe, it, expect } from 'vitest'
import { computeRecencyWeightedAverage, capOutliers, type SourceResponse } from './response-scoring'

describe('computeRecencyWeightedAverage', () => {
  it('returns 0 for an empty response list', () => {
    expect(computeRecencyWeightedAverage([], new Date('2026-08-05'))).toBe(0)
  })

  it('returns the plain average when all responses are equally recent', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    const responses: SourceResponse[] = [
      { value: 60, submittedAt: '2026-08-05T00:00:00Z' },
      { value: 80, submittedAt: '2026-08-05T00:00:00Z' },
    ]
    expect(computeRecencyWeightedAverage(responses, now)).toBeCloseTo(70, 5)
  })

  it('weights recent responses more heavily than old ones', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    const responses: SourceResponse[] = [
      { value: 100, submittedAt: '2026-08-04T00:00:00Z' }, // 1 day old
      { value: 0, submittedAt: '2025-01-01T00:00:00Z' },   // over a year old
    ]
    const result = computeRecencyWeightedAverage(responses, now)
    // the recent 100 should dominate a simple 50/50 average
    expect(result).toBeGreaterThan(50)
  })

  it('treats a future-dated submittedAt as zero age rather than negative weight', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    const responses: SourceResponse[] = [
      { value: 40, submittedAt: '2026-08-06T00:00:00Z' }, // 1 day "in the future" (clock skew)
    ]
    expect(computeRecencyWeightedAverage(responses, now)).toBeCloseTo(40, 5)
  })
})

describe('capOutliers', () => {
  it('returns responses unchanged when fewer than 3 (not enough data to define an outlier)', () => {
    const responses: SourceResponse[] = [
      { value: 20, submittedAt: '2026-08-01T00:00:00Z' },
      { value: 90, submittedAt: '2026-08-02T00:00:00Z' },
    ]
    expect(capOutliers(responses)).toEqual(responses)
  })

  it('caps a single extreme rating without affecting the others', () => {
    const responses: SourceResponse[] = [
      { value: 70, submittedAt: '2026-08-01T00:00:00Z' },
      { value: 75, submittedAt: '2026-08-02T00:00:00Z' },
      { value: 0, submittedAt: '2026-08-03T00:00:00Z' }, // extreme outlier
    ]
    // median of [0, 70, 75] (sorted) is the middle value, 70
    const capped = capOutliers(responses, 25)
    expect(capped[0].value).toBe(70)
    expect(capped[1].value).toBe(75)
    expect(capped[2].value).toBeGreaterThan(0) // pulled toward the median, not left at the extreme
    expect(capped[2].value).toBe(70 - 25) // median (70) minus the max deviation
  })

  it('a single outlier response does not swing the recency-weighted average by more than the cap allows', () => {
    const now = new Date('2026-08-05T00:00:00Z')
    const uncappedResponses: SourceResponse[] = [
      { value: 70, submittedAt: now.toISOString() },
      { value: 75, submittedAt: now.toISOString() },
      { value: 78, submittedAt: now.toISOString() },
      { value: 0, submittedAt: now.toISOString() }, // one extreme outlier
    ]
    const withoutCapping = computeRecencyWeightedAverage(uncappedResponses, now)
    const withCapping = computeRecencyWeightedAverage(capOutliers(uncappedResponses, 25), now)
    // capping must pull the average up compared to leaving the extreme value in
    expect(withCapping).toBeGreaterThan(withoutCapping)
    // and the capped average should stay close to the cluster of normal responses
    expect(withCapping).toBeGreaterThan(60)
  })

  it('does not alter responses within the deviation threshold', () => {
    const responses: SourceResponse[] = [
      { value: 70, submittedAt: '2026-08-01T00:00:00Z' },
      { value: 75, submittedAt: '2026-08-02T00:00:00Z' },
      { value: 80, submittedAt: '2026-08-03T00:00:00Z' },
    ]
    expect(capOutliers(responses, 25)).toEqual(responses)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/response-scoring.test.ts`
Expected: FAIL — `Cannot find module './response-scoring'`.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/response-scoring.ts

export interface SourceResponse {
  value: number // 0-100 normalized contribution from a single response
  submittedAt: string // ISO timestamp
}

const RECENCY_HALF_LIFE_DAYS = 90

export function computeRecencyWeightedAverage(responses: SourceResponse[], now: Date): number {
  if (responses.length === 0) return 0

  let weightedSum = 0
  let totalWeight = 0
  for (const r of responses) {
    const ageDays = (now.getTime() - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
    const weight = Math.pow(0.5, Math.max(ageDays, 0) / RECENCY_HALF_LIFE_DAYS)
    weightedSum += r.value * weight
    totalWeight += weight
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight
}

const DEFAULT_MAX_DEVIATION_FROM_MEDIAN = 25

export function capOutliers(
  responses: SourceResponse[],
  maxDeviationFromMedian: number = DEFAULT_MAX_DEVIATION_FROM_MEDIAN,
): SourceResponse[] {
  if (responses.length < 3) return responses

  const sortedValues = [...responses.map(r => r.value)].sort((a, b) => a - b)
  const mid = Math.floor(sortedValues.length / 2)
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid]

  return responses.map(r => {
    const deviation = r.value - median
    if (Math.abs(deviation) > maxDeviationFromMedian) {
      const cappedValue = median + Math.sign(deviation) * maxDeviationFromMedian
      return { ...r, value: cappedValue }
    }
    return r
  })
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/response-scoring.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/response-scoring.ts web/src/lib/coach-dna/response-scoring.test.ts
git commit -m "feat(coach-dna): add recency-weighted averaging and peer-observation outlier capping"
```

---

### Task 5: Score change limiting and insufficient-data messaging

**Files:**
- Create: `web/src/lib/coach-dna/limits.ts`
- Test: `web/src/lib/coach-dna/limits.test.ts`

**Interfaces:**
- Consumes: `ScoreSource`, `CategoryWeightConfig`, `SOURCE_LABELS` from Task 2 (`./config`).
- Produces: `applyScoreChangeLimit(previousScore: number | null, newScore: number, maxDelta?: number): number`, `buildInsufficientDataMessage(sampleSizes: Record<ScoreSource, number>, thresholds: CategoryWeightConfig, weights: CategoryWeightConfig): string`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/limits.test.ts
import { describe, it, expect } from 'vitest'
import { applyScoreChangeLimit, buildInsufficientDataMessage } from './limits'
import { getCategoryWeights, getSourceThresholds } from './config'

describe('applyScoreChangeLimit', () => {
  it('returns the new score unclamped when there is no previous score', () => {
    expect(applyScoreChangeLimit(null, 42, 15)).toBe(42)
  })

  it('passes through a change within the allowed delta', () => {
    expect(applyScoreChangeLimit(50, 60, 15)).toBe(60)
  })

  it('clamps an increase larger than the allowed delta', () => {
    expect(applyScoreChangeLimit(50, 90, 15)).toBe(65)
  })

  it('clamps a decrease larger than the allowed delta', () => {
    expect(applyScoreChangeLimit(50, 10, 15)).toBe(35)
  })

  it('uses a sensible default delta when none is provided', () => {
    // default is documented as 15 in the module; a jump of 100 must still be clamped
    expect(applyScoreChangeLimit(20, 120)).toBeLessThan(120)
  })
})

describe('buildInsufficientDataMessage', () => {
  it('prompts for the highest-weighted inactive source', () => {
    const weights = getCategoryWeights('teacher') // player_voice weighted highest among typical gaps
    const thresholds = getSourceThresholds('teacher') // player_voice: 3
    const sampleSizes = { self: 1, player_voice: 0, peer_observation: 0, parent_voice: 0 }
    const message = buildInsufficientDataMessage(sampleSizes, thresholds, weights)
    expect(message).toBe('Get 3 more Player Voice responses to unlock this score.')
  })

  it('uses singular phrasing when exactly one more response is needed', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const sampleSizes = { self: 1, player_voice: 2, peer_observation: 0, parent_voice: 0 }
    const message = buildInsufficientDataMessage(sampleSizes, thresholds, weights)
    expect(message).toBe('Get 1 more Player Voice response to unlock this score.')
  })

  it('falls back to a generic message when every source is already at or above threshold', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const sampleSizes = { self: 5, player_voice: 5, peer_observation: 5, parent_voice: 5 }
    const message = buildInsufficientDataMessage(sampleSizes, thresholds, weights)
    expect(message).toBe('Not enough responses yet to calculate this score.')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/limits.test.ts`
Expected: FAIL — `Cannot find module './limits'`.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/limits.ts
import { SOURCES, SOURCE_LABELS, type CategoryWeightConfig, type ScoreSource } from './config'

const DEFAULT_MAX_SCORE_DELTA = 15

export function applyScoreChangeLimit(
  previousScore: number | null,
  newScore: number,
  maxDelta: number = DEFAULT_MAX_SCORE_DELTA,
): number {
  if (previousScore === null) return newScore
  const delta = newScore - previousScore
  if (delta > maxDelta) return previousScore + maxDelta
  if (delta < -maxDelta) return previousScore - maxDelta
  return newScore
}

export function buildInsufficientDataMessage(
  sampleSizes: Record<ScoreSource, number>,
  thresholds: CategoryWeightConfig,
  weights: CategoryWeightConfig,
): string {
  const inactive = SOURCES.filter(s => sampleSizes[s] < thresholds[s])
  if (inactive.length === 0) return 'Not enough responses yet to calculate this score.'

  const target = inactive.reduce((best, s) => (weights[s] > weights[best] ? s : best), inactive[0])
  const needed = Math.max(thresholds[target] - sampleSizes[target], 1)
  const noun = needed === 1 ? 'response' : 'responses'
  return `Get ${needed} more ${SOURCE_LABELS[target]} ${noun} to unlock this score.`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/limits.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/limits.ts web/src/lib/coach-dna/limits.test.ts
git commit -m "feat(coach-dna): add score change limiting and insufficient-data messaging"
```

---

### Task 6: Question-set version filtering

**Files:**
- Create: `web/src/lib/coach-dna/versioning.ts`
- Test: `web/src/lib/coach-dna/versioning.test.ts`

**Interfaces:**
- Produces: `VersionedResponse { value: number; submittedAt: string; questionVersion: number }`, `filterCurrentVersion(rows: VersionedResponse[], currentVersion: number): VersionedResponse[]`.

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/versioning.test.ts
import { describe, it, expect } from 'vitest'
import { filterCurrentVersion, type VersionedResponse } from './versioning'

describe('filterCurrentVersion', () => {
  it('keeps only responses matching the current question version', () => {
    const rows: VersionedResponse[] = [
      { value: 80, submittedAt: '2026-01-01T00:00:00Z', questionVersion: 1 },
      { value: 60, submittedAt: '2026-06-01T00:00:00Z', questionVersion: 2 },
      { value: 90, submittedAt: '2026-07-01T00:00:00Z', questionVersion: 2 },
    ]
    expect(filterCurrentVersion(rows, 2)).toEqual([
      { value: 60, submittedAt: '2026-06-01T00:00:00Z', questionVersion: 2 },
      { value: 90, submittedAt: '2026-07-01T00:00:00Z', questionVersion: 2 },
    ])
  })

  it('excludes responses tied to a retired question version even if it was the most recent version at submission time', () => {
    const rows: VersionedResponse[] = [
      { value: 100, submittedAt: '2026-07-01T00:00:00Z', questionVersion: 1 },
    ]
    expect(filterCurrentVersion(rows, 2)).toEqual([])
  })

  it('returns an empty array for no rows', () => {
    expect(filterCurrentVersion([], 1)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/versioning.test.ts`
Expected: FAIL — `Cannot find module './versioning'`.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/versioning.ts

export interface VersionedResponse {
  value: number
  submittedAt: string
  questionVersion: number
}

export function filterCurrentVersion<T extends VersionedResponse>(rows: T[], currentVersion: number): T[] {
  return rows.filter(r => r.questionVersion === currentVersion)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/versioning.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/versioning.ts web/src/lib/coach-dna/versioning.test.ts
git commit -m "feat(coach-dna): add question-set version filtering so retired questions don't corrupt historical scores"
```

---

### Task 7: `computeCategoryScore` orchestrator

**Files:**
- Create: `web/src/lib/coach-dna/scoring.ts`
- Test: `web/src/lib/coach-dna/scoring.test.ts`

**Interfaces:**
- Consumes: `ScoreSource`, `SOURCES`, `CategoryWeightConfig` from Task 2 (`./config`); `redistributeWeights` from Task 3 (`./redistribute`); `SourceResponse`, `computeRecencyWeightedAverage`, `capOutliers` from Task 4 (`./response-scoring`); `applyScoreChangeLimit`, `buildInsufficientDataMessage` from Task 5 (`./limits`).
- Produces: `SourceInput { source: ScoreSource; responses: SourceResponse[] }`, `CategoryScoreResult` (discriminated union on `status`), `computeCategoryScore(inputs: SourceInput[], weights: CategoryWeightConfig, thresholds: CategoryWeightConfig, now: Date, previousScore?: number | null): CategoryScoreResult`.

This is the module the design doc's required test cases target directly: **all-sources-active; one-source-missing; two-sources-missing; below-threshold-everywhere (→ `INSUFFICIENT_DATA`); a single outlier response not swinging the score; weight redistribution always sums to 100%.**

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/lib/coach-dna/scoring.test.ts
import { describe, it, expect } from 'vitest'
import { computeCategoryScore, type SourceInput } from './scoring'
import { getCategoryWeights, getSourceThresholds } from './config'

const NOW = new Date('2026-08-05T00:00:00Z')

function response(value: number, daysAgo = 0) {
  const d = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return { value, submittedAt: d.toISOString() }
}

describe('computeCategoryScore', () => {
  it('all sources active: returns a scored result blending every source', () => {
    const weights = getCategoryWeights('teacher') // self 25 / player 35 / peer 30 / parent 10
    const thresholds = getSourceThresholds('teacher') // self 1 / player 3 / peer 1 / parent 3
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [response(90)] },
      { source: 'parent_voice', responses: [response(60), response(65), response(62)] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('scored')
    if (result.status === 'scored') {
      // sanity: blended score is a weighted mix, must land strictly between the min and max source score
      expect(result.blendedScore).toBeGreaterThan(60)
      expect(result.blendedScore).toBeLessThan(90)
      expect(result.sourceScores.self).toBeCloseTo(80, 1)
      expect(result.sourceScores.peer_observation).toBeCloseTo(90, 1)
    }
  })

  it('one source missing: redistributes weight proportionally and still scores', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [response(90)] },
      { source: 'parent_voice', responses: [] }, // below threshold — MVP has no Parent Voice yet
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('scored')
  })

  it('two sources missing: still scores as long as two remain active', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [] },
      { source: 'parent_voice', responses: [] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('scored')
  })

  it('below threshold everywhere: returns INSUFFICIENT_DATA, never a fabricated number', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(80)] }, // only self active — explicitly insufficient per design doc
      { source: 'player_voice', responses: [] },
      { source: 'peer_observation', responses: [] },
      { source: 'parent_voice', responses: [] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('insufficient_data')
    if (result.status === 'insufficient_data') {
      expect(result.message).toContain('more')
      expect(result.message).toContain('unlock this score')
    }
    // TypeScript-level guarantee: an insufficient_data result has no blendedScore field at all
    expect((result as { blendedScore?: number }).blendedScore).toBeUndefined()
  })

  it('zero responses anywhere: returns INSUFFICIENT_DATA', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [] },
      { source: 'player_voice', responses: [] },
      { source: 'peer_observation', responses: [] },
      { source: 'parent_voice', responses: [] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW)
    expect(result.status).toBe('insufficient_data')
  })

  it('a single outlier peer-observation response does not swing the score', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const withoutOutlier: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [response(75), response(78), response(80)] },
    ]
    const withOutlier: SourceInput[] = [
      { source: 'self', responses: [response(80)] },
      { source: 'player_voice', responses: [response(70), response(75), response(72)] },
      { source: 'peer_observation', responses: [response(75), response(78), response(0)] }, // one extreme outlier added
    ]
    const resultWithout = computeCategoryScore(withoutOutlier, weights, thresholds, NOW)
    const resultWith = computeCategoryScore(withOutlier, weights, thresholds, NOW)
    expect(resultWithout.status).toBe('scored')
    expect(resultWith.status).toBe('scored')
    if (resultWithout.status === 'scored' && resultWith.status === 'scored') {
      // the outlier must not drag the blended score down by more than a few points
      expect(resultWithout.blendedScore - resultWith.blendedScore).toBeLessThan(10)
    }
  })

  it('weight redistribution always sums to 100% regardless of which sources are active', () => {
    const weights = getCategoryWeights('culture-builder') // self 15 / player 40 / peer 25 / parent 20
    const thresholds = getSourceThresholds('culture-builder')
    const activeSubsets: SourceInput[][] = [
      [
        { source: 'self', responses: [response(50)] },
        { source: 'player_voice', responses: [response(50), response(50), response(50)] },
      ],
      [
        { source: 'player_voice', responses: [response(50), response(50), response(50)] },
        { source: 'peer_observation', responses: [response(50)] },
        { source: 'parent_voice', responses: [response(50), response(50), response(50)] },
      ],
    ]
    for (const inputs of activeSubsets) {
      const result = computeCategoryScore(inputs, weights, thresholds, NOW)
      expect(result.status).toBe('scored')
      // if every active source reports the identical value, the blend must equal that value —
      // this only holds if the redistributed weights actually summed to 100
      if (result.status === 'scored') {
        expect(result.blendedScore).toBeCloseTo(50, 1)
      }
    }
  })

  it('applies the score change limit against a previous score', () => {
    const weights = getCategoryWeights('teacher')
    const thresholds = getSourceThresholds('teacher')
    const inputs: SourceInput[] = [
      { source: 'self', responses: [response(100)] },
      { source: 'player_voice', responses: [response(100), response(100), response(100)] },
      { source: 'peer_observation', responses: [response(100)] },
    ]
    const result = computeCategoryScore(inputs, weights, thresholds, NOW, 20) // previous score was 20
    expect(result.status).toBe('scored')
    if (result.status === 'scored') {
      // even though every source reports 100, the jump from a previous score of 20 must be capped
      expect(result.blendedScore).toBeLessThan(100)
      expect(result.blendedScore).toBeLessThanOrEqual(35) // default max delta is 15
    }
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/scoring.test.ts`
Expected: FAIL — `Cannot find module './scoring'`.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/scoring.ts
import { SOURCES, type CategoryWeightConfig, type ScoreSource } from './config'
import { redistributeWeights } from './redistribute'
import { computeRecencyWeightedAverage, capOutliers, type SourceResponse } from './response-scoring'
import { applyScoreChangeLimit, buildInsufficientDataMessage } from './limits'

export type { SourceResponse } from './response-scoring'
export type { ScoreSource, CategoryWeightConfig } from './config'

export interface SourceInput {
  source: ScoreSource
  responses: SourceResponse[]
}

export type CategoryScoreResult =
  | {
      status: 'scored'
      blendedScore: number
      sourceScores: Partial<Record<ScoreSource, number>>
    }
  | {
      status: 'insufficient_data'
      message: string
      sourceScores: Partial<Record<ScoreSource, number>>
    }

export function computeCategoryScore(
  inputs: SourceInput[],
  weights: CategoryWeightConfig,
  thresholds: CategoryWeightConfig,
  now: Date,
  previousScore: number | null = null,
): CategoryScoreResult {
  const sampleSizes: Record<ScoreSource, number> = {
    self: 0,
    player_voice: 0,
    peer_observation: 0,
    parent_voice: 0,
  }
  const sourceScores: Partial<Record<ScoreSource, number>> = {}

  for (const input of inputs) {
    sampleSizes[input.source] = input.responses.length
    if (input.responses.length === 0) continue
    const responses = input.source === 'peer_observation' ? capOutliers(input.responses) : input.responses
    sourceScores[input.source] = computeRecencyWeightedAverage(responses, now)
  }

  const activeSources = SOURCES.filter(s => sampleSizes[s] >= thresholds[s])

  if (activeSources.length < 2) {
    return {
      status: 'insufficient_data',
      message: buildInsufficientDataMessage(sampleSizes, thresholds, weights),
      sourceScores,
    }
  }

  const redistributed = redistributeWeights(weights, activeSources)
  const redistributedWeightSum = Object.values(redistributed).reduce((a, b) => a + (b ?? 0), 0)

  if (redistributedWeightSum === 0) {
    return {
      status: 'insufficient_data',
      message: buildInsufficientDataMessage(sampleSizes, thresholds, weights),
      sourceScores,
    }
  }

  const rawBlended = activeSources.reduce(
    (sum, s) => sum + (sourceScores[s] ?? 0) * (redistributed[s] ?? 0) / 100,
    0,
  )
  const blendedScore = applyScoreChangeLimit(previousScore, rawBlended)

  return { status: 'scored', blendedScore, sourceScores }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/scoring.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/scoring.ts web/src/lib/coach-dna/scoring.test.ts
git commit -m "feat(coach-dna): add computeCategoryScore orchestrator with insufficient-data and redistribution rules"
```

---

### Task 8: Full-module verification

**Files:**
- None created — this task verifies Tasks 1-7 together.

- [ ] **Step 1: Run the full Coach DNA scoring test suite**

Run: `cd web && npx vitest run src/lib/coach-dna`
Expected: all test files pass (config, redistribute, response-scoring, limits, versioning, scoring — 6 files, ~40 tests total).

- [ ] **Step 2: Run the full project test suite and typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npm run test`
Expected: all existing tests plus the new Coach DNA tests pass, no regressions.

- [ ] **Step 3: Confirm no I/O leaked into the pure module**

Run a check that none of the new files under `web/src/lib/coach-dna/` (excluding `config.ts`'s plain data) import `@/lib/supabase/*` or call `fetch`:
```bash
cd web && grep -rl "supabase\|fetch(" src/lib/coach-dna/*.ts | grep -v ".test.ts"
```
Expected: no output (empty) — confirms the module stayed pure per the Global Constraints, with all database wiring deferred to Phase 3.

- [ ] **Step 4: Commit (only if Step 1-3 required fixes)**

If any step required a fix, commit it with an appropriate message. If everything passed cleanly, skip this step — Phase 2 is complete as of Task 7's commit.

---

## Deferred to Phase 3

Reading assessment/feedback rows from Supabase, converting them into `SourceInput[]`/`SourceResponse[]` (including applying `filterCurrentVersion` from Task 6), calling `computeCategoryScore` per category, and writing the results to `coach_scores`/`coach_category_scores` via the service-role client — this "fetch, compute, persist" orchestration layer is Phase 3 UI/route work, not part of this plan. Per the design doc's rollout, the weight-redistribution and insufficient-data test output (Task 7's test file) is reviewed before that work starts.
