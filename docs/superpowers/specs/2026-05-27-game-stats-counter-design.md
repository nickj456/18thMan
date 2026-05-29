# Game Stats Counter — Design Spec

**Date:** 2026-05-27
**Status:** Approved

---

## Overview

A live sideline game stats counter for rugby league coaches. Allows a group member to tap-count carries and tackles per player, and track set completion by half, during a match. Stats are persisted and visible to all group members in real-time. Exportable as a PDF and shareable via WhatsApp/link.

---

## Access & Gating

- **Create:** Paid members only (`club` subscription tier or active trial). Role must be `coach` or `admin`.
- **View (review mode):** All members of the coaching group — read-only, real-time.
- Access check is enforced server-side via Supabase RLS and the existing `effective_tier()` function.

---

## Feature Entry Point

Located at `/groups/[id]/game-stats` — a new sub-route within the coaching group area, consistent with `/groups/[id]/squad` and `/groups/[id]/blocks`.

A "Game Stats" link is added to the group detail page (`/groups/[id]/page.tsx`).

---

## Create Screen

Route: `/groups/[id]/game-stats/new`

- Coach selects from their group's existing **match records** (from the `matches` table — opponent, date, location).
- On submit, a `game_stat_sessions` row is created (see schema below).
- Players are loaded automatically from the `players` table for the group — no manual entry.
- After creation, redirects directly to the tally screen for that session.

---

## Tally Screen (Live Entry)

Route: `/groups/[id]/game-stats/[sessionId]`

A `'use client'` component. Layout: summary bar → mode toggle → tab bar → active section content.

### Mode toggle
Two modes on one device — **TAP** (default) and **REVIEW** — toggled with a pill toggle at the top.

### Summary bar (always visible in both modes)
Three cells showing live team totals:
- **Carries** (orange) — total across all players
- **Tackles** (blue) — total across all players
- **Sets** (green) — completed/total (e.g. `7/10`)

### TAP mode — Carries tab
- List of all squad players, alphabetical by default.
- Each row: player name | count | `↩` undo button | `+` tap button.
- `+` inserts a `game_stat_events` row (`stat_type = 'carry'`).
- `↩` deletes the most recent event for that player + stat type (soft undo — only the creator can undo their own taps).
- Count shown is derived from `COUNT(*)` of that player's carry events for the session.

### TAP mode — Tackles tab
- Identical layout to Carries, `stat_type = 'tackle'`.

### TAP mode — Sets tab
- **Half toggle** at top: `1st Half` / `2nd Half` (controls which half new events are attributed to).
- Two large buttons: **YES — COMPLETE ✓** (green) and **NO — INCOMPLETE ✗** (red).
- Each tap inserts a `game_stat_events` row with `stat_type = 'set_completion'`, `half = 1|2`, `completed = true|false`, no `player_id`.
- Running tally: Complete count | Incomplete count | Completion rate (%).
- **Last 5 sets** visual — row of coloured chips (green tick / red cross) showing the most recent 5 taps in sequence.
- No per-set undo button here; instead a small "Undo last" text link removes the most recent set event.

### REVIEW mode
- Same summary bar.
- Three sections stacked: Carries (sorted desc by count), Tackles (sorted desc by count), Set Completion.
- Set Completion shows 1st half and 2nd half side-by-side: `completed/total` for each.
- Updates in real-time via Supabase Realtime subscription on `game_stat_events` for the session.
- **Share bar** pinned to bottom: `PDF` | `WhatsApp` | `Copy Link`.

---

## Real-time Sync

- Supabase Realtime subscription on `game_stat_events` filtered by `session_id`.
- Review mode subscribes on mount, unsubscribes on unmount.
- TAP mode also subscribes so the summary bar totals stay accurate.
- Other group members viewing the review URL on their own devices see the same live updates.

---

## Database Schema

### New table: `game_stat_sessions`

```sql
create table public.game_stat_sessions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.coaching_groups(id) on delete cascade,
  match_id    uuid not null references public.matches(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  unique (match_id)  -- one stats session per match
);
```

### New table: `game_stat_events`

```sql
create type public.stat_type as enum ('carry', 'tackle', 'set_completion');

create table public.game_stat_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.game_stat_sessions(id) on delete cascade,
  player_id   uuid references public.players(id) on delete cascade,  -- null for set_completion
  stat_type   public.stat_type not null,
  half        smallint not null default 1 check (half in (1, 2)),
  completed   boolean,  -- only used for set_completion events
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create index game_stat_events_session_id_idx on public.game_stat_events(session_id);
create index game_stat_events_player_id_idx  on public.game_stat_events(player_id);
```

### RLS

- `game_stat_sessions`: group club members can SELECT; coach/admin can INSERT; creator or admin can DELETE.
- `game_stat_events`: group club members can SELECT; coach/admin can INSERT their own; creator or admin can DELETE their own (undo).

---

## PDF Export

Uses the existing `@react-pdf/renderer` setup with the 18th Man palette (`#e8560a` orange, `#111827` dark, Helvetica).

Layout:
- Cover: match details (opponent, date, group name), 18th Man branding.
- Carries table: player name | carry count, sorted descending.
- Tackles table: player name | tackle count, sorted descending.
- Set Completion summary: 1st half and 2nd half — complete / incomplete / rate %.

PDF is generated server-side via a Route Handler at `/api/game-stats/[sessionId]/pdf`.

---

## WhatsApp / Share

- **WhatsApp:** `https://wa.me/?text=` deep-link with a pre-formatted text summary and the session review URL.
- **Copy Link:** copies the `/groups/[id]/game-stats/[sessionId]` URL to clipboard. Recipient must be a group member to view.

---

## Routes Summary

| Route | Description |
|---|---|
| `/groups/[id]/game-stats` | List of stat sessions for this group |
| `/groups/[id]/game-stats/new` | Create session (select match) |
| `/groups/[id]/game-stats/[sessionId]` | Tally + Review screen |
| `/api/game-stats/[sessionId]/pdf` | PDF download route handler |

---

## Out of Scope

- Multiple simultaneous tappers (single-user tapping model; undo only removes the creator's own last event)
- Editing historical sessions after the match
- Push notifications for review viewers
