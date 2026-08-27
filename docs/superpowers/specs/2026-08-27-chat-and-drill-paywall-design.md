# AI Chat Limit Reduction & Drill Designer Save-Gating — Design

**Status:** Approved (design settled via direct conversation + two scoping decisions; no separate brainstorming session run, given the design closely follows the already-shipped [visible-locked-features design](2026-08-27-visible-locked-features-design.md)).

## Problem

Two more free-tier limits need tightening to push the conversion-focused product priority further (CLAUDE.md: "free/non-club coaches are the primary conversion target"):

1. **AI Coach chat** — free tier currently gets 20 messages/day. Reduce to 5/day.
2. **Drill designer** — free tier currently gets up to 20 *saved* drills before being blocked. Replace this with: unlimited use of the designer to build a drill, but saving a drill requires a paid tier (or the auto-granted trial).

## Decision 1 — AI Chat: pure limit reduction

No behavior change beyond the number. Free tier's daily message cap drops from 20 to 5. The existing lock UI (an `UpgradePrompt` modal triggered via `useUpgradePrompt`/`checkError` in `AiChat.tsx`, added in the visible-locked-features branch) already fires correctly when the server returns its "daily limit reached" error — nothing about that plumbing changes.

## Decision 2 — Drill designer: replace the 20-drill cap with save-gating

**Current behavior** (`web/src/lib/subscription.ts`'s `canCreateDrill`): free tier may create up to `FREE_DRILL_LIMIT` (20) drills; beyond that, `saveDrillDesign` rejects with an upgrade error. A background job auto-grants a one-time 48-hour trial when a free-tier coach's drill count reaches 3 (`designer-actions.ts`, `count + 1 === 3`).

**New behavior:**
- The drill designer UI (`DrillDesigner.tsx`, `/drills/new`, `/drills/[id]/edit`) is always fully usable regardless of tier — no entry gate exists today and none is added. A free-tier coach can build a drill on the canvas with zero friction.
- `canCreateDrill` no longer allows free tier to create a *new* saved drill at any count — the create gate becomes unconditional for `tier === 'free'`.
- **The auto-trial trigger moves from "3rd drill created" to "first save attempt while on free tier."** Since a genuinely free (never-trialed) coach can no longer reach a 3rd saved drill under the new rule, the old trigger condition can never fire. The new trigger: when `saveDrillDesign` is about to reject a free-tier save, it first attempts `activateTrial` (the same one-time, 48-hour, `trial_used`-gated grant that already exists). If activation succeeds (first time ever hitting this wall), the save proceeds immediately as a trial-tier save — no separate "try again" step, no visible interruption. If activation fails (trial already used and expired, or currently exhausted), the save is rejected with an upgrade-required error, same as today's shape.
- This activation must happen **synchronously, before the insert**, unlike today's version which grants the trial via a background `after()` job following a successful save. The trial has to be active *before* the save proceeds, since the save's own success now depends on it.
- **Editing an existing drill is unaffected.** `updateDrillDesign` keeps no drill-count gate today and gets none added — a free-tier coach retains full edit rights on anything already saved (from before this change, or saved during a trial window), consistent with not retroactively punishing existing users.
- The one-time "you've hit the limit" nudge email (currently sent when `count === FREE_DRILL_LIMIT`) is repointed to the new wall: send it when a free-tier save is rejected because `activateTrial` returned `false` (i.e., they've already used their trial and are now genuinely blocked) — this is the real "you've hit the wall, upgrade" moment under the new model.
- `FREE_DRILL_LIMIT` as a numeric cap is removed from the create-gate. Any other reference to it (pricing page copy, CLAUDE.md) is rewritten to describe the new model rather than a number.

## Files Affected

- `web/src/lib/subscription-limits.ts` — `FREE_AI_CHAT_DAILY_LIMIT`: `20 → 5`. `FREE_DRILL_LIMIT` removed (no longer a numeric cap; nothing else in this file depends on it).
- `web/src/lib/subscription.ts` — `canCreateDrill`: free tier always `allowed: false` (drop the count comparison). Re-export list drops `FREE_DRILL_LIMIT`.
- `web/src/app/(discover)/drills/designer-actions.ts` — `saveDrillDesign`: restructure the gate to synchronously call `activateTrial` when free-tier and not allowed; on success, treat the save as a trial-tier save (this also affects the `hasClubAccess(tier)` check for club-visibility further down — it must use the *resolved* tier, trial-or-free, not the stale pre-activation tier). Repoint the nudge email trigger. Remove the now-dead "3rd drill" trigger block.
- `web/src/app/pricing/page.tsx` — `FREE_FEATURES`: drop the `FREE_DRILL_LIMIT`-based bullet, replace with wording describing "try free, save unlocks a one-time 48h trial" (exact copy is an implementation-time judgment call — keep it short, on-tone with the rest of the list). Update the AI chat bullet to read `5` instead of `20` (already reads the constant, so this updates automatically — verify).
- `web/src/app/api/chat/route.ts` — `SYSTEM_PROMPT`: two literal mentions of "20 messages/day" (line ~80) and "up to 20 drills" (line ~87) need rewriting to match the new numbers/model. These are plain-text descriptions the AI reads out to users, not code — CLAUDE.md already flags this file as a known drift risk.
- `CLAUDE.md` (project root) — tier comparison table: "AI coaching chat" row (Free column) `20 msgs/day → 5 msgs/day`; "Drills created" row (Free column) `Up to 20 → Unlimited to try — first save starts a 48h trial`.
- Tests: `web/src/lib/subscription.test.ts` has no existing coverage of `canCreateDrill`/`activateTrial` — add coverage for the new unconditional-block behavior. `designer-actions.test.ts` needs new tests for: first free-tier save attempt succeeds and activates trial; save after trial already used is rejected; update path remains ungated regardless of tier. `route.test.ts` doesn't assert the literal limit number today — no change needed there, but worth a sanity check.

## Out of Scope

- No change to session-plan limits (`FREE_SESSION_LIMIT`) or any other tier's behavior (Trial/Coach Pro/Club are all unaffected — they already have unlimited drills and unlimited AI chat).
- No change to the trial's own duration (still 48 hours) or its one-time nature (`trial_used` still gates a second grant).
- No visible UI change to the drill designer's entry point — it was already always open to every tier; this spec only changes what happens at Save.
