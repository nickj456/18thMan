# Feedback Public Submission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a respondent (player, parent, or peer coach) open a feedback request's shareable link, rate 8 statements and optionally leave one comment, and submit it — with the comment automatically screened for safeguarding concerns before a coach ever sees it. This is Plan 2 of 4 implementing `docs/superpowers/specs/2026-08-12-coach-360-feedback-design.md` (Part 3, plus the read side of Part 2).

**Architecture:** A new route outside the `(app)` auth group, `web/src/app/feedback/[token]/`, resolves a `feedback_requests.token` to the request with no login. Every read and write in this flow uses the service-role client (`createServiceClient()`), not the request-scoped anon client — `feedback_requests`, `assessment_questions`, `feedback_responses`, and `feedback_answers` all currently have zero RLS grants for the `anon` role (confirmed by reading migrations 085–109 directly), and the design spec's own Part 5 text already anticipates this: the service client "is not needed until Plan 2 (anonymous public submission, which has no `auth.uid()` to satisfy these policies with)". Rather than carve new anon RLS policies into a safeguarding-sensitive table set, this plan keeps every anonymous read/write behind the service-role client with all validation (token validity, expiry, status, respondent-type-vs-feedback-type, rating range, question-shape) done in application code before any write reaches the database.

**Tech Stack:** Next.js App Router (Server Components, Server Actions, `useActionState`), Supabase Postgres (service-role client), Vercel AI SDK + Groq (automated safeguarding screen, mirroring the existing Coach DNA summary call), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-12-coach-360-feedback-design.md`

## Global Constraints

- No anon RLS policies exist on `feedback_requests`, `assessment_questions`, `feedback_responses`, `feedback_answers`, or `safeguarding_flags`, and none are added by this plan. Every read/write in the public submission path uses `createServiceClient()` (`web/src/lib/supabase/service.ts`) — this is a deliberate choice already flagged in the design spec, not a workaround to patch later.
- `feedback_responses.held_for_review` defaults to `false` at the schema level (migration `088_feedback_requests.sql`). This plan's insert must explicitly set it to `true`, then explicitly flip it to `false` only on the clean-or-no-comment path. Getting this backwards silently defeats the safeguarding gate.
- Rating answers use `feedback_answers.numeric_value` (integer 1–5); the free-text answer uses `written_value`. A `feedback_answers` row for the free-text question is only created if the respondent actually left a comment — no empty row otherwise.
- `respondent_type` is `'peer_coach'` (not `'peer_observation'`) for Peer Observation requests — don't confuse the `feedback_type` enum value (`'player_voice' | 'peer_observation'`) with the `respondent_type` enum value (`'player' | 'parent' | 'peer_coach'`).
- Migration `117_feedback_question_bank_display_order.sql` (already applied live) set `display_order` 1–9 per `assessment_type` for the `player_voice`/`peer_observation` question banks (8 rating-scale statements + 1 free-text). Always fetch questions with `.order('display_order')`.
- Device-fingerprint throttling (`feedback_responses.device_fingerprint_hash`) is a basic anti-abuse measure only, not a security control — no CAPTCHA, no IP-based blocking, per the design spec's explicit scope note.
- `/feedback/[token]` sits outside the `(app)` route group and is not in `web/src/proxy.ts`'s protected-route matcher (`web/src/lib/supabase/middleware.ts`'s `isAppRoute` check) — no auth-check changes are needed there. Add `/feedback` to `web/src/app/robots.ts`'s disallow list and set `robots: { index: false, follow: false }` on the page's metadata — these links may reference minors and must never be indexed.
- All web app commands run from `web/`.

---

### Task 1: Safeguarding check helper

**Files:**
- Create: `web/src/lib/coach-dna/safeguarding.ts`
- Create: `web/src/lib/coach-dna/safeguarding.test.ts`

**Interfaces:**
- Produces: `checkSafeguardingConcern(text: string): Promise<boolean>` — consumed by Task 4.

**Context for the implementer:** Mirrors the existing Groq call in `web/src/app/(app)/admin/coach-dna/summary-actions.ts` (`createGroq`, `generateText`, model `'llama-3.3-70b-versatile'`). Unlike that call, this one must **fail closed**: any API error, timeout, or unparseable response returns `true` (flagged), never `false` — a false negative here means unscreened content reaches a coach unmoderated, which is worse than an occasional false positive landing in the manual moderation queue (Plan 4).

- [ ] **Step 1: Write the failing test**

```ts
// web/src/lib/coach-dna/safeguarding.test.ts
import { describe, it, expect, vi } from 'vitest'

const generateTextMock = vi.fn()

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}))
vi.mock('@ai-sdk/groq', () => ({
  createGroq: () => (model: string) => ({ modelId: model }),
}))

import { checkSafeguardingConcern } from './safeguarding'

describe('checkSafeguardingConcern', () => {
  it('returns false when the model responds CLEAR', async () => {
    generateTextMock.mockResolvedValueOnce({ text: 'CLEAR' })
    expect(await checkSafeguardingConcern('Great coach, really helped me improve.')).toBe(false)
  })

  it('returns true when the model responds FLAG', async () => {
    generateTextMock.mockResolvedValueOnce({ text: 'FLAG' })
    expect(await checkSafeguardingConcern('concerning text')).toBe(true)
  })

  it('is case- and whitespace-insensitive on CLEAR', async () => {
    generateTextMock.mockResolvedValueOnce({ text: '  clear  \n' })
    expect(await checkSafeguardingConcern('fine')).toBe(false)
  })

  it('fails closed (flags) on an unparseable response', async () => {
    generateTextMock.mockResolvedValueOnce({ text: 'I cannot determine this.' })
    expect(await checkSafeguardingConcern('ambiguous')).toBe(true)
  })

  it('fails closed (flags) when the model call throws', async () => {
    generateTextMock.mockRejectedValueOnce(new Error('groq down'))
    expect(await checkSafeguardingConcern('anything')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/coach-dna/safeguarding.test.ts`
Expected: FAIL — `./safeguarding` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/safeguarding.ts
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

/**
 * Automated safeguarding screen for a free-text feedback comment. Fails
 * closed: any error, timeout, or unparseable response is treated as a flag
 * (held for manual review) rather than waved through, since a false
 * negative here is far worse than a false positive landing in the
 * moderation queue.
 */
export async function checkSafeguardingConcern(text: string): Promise<boolean> {
  const prompt = `You are a safeguarding screener for a youth rugby league coaching platform. A respondent (who may be a child, a parent, or a coach) has submitted this free-text comment as part of anonymous coach feedback:

"""
${text}
"""

Does this text contain anything inappropriate directed at or involving a minor (e.g. sexual content, grooming language, an abuse disclosure requiring urgent escalation, or other content unsafe for an automated review queue to pass through untouched)?

Respond with ONLY the single word "FLAG" or "CLEAR" — no other text.`

  try {
    const { text: result } = await generateText({ model: groq('llama-3.3-70b-versatile'), prompt })
    return result.trim().toUpperCase() !== 'CLEAR'
  } catch {
    return true
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/coach-dna/safeguarding.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/safeguarding.ts web/src/lib/coach-dna/safeguarding.test.ts
git commit -m "feat(feedback): add automated safeguarding check for free-text comments"
```

---

### Task 2: Device fingerprint hash helper

**Files:**
- Create: `web/src/lib/coach-dna/device-fingerprint.ts`
- Create: `web/src/lib/coach-dna/device-fingerprint.test.ts`

**Interfaces:**
- Produces: `hashDeviceFingerprint(deviceId: string, token: string): string` — consumed by Task 4.

**Context for the implementer:** `feedback_responses.device_fingerprint_hash` already exists in the schema for basic duplicate-submission throttling (see Global Constraints — not a new anti-abuse system). Hashing the device id together with the request's token means the same browser submitting to two different coaches' requests produces unrelated hashes — nothing to correlate across requests — while a second submission to the *same* request from the same browser is still detectable.

- [ ] **Step 1: Write the failing test**

```ts
// web/src/lib/coach-dna/device-fingerprint.test.ts
import { describe, it, expect } from 'vitest'
import { hashDeviceFingerprint } from './device-fingerprint'

describe('hashDeviceFingerprint', () => {
  it('is deterministic for the same device id and token', () => {
    const a = hashDeviceFingerprint('device-1', 'token-1')
    const b = hashDeviceFingerprint('device-1', 'token-1')
    expect(a).toBe(b)
  })

  it('produces a 64-character hex sha256 digest', () => {
    expect(hashDeviceFingerprint('device-1', 'token-1')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different hashes for the same device across different requests', () => {
    const a = hashDeviceFingerprint('device-1', 'token-1')
    const b = hashDeviceFingerprint('device-1', 'token-2')
    expect(a).not.toBe(b)
  })

  it('produces different hashes for different devices on the same request', () => {
    const a = hashDeviceFingerprint('device-1', 'token-1')
    const b = hashDeviceFingerprint('device-2', 'token-1')
    expect(a).not.toBe(b)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/coach-dna/device-fingerprint.test.ts`
Expected: FAIL — `./device-fingerprint` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/device-fingerprint.ts
import { createHash } from 'crypto'

/**
 * Hashes a client-generated device id together with the feedback request's
 * token, so the hash is meaningless outside the (device, request) pair it
 * was computed for. Not a security control — see the design spec's
 * explicit scope note: no CAPTCHA, no IP-based blocking, basic throttling
 * only.
 */
export function hashDeviceFingerprint(deviceId: string, token: string): string {
  return createHash('sha256').update(`${deviceId}:${token}`).digest('hex')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/coach-dna/device-fingerprint.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/device-fingerprint.ts web/src/lib/coach-dna/device-fingerprint.test.ts
git commit -m "feat(feedback): add device fingerprint hashing helper"
```

---

### Task 3: Feedback-request eligibility helper

**Files:**
- Create: `web/src/lib/coach-dna/feedback-request-status.ts`
- Create: `web/src/lib/coach-dna/feedback-request-status.test.ts`

**Interfaces:**
- Produces: `feedbackRequestEligibility(request: { status: 'active' | 'paused' | 'expired'; expires_at: string }): 'accepting' | 'expired' | 'paused'` — consumed by Task 4 (re-checked at submit time) and Task 6 (checked at render time).

**Context for the implementer:** A request can be unavailable two ways: its `expires_at` timestamp has passed (checked regardless of `status`, since nothing sweeps `status` to `'expired'` on a timer), or its coach has manually set `status = 'paused'`. Both are checked independently at render time (Task 6) and again inside the submit action (Task 4) — never trust that a page render is still valid by the time of submit.

- [ ] **Step 1: Write the failing test**

```ts
// web/src/lib/coach-dna/feedback-request-status.test.ts
import { describe, it, expect } from 'vitest'
import { feedbackRequestEligibility } from './feedback-request-status'

const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
const past = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

describe('feedbackRequestEligibility', () => {
  it('returns accepting for an active, non-expired request', () => {
    expect(feedbackRequestEligibility({ status: 'active', expires_at: future() })).toBe('accepting')
  })

  it('returns expired when expires_at has passed, even if status is still active', () => {
    expect(feedbackRequestEligibility({ status: 'active', expires_at: past() })).toBe('expired')
  })

  it('returns paused for a paused, non-expired request', () => {
    expect(feedbackRequestEligibility({ status: 'paused', expires_at: future() })).toBe('paused')
  })

  it('returns expired for an explicitly expired status', () => {
    expect(feedbackRequestEligibility({ status: 'expired', expires_at: future() })).toBe('expired')
  })

  it('prefers expired over paused when both apply', () => {
    expect(feedbackRequestEligibility({ status: 'paused', expires_at: past() })).toBe('expired')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/coach-dna/feedback-request-status.test.ts`
Expected: FAIL — `./feedback-request-status` does not exist yet.

- [ ] **Step 3: Write the implementation**

```ts
// web/src/lib/coach-dna/feedback-request-status.ts
export type FeedbackRequestEligibility = 'accepting' | 'expired' | 'paused'

/** Whether a feedback request is currently accepting public submissions. */
export function feedbackRequestEligibility(request: {
  status: 'active' | 'paused' | 'expired'
  expires_at: string
}): FeedbackRequestEligibility {
  if (new Date(request.expires_at).getTime() <= Date.now()) return 'expired'
  if (request.status === 'paused') return 'paused'
  if (request.status === 'expired') return 'expired'
  return 'accepting'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/coach-dna/feedback-request-status.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/coach-dna/feedback-request-status.ts web/src/lib/coach-dna/feedback-request-status.test.ts
git commit -m "feat(feedback): add feedback request eligibility helper"
```

---

### Task 4: `submitFeedbackResponse` server action

**Files:**
- Create: `web/src/app/feedback/[token]/actions.ts`
- Create: `web/src/app/feedback/[token]/actions.test.ts`

**Interfaces:**
- Consumes: `checkSafeguardingConcern` (Task 1), `hashDeviceFingerprint` (Task 2), `feedbackRequestEligibility` (Task 3).
- Produces: `type SubmitFeedbackState = { error?: string; success?: boolean }` and `submitFeedbackResponse(token: string, prevState: SubmitFeedbackState, formData: FormData): Promise<SubmitFeedbackState>` — consumed by Task 5 (bound to the form via `.bind(null, token)` and `useActionState`).

**Context for the implementer:** This is the only task in this plan implementing the four numbered steps in the design spec's Part 3 ("On submit: 1. create held response, 2. safeguarding-check any comment, 3. clean/no-comment clears the hold, 4. flagged creates a `safeguarding_flags` row and stays held"). Use `createServiceClient()` (`web/src/lib/supabase/service.ts`) for every table access — see Global Constraints for why. Never surface a raw database error message to the caller; return the generic `GENERIC_ERROR` string instead (this endpoint is reachable by anonymous members of the public, including minors).

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/app/feedback/[token]/actions.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Question = { id: string; question_format: string }

const state: {
  request: { id: string; feedback_type: 'player_voice' | 'peer_observation'; status: 'active' | 'paused' | 'expired'; expires_at: string } | null
  questions: Question[]
  existingResponseId: string | null
  insertResponseError: { message: string } | null
  insertAnswersError: { message: string } | null
  safeguardingFlagged: boolean
} = {
  request: null,
  questions: [],
  existingResponseId: null,
  insertResponseError: null,
  insertAnswersError: null,
  safeguardingFlagged: false,
}

const insertResponseMock = vi.fn()
const insertAnswersMock = vi.fn()
const insertFlagMock = vi.fn(async () => ({ error: null }))
const updateHeldMock = vi.fn()
const checkSafeguardingConcernMock = vi.fn(async () => state.safeguardingFlagged)

vi.mock('@/lib/coach-dna/safeguarding', () => ({
  checkSafeguardingConcern: (text: string) => checkSafeguardingConcernMock(text),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'feedback_requests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: state.request }),
            }),
          }),
        }
      }
      if (table === 'assessment_questions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: state.questions }),
              }),
            }),
          }),
        }
      }
      if (table === 'feedback_responses') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.existingResponseId ? { id: state.existingResponseId } : null }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                insertResponseMock(row)
                if (state.insertResponseError) return { data: null, error: state.insertResponseError }
                return { data: { id: 'response-1' }, error: null }
              },
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              updateHeldMock(patch)
              return { error: null }
            },
          }),
        }
      }
      if (table === 'feedback_answers') {
        return {
          insert: (rows: Record<string, unknown>[]) => ({
            select: async () => {
              insertAnswersMock(rows)
              if (state.insertAnswersError) return { data: null, error: state.insertAnswersError }
              return { data: rows.map((r, i) => ({ id: `answer-${i}`, question_id: r.question_id })), error: null }
            },
          }),
        }
      }
      if (table === 'safeguarding_flags') {
        return { insert: (row: Record<string, unknown>) => insertFlagMock(row) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { submitFeedbackResponse } from './actions'

const RATING_QUESTIONS: Question[] = Array.from({ length: 8 }, (_, i) => ({ id: `q${i + 1}`, question_format: 'rating_scale' }))
const FREE_TEXT_QUESTION: Question = { id: 'qft', question_format: 'free_text' }
const ALL_QUESTIONS = [...RATING_QUESTIONS, FREE_TEXT_QUESTION]

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

function allRatings(value = '4'): Record<string, string> {
  return Object.fromEntries(RATING_QUESTIONS.map(q => [`rating-${q.id}`, value]))
}

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

describe('submitFeedbackResponse', () => {
  beforeEach(() => {
    state.request = { id: 'req-1', feedback_type: 'peer_observation', status: 'active', expires_at: FUTURE }
    state.questions = ALL_QUESTIONS
    state.existingResponseId = null
    state.insertResponseError = null
    state.insertAnswersError = null
    state.safeguardingFlagged = false
    insertResponseMock.mockClear()
    insertAnswersMock.mockClear()
    insertFlagMock.mockClear()
    updateHeldMock.mockClear()
    checkSafeguardingConcernMock.mockClear()
  })

  it('rejects when the token does not resolve to a request', async () => {
    state.request = null
    const result = await submitFeedbackResponse('bad-token', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'This feedback link is no longer valid.' })
  })

  it('rejects an expired request', async () => {
    state.request!.expires_at = PAST
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'This feedback request has expired.' })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('rejects a paused request', async () => {
    state.request!.status = 'paused'
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'This coach is not currently accepting feedback on this link.' })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('peer_observation: submits successfully with no comment, respondentType always peer_coach', async () => {
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ success: true })
    expect(insertResponseMock).toHaveBeenCalledWith(expect.objectContaining({ respondent_type: 'peer_coach', held_for_review: true }))
    expect(updateHeldMock).toHaveBeenCalledWith({ held_for_review: false })
    expect(checkSafeguardingConcernMock).not.toHaveBeenCalled()
  })

  it('player_voice: rejects when respondentType is missing', async () => {
    state.request!.feedback_type = 'player_voice'
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'Please select whether you are the player or a parent.' })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('player_voice: submits successfully with respondentType parent', async () => {
    state.request!.feedback_type = 'player_voice'
    const result = await submitFeedbackResponse('token-1', {}, formData({ ...allRatings(), respondentType: 'parent' }))
    expect(result).toEqual({ success: true })
    expect(insertResponseMock).toHaveBeenCalledWith(expect.objectContaining({ respondent_type: 'parent' }))
  })

  it('rejects when a rating is missing', async () => {
    const ratings = allRatings()
    delete (ratings as Record<string, string>)['rating-q8']
    const result = await submitFeedbackResponse('token-1', {}, formData(ratings))
    expect(result).toEqual({ error: 'Please rate every statement before submitting.' })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range rating', async () => {
    const result = await submitFeedbackResponse('token-1', {}, formData({ ...allRatings(), 'rating-q1': '6' }))
    expect(result).toEqual({ error: 'Please rate every statement before submitting.' })
  })

  it('rejects a duplicate submission from the same device', async () => {
    state.existingResponseId = 'existing-response'
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: "You've already submitted feedback for this request." })
    expect(insertResponseMock).not.toHaveBeenCalled()
  })

  it('a clean comment flips held_for_review to false and never creates a safeguarding flag', async () => {
    state.safeguardingFlagged = false
    const result = await submitFeedbackResponse('token-1', {}, formData({ ...allRatings(), comment: 'Great coach!' }))
    expect(result).toEqual({ success: true })
    expect(checkSafeguardingConcernMock).toHaveBeenCalledWith('Great coach!')
    expect(updateHeldMock).toHaveBeenCalledWith({ held_for_review: false })
    expect(insertFlagMock).not.toHaveBeenCalled()
  })

  it('a flagged comment creates a safeguarding_flags row and leaves the response held', async () => {
    state.safeguardingFlagged = true
    const result = await submitFeedbackResponse('token-1', {}, formData({ ...allRatings(), comment: 'concerning text' }))
    expect(result).toEqual({ success: true })
    expect(insertFlagMock).toHaveBeenCalledWith(
      expect.objectContaining({ flagged_text: 'concerning text', detection_method: 'automated', feedback_answer_id: 'answer-8' }),
    )
    expect(updateHeldMock).not.toHaveBeenCalled()
  })

  it('returns a generic error when the response insert fails', async () => {
    state.insertResponseError = { message: 'db down' }
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'Something went wrong submitting your feedback. Please try again.' })
  })

  it('returns a generic error when the answers insert fails', async () => {
    state.insertAnswersError = { message: 'db down' }
    const result = await submitFeedbackResponse('token-1', {}, formData(allRatings()))
    expect(result).toEqual({ error: 'Something went wrong submitting your feedback. Please try again.' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/feedback/[token]/actions.test.ts"`
Expected: FAIL — `./actions` does not exist yet.

- [ ] **Step 3: Write the action**

```ts
// web/src/app/feedback/[token]/actions.ts
'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { feedbackRequestEligibility } from '@/lib/coach-dna/feedback-request-status'
import { hashDeviceFingerprint } from '@/lib/coach-dna/device-fingerprint'
import { checkSafeguardingConcern } from '@/lib/coach-dna/safeguarding'
import type { RespondentType } from '@/lib/supabase/types'

export type SubmitFeedbackState = { error?: string; success?: boolean }

const GENERIC_ERROR = 'Something went wrong submitting your feedback. Please try again.'

export async function submitFeedbackResponse(
  token: string,
  _prevState: SubmitFeedbackState,
  formData: FormData,
): Promise<SubmitFeedbackState> {
  const supabase = createServiceClient()

  const { data: request } = await supabase
    .from('feedback_requests')
    .select('id, feedback_type, status, expires_at')
    .eq('token', token)
    .maybeSingle()
  if (!request) return { error: 'This feedback link is no longer valid.' }

  const eligibility = feedbackRequestEligibility(request)
  if (eligibility === 'expired') return { error: 'This feedback request has expired.' }
  if (eligibility === 'paused') return { error: 'This coach is not currently accepting feedback on this link.' }

  let respondentType: RespondentType
  if (request.feedback_type === 'peer_observation') {
    respondentType = 'peer_coach'
  } else {
    const submitted = formData.get('respondentType')
    if (submitted !== 'player' && submitted !== 'parent') {
      return { error: 'Please select whether you are the player or a parent.' }
    }
    respondentType = submitted
  }

  const { data: questions } = await supabase
    .from('assessment_questions')
    .select('id, question_format')
    .eq('assessment_type', request.feedback_type)
    .eq('active', true)
    .order('display_order')
  const ratingQuestions = (questions ?? []).filter(q => q.question_format === 'rating_scale')
  const freeTextQuestion = (questions ?? []).find(q => q.question_format === 'free_text')
  if (ratingQuestions.length !== 8 || !freeTextQuestion) return { error: GENERIC_ERROR }

  const ratings = new Map<string, number>()
  for (const q of ratingQuestions) {
    const raw = formData.get(`rating-${q.id}`)
    const value = Number(raw)
    if (!raw || !Number.isInteger(value) || value < 1 || value > 5) {
      return { error: 'Please rate every statement before submitting.' }
    }
    ratings.set(q.id, value)
  }

  const rawComment = (formData.get('comment') as string | null)?.trim()
  const comment = rawComment ? rawComment : null

  const deviceId = (formData.get('deviceId') as string | null) ?? ''
  const fingerprint = hashDeviceFingerprint(deviceId, token)

  const { data: existing } = await supabase
    .from('feedback_responses')
    .select('id')
    .eq('feedback_request_id', request.id)
    .eq('device_fingerprint_hash', fingerprint)
    .maybeSingle()
  if (existing) return { error: "You've already submitted feedback for this request." }

  const { data: response, error: responseError } = await supabase
    .from('feedback_responses')
    .insert({
      feedback_request_id: request.id,
      respondent_type: respondentType,
      held_for_review: true,
      device_fingerprint_hash: fingerprint,
    })
    .select('id')
    .single()
  if (responseError || !response) return { error: GENERIC_ERROR }

  const answerRows: { feedback_response_id: string; question_id: string; numeric_value?: number; written_value?: string }[] =
    ratingQuestions.map(q => ({
      feedback_response_id: response.id,
      question_id: q.id,
      numeric_value: ratings.get(q.id),
    }))
  if (comment) {
    answerRows.push({ feedback_response_id: response.id, question_id: freeTextQuestion.id, written_value: comment })
  }

  const { data: insertedAnswers, error: answersError } = await supabase
    .from('feedback_answers')
    .insert(answerRows)
    .select('id, question_id')
  if (answersError) return { error: GENERIC_ERROR }

  if (comment) {
    const flagged = await checkSafeguardingConcern(comment)
    if (flagged) {
      const freeTextAnswer = (insertedAnswers ?? []).find(a => a.question_id === freeTextQuestion.id)
      if (freeTextAnswer) {
        await supabase.from('safeguarding_flags').insert({
          feedback_answer_id: freeTextAnswer.id,
          flagged_text: comment,
          detection_method: 'automated',
        })
      }
      return { success: true }
    }
  }

  await supabase.from('feedback_responses').update({ held_for_review: false }).eq('id', response.id)
  return { success: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/feedback/[token]/actions.test.ts"`
Expected: PASS (13/13)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/feedback/[token]/actions.ts" "web/src/app/feedback/[token]/actions.test.ts"
git commit -m "feat(feedback): add submitFeedbackResponse server action with safeguarding gate"
```

---

### Task 5: `FeedbackForm` client component

**Files:**
- Create: `web/src/app/feedback/[token]/FeedbackForm.tsx`

**Interfaces:**
- Consumes: `submitFeedbackResponse` (Task 4).
- Produces: `<FeedbackForm token={string} feedbackType={'player_voice'|'peer_observation'} questions={{id,text,format}[]} />` — consumed by Task 6.

**Context for the implementer:** Follow `web/src/app/contact/ContactForm.tsx`'s exact conventions (`useActionState`, inline error banner, `isPending`-disabled submit button, dark-theme Tailwind color tokens) — it's the closest existing precedent for a public, unauthenticated form using `useActionState`. The device id is generated client-side on mount and persisted in `localStorage` so a resubmission from the same browser hashes to the same fingerprint (see Task 2); it is never used for anything beyond that basic throttling check.

- [ ] **Step 1: Write the component**

```tsx
// web/src/app/feedback/[token]/FeedbackForm.tsx
'use client'

import { useEffect, useState, useActionState } from 'react'
import { submitFeedbackResponse, type SubmitFeedbackState } from './actions'

type Question = { id: string; text: string; format: string }

const DEVICE_ID_KEY = '18thman-feedback-device-id'
const RATING_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
]

function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.localStorage.setItem(DEVICE_ID_KEY, created)
  return created
}

export function FeedbackForm({
  token,
  feedbackType,
  questions,
}: {
  token: string
  feedbackType: 'player_voice' | 'peer_observation'
  questions: Question[]
}) {
  const [state, formAction, isPending] = useActionState(
    submitFeedbackResponse.bind(null, token),
    {} as SubmitFeedbackState,
  )
  const [deviceId, setDeviceId] = useState('')

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId())
  }, [])

  if (state.success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-emerald-300">
        Thanks — your feedback has been submitted.
      </div>
    )
  }

  const ratingQuestions = questions.filter(q => q.format === 'rating_scale')
  const freeTextQuestion = questions.find(q => q.format === 'free_text')

  return (
    <form action={formAction} className="space-y-7">
      <input type="hidden" name="deviceId" value={deviceId} />

      {state.error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      {feedbackType === 'player_voice' && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#7a7672]">I am the...</p>
          <div className="flex gap-5 text-sm text-[#c8c4bc]">
            <label className="flex items-center gap-2">
              <input type="radio" name="respondentType" value="player" required /> Player
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="respondentType" value="parent" required /> Parent
            </label>
          </div>
        </div>
      )}

      {ratingQuestions.map(q => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm text-[#e8e4dc]">{q.text}</p>
          <div className="flex flex-wrap gap-4">
            {RATING_OPTIONS.map(opt => (
              <label key={opt.value} className="flex flex-col items-center gap-1 text-[11px] text-[#7a7672] w-16 text-center">
                <input type="radio" name={`rating-${q.id}`} value={opt.value} required />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      ))}

      {freeTextQuestion && (
        <div className="space-y-1.5">
          <label htmlFor="comment" className="block text-sm text-[#e8e4dc]">
            {freeTextQuestion.text} <span className="text-[#5a5855]">(optional)</span>
          </label>
          <textarea
            id="comment" name="comment" rows={4}
            className="w-full text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[#e8e4dc] focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60 resize-none"
          />
        </div>
      )}

      <button
        type="submit" disabled={isPending}
        className="px-6 py-2.5 rounded-lg bg-[#e8560a] hover:bg-[#d14d09] text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isPending ? 'Submitting…' : 'Submit Feedback'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/feedback/[token]/FeedbackForm.tsx"
git commit -m "feat(feedback): add public FeedbackForm client component"
```

---

### Task 6: Public page + robots exclusion

**Files:**
- Create: `web/src/app/feedback/[token]/page.tsx`
- Modify: `web/src/app/robots.ts`

**Interfaces:**
- Consumes: `feedbackRequestEligibility` (Task 3), `<FeedbackForm>` (Task 5).

**Context for the implementer:** This is the route a respondent lands on from the link a coach copied (Plan 1's `CopyLinkButton`). Resolve the token, show a blocked state for `expired`/`paused` (not a bare 404 — the token is valid, just currently unavailable), and otherwise render the form. Coach `display_name`/`club` lookup follows the exact pattern in `web/src/app/sessions/share/[token]/page.tsx` (a public, no-login share page with the same shape of problem). Styling follows `web/src/app/contact/page.tsx`'s Tailwind dark-theme conventions, not `sessions/share`'s inline styles — this route has an interactive form, and Tailwind is this project's stated styling approach (see `CLAUDE.md`).

- [ ] **Step 1: Write the page**

```tsx
// web/src/app/feedback/[token]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { feedbackRequestEligibility } from '@/lib/coach-dna/feedback-request-status'
import { FeedbackForm } from './FeedbackForm'

export const metadata = {
  title: 'Give Feedback — 18th Man',
  robots: { index: false, follow: false },
}

export default async function FeedbackTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: request } = await supabase
    .from('feedback_requests')
    .select('id, coach_id, feedback_type, status, expires_at')
    .eq('token', token)
    .maybeSingle()
  if (!request) notFound()

  const eligibility = feedbackRequestEligibility(request)

  const { data: coach } = await supabase
    .from('profiles')
    .select('display_name, club')
    .eq('id', request.coach_id)
    .single()

  const { data: questions } = await supabase
    .from('assessment_questions')
    .select('id, question_text, question_format')
    .eq('assessment_type', request.feedback_type)
    .eq('active', true)
    .order('display_order')

  return (
    <div className="min-h-screen bg-[#07080d] text-[#c8c4bc] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-[#e8560a] text-sm font-semibold hover:opacity-80 transition-opacity">
            18th Man
          </Link>
          <h1 className="text-2xl font-bold text-[#e8e4dc] mt-4 mb-1">
            {request.feedback_type === 'player_voice' ? 'Player / Parent Feedback' : 'Peer Coach Feedback'}
          </h1>
          <p className="text-sm text-[#7a7672]">
            {coach?.display_name
              ? `Anonymous feedback for ${coach.display_name}${coach.club ? ` (${coach.club})` : ''}.`
              : 'Anonymous feedback for your coach.'}{' '}
            Your response is not linked to your name.
          </p>
        </div>

        {eligibility === 'expired' && (
          <div className="rounded-xl border border-white/10 bg-[#0d0f16] p-6 text-sm text-[#a8a4a0]">
            This feedback request has expired. Please check with your coach for an up-to-date link.
          </div>
        )}
        {eligibility === 'paused' && (
          <div className="rounded-xl border border-white/10 bg-[#0d0f16] p-6 text-sm text-[#a8a4a0]">
            This coach is not currently accepting feedback on this link.
          </div>
        )}
        {eligibility === 'accepting' && (
          <FeedbackForm
            token={token}
            feedbackType={request.feedback_type}
            questions={(questions ?? []).map(q => ({ id: q.id, text: q.question_text, format: q.question_format }))}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `/feedback` to the robots disallow list**

In `web/src/app/robots.ts`, add `'/feedback'` to the existing `disallow` array (alongside `/dashboard`, `/sessions`, etc.) — these links may reference minors and must never be crawled or indexed, in addition to the page-level `robots: { index: false, follow: false }` metadata above.

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full feedback test suite**

Run: `cd web && npx vitest run "src/app/feedback" src/lib/coach-dna/safeguarding.test.ts src/lib/coach-dna/device-fingerprint.test.ts src/lib/coach-dna/feedback-request-status.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/feedback/[token]/page.tsx" web/src/app/robots.ts
git commit -m "feat(feedback): add public feedback submission page"
```

---

### Task 7: Full verification

**Files:**
- None created — this task verifies Tasks 1-6 together.

- [ ] **Step 1: Run the full test suite and typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npm run test`
Expected: all existing tests plus every new test file from Tasks 1-4 pass, no regressions.

- [ ] **Step 2: Confirm service-role usage is scoped to this plan's own files**

Run: `cd web && grep -rln "createServiceClient" "src/app/feedback"`

Expected: `src/app/feedback/[token]/actions.ts` and `src/app/feedback/[token]/page.tsx` only. Unlike Plan 1 (where service-role usage was a red flag), this plan is *expected* to use it everywhere in this route tree — see Global Constraints. If any other file under `src/app` newly uses `createServiceClient()`, that's a scope leak worth double-checking.

- [ ] **Step 3: Manual QA (cannot be automated in this environment — report to the human partner instead of claiming it's verified)**

This needs a real `feedback_requests` row (created via Plan 1's `/admin/coach-dna/feedback/new`) and its token. Do NOT claim this "works" without doing this:
1. Visit `/feedback/<token>` for a Peer Observation request — confirm no respondent-type picker, all 8 statements render in a stable order, submit with all ratings + no comment succeeds, and the response later shows up (as `held_for_review = false`) via the coach's own feedback data.
2. Visit `/feedback/<token>` for a Player/Parent Voice request — confirm the player/parent picker appears and is required before submit succeeds.
3. Submit a comment with clearly benign content — confirm the response is not held after submission.
4. Submit a comment engineered to plausibly trip the safeguarding screen — confirm a `safeguarding_flags` row is created and the response stays `held_for_review = true` (check via SQL, since Plan 4's moderation UI doesn't exist yet).
5. Submit twice from the same browser to the same link — confirm the second submission is rejected with the "already submitted" message.
6. Visit an expired link (`expires_at` in the past) and a paused link (`status = 'paused'`) — confirm each shows its distinct blocked state, not a raw 404 or a working form.

If Playwright MCP tools or a way to create a live test `feedback_requests` row are not available, explicitly report that manual QA was NOT performed and ask the human partner to click through the flow themselves before considering this plan done.

- [ ] **Step 4: Commit (only if Step 1-2 required fixes)**

If any step required a fix, commit it with an appropriate message. If everything passed cleanly, skip this step.
