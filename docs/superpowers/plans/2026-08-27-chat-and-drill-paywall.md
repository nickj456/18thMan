# AI Chat Limit Reduction & Drill Designer Save-Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the free-tier AI chat daily limit from 20 to 5 messages, and replace the drill designer's "up to 20 saved drills" free-tier cap with "unlimited use of the designer, but saving a new drill requires a paid tier or the one-time auto-trial."

**Architecture:** Two independent server-side gate changes (`subscription.ts`'s `canCreateDrill`, and `designer-actions.ts`'s `saveDrillDesign`), plus a sweep of every place in the codebase that describes these two limits in plain text (pricing page, landing page, legal terms, FAQ, help doc, AI system prompt, CLAUDE.md) so nothing goes stale relative to the new behavior.

**Tech Stack:** Next.js Server Actions, Supabase, Vitest.

**Spec:** [docs/superpowers/specs/2026-08-27-chat-and-drill-paywall-design.md](../specs/2026-08-27-chat-and-drill-paywall-design.md)

## Global Constraints

- `hasClubAccess(tier)` / a resolved `EffectiveTier` is the only authorization signal for club-gated behavior — never a raw boolean flag or a stale pre-activation tier value. When `saveDrillDesign` activates a trial mid-request, every later check in that same request must use the newly-resolved tier, not the tier `canCreateDrill` originally returned.
- Editing an *existing* drill (`updateDrillDesign`) is never gated by drill count or save-tier — only *creating* a new one is. Do not add any new gate to `updateDrillDesign` in this plan.
- The drill designer UI itself (`DrillDesigner.tsx`, `/drills/new`, `/drills/[id]/edit`) has no entry gate today and gets none added — every tier can always open it. Only the Save action is gated.
- Every intermediate commit must typecheck and pass the full test suite — a later task's cleanup (e.g. removing an unused constant) must not run before every consumer of that constant has already been migrated off it by an earlier task.
- Follow this repo's existing testing precedent: dedicated unit tests are added for logic changes (`canCreateDrill`, `saveDrillDesign`'s gate); pure copy/documentation edits (pricing/landing page text, legal terms, FAQ, help doc, CLAUDE.md) are not given dedicated tests, matching how the visible-locked-features plan treated copy-only changes.

---

### Task 1: Reduce the free-tier AI chat daily limit

**Files:**
- Modify: `web/src/lib/subscription-limits.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `FREE_AI_CHAT_DAILY_LIMIT` now equals `5` — every other file that imports it (`subscription.ts`'s re-export, `pricing/page.tsx`'s bullet, `api/chat/route.ts`'s gate check) picks up the new value automatically without further code changes to those files (their prose descriptions of "20" are handled separately in Task 4, since those are hardcoded strings, not derived from the constant).

- [ ] **Step 1: Change the constant**

In `web/src/lib/subscription-limits.ts`, change:

```ts
export const FREE_AI_CHAT_DAILY_LIMIT = 20
```

to:

```ts
export const FREE_AI_CHAT_DAILY_LIMIT = 5
```

- [ ] **Step 2: Typecheck and run the full suite**

Run: `cd web && npx tsc --noEmit && npm run test -- --run`
Expected: both clean. No test hardcodes `20` for this constant today, so nothing should break — if something does, it means a stale hardcoded `20` exists somewhere that needs the constant instead; fix that reference to import the constant rather than hardcoding the old number.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/subscription-limits.ts
git commit -m "feat(subscription): reduce free-tier AI chat limit from 20 to 5 messages/day"
```

---

### Task 2: `canCreateDrill` never allows a free-tier coach to create a new drill

**Files:**
- Modify: `web/src/lib/subscription.ts:120-138` (the `canCreateDrill` function and its surrounding imports)
- Test: `web/src/lib/subscription.test.ts`

**Interfaces:**
- Consumes: `getEffectiveTier` (unchanged), `EffectiveTier` type (unchanged).
- Produces: `canCreateDrill(supabase, userId)` now returns `{ allowed: false, tier: 'free', count }` for every free-tier caller regardless of `count` (previously `allowed` was `count < 20`). `{ allowed: true, ... }` for every other tier is unchanged. Task 3's `saveDrillDesign` consumes this new `allowed: false` behavior directly — it no longer needs the old `count === FREE_DRILL_LIMIT` check to detect "just hit the wall," since every free-tier attempt now hits it.

- [ ] **Step 1: Write the failing tests**

`web/src/lib/subscription.test.ts` currently only tests `getEffectiveTier`. Add a `canCreateDrill` import and a `drillCount` field to the shared mock state, extend the shared `supabase` mock's `from` to handle the `drills` table, and add a new sibling `describe` block. Apply this diff:

Change the import line:
```ts
import { getEffectiveTier } from './subscription'
```
to:
```ts
import { getEffectiveTier, canCreateDrill } from './subscription'
```

Change the `state` type and initial value:
```ts
const state: {
  profile: { role: string; club_id: string | null; trial_ends_at: string | null; subscription_tier: string | null } | null
  userOverride: { enabled: boolean; expires_at: string | null } | null
  clubOverride: { enabled: boolean; expires_at: string | null } | null
  club: { subscription_tier: string } | null
} = {
  profile: null,
  userOverride: null,
  clubOverride: null,
  club: null,
}
```
to:
```ts
const state: {
  profile: { role: string; club_id: string | null; trial_ends_at: string | null; subscription_tier: string | null } | null
  userOverride: { enabled: boolean; expires_at: string | null } | null
  clubOverride: { enabled: boolean; expires_at: string | null } | null
  club: { subscription_tier: string } | null
  drillCount: number
} = {
  profile: null,
  userOverride: null,
  clubOverride: null,
  club: null,
  drillCount: 0,
}
```

Add a `drills` branch to the shared `supabase.from`, right after the `clubs` branch:
```ts
    if (table === 'clubs') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: state.club }) }) }) }
    }
    if (table === 'drills') {
      return { select: () => ({ eq: async () => ({ count: state.drillCount }) }) }
    }
    throw new Error(`unexpected table: ${table}`)
```

Add a new `describe` block after the closing `})` of `describe('getEffectiveTier', ...)`:
```ts
describe('canCreateDrill', () => {
  beforeEach(() => {
    state.profile = { role: 'coach', club_id: null, trial_ends_at: null, subscription_tier: null }
    state.userOverride = null
    state.clubOverride = null
    state.club = null
    state.drillCount = 0
  })

  it('never allows a free-tier coach to create a new drill, even with zero existing drills', async () => {
    const result = await canCreateDrill(supabase, 'user-1')
    expect(result).toEqual({ allowed: false, tier: 'free', count: 0 })
  })

  it('still blocks a free-tier coach who already has drills saved from before this change', async () => {
    state.drillCount = 15
    const result = await canCreateDrill(supabase, 'user-1')
    expect(result.allowed).toBe(false)
    expect(result.count).toBe(15)
  })

  it('allows unlimited drill creation on an active trial', async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    state.profile = { role: 'coach', club_id: null, trial_ends_at: future, subscription_tier: null }
    const result = await canCreateDrill(supabase, 'user-1')
    expect(result).toEqual({ allowed: true, tier: 'trial', count: 0 })
  })

  it('allows unlimited drill creation on an active club subscription', async () => {
    state.profile = { role: 'coach', club_id: 'club-1', trial_ends_at: null, subscription_tier: null }
    state.club = { subscription_tier: 'club' }
    const result = await canCreateDrill(supabase, 'user-1')
    expect(result.allowed).toBe(true)
    expect(result.tier).toBe('club')
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `cd web && npx vitest run src/lib/subscription.test.ts -t canCreateDrill`
Expected: FAIL — `canCreateDrill` is not exported/imported correctly yet, or (once the import compiles) the first two tests fail because the current implementation still allows free-tier creation below the 20-drill count.

- [ ] **Step 3: Implement**

In `web/src/lib/subscription.ts`, change the import line (drop `FREE_DRILL_LIMIT` — it's no longer used in this file after this change; the re-export on the line above stays untouched for now, since `designer-actions.ts` and `pricing/page.tsx` still import it from `@/lib/subscription` until Tasks 3 and 4 migrate off it):

```ts
export { FREE_DRILL_LIMIT, FREE_SESSION_LIMIT, FREE_AI_CHAT_DAILY_LIMIT } from './subscription-limits'
import { FREE_DRILL_LIMIT, FREE_SESSION_LIMIT, FREE_AI_CHAT_DAILY_LIMIT } from './subscription-limits'
```
to:
```ts
export { FREE_DRILL_LIMIT, FREE_SESSION_LIMIT, FREE_AI_CHAT_DAILY_LIMIT } from './subscription-limits'
import { FREE_SESSION_LIMIT, FREE_AI_CHAT_DAILY_LIMIT } from './subscription-limits'
```

Change `canCreateDrill`:

```ts
/** True if the user can create another drill (free tier: max 20) */
export async function canCreateDrill(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<{ allowed: boolean; tier: EffectiveTier; count: number }> {
  const [tier, countResult] = await Promise.all([
    getEffectiveTier(supabase, userId),
    supabase
      .from('drills')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', userId),
  ])

  const count = countResult.count ?? 0

  if (tier !== 'free') return { allowed: true, tier, count }
  return { allowed: count < FREE_DRILL_LIMIT, tier, count }
}
```

to:

```ts
/**
 * True if the user can create a NEW saved drill. Free tier can never save
 * a new drill outright -- the designer itself stays fully open to every
 * tier, but saving one requires a paid tier or the one-time auto-trial
 * (see saveDrillDesign in designer-actions.ts, which activates that trial
 * on a free-tier coach's first save attempt and lets that save through as
 * a trial save). Editing an EXISTING drill (updateDrillDesign) is not
 * gated by this at all.
 */
export async function canCreateDrill(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<{ allowed: boolean; tier: EffectiveTier; count: number }> {
  const [tier, countResult] = await Promise.all([
    getEffectiveTier(supabase, userId),
    supabase
      .from('drills')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', userId),
  ])

  const count = countResult.count ?? 0

  if (tier !== 'free') return { allowed: true, tier, count }
  return { allowed: false, tier, count }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx tsc --noEmit && npx vitest run src/lib/subscription.test.ts`
Expected: PASS, all tests including the 4 new ones. Also run `cd web && npm run test -- --run` for the full suite — `designer-actions.test.ts` fully mocks `@/lib/subscription`, so it's unaffected by this change and should still pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/subscription.ts web/src/lib/subscription.test.ts
git commit -m "feat(drills): stop allowing free-tier coaches to create new saved drills"
```

---

### Task 3: `saveDrillDesign` auto-activates a trial on a free-tier coach's first save, blocks after

**Files:**
- Modify: `web/src/app/(discover)/drills/designer-actions.ts:1-100,184-198`
- Modify: `web/src/lib/email.ts:221-238`
- Test: `web/src/app/(discover)/drills/designer-actions.test.ts`

**Interfaces:**
- Consumes: `canCreateDrill`'s new `allowed: false` behavior from Task 2 (always false for free tier). `activateTrial(supabase, userId)` (unchanged signature, already exists in `subscription.ts`).
- Produces: `saveDrillDesign` now performs the trial-activation-or-reject decision synchronously, before the insert (previously the drill-count-based trial trigger ran in a background `after()` job following a successful save — that entire code path is removed since it can never fire under the new model).

- [ ] **Step 1: Write the failing tests**

In `web/src/app/(discover)/drills/designer-actions.test.ts`, make these changes:

Add `activateTrialResult: boolean` to the `state` type and its initial value:
```ts
const state: {
  user: { id: string; email: string } | null
  session: { access_token: string } | null
  canCreateDrillResult: { allowed: boolean; count: number; tier: string }
  activateTrialResult: boolean
  hasClubAccessResult: boolean
  effectiveTierResult: string
  insertError: { message: string } | null
  updateError: { message: string } | null
} = {
  user: { id: 'coach-1', email: 'coach@example.com' },
  session: { access_token: 'token' },
  canCreateDrillResult: { allowed: true, count: 1, tier: 'free' },
  activateTrialResult: false,
  hasClubAccessResult: false,
  effectiveTierResult: 'free',
  insertError: null,
  updateError: null,
}
```

Add an `activateTrialMock` next to the existing `hasClubAccessMock` (same rigor: a real `vi.fn()`, not a plain arrow, so tests can assert it was actually called):
```ts
const activateTrialMock = vi.fn(async () => state.activateTrialResult)
```

Update the `@/lib/subscription` mock to use it and drop the now-unused `FREE_DRILL_LIMIT` entry (`designer-actions.ts` stops importing it in Step 3 below):
```ts
vi.mock('@/lib/subscription', () => ({
  canCreateDrill: async () => state.canCreateDrillResult,
  activateTrial: () => activateTrialMock(),
  hasClubAccess: (tier: string) => hasClubAccessMock(tier),
  getEffectiveTier: async () => state.effectiveTierResult,
}))
```

In the existing `describe('saveDrillDesign — club visibility authorization', ...)` block's `beforeEach`, add the new field's reset and mock clear so it doesn't leak into other tests:
```ts
  beforeEach(() => {
    state.hasClubAccessResult = false
    state.canCreateDrillResult = { allowed: true, count: 1, tier: 'free' }
    state.activateTrialResult = false
    state.insertError = null
    insertMock.mockClear()
    hasClubAccessMock.mockClear()
    activateTrialMock.mockClear()
  })
```

Add a new `describe` block after `describe('saveDrillDesign — club visibility authorization', ...)`'s closing `})`, before `describe('updateDrillDesign — club visibility authorization', ...)`:
```ts
describe('saveDrillDesign — free-tier save gate', () => {
  beforeEach(() => {
    state.hasClubAccessResult = false
    state.canCreateDrillResult = { allowed: true, count: 1, tier: 'free' }
    state.activateTrialResult = false
    state.insertError = null
    insertMock.mockClear()
    hasClubAccessMock.mockClear()
    activateTrialMock.mockClear()
  })

  it('activates a one-time trial and lets the save through on a free-tier coach\'s first save attempt', async () => {
    state.canCreateDrillResult = { allowed: false, count: 0, tier: 'free' }
    state.activateTrialResult = true
    const result = await saveDrillDesign(baseInput({ visibility: 'private', clubId: null }))
    expect(result.error).toBeUndefined()
    expect(result.drillId).toBe('drill-1')
    expect(activateTrialMock).toHaveBeenCalledTimes(1)
    expect(insertMock).toHaveBeenCalled()
  })

  it('rejects the save when the free-tier coach has already used their one-time trial', async () => {
    state.canCreateDrillResult = { allowed: false, count: 0, tier: 'free' }
    state.activateTrialResult = false
    const result = await saveDrillDesign(baseInput({ visibility: 'private', clubId: null }))
    expect(result.error).toMatch(/upgrade/i)
    expect(result.error).toMatch(/subscription/i)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('does not attempt to activate a trial when canCreateDrill already allows the save', async () => {
    state.canCreateDrillResult = { allowed: true, count: 5, tier: 'club' }
    const result = await saveDrillDesign(baseInput({ visibility: 'private', clubId: null }))
    expect(result.error).toBeUndefined()
    expect(activateTrialMock).not.toHaveBeenCalled()
  })

  it('uses the freshly-activated trial tier, not the stale free tier, for the same save\'s club-visibility check', async () => {
    state.canCreateDrillResult = { allowed: false, count: 0, tier: 'free' }
    state.activateTrialResult = true
    state.hasClubAccessResult = true
    const result = await saveDrillDesign(baseInput({ visibility: 'club', clubId: 'club-1' }))
    expect(result.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: 'club-1', is_public: false }))
    // The critical assertion: hasClubAccess must be called with 'trial'
    // (the tier this save just activated), never the original 'free'.
    expect(hasClubAccessMock).toHaveBeenCalledWith('trial')
  })
})
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(discover)/drills/designer-actions.test.ts" -t "free-tier save gate"`
Expected: FAIL — the current implementation still gates on `FREE_DRILL_LIMIT`/`count === FREE_DRILL_LIMIT` and never calls `activateTrial` synchronously.

- [ ] **Step 3: Implement**

In `web/src/app/(discover)/drills/designer-actions.ts`, change the import (drop `FREE_DRILL_LIMIT`, no longer used in this file):
```ts
import { canCreateDrill, activateTrial, FREE_DRILL_LIMIT, hasClubAccess, getEffectiveTier } from '@/lib/subscription'
```
to:
```ts
import { canCreateDrill, activateTrial, hasClubAccess, getEffectiveTier } from '@/lib/subscription'
```

Add a second module-level error constant next to `CLUB_VISIBILITY_ERROR`:
```ts
const CLUB_VISIBILITY_ERROR = 'Club-private drills require an active club subscription. Upgrade your club to enable this.'
```
to:
```ts
const CLUB_VISIBILITY_ERROR = 'Club-private drills require an active club subscription. Upgrade your club to enable this.'
const SAVE_REQUIRES_UPGRADE_ERROR = 'Saving a drill requires an active subscription. Upgrade to Coach Pro or Club to save your drills.'
```

Replace the gate block (from the `// Feature gate...` comment through the `hasClubAccess` check, i.e. everything currently between the auth check and `const canvasPreviewUrl = ...`):
```ts
  // Feature gate: free tier limited to 20 drills
  const { allowed, count, tier } = await canCreateDrill(supabase, user.id)
  if (!allowed) {
    // Send a one-time nudge email when they first hit the limit
    if (count === FREE_DRILL_LIMIT) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      const email = user.email
      if (email) {
        after(async () => { await sendDrillLimitEmail(email, profile?.display_name ?? '') })
      }
    }
    return { error: `You've reached the free limit of ${FREE_DRILL_LIMIT} drills. Upgrade your club to create unlimited drills.` }
  }

  // Never trust a client-submitted 'club' visibility on its own -- the UI
  // already prevents selecting it without access, but this is the real
  // authorization boundary. Same class of gap as the 2026-08-26
  // getEffectiveTier fix: don't let an abandoned Stripe checkout's
  // placeholder club grant club-private drills either.
  // (Reuses the `tier` already resolved by canCreateDrill above -- it's the
  // same getEffectiveTier() value, so there's no need for a second query.)
  if (input.visibility === 'club' && !hasClubAccess(tier)) {
    return { error: CLUB_VISIBILITY_ERROR }
  }
```
with:
```ts
  const drillGate = await canCreateDrill(supabase, user.id)
  let tier = drillGate.tier

  if (!drillGate.allowed) {
    // Free tier can no longer create a new saved drill outright (Task 2).
    // The first time this happens for a given coach, auto-activate their
    // one-time 48-hour trial -- this is the same grant that used to fire
    // in the background after the 3rd saved drill; that trigger can never
    // happen now, since a genuinely free coach can't reach a 3rd saved
    // drill -- and let THIS save go through as a trial save. Only a coach
    // who has already used and outlived that trial is actually blocked.
    const activated = await activateTrial(supabase, user.id)
    if (activated) {
      tier = 'trial'
      const userEmail = user.email
      after(async () => {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
        const trialEnd = new Date()
        trialEnd.setHours(trialEnd.getHours() + 48)
        if (userEmail) await sendTrialStartEmail(userEmail, profile?.display_name ?? '', trialEnd)
      })
    } else {
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      const email = user.email
      if (email) {
        after(async () => { await sendDrillLimitEmail(email, profile?.display_name ?? '') })
      }
      return { error: SAVE_REQUIRES_UPGRADE_ERROR }
    }
  }

  // Never trust a client-submitted 'club' visibility on its own -- the UI
  // already prevents selecting it without access, but this is the real
  // authorization boundary. Uses the resolved `tier` above, which may have
  // just been upgraded to 'trial' by the block above -- a coach whose very
  // first save just activated their trial can immediately save into a
  // club-private drill if they picked that visibility.
  if (input.visibility === 'club' && !hasClubAccess(tier)) {
    return { error: CLUB_VISIBILITY_ERROR }
  }
```

Remove the now-dead trigger block further down (it can never fire — a genuinely free coach can never reach a 3rd saved drill under the new gate, and a coach who just got auto-trialed at save #1 is no longer `tier === 'free'`):
```ts
  // Trial trigger: activate 48-hour trial after the user creates their 3rd drill
  if (count + 1 === 3 && tier === 'free') {
    const accessToken = session.access_token
    const userEmail = user.email
    after(async () => {
      const bg = createBackgroundClient(accessToken)
      const activated = await activateTrial(bg, user.id)
      if (activated && userEmail) {
        const { data: profile } = await bg.from('profiles').select('display_name').eq('id', user.id).single()
        const trialEnd = new Date()
        trialEnd.setHours(trialEnd.getHours() + 48)
        await sendTrialStartEmail(userEmail, profile?.display_name ?? '', trialEnd)
      }
    })
  }

```
(delete this block entirely, including its blank trailing line)

In `web/src/lib/email.ts`, replace `sendDrillLimitEmail` and its doc comment:
```ts
/** Sent when a free user hits the 20-drill limit */
export async function sendDrillLimitEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(to, "You've created 20 drills — unlock unlimited", layout(`
    ${heading("You've built a serious drill library.")}
    ${para('20 drills created — you\'ve hit the free limit.')}
    ${divider()}
    ${greeting(displayName)}
    ${para("That's a lot of drills. Upgrade your club subscription to create unlimited drills, plus unlock:")}
    ${featureList([
      'Unlimited drills',
      'Coaching groups',
      'AI session guidance (GameSense)',
      'PDF export',
    ])}
    ${ctaButton('Upgrade your club', PRICING_URL)}
    ${sign()}
  `))
}
```
with:
```ts
/** Sent when a free-tier coach is blocked from saving a drill because their one-time trial has already been used */
export async function sendDrillLimitEmail(to: string, displayName: string): Promise<EmailResult> {
  return send(to, "Ready to save more drills? Unlock unlimited", layout(`
    ${heading("You've built something worth keeping.")}
    ${para("Saving a drill now needs an active subscription — your one-time 48-hour trial has already been used.")}
    ${divider()}
    ${greeting(displayName)}
    ${para("Upgrade your club subscription to save unlimited drills, plus unlock:")}
    ${featureList([
      'Unlimited drills',
      'Coaching groups',
      'AI session guidance (GameSense)',
      'PDF export',
    ])}
    ${ctaButton('Upgrade your club', PRICING_URL)}
    ${sign()}
  `))
}
```

Grep for any test asserting the old `sendDrillLimitEmail` copy (`"You've created 20 drills"`, `"20 drills created"`) and update it to match the new subject/body if found:
```bash
cd web && grep -rn "created 20 drills\|20 drills created" src/
```
If any test file matches, update its expected strings to the new copy above.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx tsc --noEmit && npx vitest run "src/app/(discover)/drills/designer-actions.test.ts"`
Expected: PASS, all tests including the 4 new ones and the 6 pre-existing ones. Then run `cd web && npm run test -- --run` for the full suite.

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(discover)/drills/designer-actions.ts" "web/src/app/(discover)/drills/designer-actions.test.ts" web/src/lib/email.ts
git commit -m "feat(drills): auto-activate the one-time trial on a free-tier coach's first save attempt"
```

---

### Task 4: Sync every remaining description of these two limits, and remove the dead constant

**Files:**
- Modify: `web/src/components/designer/DrillDesigner.tsx:497`
- Modify: `web/src/app/pricing/page.tsx:3,29-36`
- Modify: `web/src/app/page.tsx:1503,1506`
- Modify: `web/src/app/legal/terms/page.tsx:64`
- Modify: `web/src/app/(app)/how-to/page.tsx:180`
- Modify: `web/src/lib/help/platform-guide.md:75,77`
- Modify: `web/src/app/api/chat/route.ts:80,87`
- Modify: `web/src/lib/subscription-limits.ts` (remove `FREE_DRILL_LIMIT`)
- Modify: `web/src/lib/subscription.ts:17` (drop it from the re-export)
- Modify: `CLAUDE.md` (project root — tier table and resolution-order prose)

**Interfaces:**
- Consumes: the final behavior from Tasks 1-3 (5 msgs/day, unlimited-to-try-then-save-gated drills).
- Produces: nothing new is exported; this task only removes the now-fully-unused `FREE_DRILL_LIMIT` constant once every consumer found in this task has been migrated off it.

This task is copy/documentation only — no new logic, so no dedicated unit test is added, consistent with this repo's existing precedent for copy-only changes (see the plan's Global Constraints). Verification is `tsc`/full-suite plus a final grep sweep (Step 3 below).

- [ ] **Step 1: Update every literal description**

In `web/src/components/designer/DrillDesigner.tsx`, the modal's `feature`/`heading` branch only distinguishes the club-visibility error from everything else, so the new save-gate error (`SAVE_REQUIRES_UPGRADE_ERROR` from Task 3) would fall into the `'Unlimited drills'` branch and render the now-inaccurate heading "Unlimited drills is a club feature". Add a third case, matching the existing pattern exactly, and update the fallback description (used only if `upgradeMessage` is somehow unset, which the real server errors always populate — this is a defensive fallback, so it should still reflect the real current copy):
```tsx
      <UpgradePrompt
        modal
        feature={upgradeMessage?.includes('Club-private drills') ? 'Club-private drills' : 'Unlimited drills'}
        heading={upgradeMessage?.includes('Club-private drills') ? 'Club-private drills are a club feature' : undefined}
        description={upgradeMessage ?? "You've created 20 drills — the free limit. Upgrade your club subscription to create unlimited drills."}
        onDismiss={dismissUpgrade}
      />
```
to:
```tsx
      <UpgradePrompt
        modal
        feature={
          upgradeMessage?.includes('Club-private drills')
            ? 'Club-private drills'
            : upgradeMessage?.includes('Saving a drill requires')
              ? 'Saving drills'
              : 'Unlimited drills'
        }
        heading={
          upgradeMessage?.includes('Club-private drills')
            ? 'Club-private drills are a club feature'
            : upgradeMessage?.includes('Saving a drill requires')
              ? 'Saving drills requires an active subscription'
              : undefined
        }
        description={upgradeMessage ?? 'Saving a drill requires an active subscription. Upgrade to Coach Pro or Club to save your drills.'}
        onDismiss={dismissUpgrade}
      />
```

In `web/src/app/pricing/page.tsx`, change the import (drop `FREE_DRILL_LIMIT`):
```tsx
import { getEffectiveTier, hasClubAccess, FREE_DRILL_LIMIT, FREE_SESSION_LIMIT, FREE_AI_CHAT_DAILY_LIMIT } from '@/lib/subscription'
```
to:
```tsx
import { getEffectiveTier, hasClubAccess, FREE_SESSION_LIMIT, FREE_AI_CHAT_DAILY_LIMIT } from '@/lib/subscription'
```
and change the `FREE_FEATURES` list:
```tsx
const FREE_FEATURES = [
  `Up to ${FREE_DRILL_LIMIT} drills`,
  'Public drill library (unlimited)',
  `${FREE_SESSION_LIMIT} session plan${FREE_SESSION_LIMIT === 1 ? '' : 's'}`,
  `AI coaching chat (${FREE_AI_CHAT_DAILY_LIMIT} messages/day)`,
  'Community access',
  'Profile page',
]
```
to:
```tsx
const FREE_FEATURES = [
  'Drill designer — try it free, saving unlocks a one-time 48h trial',
  'Public drill library (unlimited)',
  `${FREE_SESSION_LIMIT} session plan${FREE_SESSION_LIMIT === 1 ? '' : 's'}`,
  `AI coaching chat (${FREE_AI_CHAT_DAILY_LIMIT} messages/day)`,
  'Community access',
  'Profile page',
]
```

In `web/src/app/page.tsx`, change the landing page's free-tier bullet list:
```tsx
                {[
                  'Up to 20 drills',
                  'Public drill library',
                  'Up to 3 session plans',
                  'AI coaching chat (20/day)',
                  'Community access',
                  'Public profile page',
                ].map(f => (
```
to:
```tsx
                {[
                  'Drill designer — try free, saving unlocks a 48h trial',
                  'Public drill library',
                  'Up to 3 session plans',
                  'AI coaching chat (5/day)',
                  'Community access',
                  'Public profile page',
                ].map(f => (
```
(Leave `'Up to 3 session plans'` exactly as-is — it does not match the real `FREE_SESSION_LIMIT` of 1 today, but that mismatch is a pre-existing, unrelated drift bug out of scope for this plan; do not fix it here.)

In `web/src/app/legal/terms/page.tsx`, change:
```tsx
              <li>The free tier is free forever and includes up to 20 drills and 20 AI messages per day.</li>
```
to:
```tsx
              <li>The free tier is free forever and includes unlimited use of the drill designer (saving a drill starts a one-time 48-hour trial) and 5 AI coaching messages per day.</li>
```

In `web/src/app/(app)/how-to/page.tsx`, change:
```tsx
        a: 'Up to 20 drills, unlimited access to the public drill library, unlimited session planning, 20 AI coaching messages per day, full community access, and your profile page.',
```
to:
```tsx
        a: 'Unlimited use of the drill designer (saving your first drill starts a one-time 48-hour trial with full access), unlimited access to the public drill library, unlimited session planning, 5 AI coaching messages per day, full community access, and your profile page.',
```
(Leave "unlimited session planning" as-is — same pre-existing, unrelated drift as the landing page's "Up to 3 session plans"; not in scope here.)

In `web/src/lib/help/platform-guide.md`, change:
```
- Free tier: 20 drills, unlimited sessions, 20 AI messages/day, community access.
- Club tier (£19.99\month): everything unlimited, coaching groups, collaborative sessions, AI guidance, PDF export.
- Trial: 48-hour full Club access, triggered automatically after your 3rd drill.
```
to:
```
- Free tier: unlimited drill designer use (saving starts a one-time 48h trial), unlimited sessions, 5 AI messages/day, community access.
- Club tier (£19.99\month): everything unlimited, coaching groups, collaborative sessions, AI guidance, PDF export.
- Trial: 48-hour full Club access, triggered automatically the first time a free-tier coach tries to save a drill.
```
(Leave the `£19.99\month` Club price exactly as-is — it doesn't match CLAUDE.md's real £24.99/mo, but that's a pre-existing, unrelated drift bug out of scope for this plan.)

In `web/src/app/api/chat/route.ts`, change:
```
- AI coach: rugby league specialist, available at /chat/ai. Free users get 20 messages/day.
```
to:
```
- AI coach: rugby league specialist, available at /chat/ai. Free users get 5 messages/day.
```
and change:
```
- Free: up to 20 drills, 1 session plan, 20 AI messages/day, full community access.
```
to:
```
- Free: unlimited drill designer use (saving starts a one-time 48h trial), 1 session plan, 5 AI messages/day, full community access.
```

- [ ] **Step 2: Remove the now-fully-unused `FREE_DRILL_LIMIT` constant**

Every consumer has now been migrated off it (Tasks 2 and 3 handled `subscription.ts` and `designer-actions.ts`; this task just handled `pricing/page.tsx`, the last code consumer). Confirm with:
```bash
cd web && grep -rn "FREE_DRILL_LIMIT" src/
```
Expected: only two remaining hits — its declaration in `subscription-limits.ts` and its re-export in `subscription.ts`. Remove both.

In `web/src/lib/subscription-limits.ts`, remove the line:
```ts
export const FREE_DRILL_LIMIT = 20
```

In `web/src/lib/subscription.ts`, change:
```ts
export { FREE_DRILL_LIMIT, FREE_SESSION_LIMIT, FREE_AI_CHAT_DAILY_LIMIT } from './subscription-limits'
```
to:
```ts
export { FREE_SESSION_LIMIT, FREE_AI_CHAT_DAILY_LIMIT } from './subscription-limits'
```

Re-run the grep — it should now return nothing.

- [ ] **Step 3: Update CLAUDE.md's tier table and resolution-order prose**

In `CLAUDE.md` (project root), change the tier comparison table's two affected rows:
```
| Drills created | Up to 20 | Unlimited | Unlimited | Unlimited |
```
to:
```
| Drills created | Unlimited to try — first save starts a 48h trial | Unlimited | Unlimited | Unlimited |
```
and:
```
| AI coaching chat | 20 msgs/day | Unlimited | Unlimited | Unlimited |
```
to:
```
| AI coaching chat | 5 msgs/day | Unlimited | Unlimited | Unlimited |
```

Change the resolution-order list's item 4:
```
4. `profiles.trial_ends_at` is in the future → `'trial'` (same access as Club). Auto-granted once, 48 hours, triggered when a free-tier coach creates their 3rd drill (`designer-actions.ts`).
```
to:
```
4. `profiles.trial_ends_at` is in the future → `'trial'` (same access as Club). Auto-granted once, 48 hours, triggered when a free-tier coach attempts to save their first drill (`designer-actions.ts`).
```

- [ ] **Step 4: Final verification sweep**

Run:
```bash
cd web && grep -rn "20 drills\|20 AI messages\|20 messages/day\|created 20\|reached the free limit of 20\|creates their 3rd drill" src/ ../CLAUDE.md
```
Expected: no matches (every occurrence found during this plan's investigation has been rewritten). If anything unexpected turns up, it's either a genuinely new occurrence not covered above (rewrite it consistently with the pattern used elsewhere in this task) or a false-positive substring match (leave it).

Then run: `cd web && npx tsc --noEmit && npm run test -- --run`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/designer/DrillDesigner.tsx web/src/app/pricing/page.tsx web/src/app/page.tsx web/src/app/legal/terms/page.tsx "web/src/app/(app)/how-to/page.tsx" web/src/lib/help/platform-guide.md web/src/app/api/chat/route.ts web/src/lib/subscription-limits.ts web/src/lib/subscription.ts CLAUDE.md
git commit -m "docs(subscription): sync all copy describing the AI chat and drill save limits, remove FREE_DRILL_LIMIT"
```
