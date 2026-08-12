# Feedback Request Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach create a Player/Parent Voice or Peer Observation feedback request — gated by club guardian consent for the former — and see a shareable link for it. This is Plan 1 of 4 implementing `docs/superpowers/specs/2026-08-12-coach-360-feedback-design.md`.

**Architecture:** All backend tables (`feedback_requests`, `club_guardian_consents`, etc.) already exist (migrations 088–104) — this plan is content (new question bank) plus a server action and two Server Component pages on top of the existing schema. No new tables.

**Tech Stack:** Next.js App Router (Server Components, Server Actions), Supabase Postgres, Vitest.

## Global Constraints

- `feedback_requests.minimum_response_threshold` has a DB-level floor of 3 (migration 094's `minimum_response_threshold_floor` CHECK) — enforce the same floor in the server action so the user gets a clear error instead of a raw DB error.
- `feedback_requests.feedback_type`, `.token`, `.anonymous` are immutable after creation (migration 102's tampering-guard trigger) and `team_id` can only transition to NULL, never to a different non-null value — this plan only ever creates rows, never updates these columns, so no special handling needed beyond getting creation right.
- A Player/Parent Voice request requires a club guardian consent on file for the coach's club and the current season (`club_guardian_consents`, season = calendar year via a new shared helper) before it can be created. Peer Observation requests skip this check entirely — no minors involved.
- `assessment_questions.category_id` is required (non-null) for `player_voice`/`peer_observation` rows (migration 107's `category_id_only_for_feedback_types` CHECK); `age_group` is required for `player_voice` only, must be null for `peer_observation` (migration 085's `age_group_only_for_player_voice` CHECK).
- The `assessment_type` enum already contains `'player_voice'` and `'peer_observation'` (migration 085) — no ALTER TYPE needed anywhere in this plan.
- All web app commands run from `web/`.

---

### Task 1: Seed the player_voice and peer_observation question banks

**Files:**
- Create: `web/supabase/migrations/115_feedback_question_bank_seed.sql`

**Interfaces:**
- None — content-only migration. Later plans (2, 4) will read these rows by `assessment_type` and `category_id`, not by hardcoded question IDs (this migration doesn't assign fixed UUIDs, unlike the self-assessment seed).

**Context for the implementer:** Each audience gets 8 rating-scale statements (one per coaching category) plus one free-text "anything else" question. The free-text question is modeled as its own `assessment_questions` row (`question_format = 'free_text'`) rather than a separate column on `feedback_responses`, because `safeguarding_flags.feedback_answer_id` references `feedback_answers(id)` — the existing schema's own design intent is for flaggable free text to live in a `feedback_answers` row tied to a question, not a response-level column. The `category_id_only_for_feedback_types` constraint requires a non-null `category_id` even for this question, so it's attached to Culture Builder (the closest conceptual fit for a general "anything else about the team/coach" comment) purely to satisfy the constraint — it's never used to bucket a numeric score, since this question never has a `numeric_value`.

The `dna_categories` table already exists and is fully seeded (migration from 2026-08-05) — these are its real category IDs, verified live:

| Category slug | `dna_categories.id` |
|---|---|
| teacher | `15a429b6-eddc-4219-aec2-6b007f5f502a` |
| technician | `7193c353-151a-4990-bc51-de1094d963da` |
| motivator | `c819d09d-a5fd-46ca-bc1e-0da501bee511` |
| developer | `4189dcc5-1837-453f-9a79-2d4364588047` |
| game-manager | `da0bfe2f-1a13-428b-999c-08d6e611e681` |
| communicator | `8a537db6-f1b0-40fb-bc31-2a4486dda4e9` |
| organiser | `49a67ac1-aedd-4b1b-9ea4-3fac73c90471` |
| culture-builder | `c54dd975-6b2e-4e32-8ac5-d89c518a4994` |

- [ ] **Step 1: Write the migration**

```sql
-- 115_feedback_question_bank_seed.sql
-- Seeds the question banks for player_voice and peer_observation feedback:
-- 8 rating-scale statements per audience (one per coaching category) plus
-- one free-text "anything else" question per audience. Reuses
-- assessment_type enum values that already exist (085) -- content only,
-- no schema change. See Task 1's implementer notes in the plan for why the
-- free-text question is its own assessment_questions row rather than a
-- feedback_responses column.

-- Player/Parent Voice (age_group required by age_group_only_for_player_voice)
insert into public.assessment_questions (assessment_type, question_text, question_format, age_group, category_id) values
  ('player_voice', 'The coach explains things clearly.', 'rating_scale', 'all_ages', '15a429b6-eddc-4219-aec2-6b007f5f502a'),
  ('player_voice', 'The coach helps players improve their skills and technique.', 'rating_scale', 'all_ages', '7193c353-151a-4990-bc51-de1094d963da'),
  ('player_voice', 'The coach makes players feel confident and motivated to try their best.', 'rating_scale', 'all_ages', 'c819d09d-a5fd-46ca-bc1e-0da501bee511'),
  ('player_voice', 'The coach cares about players as people, not just as athletes.', 'rating_scale', 'all_ages', '4189dcc5-1837-453f-9a79-2d4364588047'),
  ('player_voice', 'The coach makes good decisions during games.', 'rating_scale', 'all_ages', 'da0bfe2f-1a13-428b-999c-08d6e611e681'),
  ('player_voice', 'The coach listens and communicates clearly.', 'rating_scale', 'all_ages', '8a537db6-f1b0-40fb-bc31-2a4486dda4e9'),
  ('player_voice', 'Training sessions feel well planned and organised.', 'rating_scale', 'all_ages', '49a67ac1-aedd-4b1b-9ea4-3fac73c90471'),
  ('player_voice', 'This feels like a good team to be part of.', 'rating_scale', 'all_ages', 'c54dd975-6b2e-4e32-8ac5-d89c518a4994'),
  ('player_voice', 'Is there anything else you''d like to share about your coach or the team?', 'free_text', 'all_ages', 'c54dd975-6b2e-4e32-8ac5-d89c518a4994');

-- Peer Observation (age_group must be null, not player_voice)
insert into public.assessment_questions (assessment_type, question_text, question_format, age_group, category_id) values
  ('peer_observation', 'They break down technical concepts clearly for players.', 'rating_scale', null, '15a429b6-eddc-4219-aec2-6b007f5f502a'),
  ('peer_observation', 'They have strong technical/tactical coaching knowledge.', 'rating_scale', null, '7193c353-151a-4990-bc51-de1094d963da'),
  ('peer_observation', 'They get the best effort and energy out of players.', 'rating_scale', null, 'c819d09d-a5fd-46ca-bc1e-0da501bee511'),
  ('peer_observation', 'They focus on long-term player development, not just results.', 'rating_scale', null, '4189dcc5-1837-453f-9a79-2d4364588047'),
  ('peer_observation', 'They make sound tactical decisions under pressure.', 'rating_scale', null, 'da0bfe2f-1a13-428b-999c-08d6e611e681'),
  ('peer_observation', 'They communicate clearly and directly with players and staff.', 'rating_scale', null, '8a537db6-f1b0-40fb-bc31-2a4486dda4e9'),
  ('peer_observation', 'Their sessions are well planned and run efficiently.', 'rating_scale', null, '49a67ac1-aedd-4b1b-9ea4-3fac73c90471'),
  ('peer_observation', 'They build a positive, healthy team culture.', 'rating_scale', null, 'c54dd975-6b2e-4e32-8ac5-d89c518a4994'),
  ('peer_observation', 'Is there anything else you''d like to share about this coach?', 'free_text', null, 'c54dd975-6b2e-4e32-8ac5-d89c518a4994');
```

- [ ] **Step 2: Apply the migration live**

Use the Supabase MCP `apply_migration` tool with `project_id: khslkwspsqyopicxufun` and the SQL body above.

- [ ] **Step 3: Verify**

```sql
select assessment_type, question_format, count(*) from public.assessment_questions
where assessment_type in ('player_voice', 'peer_observation')
group by assessment_type, question_format
order by assessment_type, question_format;
```

Expected: 4 rows — `player_voice/free_text: 1`, `player_voice/rating_scale: 8`, `peer_observation/free_text: 1`, `peer_observation/rating_scale: 8`.

```sql
select assessment_type, count(*) from public.assessment_questions
where assessment_type in ('player_voice', 'peer_observation') and category_id is null;
```

Expected: 0 rows (every new question has a category_id).

- [ ] **Step 4: Commit**

```bash
git add web/supabase/migrations/115_feedback_question_bank_seed.sql
git commit -m "content(feedback): seed player_voice and peer_observation question banks"
```

---

### Task 2: Season label helper

**Files:**
- Create: `web/src/lib/season.ts`
- Create: `web/src/lib/season.test.ts`

**Interfaces:**
- Produces: `getCurrentSeasonLabel(): string` — consumed by Task 3 (request creation) and by Plan 3's consent-toggle page.

**Context for the implementer:** `club_guardian_consents.season_label` is a free-text column with no fixed format — this plan defines the convention (one season per calendar year) so the request-creation check and the consent-granting UI (a later plan) always agree on what "this season" means.

- [ ] **Step 1: Write the failing test**

```ts
// web/src/lib/season.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { getCurrentSeasonLabel } from './season'

describe('getCurrentSeasonLabel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the current calendar year as a string', () => {
    vi.setSystemTime(new Date('2026-08-12T00:00:00.000Z'))
    expect(getCurrentSeasonLabel()).toBe('2026')
  })

  it('returns a different year correctly', () => {
    vi.setSystemTime(new Date('2027-01-01T00:00:00.000Z'))
    expect(getCurrentSeasonLabel()).toBe('2027')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run src/lib/season.test.ts`
Expected: FAIL — `./season` does not exist yet.

- [ ] **Step 3: Write the helper**

```ts
// web/src/lib/season.ts
/** The current season label used for club_guardian_consents (and any other
 *  season-scoped feedback check). One season per calendar year -- simple
 *  and consistent between the consent-granting UI and the request-creation
 *  check, which is all that matters (the exact scheme is arbitrary as long
 *  as both sides agree). */
export function getCurrentSeasonLabel(): string {
  return new Date().getFullYear().toString()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run src/lib/season.test.ts`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/season.ts web/src/lib/season.test.ts
git commit -m "feat(feedback): add season label helper"
```

---

### Task 3: `createFeedbackRequest` server action

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/feedback/actions.ts`
- Create: `web/src/app/(app)/admin/coach-dna/feedback/actions.test.ts`

**Interfaces:**
- Consumes: `getCurrentSeasonLabel` (Task 2).
- Produces: `createFeedbackRequest(formData: FormData): Promise<void>` — consumed by Task 5 (the creation form page, as a form `action`).

**Context for the implementer:** This mirrors the existing `startAssessment`/`requireAdmin` pattern in `web/src/app/(app)/admin/coach-dna/actions.ts` (read that file first for the exact auth-check style to match) — both `admin` and `coach` platform roles are allowed, `viewer` is redirected to `/dashboard`. Unlike that pattern, this action also needs `profiles.club_id` on the caller's own row (selectable under RLS same as `role`).

- [ ] **Step 1: Write the failing tests**

```ts
// web/src/app/(app)/admin/coach-dna/feedback/actions.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string } | null
  role: string | null
  clubId: string | null
  teamCreatedBy: string | null
  teamInviteAccepted: boolean
  consentRow: { id: string } | null
  insertError: { message: string } | null
} = {
  user: null,
  role: 'coach',
  clubId: null,
  teamCreatedBy: null,
  teamInviteAccepted: false,
  consentRow: null,
  insertError: null,
}

const insertMock = vi.fn(async (_row: Record<string, unknown>) => ({ error: state.insertError }))
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirectMock(path),
}))
vi.mock('crypto', () => ({
  randomUUID: () => 'fake-token-uuid',
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: state.role === null ? null : { role: state.role, club_id: state.clubId } }),
            }),
          }),
        }
      }
      if (table === 'coaching_groups') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.teamCreatedBy ? { id: 'team-1' } : null }),
              }),
            }),
          }),
        }
      }
      if (table === 'group_invitations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: state.teamInviteAccepted ? { id: 'invite-1' } : null }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'club_guardian_consents') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.consentRow }),
              }),
            }),
          }),
        }
      }
      if (table === 'feedback_requests') {
        return { insert: insertMock }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

import { createFeedbackRequest } from './actions'

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) fd.set(key, value)
  return fd
}

describe('createFeedbackRequest', () => {
  beforeEach(() => {
    state.user = { id: 'coach-1' }
    state.role = 'coach'
    state.clubId = 'club-1'
    state.teamCreatedBy = null
    state.teamInviteAccepted = false
    state.consentRow = null
    state.insertError = null
    insertMock.mockClear()
    redirectMock.mockClear()
  })

  it('redirects unauthenticated callers to login', async () => {
    state.user = null
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects viewer-role callers to the dashboard', async () => {
    state.role = 'viewer'
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('REDIRECT:/dashboard')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid feedback type', async () => {
    await expect(createFeedbackRequest(formData({ feedbackType: 'nonsense' }))).rejects.toThrow('Invalid feedback type')
  })

  it('creates a peer_observation request without any team or consent check', async () => {
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('REDIRECT:/admin/coach-dna/feedback')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        coach_id: 'coach-1',
        feedback_type: 'peer_observation',
        team_id: null,
        token: 'fake-token-uuid',
      }),
    )
  })

  it('rejects a player_voice request with no team selected', async () => {
    await expect(createFeedbackRequest(formData({ feedbackType: 'player_voice' }))).rejects.toThrow('Select a team')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('rejects a player_voice request when the coach does not belong to the selected team', async () => {
    state.teamCreatedBy = null
    state.teamInviteAccepted = false
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'player_voice', teamId: 'team-1' })),
    ).rejects.toThrow('not a member of that team')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('allows a player_voice request when the coach created the team', async () => {
    state.teamCreatedBy = 'coach-1'
    state.consentRow = { id: 'consent-1' }
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'player_voice', teamId: 'team-1' })),
    ).rejects.toThrow('REDIRECT:/admin/coach-dna/feedback')
    expect(insertMock).toHaveBeenCalled()
  })

  it('redirects to a consent-required state when no guardian consent is on file', async () => {
    state.teamInviteAccepted = true
    state.consentRow = null
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'player_voice', teamId: 'team-1' })),
    ).rejects.toThrow('REDIRECT:/admin/coach-dna/feedback/new?error=consent-required')
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('creates a player_voice request when the coach belongs to the team and consent is on file', async () => {
    state.teamInviteAccepted = true
    state.consentRow = { id: 'consent-1' }
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'player_voice', teamId: 'team-1' })),
    ).rejects.toThrow('REDIRECT:/admin/coach-dna/feedback')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ feedback_type: 'player_voice', team_id: 'team-1' }),
    )
  })

  it('enforces the minimum response threshold floor of 3, ignoring a lower requested value', async () => {
    await expect(
      createFeedbackRequest(formData({ feedbackType: 'peer_observation', minimumResponseThreshold: '1' })),
    ).rejects.toThrow('REDIRECT:')
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ minimum_response_threshold: 3 }))
  })

  it('defaults the expiry to 14 days out when not specified', async () => {
    const before = Date.now()
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('REDIRECT:')
    const call = insertMock.mock.calls[0][0] as { expires_at: string }
    const expiresAt = new Date(call.expires_at).getTime()
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
    expect(expiresAt).toBeGreaterThanOrEqual(before + fourteenDaysMs - 5000)
    expect(expiresAt).toBeLessThanOrEqual(before + fourteenDaysMs + 5000)
  })

  it('throws when the insert fails', async () => {
    state.insertError = { message: 'db down' }
    await expect(createFeedbackRequest(formData({ feedbackType: 'peer_observation' }))).rejects.toThrow('db down')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/feedback/actions.test.ts"`
Expected: FAIL — `./actions` does not exist yet.

- [ ] **Step 3: Write the action**

```ts
// web/src/app/(app)/admin/coach-dna/feedback/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getCurrentSeasonLabel } from '@/lib/season'
import type { FeedbackType } from '@/lib/supabase/types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function requireCoach() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role, club_id').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')
  return { supabase, userId: user.id, clubId: (profile?.club_id as string | null) ?? null }
}

async function coachBelongsToTeam(supabase: SupabaseClient, userId: string, teamId: string): Promise<boolean> {
  const { data: created } = await supabase
    .from('coaching_groups')
    .select('id')
    .eq('id', teamId)
    .eq('created_by', userId)
    .maybeSingle()
  if (created) return true

  const { data: invite } = await supabase
    .from('group_invitations')
    .select('id')
    .eq('group_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .maybeSingle()
  return !!invite
}

export async function createFeedbackRequest(formData: FormData) {
  const { supabase, userId, clubId } = await requireCoach()

  const feedbackType = formData.get('feedbackType') as FeedbackType | string
  if (feedbackType !== 'player_voice' && feedbackType !== 'peer_observation') {
    throw new Error('Invalid feedback type')
  }

  const teamId = (formData.get('teamId') as string | null) || null

  if (feedbackType === 'player_voice') {
    if (!teamId) throw new Error('Select a team for player/parent feedback')

    const belongs = await coachBelongsToTeam(supabase, userId, teamId)
    if (!belongs) throw new Error('You are not a member of that team')

    if (!clubId) throw new Error('You need to be part of a club to request player/parent feedback')

    const { data: consent } = await supabase
      .from('club_guardian_consents')
      .select('id')
      .eq('club_id', clubId)
      .eq('season_label', getCurrentSeasonLabel())
      .maybeSingle()
    if (!consent) redirect('/admin/coach-dna/feedback/new?error=consent-required')
  }

  const expiresInDays = Number(formData.get('expiresInDays')) || 14
  const requestedThreshold = Number(formData.get('minimumResponseThreshold')) || 3
  const minimumResponseThreshold = Math.max(3, requestedThreshold)
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
  const token = randomUUID()

  const { error } = await supabase.from('feedback_requests').insert({
    coach_id: userId,
    feedback_type: feedbackType,
    team_id: feedbackType === 'player_voice' ? teamId : null,
    token,
    expires_at: expiresAt,
    minimum_response_threshold: minimumResponseThreshold,
  })
  if (error) throw new Error(error.message)

  redirect('/admin/coach-dna/feedback')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/feedback/actions.test.ts"`
Expected: PASS (all tests)

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/feedback/actions.ts" "web/src/app/(app)/admin/coach-dna/feedback/actions.test.ts"
git commit -m "feat(feedback): add createFeedbackRequest server action with consent gate"
```

---

### Task 4: Feedback requests list page

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/feedback/page.tsx`
- Create: `web/src/app/(app)/admin/coach-dna/feedback/CopyLinkButton.tsx`

**Interfaces:**
- None consumed from earlier tasks directly (reads `feedback_requests` itself). Produces the page later plans (2, 3) will link back to.

**Context for the implementer:** This is the coach's home for their feedback requests — without it, a coach has nowhere to find a request's share link again after leaving the creation page. Follow the existing `web/src/app/(app)/admin/coach-dna/page.tsx` style (Card-based layout, `app-heading` class, same auth-check block).

- [ ] **Step 1: Write `CopyLinkButton.tsx`**

```tsx
// web/src/app/(app)/admin/coach-dna/feedback/CopyLinkButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  )
}
```

- [ ] **Step 2: Write the list page**

```tsx
// web/src/app/(app)/admin/coach-dna/feedback/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyLinkButton } from './CopyLinkButton'
import type { FeedbackType } from '@/lib/supabase/types'

export const metadata = { title: 'Feedback Requests' }

const TYPE_LABELS: Record<FeedbackType, string> = {
  player_voice: 'Player / Parent Voice',
  peer_observation: 'Peer Observation',
}

export default async function FeedbackRequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const { data: requests } = await supabase
    .from('feedback_requests')
    .select('id, feedback_type, team_id, token, expires_at, minimum_response_threshold, status, created_at')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })

  const teamIds = [...new Set((requests ?? []).map(r => r.team_id).filter(Boolean))] as string[]
  const { data: teams } = teamIds.length > 0
    ? await supabase.from('coaching_groups').select('id, name').in('id', teamIds)
    : { data: [] }
  const teamMap = Object.fromEntries((teams ?? []).map(t => [t.id, t.name]))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl">Feedback Requests</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Player, parent, and peer feedback on your coaching.</p>
        </div>
        <Button render={<Link href="/admin/coach-dna/feedback/new" />}>New request</Button>
      </div>

      {(requests ?? []).length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-zinc-500">
            No feedback requests yet. Create one to get started.
          </CardContent>
        </Card>
      )}

      {(requests ?? []).map(request => (
        <Card key={request.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {TYPE_LABELS[request.feedback_type as FeedbackType]}
              {request.team_id && teamMap[request.team_id] ? ` — ${teamMap[request.team_id]}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-zinc-500 space-y-1">
              <p>Status: <span className="text-zinc-300">{request.status}</span></p>
              <p>Minimum responses: <span className="text-zinc-300">{request.minimum_response_threshold}</span></p>
              <p>Expires: <span className="text-zinc-300">{new Date(request.expires_at).toLocaleDateString('en-GB')}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs text-zinc-400 bg-zinc-900 rounded px-2 py-1 flex-1 truncate">
                {siteUrl}/feedback/{request.token}
              </code>
              <CopyLinkButton link={`${siteUrl}/feedback/${request.token}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/feedback/page.tsx" "web/src/app/(app)/admin/coach-dna/feedback/CopyLinkButton.tsx"
git commit -m "feat(feedback): add feedback requests list page"
```

---

### Task 5: New request creation page

**Files:**
- Create: `web/src/app/(app)/admin/coach-dna/feedback/new/page.tsx`
- Create: `web/src/app/(app)/admin/coach-dna/feedback/new/NewFeedbackRequestForm.tsx`

**Interfaces:**
- Consumes: `createFeedbackRequest` (Task 3).

**Context for the implementer:** The team picker only makes sense for Player/Parent Voice requests, so the form needs a small client-side toggle (no server round trip needed for the toggle itself — the actual submission still goes through the `createFeedbackRequest` Server Action directly as the form's `action`).

- [ ] **Step 1: Write the client form component**

```tsx
// web/src/app/(app)/admin/coach-dna/feedback/new/NewFeedbackRequestForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createFeedbackRequest } from '../actions'

export function NewFeedbackRequestForm({
  teams,
}: {
  teams: { id: string; name: string }[]
}) {
  const [feedbackType, setFeedbackType] = useState<'player_voice' | 'peer_observation'>('peer_observation')

  return (
    <form action={createFeedbackRequest} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-200">Type</label>
        <div className="flex gap-4 text-sm text-zinc-400">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="feedbackType"
              value="peer_observation"
              checked={feedbackType === 'peer_observation'}
              onChange={() => setFeedbackType('peer_observation')}
            />
            Peer Observation (fellow coach)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="feedbackType"
              value="player_voice"
              checked={feedbackType === 'player_voice'}
              onChange={() => setFeedbackType('player_voice')}
            />
            Player / Parent Voice
          </label>
        </div>
      </div>

      {feedbackType === 'player_voice' && (
        <div className="space-y-2">
          <label htmlFor="teamId" className="text-sm font-medium text-zinc-200">Team</label>
          <select id="teamId" name="teamId" required className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200">
            <option value="">Select a team</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="expiresInDays" className="text-sm font-medium text-zinc-200">Expires in (days)</label>
        <Input id="expiresInDays" name="expiresInDays" type="number" min={1} defaultValue={14} />
      </div>

      <div className="space-y-2">
        <label htmlFor="minimumResponseThreshold" className="text-sm font-medium text-zinc-200">Minimum responses</label>
        <Input id="minimumResponseThreshold" name="minimumResponseThreshold" type="number" min={3} defaultValue={3} />
        <p className="text-xs text-zinc-500">Must be at least 3.</p>
      </div>

      <Button type="submit">Create request</Button>
    </form>
  )
}
```

- [ ] **Step 2: Write the page**

```tsx
// web/src/app/(app)/admin/coach-dna/feedback/new/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NewFeedbackRequestForm } from './NewFeedbackRequestForm'

export const metadata = { title: 'New Feedback Request' }

export default async function NewFeedbackRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const { data: myGroupInvites } = await supabase
    .from('group_invitations')
    .select('group_id, coaching_groups(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'accepted')
  const { data: createdGroups } = await supabase
    .from('coaching_groups')
    .select('id, name')
    .eq('created_by', user.id)

  const invitedTeams = (myGroupInvites ?? [])
    .map(i => i.coaching_groups as unknown as { id: string; name: string } | null)
    .filter((t): t is { id: string; name: string } => t !== null)
  const teamMap = new Map<string, { id: string; name: string }>()
  for (const team of [...invitedTeams, ...(createdGroups ?? [])]) teamMap.set(team.id, team)
  const teams = [...teamMap.values()]

  if (error === 'consent-required') {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="app-heading text-2xl">New Feedback Request</h1>
        <Card>
          <CardHeader>
            <CardTitle>Guardian consent needed</CardTitle>
            <CardDescription>
              Your club needs to confirm guardian consent is on file for this season before you can request
              player or parent feedback. Ask your club admin to confirm this in the club settings, then try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/coach-dna/feedback" className="text-sm text-orange-400 hover:text-orange-300">
              Back to feedback requests
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="app-heading text-2xl">New Feedback Request</h1>
      <Card>
        <CardHeader>
          <CardTitle>Request feedback</CardTitle>
          <CardDescription>
            Peer Observation is for a fellow coach. Player / Parent Voice is scoped to one of your teams and
            requires your club to have confirmed guardian consent for this season.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewFeedbackRequestForm teams={teams} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full feedback test suite**

Run: `cd web && npx vitest run "src/app/(app)/admin/coach-dna/feedback" src/lib/season.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(app)/admin/coach-dna/feedback/new/page.tsx" "web/src/app/(app)/admin/coach-dna/feedback/new/NewFeedbackRequestForm.tsx"
git commit -m "feat(feedback): add new feedback request creation page"
```

---

### Task 6: Full verification

**Files:**
- None created — this task verifies Tasks 1-5 together.

- [ ] **Step 1: Run the full test suite and typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

Run: `cd web && npm run test`
Expected: all existing tests plus every new test file from Tasks 1-5 pass, no regressions.

- [ ] **Step 2: Confirm the question bank seed applied live matches the repo**

Run via Supabase MCP (`execute_sql`, `project_id: khslkwspsqyopicxufun`):

```sql
select assessment_type, count(*) from public.assessment_questions where assessment_type in ('player_voice', 'peer_observation') group by assessment_type;
```

Expected: `player_voice: 9`, `peer_observation: 9`.

- [ ] **Step 3: Confirm no service-role usage where user-scoped suffices**

Run: `cd web && grep -rn "createServiceClient" "src/app/(app)/admin/coach-dna/feedback"`

Expected: no matches — every table this plan touches (`feedback_requests`, `club_guardian_consents`, `coaching_groups`, `group_invitations`, `profiles`) has RLS policies that already permit the coach to read/write what this plan needs as themselves; the service client is not needed until Plan 2 (anonymous public submission, which has no `auth.uid()` to satisfy these policies with).

- [ ] **Step 4: Manual QA (cannot be automated in this environment — report to the human partner instead of claiming it's verified)**

This needs a logged-in coach account. Do NOT claim this "works" without doing this:
1. Visit `/admin/coach-dna/feedback` — confirm the empty state shows, "New request" link works.
2. Create a Peer Observation request — confirm no team picker appears, request is created, appears in the list with a working "Copy link" button.
3. Create a Player/Parent Voice request without your club having guardian consent on file for this season (if your test account's club has none) — confirm you land on the consent-required message.
4. If you can grant consent directly via SQL for a test club/season, retry — confirm the request now creates successfully and is scoped to the selected team.
5. Confirm a `viewer`-role account is redirected away from both pages.

If Playwright MCP tools or a test coach account are not available, explicitly report that manual QA was NOT performed and ask the human partner to click through the flow themselves before considering this plan done.

- [ ] **Step 5: Commit (only if Step 1-3 required fixes)**

If any step required a fix, commit it with an appropriate message. If everything passed cleanly, skip this step.
