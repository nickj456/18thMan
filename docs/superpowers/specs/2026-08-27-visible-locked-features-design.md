# Visible-But-Locked Premium Features & Tier Badge — Design Spec

**Date:** 2026-08-27
**Status:** Approved by Nick (pending final spec review)

## Problem

Premium features are currently either fully hidden from free/non-club coaches (the "Club only" drill visibility option disappears from the dropdown entirely) or gate on the wrong signal (`club_id` presence, not whether that club has an active paid subscription — the exact class of bug fixed in `getEffectiveTier` on 2026-08-26). Hidden features create no upgrade desire, because the user never learns they exist.

Separately, the dashboard's only "your status" badge shows `profiles.role` (admin/coach/viewer — a free platform permission level), not the paid subscription tier. A free-tier coach with `role = 'coach'` sees a badge reading "Coach," which is easy to mistake for the paid "Coach Pro" tier. Nick confirmed this conflation is real and unintentional.

## Goal

Premium features render for every user regardless of tier, in a visibly locked state (lock icon, greyed treatment, one-click path to upgrade) instead of being absent. A persistent, correctly-labeled tier badge shows what tier the viewer is actually on, distinct from their platform role.

This spec covers two features as the proving ground — **Coaching Groups** (`/groups`) and **Club-only drill visibility** (drill designer) — plus the tier badge. Confirmed with Nick: prove the pattern here before extending to GameSense, collaborative sessions, and the rest of the club-only feature surface.

## Non-goals

- Not touching Coach Pro-only gating (drill/session/AI-chat limits) — those already work via numeric limits with clear "N of M used" messaging on their own pages; this spec is about features that are currently binary hidden/shown, not usage counters.
- Not rolling this out to GameSense, collaborative session plans, or the community section yet — a deliberate follow-up once this pass is validated.
- Not changing what Coach Pro unlocks vs. Club — the tier boundaries themselves are correct and confirmed with Nick; this is a UI/authorization change, not a pricing change.

## Design

### 1. Tier resolution — already correct, now the single source of truth

`hasClubAccess(await getEffectiveTierCached(userId))` (`web/src/lib/subscription.ts`) is already correct post-2026-08-26 fix: it resolves `'club'`/`'trial'` only when the club's own `subscription_tier` is actually `'club'`, not from `profiles.club_id` presence alone. Every check this spec adds uses this function — never a raw `club_id` or `role` check — so a user can't get a locked feature to unlock by abandoning a Stripe checkout, same as the fix already shipped.

### 2. Tier badge

New component `web/src/components/TierBadge.tsx`:
- Props: `{ tier: EffectiveTier }` (`'free' | 'trial' | 'coach' | 'club'`).
- **Colors follow DESIGN.md's One Accent Rule** — ember orange is the only color allowed to signal "this matters"; a second accent hue per tier (the original amber/indigo/emerald draft) would violate it. Tiers are differentiated by *treatment* instead, the same way the existing button variants (primary/outline/ghost) differentiate meaning through fill rather than hue:
  - Free: quiet neutral pill — muted-foreground text, muted-surface/transparent background, hairline border. No orange; this is the baseline, nothing to signal.
  - Trial: ember-orange outline — transparent fill, ember text and border. Active but temporary.
  - Coach Pro: ember-orange low-opacity fill (`bg-ember/10 text-ember border-ember/20`) — the same low-opacity-fill pattern already used for other pills elsewhere in the app, just on the brand color instead of a borrowed one.
  - Club: ember-orange solid fill (`bg-ember text-white`) — matches the primary-button treatment exactly; the most prominent tier gets the same visual weight as a primary CTA.
- Plain text, no icons — matches the existing role badge's minimalism and DESIGN.md's "used sparingly and deliberately, never as decoration" rule.
- Label text: `'free'` → "Free", `'trial'` → "Trial", `'coach'` → "Coach Pro" (never bare "Coach" — that word is reserved for the role badge), `'club'` → "Club".

Placement for this pass: dashboard header, directly beside the existing role badge (`web/src/app/(app)/dashboard/page.tsx`) — both badges stay, now clearly two different things sitting side by side. `dashboard/page.tsx` already computes `getEffectiveTier` nowhere yet; it will call `getEffectiveTierCached(user.id)` alongside its existing profile fetch.

### 3. `/groups` (Coaching Groups)

Current: `web/src/app/(app)/groups/page.tsx` returns an empty "you need a club" card when `!profile?.club_id`, gating on membership, not payment.

New:
- Gate check becomes `!hasClubAccess(tier)` instead of `!profile?.club_id` — closes the same abandoned-checkout gap fixed elsewhere.
- Locked state replaces the bare empty card with a real feature-description panel — what Coaching Groups actually does (a short bullet list: share drills/sessions with your coaching staff, up to 5 groups per club, etc., pulled from the existing `CLUB_FEATURES` copy on `/pricing` so the two surfaces don't drift) — visually consistent with the rest of the page but with a lock icon overlay and a single CTA button linking to `/clubs` (the upsell page already built 2026-08-26).
- A club member with `hasClubAccess` sees the page exactly as today — no behavior change for paying users.

### 4. Drill designer — club visibility option

Current: `web/src/components/designer/DrillDesigner.tsx` conditionally renders the "🔒 Club only" `SelectItem` only `{userClubId && (...)}` — absent entirely for anyone without a `club_id`. Nothing server-side re-verifies tier before `designer-actions.ts` persists `club_id` on the drill.

New:
- The "🔒 Club only" option always renders in the dropdown.
- `DrillDesigner` receives a new `hasClubAccess: boolean` prop (computed server-side by its callers — `drills/new/page.tsx` and `drills/[id]/edit/page.tsx` — via `hasClubAccess(await getEffectiveTierCached(user.id))`) alongside the existing `userClubId`/`userClubName`.
- When `!hasClubAccess`, the "Club only" `SelectItem` renders `disabled`, with a tooltip ("Upgrade to Club to make drills club-private") — fully inert, cannot be selected at all (confirmed default with Nick; flagged as reversible to "selectable, blocked on save" if that reads better once built).
- `designer-actions.ts`'s `createDrillDesign`/`updateDrillDesign` re-verify `hasClubAccess(await getEffectiveTier(supabase, user.id))` server-side before honoring `visibility === 'club'` — if the check fails, the drill silently saves as `private` instead (never trust the client-submitted visibility value for the privileged case), closing the authorization gap whether or not the UI is bypassed directly.

### Testing

- `TierBadge`: unit tests for all four tier→label/color mappings.
- `/groups`: existing precedent for large Server Component pages in this codebase has no dedicated page test (see `CLAUDE.md`'s established pattern for `/complete`, `/clubs`, etc.) — implementation-only, matching precedent.
- `DrillDesigner`: test that the "Club only" option is present-but-disabled when `hasClubAccess` is false, and enabled when true.
- `designer-actions.ts`: regression tests — a `visibility: 'club'` submission from a user without `hasClubAccess` persists as private, not club; the same submission from a user with `hasClubAccess` persists as club. This is the authorization-critical path, gets the most thorough coverage.

## Open question carried into implementation

Whether the disabled "Club only" option should be fully inert (current default) or selectable-but-blocked-on-save — Nick can redirect once he sees the built version if the fully-inert version feels wrong in practice.
