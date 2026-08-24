# Coach DNA — Outcome PDFs & Spectacle Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single branded Coach DNA card image with a "spectacle" reveal on the hub page that unlocks two downloadable PDFs — the full self-assessment/blended outcome, and a summarized player/parent/peer feedback report.

**Architecture:** A new aggregation module (`feedback-summary.ts`) computes simple per-category averages from cleared feedback, gated by the same anonymity thresholds the live scoring engine uses. Two new Route Handlers render PDFs on demand via `@react-pdf/renderer` (`renderToBuffer`), reusing the existing `CoachDnaSummaryPDF` template for PDF 1 and a new, self-contained `FeedbackSummaryPDF` template for PDF 2. A new client component (`CoachDnaOutcomeReveal`) replaces `CoachDnaCardDialog`: a bold ember-branded trigger that reveals two `<a download>` buttons in place, no modal. The old single-image card feature (route, `card-data.ts`, `google-font.ts`, `card-logo.ts`, `CoachDnaCardDialog.tsx`, and all their tests) is deleted.

**Tech Stack:** Next.js App Router (Route Handlers), `@react-pdf/renderer`, Supabase (service-role client for feedback aggregation, server client for auth/ownership), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-21-coach-dna-outcome-pdfs-design.md`

## Global Constraints

- Both new Route Handlers replicate the exact auth/ownership/blended-status gate the old `card-image` route used: `getUser()` → 401; `profiles.role` must be `admin` or `coach` → 403; `assessment_attempts` row must exist, belong to `user.id`, and have `completed_at` set → 404; `ensureFreshSummary(attemptId, user.id)` must produce a `hasBlendedFeedback(summary.sourcedCategories)` summary → 404. Never trust a client-supplied flag.
- The feedback summary never includes respondent-identifying data (no comments, no per-response detail) and withholds any category below its anonymity threshold (`getSourceThresholds`), exactly like the live blended score.
- No change to `computeCategoryScore`, `fetchBlendInputs`, the live blended score, or `CoachDnaSummaryPDF`'s existing content/props — PDF 1 reuses it unmodified. No change to `emailSelfAssessmentSummaryPDF`.
- No new database migration — read existing tables only.
- `FeedbackSummaryPDF.tsx` uses its own small, self-contained `StyleSheet` rather than extracting shared styles out of `CoachDnaSummaryPDF.tsx` — this avoids touching a working, already-shipped production file (used for real coach emails today) for a purely cosmetic/organizational win. Both templates independently define the same ember/zinc color language by eye by copying the hex values, not by sharing a module.
- Every `@react-pdf/renderer` mock in a new test file must match the established convention exactly: `{ renderToBuffer, StyleSheet: { create: (styles) => styles }, Document: 'Document', Page: 'Page', Text: 'Text', View: 'View', Image: 'Image' }` — `StyleSheet.create` runs at module load time in any file with a top-level `const s = StyleSheet.create({...})`, so it must always be mocked even when the component itself is never invoked.

---

### Task 1: Export `RESPONDENT_TO_SOURCE` + `computeFeedbackSummary` aggregation

**Files:**
- Modify: `web/src/lib/coach-dna/blend-inputs.ts`
- Create: `web/src/lib/coach-dna/feedback-summary.ts`
- Test: `web/src/lib/coach-dna/feedback-summary.test.ts`

**Interfaces:**
- Consumes: `getSourceThresholds(categorySlug: string): CategoryWeightConfig` and `type ScoreSource = 'self' | 'player_voice' | 'peer_observation' | 'parent_voice'` from `./config`.
- Produces: `export const RESPONDENT_TO_SOURCE: Record<string, ScoreSource>` from `./blend-inputs` (was private). `export interface FeedbackCategorySummary { categorySlug: string; averageRating: number; responseCount: number }`, `export interface FeedbackTypeSummary { ready: boolean; responseCount: number; categories: FeedbackCategorySummary[] }`, `export interface FeedbackSummaryData { playerParentVoice: FeedbackTypeSummary; peerObservation: FeedbackTypeSummary }`, `export async function computeFeedbackSummary(supabase: ReturnType<typeof createServiceClient>, coachId: string): Promise<FeedbackSummaryData>` from `./feedback-summary` — all consumed by Task 4's route handler.

- [ ] **Step 1: Export `RESPONDENT_TO_SOURCE` from `blend-inputs.ts`**

In `web/src/lib/coach-dna/blend-inputs.ts`, change:

```ts
const RESPONDENT_TO_SOURCE: Record<string, ScoreSource> = {
```

to:

```ts
export const RESPONDENT_TO_SOURCE: Record<string, ScoreSource> = {
```

No other change to this file. Run `cd web && npx vitest run src/lib/coach-dna/blend-inputs.test.ts` — expect PASS (unchanged behavior, `fetchBlendInputs`'s existing tests don't touch the export keyword).

- [ ] **Step 2: Write the failing tests for `computeFeedbackSummary`**

Create `web/src/lib/coach-dna/feedback-summary.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'

const state: {
  requestIds: string[]
  responses: { id: string; respondent_type: string }[]
  answers: { numeric_value: number | null; feedback_response_id: string; question_id: string; assessment_questions: { dna_categories: { slug: string } } }[]
  excludedResponseIds: string[]
} = {
  requestIds: [],
  responses: [],
  answers: [],
  excludedResponseIds: [],
}

function makeClient() {
  return {
    from: (table: string) => {
      if (table === 'feedback_requests') {
        return { select: () => ({ eq: async () => ({ data: state.requestIds.map(id => ({ id })) }) }) }
      }
      if (table === 'feedback_responses') {
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({ data: state.responses }),
            }),
          }),
        }
      }
      if (table === 'feedback_answers') {
        return {
          select: () => ({
            in: () => ({
              not: async () => ({ data: state.answers }),
            }),
          }),
        }
      }
      if (table === 'response_disputes') {
        return {
          select: () => ({
            in: () => ({
              eq: async () => ({ data: state.excludedResponseIds.map(id => ({ feedback_response_id: id })) }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }
}

import { computeFeedbackSummary } from './feedback-summary'

describe('computeFeedbackSummary', () => {
  beforeEach(() => {
    state.requestIds = ['req-1']
    state.responses = []
    state.answers = []
    state.excludedResponseIds = []
  })

  it('returns both sections not-ready when there are no feedback requests', async () => {
    state.requestIds = []
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.playerParentVoice).toEqual({ ready: false, responseCount: 0, categories: [] })
    expect(result.peerObservation).toEqual({ ready: false, responseCount: 0, categories: [] })
  })

  it('returns both sections not-ready when there are no responses', async () => {
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.playerParentVoice.ready).toBe(false)
    expect(result.peerObservation.ready).toBe(false)
  })

  it('withholds a category below its threshold (2 player responses, threshold 3)', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'player' },
      { id: 'resp-2', respondent_type: 'player' },
    ]
    state.answers = [
      { numeric_value: 4, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } },
      { numeric_value: 5, feedback_response_id: 'resp-2', question_id: 'q2', assessment_questions: { dna_categories: { slug: 'teacher' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.playerParentVoice.ready).toBe(false)
    expect(result.playerParentVoice.categories).toEqual([])
  })

  it('combines player + parent responses toward the Player / Parent Voice threshold', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'player' },
      { id: 'resp-2', respondent_type: 'player' },
      { id: 'resp-3', respondent_type: 'parent' },
    ]
    state.answers = [
      { numeric_value: 4, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'teacher' } } },
      { numeric_value: 4, feedback_response_id: 'resp-2', question_id: 'q2', assessment_questions: { dna_categories: { slug: 'teacher' } } },
      { numeric_value: 4, feedback_response_id: 'resp-3', question_id: 'q3', assessment_questions: { dna_categories: { slug: 'teacher' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.playerParentVoice.ready).toBe(true)
    expect(result.playerParentVoice.categories).toEqual([{ categorySlug: 'teacher', averageRating: 4, responseCount: 3 }])
    expect(result.playerParentVoice.responseCount).toBe(3)
  })

  it('clears Peer Observation at a single response (threshold 1)', async () => {
    state.responses = [{ id: 'resp-1', respondent_type: 'peer_coach' }]
    state.answers = [
      { numeric_value: 3, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'organiser' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.peerObservation.ready).toBe(true)
    expect(result.peerObservation.categories).toEqual([{ categorySlug: 'organiser', averageRating: 3, responseCount: 1 }])
  })

  it('computes a plain arithmetic mean across multiple answers in the same category', async () => {
    state.responses = [{ id: 'resp-1', respondent_type: 'peer_coach' }]
    state.answers = [
      { numeric_value: 2, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'organiser' } } },
      { numeric_value: 5, feedback_response_id: 'resp-1', question_id: 'q2', assessment_questions: { dna_categories: { slug: 'organiser' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.peerObservation.categories[0].averageRating).toBe(3.5)
  })

  it('excludes a response with an excluded dispute from both the average and the response count', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'peer_coach' },
      { id: 'resp-2', respondent_type: 'peer_coach' },
    ]
    state.answers = [
      { numeric_value: 1, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'organiser' } } },
      { numeric_value: 5, feedback_response_id: 'resp-2', question_id: 'q2', assessment_questions: { dna_categories: { slug: 'organiser' } } },
    ]
    state.excludedResponseIds = ['resp-1']
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.peerObservation.categories).toEqual([{ categorySlug: 'organiser', averageRating: 5, responseCount: 1 }])
    expect(result.peerObservation.responseCount).toBe(1)
  })

  it('keeps Player/Parent Voice and Peer Observation as independent sections', async () => {
    state.responses = [
      { id: 'resp-1', respondent_type: 'peer_coach' },
    ]
    state.answers = [
      { numeric_value: 4, feedback_response_id: 'resp-1', question_id: 'q1', assessment_questions: { dna_categories: { slug: 'organiser' } } },
    ]
    const result = await computeFeedbackSummary(makeClient() as never, 'coach-1')
    expect(result.peerObservation.ready).toBe(true)
    expect(result.playerParentVoice.ready).toBe(false)
    expect(result.playerParentVoice.categories).toEqual([])
  })
})
```

- [ ] **Step 2b: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/lib/coach-dna/feedback-summary.test.ts`
Expected: FAIL — `Cannot find module './feedback-summary'` (file doesn't exist yet).

- [ ] **Step 3: Implement `feedback-summary.ts`**

Create `web/src/lib/coach-dna/feedback-summary.ts`:

```ts
import type { createServiceClient } from '@/lib/supabase/service'
import { RESPONDENT_TO_SOURCE } from './blend-inputs'
import { getSourceThresholds, type ScoreSource } from './config'

type ServiceClient = ReturnType<typeof createServiceClient>

export interface FeedbackCategorySummary {
  categorySlug: string
  averageRating: number
  responseCount: number
}

export interface FeedbackTypeSummary {
  ready: boolean
  responseCount: number
  categories: FeedbackCategorySummary[]
}

export interface FeedbackSummaryData {
  playerParentVoice: FeedbackTypeSummary
  peerObservation: FeedbackTypeSummary
}

const EMPTY_TYPE_SUMMARY: FeedbackTypeSummary = { ready: false, responseCount: 0, categories: [] }

/** Cleared, non-excluded external feedback for a coach, aggregated into
 *  simple per-category averages for the downloadable feedback summary PDF --
 *  deliberately not the recency-weighted/outlier-capped blend
 *  computeCategoryScore uses for the live score, since this is a readable
 *  snapshot, not a precise blended score. A category is withheld until it
 *  clears the same anonymity threshold (getSourceThresholds) the live
 *  scoring engine already enforces. */
export async function computeFeedbackSummary(
  supabase: ServiceClient,
  coachId: string,
): Promise<FeedbackSummaryData> {
  const { data: requests } = await supabase.from('feedback_requests').select('id').eq('coach_id', coachId)
  const requestIds = (requests ?? []).map(r => r.id as string)
  if (requestIds.length === 0) {
    return { playerParentVoice: EMPTY_TYPE_SUMMARY, peerObservation: EMPTY_TYPE_SUMMARY }
  }

  const { data: responses } = await supabase
    .from('feedback_responses')
    .select('id, respondent_type')
    .in('feedback_request_id', requestIds)
    .eq('held_for_review', false)
  const responseRows = (responses ?? []) as { id: string; respondent_type: string }[]
  if (responseRows.length === 0) {
    return { playerParentVoice: EMPTY_TYPE_SUMMARY, peerObservation: EMPTY_TYPE_SUMMARY }
  }

  const responseIds = responseRows.map(r => r.id)

  const { data: disputes } = await supabase
    .from('response_disputes')
    .select('feedback_response_id')
    .in('feedback_response_id', responseIds)
    .eq('status', 'excluded')
  const excludedIds = new Set((disputes ?? []).map(d => d.feedback_response_id as string))

  const { data: answers } = await supabase
    .from('feedback_answers')
    .select('numeric_value, feedback_response_id, question_id, assessment_questions!inner(dna_categories!inner(slug))')
    .in('feedback_response_id', responseIds)
    .not('numeric_value', 'is', null)
  type AnswerRow = {
    numeric_value: number
    feedback_response_id: string
    question_id: string
    assessment_questions: { dna_categories: { slug: string } }
  }
  const answerRows = (answers ?? []) as unknown as AnswerRow[]

  const responseById = new Map(responseRows.map(r => [r.id, r]))

  // categorySlug -> source -> ratings[]
  const ratingsByCategoryAndSource = new Map<string, Map<ScoreSource, number[]>>()
  // source -> Set of cleared response ids (for the type's total response count)
  const clearedResponseIdsBySource = new Map<ScoreSource, Set<string>>()

  for (const answer of answerRows) {
    if (excludedIds.has(answer.feedback_response_id)) continue
    const response = responseById.get(answer.feedback_response_id)
    if (!response) continue
    const source = RESPONDENT_TO_SOURCE[response.respondent_type]
    if (!source) continue
    const slug = answer.assessment_questions.dna_categories.slug

    if (!ratingsByCategoryAndSource.has(slug)) ratingsByCategoryAndSource.set(slug, new Map())
    const bySource = ratingsByCategoryAndSource.get(slug)!
    if (!bySource.has(source)) bySource.set(source, [])
    bySource.get(source)!.push(answer.numeric_value)

    if (!clearedResponseIdsBySource.has(source)) clearedResponseIdsBySource.set(source, new Set())
    clearedResponseIdsBySource.get(source)!.add(response.id)
  }

  function average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  function buildTypeSummary(sources: ScoreSource[]): FeedbackTypeSummary {
    const categories: FeedbackCategorySummary[] = []
    for (const [slug, bySource] of ratingsByCategoryAndSource) {
      const combined = sources.flatMap(source => bySource.get(source) ?? [])
      const threshold = Math.min(...sources.map(source => getSourceThresholds(slug)[source]))
      if (combined.length >= threshold) {
        categories.push({ categorySlug: slug, averageRating: average(combined), responseCount: combined.length })
      }
    }
    const responseIdSet = new Set<string>()
    for (const source of sources) {
      for (const id of clearedResponseIdsBySource.get(source) ?? []) responseIdSet.add(id)
    }
    return { ready: categories.length > 0, responseCount: responseIdSet.size, categories }
  }

  return {
    playerParentVoice: buildTypeSummary(['player_voice', 'parent_voice']),
    peerObservation: buildTypeSummary(['peer_observation']),
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/lib/coach-dna/feedback-summary.test.ts`
Expected: PASS (all 8 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add web/src/lib/coach-dna/blend-inputs.ts web/src/lib/coach-dna/feedback-summary.ts web/src/lib/coach-dna/feedback-summary.test.ts
git commit -m "feat(coach-dna): add feedback-summary aggregation for the outcome PDFs"
```

---

### Task 2: `FeedbackSummaryPDF` template

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/FeedbackSummaryPDF.tsx`

No dedicated test file — mirrors the established precedent for `CoachDnaSummaryPDF.tsx`, which also has no direct render test; both are exercised indirectly through their consuming Route Handler/Server Action's captured `renderToBuffer` props (see Task 4).

**Interfaces:**
- Consumes: `labelFor(slug: string): string` from `@/lib/coach-dna/categories`; `FeedbackSummaryData`, `FeedbackTypeSummary` from `@/lib/coach-dna/feedback-summary` (Task 1).
- Produces: `export function FeedbackSummaryPDF({ data, coachName, clubName, logoSrc }: { data: FeedbackSummaryData; coachName?: string | null; clubName?: string | null; logoSrc?: string })` — a `@react-pdf/renderer` `Document` component, consumed by Task 4's route handler.

- [ ] **Step 1: Create the component**

Create `web/src/app/(app)/admin/coach-dna/FeedbackSummaryPDF.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { labelFor } from '@/lib/coach-dna/categories'
import type { FeedbackSummaryData, FeedbackTypeSummary } from '@/lib/coach-dna/feedback-summary'

const E      = '#e8560a'
const DARK   = '#111827'
const MID    = '#374151'
const MUTED  = '#6b7280'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE  = '#ffffff'

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, paddingBottom: 56, fontSize: 10, fontFamily: 'Helvetica', color: DARK },

  header: {
    backgroundColor: E,
    paddingHorizontal: 44,
    paddingTop: 44,
    paddingBottom: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLogoBadge: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
  },
  headerLogo: { width: 36, height: 36 },
  eyeLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 10 },
  title: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: -0.5 },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 6 },

  body: { paddingHorizontal: 44, paddingTop: 32 },

  groupHeading: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 2, marginBottom: 12, marginTop: 28,
    paddingBottom: 8, borderBottomWidth: 1.5, borderBottomStyle: 'solid', borderBottomColor: E, color: E,
  },
  responseCount: { fontSize: 9, color: MUTED, marginBottom: 14 },
  categoryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14, backgroundColor: LIGHT, borderRadius: 5, marginBottom: 6,
  },
  categoryName: { fontSize: 9.5, color: MID, fontFamily: 'Helvetica-Bold' },
  categoryRating: { fontSize: 9.5, color: DARK, fontFamily: 'Helvetica-Bold' },
  notReady: { fontSize: 9.5, color: MUTED, fontStyle: 'italic', paddingVertical: 8 },

  footer: {
    position: 'absolute', bottom: 20, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: E, letterSpacing: 1.5 },
  footerMeta: { fontSize: 6.5, color: MUTED },
})

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
            <View key={category.categorySlug} style={s.categoryRow}>
              <Text style={s.categoryName}>{labelFor(category.categorySlug)}</Text>
              <Text style={s.categoryRating}>{category.averageRating.toFixed(1)}/5</Text>
            </View>
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
      <Page size="A4" style={s.page}>
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

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/FeedbackSummaryPDF.tsx"
git commit -m "feat(coach-dna): add FeedbackSummaryPDF template"
```

---

### Task 3: `report-pdf` Route Handler (PDF 1 — full outcome)

**Files:**
- Create: `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.tsx`
- Test: `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts`

**Interfaces:**
- Consumes: `ensureFreshSummary(attemptId: string, coachId: string): Promise<SelfAssessmentSummary>` from `@/app/(app)/admin/coach-dna/summary-actions`; `hasBlendedFeedback(sourcedCategories): boolean` from `@/lib/coach-dna/blend-status`; `CoachDnaSummaryPDF` from `@/app/(app)/admin/coach-dna/CoachDnaSummaryPDF` (unmodified); `LOGO_DATA_URI` from `@/lib/pdf-logo`.
- Produces: `GET(request, { params }: { params: Promise<{ attemptId: string }> })` at `/api/coach-dna/report-pdf/[attemptId]`, consumed by Task 5's `CoachDnaOutcomeReveal` download link.

- [ ] **Step 1: Write the failing tests**

Create `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  displayName: string | null
  club: string | null
  clubId: string | null
  clubName: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  summary: {
    primaryType: string
    secondaryType: string | null
    narrative: string
    pros: unknown[]
    cons: unknown[]
    sourcedCategories?: Record<string, string[]>
  } | null
  ensureFreshSummaryError: Error | null
} = {
  user: null, role: null, displayName: null, club: null, clubId: null, clubName: null,
  attempt: null, summary: null, ensureFreshSummaryError: null,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: state.role === null
                  ? null
                  : { role: state.role, display_name: state.displayName, club: state.club, club_id: state.clubId },
              }),
            }),
          }),
        }
      }
      if (table === 'assessment_attempts') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }) }
      }
      if (table === 'clubs') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: state.clubName ? { name: state.clubName } : null }) }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

const ensureFreshSummaryMock = vi.fn(async (_attemptId: string, _coachId: string) => {
  if (state.ensureFreshSummaryError) throw state.ensureFreshSummaryError
  return state.summary
})
vi.mock('@/app/(app)/admin/coach-dna/summary-actions', () => ({
  ensureFreshSummary: (attemptId: string, coachId: string) => ensureFreshSummaryMock(attemptId, coachId),
}))

const renderToBufferMock = vi.fn(async (_element: unknown) => new Uint8Array([1, 2, 3]))
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: (element: unknown) => renderToBufferMock(element),
  StyleSheet: { create: (styles: unknown) => styles },
  Document: 'Document',
  Page: 'Page',
  Text: 'Text',
  View: 'View',
  Image: 'Image',
}))

import { GET } from './route'

function makeRequest(attemptId: string) {
  return GET(new Request(`http://localhost/api/coach-dna/report-pdf/${attemptId}`), {
    params: Promise.resolve({ attemptId }),
  })
}

describe('GET /api/coach-dna/report-pdf/[attemptId]', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.displayName = null
    state.club = null
    state.clubId = null
    state.clubName = null
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.summary = {
      primaryType: 'motivator', secondaryType: null, narrative: '',
      pros: [], cons: [], sourcedCategories: { motivator: ['self', 'player_voice'] },
    }
    state.ensureFreshSummaryError = null
    ensureFreshSummaryMock.mockClear()
    renderToBufferMock.mockClear()
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
    expect(renderToBufferMock).not.toHaveBeenCalled()
  })

  it('returns the PDF with the right headers for a blended profile', async () => {
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="coach-dna-outcome.pdf"')
    expect(renderToBufferMock).toHaveBeenCalledTimes(1)
  })

  it('passes the coach club name (resolved via club_id) and the completed_at timestamp through to the PDF', async () => {
    state.clubId = 'club-1'
    state.clubName = 'Wigan Warriors'

    await makeRequest('attempt-1')

    const element = renderToBufferMock.mock.calls[0][0] as { props: { clubName: string | null; completedAt: string } }
    expect(element.props.clubName).toBe('Wigan Warriors')
    expect(element.props.completedAt).toBe('2026-08-06T00:00:00.000Z')
  })

  it("always calls ensureFreshSummary with the authenticated caller's own id", async () => {
    await makeRequest('attempt-1')
    expect(ensureFreshSummaryMock).toHaveBeenCalledWith('attempt-1', 'coach-1')
  })

  it('returns 500 when ensureFreshSummary throws', async () => {
    state.ensureFreshSummaryError = new Error('groq down')
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts"`
Expected: FAIL — `Cannot find module './route'` (file doesn't exist yet).

- [ ] **Step 3: Implement the route handler**

Create `web/src/app/api/coach-dna/report-pdf/[attemptId]/route.tsx`:

```tsx
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { ensureFreshSummary } from '@/app/(app)/admin/coach-dna/summary-actions'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'
import { CoachDnaSummaryPDF } from '@/app/(app)/admin/coach-dna/CoachDnaSummaryPDF'
import { LOGO_DATA_URI } from '@/lib/pdf-logo'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, display_name, club, club_id')
      .eq('id', user.id)
      .single()
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

    // `club_id` (FK to `clubs`) is the current source of truth; `club` is a
    // legacy free-text fallback for profiles never migrated to it -- same
    // resolution order as pdf-actions.tsx's emailSelfAssessmentSummaryPDF.
    let clubName: string | null = profile?.club ?? null
    if (profile?.club_id) {
      const { data: club } = await supabase.from('clubs').select('name').eq('id', profile.club_id).single()
      clubName = club?.name ?? clubName
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      <CoachDnaSummaryPDF
        data={summary}
        completedAt={attempt.completed_at}
        logoSrc={LOGO_DATA_URI}
        coachName={profile?.display_name ?? null}
        clubName={clubName}
      /> as any,
    )

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="coach-dna-outcome.pdf"',
      },
    })
  } catch (err) {
    console.error('[coach-dna/report-pdf] Failed to generate report PDF:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/api/coach-dna/report-pdf/[attemptId]/route.test.ts"`
Expected: PASS (all 8 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add "web/src/app/api/coach-dna/report-pdf"
git commit -m "feat(coach-dna): add report-pdf route handler for the full outcome PDF"
```

---

### Task 4: `feedback-summary-pdf` Route Handler (PDF 2 — feedback summary)

**Files:**
- Create: `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.tsx`
- Test: `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts`

**Interfaces:**
- Consumes: same auth/ownership/blended gate as Task 3; `createServiceClient()` from `@/lib/supabase/service`; `computeFeedbackSummary(supabase, coachId): Promise<FeedbackSummaryData>` from `@/lib/coach-dna/feedback-summary` (Task 1); `FeedbackSummaryPDF` from `@/app/(app)/admin/coach-dna/FeedbackSummaryPDF` (Task 2); `LOGO_DATA_URI` from `@/lib/pdf-logo`.
- Produces: `GET(request, { params }: { params: Promise<{ attemptId: string }> })` at `/api/coach-dna/feedback-summary-pdf/[attemptId]`, consumed by Task 5's `CoachDnaOutcomeReveal` download link.

- [ ] **Step 1: Write the failing tests**

Create `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  displayName: string | null
  club: string | null
  clubId: string | null
  clubName: string | null
  attempt: { id: string; coach_id: string; completed_at: string | null } | null
  summary: {
    primaryType: string
    secondaryType: string | null
    narrative: string
    pros: unknown[]
    cons: unknown[]
    sourcedCategories?: Record<string, string[]>
  } | null
  ensureFreshSummaryError: Error | null
  feedbackSummary: unknown
} = {
  user: null, role: null, displayName: null, club: null, clubId: null, clubName: null,
  attempt: null, summary: null, ensureFreshSummaryError: null,
  feedbackSummary: {
    playerParentVoice: { ready: false, responseCount: 0, categories: [] },
    peerObservation: { ready: false, responseCount: 0, categories: [] },
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: state.role === null
                  ? null
                  : { role: state.role, display_name: state.displayName, club: state.club, club_id: state.clubId },
              }),
            }),
          }),
        }
      }
      if (table === 'assessment_attempts') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: state.attempt }) }) }) }
      }
      if (table === 'clubs') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: state.clubName ? { name: state.clubName } : null }) }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({}),
}))

const ensureFreshSummaryMock = vi.fn(async (_attemptId: string, _coachId: string) => {
  if (state.ensureFreshSummaryError) throw state.ensureFreshSummaryError
  return state.summary
})
vi.mock('@/app/(app)/admin/coach-dna/summary-actions', () => ({
  ensureFreshSummary: (attemptId: string, coachId: string) => ensureFreshSummaryMock(attemptId, coachId),
}))

const computeFeedbackSummaryMock = vi.fn(async (_supabase: unknown, _coachId: string) => state.feedbackSummary)
vi.mock('@/lib/coach-dna/feedback-summary', () => ({
  computeFeedbackSummary: (supabase: unknown, coachId: string) => computeFeedbackSummaryMock(supabase, coachId),
}))

const renderToBufferMock = vi.fn(async (_element: unknown) => new Uint8Array([1, 2, 3]))
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: (element: unknown) => renderToBufferMock(element),
  StyleSheet: { create: (styles: unknown) => styles },
  Document: 'Document',
  Page: 'Page',
  Text: 'Text',
  View: 'View',
  Image: 'Image',
}))

import { GET } from './route'

function makeRequest(attemptId: string) {
  return GET(new Request(`http://localhost/api/coach-dna/feedback-summary-pdf/${attemptId}`), {
    params: Promise.resolve({ attemptId }),
  })
}

describe('GET /api/coach-dna/feedback-summary-pdf/[attemptId]', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'admin'
    state.displayName = null
    state.club = null
    state.clubId = null
    state.clubName = null
    state.attempt = { id: 'attempt-1', coach_id: 'coach-1', completed_at: '2026-08-06T00:00:00.000Z' }
    state.summary = {
      primaryType: 'motivator', secondaryType: null, narrative: '',
      pros: [], cons: [], sourcedCategories: { motivator: ['self', 'player_voice'] },
    }
    state.ensureFreshSummaryError = null
    state.feedbackSummary = {
      playerParentVoice: { ready: true, responseCount: 4, categories: [{ categorySlug: 'motivator', averageRating: 4.2, responseCount: 4 }] },
      peerObservation: { ready: false, responseCount: 0, categories: [] },
    }
    ensureFreshSummaryMock.mockClear()
    computeFeedbackSummaryMock.mockClear()
    renderToBufferMock.mockClear()
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
    expect(computeFeedbackSummaryMock).not.toHaveBeenCalled()
  })

  it('returns the PDF with the right headers for a blended profile', async () => {
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="coach-dna-feedback-summary.pdf"')
    expect(renderToBufferMock).toHaveBeenCalledTimes(1)
  })

  it("calls computeFeedbackSummary with the authenticated caller's own id", async () => {
    await makeRequest('attempt-1')
    expect(computeFeedbackSummaryMock).toHaveBeenCalledWith(expect.anything(), 'coach-1')
  })

  it('passes the aggregated feedback summary data and club name through to the PDF', async () => {
    state.clubId = 'club-1'
    state.clubName = 'Wigan Warriors'

    await makeRequest('attempt-1')

    const element = renderToBufferMock.mock.calls[0][0] as { props: { data: unknown; clubName: string | null } }
    expect(element.props.data).toEqual(state.feedbackSummary)
    expect(element.props.clubName).toBe('Wigan Warriors')
  })

  it('returns 500 when computeFeedbackSummary throws', async () => {
    computeFeedbackSummaryMock.mockRejectedValueOnce(new Error('db down'))
    const res = await makeRequest('attempt-1')
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts"`
Expected: FAIL — `Cannot find module './route'` (file doesn't exist yet).

- [ ] **Step 3: Implement the route handler**

Create `web/src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.tsx`:

```tsx
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ensureFreshSummary } from '@/app/(app)/admin/coach-dna/summary-actions'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'
import { computeFeedbackSummary } from '@/lib/coach-dna/feedback-summary'
import { FeedbackSummaryPDF } from '@/app/(app)/admin/coach-dna/FeedbackSummaryPDF'
import { LOGO_DATA_URI } from '@/lib/pdf-logo'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, display_name, club, club_id')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin' && profile?.role !== 'coach') {
      return new Response('Forbidden', { status: 403 })
    }

    // The attemptId here is only used for the ownership/completion/blended
    // gate, matching the old card-image route's pattern -- the feedback
    // summary itself is keyed off coachId, not the attempt, since feedback
    // isn't tied to one specific assessment attempt.
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

    let clubName: string | null = profile?.club ?? null
    if (profile?.club_id) {
      const { data: club } = await supabase.from('clubs').select('name').eq('id', profile.club_id).single()
      clubName = club?.name ?? clubName
    }

    const serviceSupabase = createServiceClient()
    const feedbackSummary = await computeFeedbackSummary(serviceSupabase, user.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      <FeedbackSummaryPDF
        data={feedbackSummary}
        logoSrc={LOGO_DATA_URI}
        coachName={profile?.display_name ?? null}
        clubName={clubName}
      /> as any,
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/api/coach-dna/feedback-summary-pdf/[attemptId]/route.test.ts"`
Expected: PASS (all 9 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add "web/src/app/api/coach-dna/feedback-summary-pdf"
git commit -m "feat(coach-dna): add feedback-summary-pdf route handler"
```

---

### Task 5: `CoachDnaOutcomeReveal` component

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.tsx`
- Test: `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.test.tsx`

**Interfaces:**
- Consumes: `buttonVariants` from `@/components/ui/button`; `cn` from `@/lib/utils`.
- Produces: `export function CoachDnaOutcomeReveal({ attemptId }: { attemptId: string })` — a `'use client'` component, consumed by Task 6's `page.tsx`.

- [ ] **Step 1: Write the failing tests**

Create `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CoachDnaOutcomeReveal } from './CoachDnaOutcomeReveal'

describe('CoachDnaOutcomeReveal', () => {
  it('shows the trigger and no download links initially', () => {
    render(<CoachDnaOutcomeReveal attemptId="attempt-1" />)
    expect(screen.getByRole('button', { name: /Get Your Report/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Your Coach DNA Report' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Feedback Summary' })).not.toBeInTheDocument()
  })

  it('reveals both download links on click, with the right hrefs and download filenames', () => {
    render(<CoachDnaOutcomeReveal attemptId="attempt-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Get Your Report/ }))

    expect(screen.queryByRole('button', { name: /Get Your Report/ })).not.toBeInTheDocument()

    const reportLink = screen.getByRole('link', { name: 'Your Coach DNA Report' })
    expect(reportLink).toHaveAttribute('href', '/api/coach-dna/report-pdf/attempt-1')
    expect(reportLink).toHaveAttribute('download', 'coach-dna-outcome.pdf')

    const feedbackLink = screen.getByRole('link', { name: 'Feedback Summary' })
    expect(feedbackLink).toHaveAttribute('href', '/api/coach-dna/feedback-summary-pdf/attempt-1')
    expect(feedbackLink).toHaveAttribute('download', 'coach-dna-feedback-summary.pdf')
  })

  it('uses the given attemptId in both download URLs', () => {
    render(<CoachDnaOutcomeReveal attemptId="attempt-xyz" />)
    fireEvent.click(screen.getByRole('button', { name: /Get Your Report/ }))

    expect(screen.getByRole('link', { name: 'Your Coach DNA Report' })).toHaveAttribute(
      'href', '/api/coach-dna/report-pdf/attempt-xyz',
    )
    expect(screen.getByRole('link', { name: 'Feedback Summary' })).toHaveAttribute(
      'href', '/api/coach-dna/feedback-summary-pdf/attempt-xyz',
    )
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.test.tsx"`
Expected: FAIL — `Cannot find module './CoachDnaOutcomeReveal'` (file doesn't exist yet).

- [ ] **Step 3: Implement the component**

Create `web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ArrowDown, Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CoachDnaOutcomeReveal({ attemptId }: { attemptId: string }) {
  const [revealed, setRevealed] = useState(false)
  const reportUrl = `/api/coach-dna/report-pdf/${attemptId}`
  const feedbackSummaryUrl = `/api/coach-dna/feedback-summary-pdf/${attemptId}`

  return (
    <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-5 text-center">
      <p className="text-xs font-semibold text-orange-400 uppercase tracking-[0.2em] mb-1">
        Your outcome is ready
      </p>
      <p className="text-sm text-zinc-400 mb-4">
        Your full Coach DNA breakdown, plus a summary of what your players, parents, and peers said.
      </p>
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold text-white uppercase tracking-wide shadow-[0_0_24px_rgba(232,86,10,0.5)] transition-all hover:bg-orange-400 hover:shadow-[0_0_32px_rgba(232,86,10,0.7)]"
        >
          <Sparkles size={16} />
          Get Your Report
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
Expected: PASS (all 3 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

```bash
git add "web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.tsx" "web/src/app/(app)/admin/coach-dna/CoachDnaOutcomeReveal.test.tsx"
git commit -m "feat(coach-dna): add CoachDnaOutcomeReveal spectacle trigger"
```

---

### Task 6: Wire into the hub page and remove the old single-image card feature

**Files:**
- Modify: `web/src/app/(app)/admin/coach-dna/page.tsx`
- Modify: `web/src/app/(app)/admin/coach-dna/page.test.tsx`
- Delete: `web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.tsx`
- Delete: `web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.test.tsx`
- Delete: `web/src/app/api/coach-dna/card-image/[attemptId]/route.tsx`
- Delete: `web/src/app/api/coach-dna/card-image/[attemptId]/route.test.ts`
- Delete: `web/src/lib/coach-dna/card-data.ts`
- Delete: `web/src/lib/coach-dna/card-data.test.ts`
- Delete: `web/src/lib/coach-dna/google-font.ts`
- Delete: `web/src/lib/coach-dna/google-font.test.ts`
- Delete: `web/src/lib/coach-dna/card-logo.ts`

**Interfaces:**
- Consumes: `CoachDnaOutcomeReveal` from `./CoachDnaOutcomeReveal` (Task 5).

- [ ] **Step 1: Swap the import and usage in `page.tsx`**

In `web/src/app/(app)/admin/coach-dna/page.tsx`, change the import:

```tsx
import { CoachDnaCardDialog } from './CoachDnaCardDialog'
```

to:

```tsx
import { CoachDnaOutcomeReveal } from './CoachDnaOutcomeReveal'
```

Then change the usage (inside the `completed && summary` branch, after the "View full breakdown" link):

```tsx
                {hasBlendedFeedback(summary.sourcedCategories) && (
                  <CoachDnaCardDialog attemptId={completed.id} />
                )}
```

to:

```tsx
                {hasBlendedFeedback(summary.sourcedCategories) && (
                  <CoachDnaOutcomeReveal attemptId={completed.id} />
                )}
```

- [ ] **Step 2: Update `page.test.tsx`'s three assertions that reference the old button**

In `web/src/app/(app)/admin/coach-dna/page.test.tsx`, in the test `'shows the Coach DNA card button when feedback has blended in'`, change:

```tsx
    expect(screen.getByRole('button', { name: 'View my Coach DNA card' })).toBeInTheDocument()
```

to:

```tsx
    expect(screen.getByRole('button', { name: /Get Your Report/ })).toBeInTheDocument()
```

Also rename that test's description to `'shows the outcome reveal trigger when feedback has blended in'`.

In the test `'hides the Coach DNA card button for a self-only summary'`, change:

```tsx
    expect(screen.queryByRole('button', { name: 'View my Coach DNA card' })).not.toBeInTheDocument()
```

to:

```tsx
    expect(screen.queryByRole('button', { name: /Get Your Report/ })).not.toBeInTheDocument()
```

Also rename that test's description to `'hides the outcome reveal trigger for a self-only summary'`.

In the test `'still shows the card button off a fallback-cached summary that is itself already blended'`, change:

```tsx
    expect(screen.getByRole('button', { name: 'View my Coach DNA card' })).toBeInTheDocument()
```

to:

```tsx
    expect(screen.getByRole('button', { name: /Get Your Report/ })).toBeInTheDocument()
```

Also rename that test's description to `'still shows the outcome reveal trigger off a fallback-cached summary that is itself already blended'`.

- [ ] **Step 3: Delete the old single-image card feature**

```bash
git rm "web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.tsx" "web/src/app/(app)/admin/coach-dna/CoachDnaCardDialog.test.tsx"
git rm -r "web/src/app/api/coach-dna/card-image"
git rm "web/src/lib/coach-dna/card-data.ts" "web/src/lib/coach-dna/card-data.test.ts"
git rm "web/src/lib/coach-dna/google-font.ts" "web/src/lib/coach-dna/google-font.test.ts"
git rm "web/src/lib/coach-dna/card-logo.ts"
```

- [ ] **Step 4: Run the full Coach DNA test suite to verify everything passes**

Run: `cd web && npx vitest run src/app/(app)/admin/coach-dna src/app/api/coach-dna src/lib/coach-dna`
Expected: PASS — no test references `CoachDnaCardDialog`, `card-image`, `card-data`, `google-font`, or `card-logo` anymore; `page.test.tsx`'s three renamed assertions pass against the new trigger text.

- [ ] **Step 5: Confirm nothing else references the deleted files**

Run: `cd web && grep -rln "card-image\|card-data\|google-font\|card-logo\|CoachDnaCardDialog" src`
Expected: no output (empty result).

- [ ] **Step 6: Typecheck, lint, and run the full test suite**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npx eslint .`
Expected: no errors.

Run: `cd web && npm run test`
Expected: PASS (full suite, including the new and modified files from Tasks 1-6).

- [ ] **Step 7: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/page.tsx" "web/src/app/(app)/admin/coach-dna/page.test.tsx"
git commit -m "feat(coach-dna): wire in the outcome reveal and retire the single-image card"
```

---

## Self-Review Notes

**Spec coverage:** Part 1 (aggregation + `RESPONDENT_TO_SOURCE` export) → Task 1. Part 2 (`FeedbackSummaryPDF`) → Task 2, with the shared-styles question the spec left open resolved in favor of a self-contained `StyleSheet` (documented in Global Constraints) to avoid touching the working, already-shipped `CoachDnaSummaryPDF.tsx`. Part 3 (two Route Handlers) → Tasks 3 and 4. Part 4 (redesigned trigger + hub page wiring) → Tasks 5 and 6. Part 5 (removal) → Task 6. Security section → the auth/ownership/blended gate replicated identically in Tasks 3 and 4, and the anonymity-threshold gating already built into `computeFeedbackSummary` (Task 1). Out of scope items are untouched by every task.

**Placeholder scan:** No TBD/TODO markers; every step has complete, copy-pasteable code; no "similar to Task N" references.

**Type consistency:** `FeedbackSummaryData` / `FeedbackTypeSummary` / `FeedbackCategorySummary` (Task 1) match exactly between the aggregation module, `FeedbackSummaryPDF`'s props (Task 2), and the feedback-summary-pdf route's test assertions (Task 4). `RESPONDENT_TO_SOURCE` is exported once (Task 1, Step 1) and only consumed, never redefined. `CoachDnaOutcomeReveal`'s `attemptId: string` prop matches `CoachDnaCardDialog`'s original signature, so Task 6's swap in `page.tsx` needs no other change to the surrounding JSX.
