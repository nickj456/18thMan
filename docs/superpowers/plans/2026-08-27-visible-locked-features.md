# Visible-But-Locked Premium Features & Tier Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Premium features (Coaching Groups, club-private drill visibility) render for every user in a visibly locked state instead of being hidden, and a correctly-labeled tier badge (distinct from the existing role badge) shows what subscription tier the viewer is actually on.

**Architecture:** `hasClubAccess(await getEffectiveTier(...))` (already correct post-2026-08-26 bug fix) becomes the single authorization signal everywhere this plan touches, replacing raw `club_id`/role checks. UI changes render the locked state instead of hiding content; a matching server-side re-check closes the one place (drill visibility) where the client-submitted value was previously trusted directly.

**Tech Stack:** Next.js App Router (Server Components, Server Actions), Supabase, Tailwind CSS + shadcn/ui (Base UI), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-27-visible-locked-features-design.md`

## Global Constraints

- **One Accent Rule (DESIGN.md):** ember orange — the `primary`/`primary-foreground` Tailwind tokens (`oklch(0.62 0.2 42)`, already theme-mapped in `globals.css`) — is the only color allowed to signal "this matters." Never introduce a second hue for tier or locked-feature UI. Use `bg-primary`/`text-primary`/`border-primary` (with opacity modifiers for lighter treatments), never a hardcoded hex or a borrowed color like `amber`/`indigo`/`emerald`.
- **Authorization signal:** `hasClubAccess(tier)` from `@/lib/subscription`, where `tier` comes from `getEffectiveTier`/`getEffectiveTierCached` — never `profile.club_id` presence alone, and never trust a client-submitted visibility/tier value without a matching server-side re-check.
- **Tier label text:** `'free'` → "Free", `'trial'` → "Trial", `'coach'` → "Coach Pro" (never bare "Coach" — that word means the platform role), `'club'` → "Club".
- **Testing precedent:** this codebase has no dedicated test files for large Server Component pages (`dashboard/page.tsx`, `groups/page.tsx`) or the canvas-heavy `DrillDesigner` client component — matches existing precedent (e.g. `/complete`, `/clubs`). Tasks touching these are implementation-only for the page/component itself; new *logic* gets extracted into small, pure, independently-testable units instead of being tested through the heavy component.
- Scope for this pass is exactly two features (Coaching Groups, drill designer club visibility) plus the tier badge — GameSense, collaborative session plans, and the rest of the club-only surface are out of scope (see spec's Non-goals).

---

### Task 1: `TierBadge` component

**Files:**
- Create: `web/src/components/TierBadge.tsx`
- Create: `web/src/components/TierBadge.test.tsx`

**Interfaces:**
- Produces: `export function TierBadge({ tier }: { tier: EffectiveTier }): JSX.Element`, where `EffectiveTier` is imported from `@/lib/supabase/types` (`'free' | 'trial' | 'coach' | 'club'`). Consumed by Task 2.

- [ ] **Step 1: Write the failing tests**

Create `web/src/components/TierBadge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierBadge } from './TierBadge'

describe('TierBadge', () => {
  it('labels free as "Free"', () => {
    render(<TierBadge tier="free" />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('labels trial as "Trial"', () => {
    render(<TierBadge tier="trial" />)
    expect(screen.getByText('Trial')).toBeInTheDocument()
  })

  it('labels the coach tier as "Coach Pro", never bare "Coach"', () => {
    render(<TierBadge tier="coach" />)
    expect(screen.getByText('Coach Pro')).toBeInTheDocument()
    expect(screen.queryByText('Coach')).not.toBeInTheDocument()
  })

  it('labels club as "Club"', () => {
    render(<TierBadge tier="club" />)
    expect(screen.getByText('Club')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/components/TierBadge.test.tsx`
Expected: FAIL — `Cannot find module './TierBadge'`.

- [ ] **Step 3: Create `TierBadge.tsx`**

```tsx
import type { EffectiveTier } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const TIER_LABEL: Record<EffectiveTier, string> = {
  free: 'Free',
  trial: 'Trial',
  coach: 'Coach Pro',
  club: 'Club',
}

// Differentiated by treatment (outline / low-opacity fill / solid fill) on
// the single brand accent, never by hue -- see DESIGN.md's One Accent Rule.
const TIER_CLASSES: Record<EffectiveTier, string> = {
  free: 'text-muted-foreground border-border bg-transparent',
  trial: 'text-primary border-primary/40 bg-transparent',
  coach: 'text-primary border-primary/20 bg-primary/10',
  club: 'text-primary-foreground border-transparent bg-primary',
}

export function TierBadge({ tier }: { tier: EffectiveTier }) {
  return (
    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full border', TIER_CLASSES[tier])}>
      {TIER_LABEL[tier]}
    </span>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/components/TierBadge.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/TierBadge.tsx web/src/components/TierBadge.test.tsx
git commit -m "feat(tier-badge): add TierBadge component, on-brand per DESIGN.md's One Accent Rule"
```

---

### Task 2: Wire the tier badge into the dashboard

**Files:**
- Modify: `web/src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `TierBadge` from Task 1; `getEffectiveTierCached(userId): Promise<EffectiveTier>` from `@/lib/subscription` (already exists, unchanged).

No dedicated test file exists for `dashboard/page.tsx` (see Global Constraints) — this task is implementation only.

- [ ] **Step 1: Add the imports**

In `web/src/app/(app)/dashboard/page.tsx`, add alongside the existing imports:

```tsx
import { TierBadge } from '@/components/TierBadge'
import { getEffectiveTierCached } from '@/lib/subscription'
```

- [ ] **Step 2: Fetch the tier alongside the existing profile fetch**

Find (around line 504):

```tsx
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role, club, club_id')
    .eq('id', user.id)
    .single()
```

Add immediately after it:

```tsx

  const tier = await getEffectiveTierCached(user.id)
```

- [ ] **Step 3: Render the badge beside the existing role badge**

Find (around line 578):

```tsx
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize mt-1 ${roleColour[profile?.role ?? 'viewer']}`}>
          {profile?.role ?? 'viewer'}
        </span>
```

Replace with:

```tsx
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${roleColour[profile?.role ?? 'viewer']}`}>
            {profile?.role ?? 'viewer'}
          </span>
          <TierBadge tier={tier} />
        </div>
```

(The `mt-1` moves from the inner `<span>` to the new wrapping `<div>` so both badges align together instead of double-margining.)

- [ ] **Step 4: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full test suite**

Run: `cd web && npm run test -- --run`
Expected: PASS, no regressions.

- [ ] **Step 6: Manually verify in the browser**

Run: `cd web && npm run dev`, log in as a free-tier coach, visit `/dashboard`. Expected: role badge (e.g. "Coach") and a separate "Free" tier badge appear side by side in the header.

- [ ] **Step 7: Commit**

```bash
git add "web/src/app/(app)/dashboard/page.tsx"
git commit -m "feat(tier-badge): show the real subscription tier next to the role badge on the dashboard"
```

---

### Task 3: Bring `UpgradePrompt` onto the brand accent

**Files:**
- Modify: `web/src/components/ui/UpgradePrompt.tsx`

No dedicated test file exists for this component and this task only changes color classes (no new logic branch) — implementation only, matching the "no test for a pure styling change" norm elsewhere in this codebase.

This component is the app's existing upgrade-nudge UI (already wired into `DrillDesigner` via `useUpgradePrompt`/`checkError`) and is directly part of the locked-feature UX this plan is building — it currently uses `amber-*` classes, a second accent color against DESIGN.md's One Accent Rule. Bringing it on-brand now avoids shipping a new on-brand tier badge next to an off-brand upgrade prompt.

- [ ] **Step 1: Replace the amber classes with the primary token**

In `web/src/components/ui/UpgradePrompt.tsx`, replace:

```tsx
    <div className="relative rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
```

with:

```tsx
    <div className="relative rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
```

Replace:

```tsx
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Lock size={16} className="text-amber-400" />
        </div>
```

with:

```tsx
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Lock size={16} className="text-primary" />
        </div>
```

Replace:

```tsx
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium transition-colors"
        >
```

with:

```tsx
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium transition-colors"
        >
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `cd web && npm run test -- --run`
Expected: PASS, no regressions (no test references the old amber classes).

- [ ] **Step 4: Commit**

```bash
git add web/src/components/ui/UpgradePrompt.tsx
git commit -m "fix(design-system): bring UpgradePrompt onto the ember-orange brand accent"
```

---

### Task 4: `/groups` — visible-but-locked Coaching Groups

**Files:**
- Modify: `web/src/app/(app)/groups/page.tsx`

**Interfaces:**
- Consumes: `hasClubAccess(tier)`, `getEffectiveTierCached(userId)` from `@/lib/subscription`.

No dedicated test file exists for `groups/page.tsx` (see Global Constraints) — implementation only.

- [ ] **Step 1: Update the imports**

In `web/src/app/(app)/groups/page.tsx`, replace:

```tsx
import { Users2, Plus, Clock, ArrowRight, Building2, Shield } from 'lucide-react'
```

with:

```tsx
import { Users2, Plus, Clock, ArrowRight, Building2, Shield, Lock } from 'lucide-react'
```

Add, alongside the `createClient` import:

```tsx
import { hasClubAccess, getEffectiveTierCached } from '@/lib/subscription'
```

- [ ] **Step 2: Replace the club-membership gate with a tier-based, visible-but-locked panel**

Find:

```tsx
  // No club yet — prompt to join one first
  if (!profile?.club_id) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="app-heading text-2xl">My Groups</h1>
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <Building2 size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">You need to be a member of a club before joining groups.</p>
          <Link href="/clubs" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Go to My Club →
          </Link>
        </div>
      </div>
    )
  }
```

Replace with:

```tsx
  // No active Club subscription -- this used to gate on raw club_id
  // presence, which let an abandoned Stripe checkout's placeholder club
  // through (see the 2026-08-26 getEffectiveTier fix). hasClubAccess is
  // the only correct signal. Shows what Coaching Groups actually offers
  // instead of a bare empty state -- visible, not hidden.
  const tier = await getEffectiveTierCached(user.id)
  if (!hasClubAccess(tier)) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="app-heading text-2xl">My Groups</h1>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Lock size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Coaching Groups is a Club feature</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Organise your coaching staff into groups and share drills and sessions privately.</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <Shield size={14} className="text-zinc-600 mt-0.5 shrink-0" />
              Share drills and sessions with your coaching staff only
            </li>
            <li className="flex items-start gap-2">
              <Shield size={14} className="text-zinc-600 mt-0.5 shrink-0" />
              Up to 5 groups per club
            </li>
            <li className="flex items-start gap-2">
              <Shield size={14} className="text-zinc-600 mt-0.5 shrink-0" />
              Collaborative session plans within each group
            </li>
          </ul>
          <Link
            href="/clubs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-medium transition-colors"
          >
            <Building2 size={14} />
            Get Club access
          </Link>
        </div>
      </div>
    )
  }
```

(`profile.club_role`/`profile.role` are still read further down the file for `isClubAdmin`/`isPlatformAdmin` — those lines are untouched. A user with `hasClubAccess === true` reaches them exactly as before; nothing changes for already-paying users.)

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `cd web && npm run test -- --run`
Expected: PASS, no regressions.

- [ ] **Step 5: Manually verify in the browser**

Run: `cd web && npm run dev`. As a free-tier coach with no club (e.g. `testcoach`), visit `/groups`. Expected: the locked panel renders with the feature list and a "Get Club access" button linking to `/clubs`, not a bare one-line message.

- [ ] **Step 6: Commit**

```bash
git add "web/src/app/(app)/groups/page.tsx"
git commit -m "feat(groups): show what Coaching Groups offers instead of hiding it, gate on real Club access"
```

---

### Task 5: Server-side authorization for club-private drill visibility

**Files:**
- Modify: `web/src/app/(discover)/drills/designer-actions.ts`
- Create: `web/src/app/(discover)/drills/designer-actions.test.ts`

**Interfaces:**
- Consumes: `hasClubAccess(tier)`, `getEffectiveTier(supabase, userId)` from `@/lib/subscription` (already exist, unchanged).
- No exported interface changes — `saveDrillDesign`/`updateDrillDesign` keep their existing signatures; this task only adds an authorization check inside them.

This is the authorization-critical path (spec: "gets the most thorough coverage") — no existing test file for this action module, so this task builds the mock harness from scratch, scoped to the new visibility-authorization behavior rather than full pre-existing-behavior coverage (which is a separate, larger, unrequested undertaking).

- [ ] **Step 1: Write the failing tests**

Create `web/src/app/(discover)/drills/designer-actions.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state: {
  user: { id: string; email: string } | null
  session: { access_token: string } | null
  canCreateDrillResult: { allowed: boolean; count: number; tier: string }
  hasClubAccessResult: boolean
  insertError: { message: string } | null
  updateError: { message: string } | null
} = {
  user: { id: 'coach-1', email: 'coach@example.com' },
  session: { access_token: 'token' },
  canCreateDrillResult: { allowed: true, count: 1, tier: 'free' },
  hasClubAccessResult: false,
  insertError: null,
  updateError: null,
}

const insertMock = vi.fn(async (payload: unknown) => ({ data: { id: 'drill-1' }, error: state.insertError }))
const updateEqMock = vi.fn(async (payload: unknown) => ({ error: state.updateError }))

vi.mock('next/server', () => ({
  after: (_cb: () => unknown) => {},
}))
vi.mock('next/cache', () => ({
  revalidateTag: () => {},
}))
vi.mock('@/lib/subscription', () => ({
  canCreateDrill: async () => state.canCreateDrillResult,
  activateTrial: async () => false,
  FREE_DRILL_LIMIT: 20,
  hasClubAccess: () => state.hasClubAccessResult,
  getEffectiveTier: async () => 'free',
}))
vi.mock('@/lib/email', () => ({
  sendTrialStartEmail: async () => {},
  sendDrillLimitEmail: async () => {},
}))
vi.mock('./youtube-actions', () => ({
  generateDrillGuideFromYoutube: async () => ({ success: false }),
}))
vi.mock('@/lib/youtube', () => ({
  extractYouTubeId: () => null,
  youtubeThumbnail: () => null,
  fetchChannelInfo: async () => null,
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: () => ({ select: () => ({ eq: () => ({}) }) }) }),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({}),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
      getSession: async () => ({ data: { session: state.session } }),
    },
    from: (table: string) => {
      if (table === 'drills') {
        return {
          insert: (payload: unknown) => ({
            select: () => ({ single: async () => insertMock(payload) }),
          }),
          update: (payload: unknown) => ({
            eq: () => ({
              eq: async () => {
                await updateEqMock(payload)
                return { error: state.updateError }
              },
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { display_name: 'Coach' } }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  }),
}))

import { saveDrillDesign, updateDrillDesign } from './designer-actions'

function baseInput(overrides: Partial<Parameters<typeof saveDrillDesign>[0]> = {}) {
  return {
    title: 'Test Drill',
    description: null,
    categoryId: null,
    difficulty: null,
    ageGroup: null,
    playerCount: null,
    canvasJson: { background: 'full' as const, elements: [] },
    previewDataUrl: null,
    youtubeUrl: null,
    tiktokUrl: null,
    facebookUrl: null,
    visibility: 'club' as const,
    clubId: 'club-1',
    ...overrides,
  }
}

describe('saveDrillDesign — club visibility authorization', () => {
  beforeEach(() => {
    state.hasClubAccessResult = false
    state.insertError = null
    insertMock.mockClear()
  })

  it('rejects a club-visibility drill when the caller has no active club subscription', async () => {
    state.hasClubAccessResult = false
    const result = await saveDrillDesign(baseInput({ visibility: 'club' }))
    expect(result.error).toMatch(/upgrade/i)
    expect(result.error).toMatch(/club subscription/i)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('allows a club-visibility drill when the caller has an active club subscription', async () => {
    state.hasClubAccessResult = true
    const result = await saveDrillDesign(baseInput({ visibility: 'club' }))
    expect(result.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: 'club-1', is_public: false }))
  })

  it('does not run the club-access check for public or private visibility', async () => {
    state.hasClubAccessResult = false
    const result = await saveDrillDesign(baseInput({ visibility: 'public', clubId: null }))
    expect(result.error).toBeUndefined()
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: null, is_public: true }))
  })
})

describe('updateDrillDesign — club visibility authorization', () => {
  beforeEach(() => {
    state.hasClubAccessResult = false
    state.updateError = null
    updateEqMock.mockClear()
  })

  function updateInput(overrides: Partial<Parameters<typeof updateDrillDesign>[0]> = {}) {
    return {
      ...baseInput(),
      drillId: 'drill-1',
      existingPreviewUrl: null,
      existingCanvasPreviewUrl: null,
      existingYoutubeUrl: null,
      existingTiktokUrl: null,
      existingFacebookUrl: null,
      existingClubId: null,
      ...overrides,
    }
  }

  it('rejects switching a drill to club visibility without an active club subscription', async () => {
    state.hasClubAccessResult = false
    const result = await updateDrillDesign(updateInput({ visibility: 'club' }))
    expect(result.error).toMatch(/upgrade/i)
    expect(updateEqMock).not.toHaveBeenCalled()
  })

  it('allows switching a drill to club visibility with an active club subscription', async () => {
    state.hasClubAccessResult = true
    const result = await updateDrillDesign(updateInput({ visibility: 'club' }))
    expect(result.error).toBeUndefined()
    expect(updateEqMock).toHaveBeenCalledWith(expect.objectContaining({ club_id: 'club-1', is_public: false }))
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run "src/app/(discover)/drills/designer-actions.test.ts"`
Expected: FAIL — the "rejects" tests get no error back (current code has no authorization check), and/or the "allows"/"does not run" tests may already pass by coincidence. The two "rejects" tests are the ones that must fail here; confirm they fail for that reason, not a mock-shape error.

- [ ] **Step 3: Add the authorization check to `saveDrillDesign`**

In `web/src/app/(discover)/drills/designer-actions.ts`, update the import:

```ts
import { canCreateDrill, activateTrial, FREE_DRILL_LIMIT, hasClubAccess, getEffectiveTier } from '@/lib/subscription'
```

Find, inside `saveDrillDesign`, right after the `canCreateDrill` block ends (after the closing `}` of `if (!allowed) { ... }`):

```ts
    return { error: `You've reached the free limit of ${FREE_DRILL_LIMIT} drills. Upgrade your club to create unlimited drills.` }
  }
```

Add immediately after that closing `}`:

```ts

  // Never trust a client-submitted 'club' visibility on its own -- the UI
  // already prevents selecting it without access, but this is the real
  // authorization boundary. Same class of gap as the 2026-08-26
  // getEffectiveTier fix: don't let an abandoned Stripe checkout's
  // placeholder club grant club-private drills either.
  if (input.visibility === 'club') {
    const tier = await getEffectiveTier(supabase, user.id)
    if (!hasClubAccess(tier)) {
      return { error: 'Club-private drills require an active club subscription. Upgrade your club to enable this.' }
    }
  }
```

- [ ] **Step 4: Add the same check to `updateDrillDesign`**

Find, inside `updateDrillDesign`:

```ts
  if (!user || !session) return { error: 'Not authenticated' }

  const canvasPreviewUrl = input.previewDataUrl
```

Replace with:

```ts
  if (!user || !session) return { error: 'Not authenticated' }

  if (input.visibility === 'club') {
    const tier = await getEffectiveTier(supabase, user.id)
    if (!hasClubAccess(tier)) {
      return { error: 'Club-private drills require an active club subscription. Upgrade your club to enable this.' }
    }
  }

  const canvasPreviewUrl = input.previewDataUrl
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd web && npx vitest run "src/app/(discover)/drills/designer-actions.test.ts"`
Expected: PASS (5 tests).

- [ ] **Step 6: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Run the full test suite**

Run: `cd web && npm run test -- --run`
Expected: PASS, no regressions.

- [ ] **Step 8: Commit**

```bash
git add "web/src/app/(discover)/drills/designer-actions.ts" "web/src/app/(discover)/drills/designer-actions.test.ts"
git commit -m "fix(drills): re-verify club access server-side before saving a club-private drill"
```

---

### Task 6: Drill designer — always show the Club visibility option, locked when inaccessible

**Files:**
- Modify: `web/src/components/designer/DrillDesigner.tsx`
- Modify: `web/src/app/(discover)/drills/new/page.tsx`
- Modify: `web/src/app/(discover)/drills/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `hasClubAccess(tier)`, `getEffectiveTierCached(userId)` from `@/lib/subscription`; the server-side authorization added in Task 5 (defense in depth if this client gate is ever bypassed).
- `DrillDesigner` gains a new required prop `hasClubAccess: boolean`.

No test file exists for `DrillDesigner` itself (canvas-heavy, no precedent — see Global Constraints). The locking *decision* is selectable/click-guarded rather than the HTML `disabled` attribute, because a `disabled` Base UI `SelectItem` sets `pointer-events: none`, which would also block a tooltip's hover trigger — so this uses visible muted styling plus a guarded `onValueChange` instead, confirmed as an acceptable revision of the spec's original "fully disabled" default (the spec flagged this exact choice as open pending what feels right once built).

- [ ] **Step 1: Add the `hasClubAccess` prop to `DrillDesigner`**

In `web/src/components/designer/DrillDesigner.tsx`, replace:

```tsx
interface DrillDesignerProps {
  categories: DrillCategory[]
  initialDrill?: InitialDrill
  userClubId?: string | null
  userClubName?: string | null
}

export function DrillDesigner({ categories, initialDrill, userClubId, userClubName }: DrillDesignerProps) {
```

with:

```tsx
interface DrillDesignerProps {
  categories: DrillCategory[]
  initialDrill?: InitialDrill
  userClubId?: string | null
  userClubName?: string | null
  hasClubAccess: boolean
}

export function DrillDesigner({ categories, initialDrill, userClubId, userClubName, hasClubAccess }: DrillDesignerProps) {
```

- [ ] **Step 2: Always render the Club option; guard selecting it**

Find:

```tsx
        <Select value={visibility} onValueChange={(v) => setVisibility(v as DrillVisibility)}>
          <SelectTrigger className="h-8 text-sm w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="public">🌐 Public</SelectItem>
            {userClubId && (
              <SelectItem value="club">🔒 {userClubName ?? 'My Club'} only</SelectItem>
            )}
            <SelectItem value="private">👁 Only me</SelectItem>
          </SelectContent>
        </Select>
        {visibility === 'club' && (
          <p className="text-[11px] text-zinc-500">Only members of your club can see this drill</p>
        )}
```

Replace with:

```tsx
        <Select
          value={visibility}
          onValueChange={(v) => {
            if (v === 'club' && !hasClubAccess) {
              toast.error('Upgrade to Club to make drills club-private.')
              return
            }
            setVisibility(v as DrillVisibility)
          }}
        >
          <SelectTrigger className="h-8 text-sm w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="public">🌐 Public</SelectItem>
            <SelectItem value="club" className={!hasClubAccess ? 'text-muted-foreground' : undefined}>
              🔒 {userClubName ?? 'My Club'} only{!hasClubAccess ? ' — Club only' : ''}
            </SelectItem>
            <SelectItem value="private">👁 Only me</SelectItem>
          </SelectContent>
        </Select>
        {visibility === 'club' && (
          <p className="text-[11px] text-zinc-500">Only members of your club can see this drill</p>
        )}
```

(`toast` is already imported in this file via `import { toast } from 'sonner'`. The Task 5 server-side check is the real authorization boundary if this client guard is ever bypassed — the save action will return the "Upgrade your club" error, which the existing `checkError`/`UpgradePrompt` wiring in this same file already surfaces as the modal.)

- [ ] **Step 3: Pass `hasClubAccess` from the "new drill" page**

In `web/src/app/(discover)/drills/new/page.tsx`, add the import:

```tsx
import { hasClubAccess, getEffectiveTierCached } from '@/lib/subscription'
```

Replace:

```tsx
  const clubId = profileResult.data?.club_id ?? null
  let clubName: string | null = null
  if (clubId) {
    const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).single()
    clubName = club?.name ?? null
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <a href="/drills" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          ← Drills
        </a>
        <span className="text-zinc-700">/</span>
        <h1 className="text-sm font-semibold text-white">New Drill</h1>
      </header>
      <DrillDesigner
        categories={categoriesResult.data ?? []}
        userClubId={clubId}
        userClubName={clubName}
      />
    </div>
  )
```

with:

```tsx
  const clubId = profileResult.data?.club_id ?? null
  let clubName: string | null = null
  if (clubId) {
    const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).single()
    clubName = club?.name ?? null
  }
  const tier = await getEffectiveTierCached(user.id)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <a href="/drills" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          ← Drills
        </a>
        <span className="text-zinc-700">/</span>
        <h1 className="text-sm font-semibold text-white">New Drill</h1>
      </header>
      <DrillDesigner
        categories={categoriesResult.data ?? []}
        userClubId={clubId}
        userClubName={clubName}
        hasClubAccess={hasClubAccess(tier)}
      />
    </div>
  )
```

- [ ] **Step 4: Pass `hasClubAccess` from the "edit drill" page**

In `web/src/app/(discover)/drills/[id]/edit/page.tsx`, add the import:

```tsx
import { hasClubAccess, getEffectiveTierCached } from '@/lib/subscription'
```

Replace:

```tsx
  const userClubId = profileResult.data?.club_id ?? null
  let userClubName: string | null = null
  if (userClubId) {
    const { data: club } = await supabase.from('clubs').select('name').eq('id', userClubId).single()
    userClubName = club?.name ?? null
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <h1 className="text-sm font-semibold">Editing: {drill.title}</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <DrillDesigner
          categories={categories}
          userClubId={userClubId}
          userClubName={userClubName}
```

with:

```tsx
  const userClubId = profileResult.data?.club_id ?? null
  let userClubName: string | null = null
  if (userClubId) {
    const { data: club } = await supabase.from('clubs').select('name').eq('id', userClubId).single()
    userClubName = club?.name ?? null
  }
  const tier = await getEffectiveTierCached(user.id)

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <h1 className="text-sm font-semibold">Editing: {drill.title}</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <DrillDesigner
          categories={categories}
          userClubId={userClubId}
          userClubName={userClubName}
          hasClubAccess={hasClubAccess(tier)}
```

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors. (This will catch any other `<DrillDesigner>` call site missing the new required `hasClubAccess` prop — search for `<DrillDesigner` if the compiler doesn't surface all of them.)

- [ ] **Step 6: Run the full test suite**

Run: `cd web && npm run test -- --run`
Expected: PASS, no regressions.

- [ ] **Step 7: Manually verify in the browser**

Run: `cd web && npm run dev`.
- As a free-tier coach (e.g. `testcoach`), open `/drills/new`. Expected: the Visibility dropdown shows "🔒 My Club only — Club only" in muted text; selecting it shows a toast ("Upgrade to Club...") and the value stays on whatever it was.
- As a coach with active Club access, open `/drills/new`. Expected: the Club option is selectable normally, with the actual club name, no muted styling.

- [ ] **Step 8: Commit**

```bash
git add web/src/components/designer/DrillDesigner.tsx "web/src/app/(discover)/drills/new/page.tsx" "web/src/app/(discover)/drills/[id]/edit/page.tsx"
git commit -m "feat(drills): always show club-only visibility, lock it behind real Club access instead of hiding it"
```

---

## Self-Review Notes

- **Spec coverage:** Tier resolution (already correct, used throughout) ✓. Tier badge — colors, labels, placement ✓ (Tasks 1–2). `/groups` visible-but-locked ✓ (Task 4). Drill designer visibility — always visible, locked client-side, re-verified server-side ✓ (Tasks 5–6). `UpgradePrompt` on-brand fix was found during planning (not in the original spec's task list) and added as Task 3 since it's the app's existing upgrade-nudge UI directly in the critical path of this feature — flagged here rather than silently added.
- **Type consistency:** `EffectiveTier` used identically across Tasks 1, 2, 4, 6. `hasClubAccess`/`getEffectiveTier`/`getEffectiveTierCached` signatures match their real definitions in `web/src/lib/subscription.ts` (verified against source, not assumed) in every task that calls them.
- **No placeholders:** every step has literal code, not a description of code.
