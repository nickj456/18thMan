# Design: Four Features — Contact Page, Penalty Stats, Admin Delete Groups, Club Groups Limit

**Date:** 2026-06-01
**Status:** Approved

---

## Overview

Four independent features added to the 18th Man rugby league coaching platform:

1. Contact Us page (public, email form)
2. Positive & Negative Penalties in the stats tracker
3. Platform admin can delete coaching groups
4. Platform admin can set a per-club groups limit

---

## Feature 1: Contact Us Page

### Route & Access
- Public route at `/contact` — no authentication required
- Sits outside the `(app)` route group, alongside `/legal/privacy` and `/legal/terms`

### UI
- Reuses the legal page shell (minimal header/footer)
- Brief intro copy: "Got a question or feedback? We'd love to hear from you."
- Form fields:
  - Name (required)
  - Email (required)
  - Subject (optional dropdown: General, Bug Report, Billing, Other)
  - Message (required, textarea)
- Submit button triggers a Server Action
- Success state: inline confirmation replacing the form ("Thanks — we'll be in touch soon.")
- Error state: inline error with retry option

### Email Sending
- Server Action sends via Resend (existing email infrastructure)
- Recipient: `Hello@18thMan.app`
- Email body: sender name, email, subject, message
- No DB record stored

### Navigation
- Sidebar footer section: "Contact" link visible to all authenticated users
- Legal pages footer links: visible to unauthenticated visitors

---

## Feature 2: Positive & Negative Penalties in Stats Tracker

### Schema
- New migration adds `penalty_won` and `penalty_conceded` to the `stat_type` enum in `game_stat_events`
- No other table changes — penalties follow the same player-attributed event model

### Live Tracker UI (`GameStatsClient.tsx`)
- Two new tap buttons in the existing stats grid:
  - **Penalty Won** — green styling
  - **Penalty Conceded** — red styling
- Player attribution: same flow as existing stats (tap stat → select player)
- Player selection remains required for consistency with existing UX

### Summary/Scoreboard
- No additional aggregation code needed — the existing per-`stat_type` breakdown automatically includes the new values
- `penalty_won` and `penalty_conceded` appear in per-player breakdowns and session totals

### Migration
- One migration file adding the two enum values
- TypeScript types regenerated via `supabase gen types typescript` after migration

---

## Feature 3: Platform Admin Can Delete Groups

### Location
- Delete button added to the page header of `/admin/groups/[id]/page.tsx`
- Styled as a destructive action (red, outlined)

### Confirmation Flow
- Clicking opens a shadcn `AlertDialog`
- Warning: "This will permanently delete [group name] and all associated members, game stats, and invitations. This cannot be undone."
- Text input: user must type the group name exactly to enable the confirm button
- Buttons: "Cancel" and "Delete Group" (destructive)

### Server Action: `deleteGroup(groupId)`
- Lives in the groups actions file
- Server-side check: caller must be platform admin (`role === 'admin'`)
- Deletes the group row — Postgres `ON DELETE CASCADE` handles child records:
  - `group_invitations`
  - `game_stat_sessions` → `game_stat_events`
- On success: redirects to `/admin`
- Hard delete — no soft delete / archiving

### RLS
- Existing RLS policy already permits platform admin to delete groups — no RLS changes needed

---

## Feature 4: Platform Admin Can Set Per-Club Groups Limit

### Schema
- New migration:
  - Adds nullable `max_groups` integer column to `clubs` table (null = platform default of 5)
  - Drops the existing DB trigger that hard-caps groups at 5

### Platform Admin UI (`ClubSettingsForm.tsx`)
- New "Max Groups" number input field added directly below the existing "Max Members" field
- Same pattern and styling as `max_members`
- Blank input = default (5); any positive integer = per-club override
- Saved via the existing club settings Server Action

### Enforcement (`createGroup()` in `groups/actions.ts`)
- Replaces the DB trigger check with an explicit app-level check:
  1. Fetch the club's current group count and `max_groups` value
  2. Compare against `max_groups ?? 5`
  3. If limit reached, return error: "Your club has reached its group limit. Contact your administrator to increase it."

### Club Admin Visibility (`ClubAdminPanel.tsx`)
- Read-only stat showing current groups used vs. limit (e.g. "3 / 5 groups")
- Same display pattern as member count — club admins can see their headroom without accessing platform admin settings

---

## Files Affected

| Feature | Files |
|---------|-------|
| Contact page | `web/src/app/contact/page.tsx` (new), `web/src/app/contact/actions.ts` (new), `web/src/components/app-sidebar.tsx` |
| Penalties | `web/supabase/migrations/0XX_penalty_stats.sql` (new), `web/src/app/(app)/groups/[id]/game-stats/[sessionId]/GameStatsClient.tsx` |
| Delete group | `web/src/app/(app)/admin/groups/[id]/page.tsx`, `web/src/app/(app)/groups/actions.ts` |
| Groups limit | `web/supabase/migrations/0XX_club_max_groups.sql` (new), `web/src/app/(app)/admin/clubs/[id]/ClubSettingsForm.tsx`, `web/src/app/(app)/groups/actions.ts`, `web/src/app/(app)/clubs/ClubAdminPanel.tsx` |

---

## Out of Scope

- Contact form spam protection (can be added later with Turnstile/hCaptcha)
- Soft delete / group archiving
- Penalty categories beyond won/conceded
- Self-serve groups limit increase by club admins (platform admin only)
