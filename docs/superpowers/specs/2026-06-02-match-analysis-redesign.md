# Design: Match Analysis Page Redesign

**Date:** 2026-06-02  
**Branch:** main  
**Status:** APPROVED  
**Supersedes:** The existing `/analyst/progression` implementation built in the initial feature ticket.

---

## Problem Statement

The initial Match Analysis page is functional but reads as a developer tool — small text, flat zinc cards, a heatmap grid that's hard to scan on small screens, and no intelligence layer. Coaches need a premium sports analytics surface: immediate visual clarity on team and player performance, AI-generated coaching observations they can act on, and a rich player dossier that opens without leaving the page.

---

## Design Direction

**Coaching Intelligence Dashboard** — data-forward, premium dark aesthetic. Inspired by professional sports analytics products. Uses the 18th Man brand (zinc-950 base, `#e8560a` orange accent, Geist Sans) pushed harder: gradient overlays on match cards, large bold numerics, colour-coded performance signals throughout.

---

## Page Layout

Two-column layout on desktop (≥1024px), single column stacked on mobile.

```
┌─────────────────────────────────────────────┐
│  Hero header (title + club + season)        │
├─────────────────────────────────────────────┤
│  Match selector bar (sticky)                │
├─────────────────────────────────────────────┤
│  Key numbers strip (4 headline stats)       │
├───────────────────────────┬─────────────────┤
│  AI Insight card          │  Season record  │
│  Team Concerns panel      │  Top tacklers   │
│  Player table             │  Top carriers   │
└───────────────────────────┴─────────────────┘
```

Player dossier opens as a right-side slide-over panel (560px wide on desktop, full-screen on mobile) triggered by clicking any player row. A backdrop overlay dims the page behind it.

---

## Component Specs

### Match Selector Bar

Horizontal scroll of match cards. Sticky at `top-12` (below the app header).

Each card shows:
- Opposition name (truncated at 1 line)
- Date (e.g. "17 May 2026") and location ("Home" / "Away")
- Score — large bold typography when available; `—` when not recorded
- WIN / LOSS / NO SCORE badge (pill in top-right)
- Event count and player count in the footer

Card visual states:
- **Default (included):** `#0d0d10` bg, `#1e1e21` border
- **Excluded:** dimmed to 35% opacity
- **Selected A:** `#e8560a` border + subtle orange gradient overlay, "A" label
- **Selected B:** green border + subtle green gradient overlay, "B" label
- **Win card:** faint green gradient overlay regardless of A/B state

"Compare mode" toggle in top-right of the bar. When active, clicking cards assigns A then B. An "Upload" placeholder card at the end (dashed border) — no functionality in this ticket.

---

### Key Numbers Strip

4 cards in a `grid-cols-4` row (2 cols on mobile).

| # | Stat | Colour | Trend line |
|---|------|--------|-----------|
| 1 | Total events | Orange | "N matches tracked" |
| 2 | Avg tackles/match | Green | ↑/↓ vs previous |
| 3 | Total errors | Red | "Persistent concern" if 3+ matches |
| 4 | Best scoreline | White | Opponent name |

Each card: large `font-size:36px font-weight:900` value, coloured bottom accent line (2px gradient), label below, trend note in matching colour.

---

### AI Insight Card

Full-width card spanning the left column. Contains:

- **Badge:** pulsing orange dot + "AI Coaching Insight" label
- **Body text:** 2–3 sentences highlighting the team's strongest performer, main concern, and one named player callout. Rendered as plain text (not markdown).
- **"Generate Insights" button:** Right-aligned. On click, calls the `generateTeamInsight` server action, streams the response into the card body. Shows a spinner while generating. Once complete, saves to `progression_insights`.
- **Stale indicator:** If the set of included session IDs has changed since last generation, a muted "⚠ Data changed — regenerate?" note appears below the text.

The card has a dark orange radial gradient glow in the top-right corner and a subtle orange left-border or bottom accent.

---

### Team Concerns Panel

Replaces the heatmap grid entirely.

Each stat shown as a bar row:
- Stat name (left)
- Gradient fill bar (width proportional to volume relative to the "worst" stat)
- Raw numbers ("18 total · 6.0/match") right-aligned
- Badge: `⚠ All 3 matches` (red), `2 of 3 matches` (orange), `On track` (green), `Strong` (green)

Sorted: concern stats first (red → orange → green). Maximum 6 rows. The bar fill uses a gradient:
- Red → orange for concern stats
- Green → teal for positive stats

---

### Player Table

Full-width in the left column, below the concerns panel.

Columns: Player (number + name + match count + decline badge if applicable) | Carries avg | Tackles avg | Errors avg | Trend arrow | Open indicator (→)

Rows sorted by total involvement (carries + tackles) descending. Shows top 10 by default; "Show all N players" link below.

Decline badge: small inline red pill `↓ [stat] declining` shown beneath the player name if any stat has 3+ consecutive drops.

Trend arrow: `↑↑` (green, up-strong), `↑` (green), `→` (zinc), `↓` (red), `↓↓` (red).

Entire row is clickable — cursor pointer, subtle bg highlight on hover, opens the player dossier.

---

### Right Sidebar

Three stacked cards:

**Season Record** — list of all sessions with opponent, date, and score. Win scores in green, unrecorded scores as `—`.

**Top Tacklers** — top 3 players by total tackle count across included sessions. Jersey circle, name, stat label, value.

**Top Carriers** — same pattern for carry count.

Sidebar cards recalculate reactively when included sessions change in the selector bar.

---

### Player Dossier (Slide-Over)

560px wide on desktop, full-screen drawer on mobile. Slides in from the right over a blurred backdrop.

**Hero section** (dark gradient bg):
- Large ghost jersey number in bottom-right (decorative, very low opacity)
- Jersey number label, player name, match count
- Pill badges: decline warnings (red), strengths (green), involvement (orange)
- Close button (×) top-right

**Performance Chart section:**
- Bar chart — one group per match, bars per stat type. X-axis: short match label ("Clockface · 17 May"). Y-axis: count. Uses recharts `BarChart` with `ResponsiveContainer`.
- Legend below (colour-coded per stat)

**Stat Breakdown section:**
- 2×2 grid of metric tiles: Avg per match, Best match, Errors avg, Trend summary
- Each tile: large number, label, trend direction coloured text

**AI Coaching Observation section:**
- Same on-demand pattern as team insight but scoped to this player
- Prompt includes player's stat values across all included sessions
- "Generate" button, streams in, saved to `progression_insights` with `scope = player.key`

---

## AI Insights — Technical Design

### Database

```sql
create table public.progression_insights (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.clubs(id),
  scope            text not null,  -- 'team' or player key e.g. 'stan martin::8'
  session_ids_hash text not null,  -- SHA-256 of sorted included session IDs
  content          text not null,
  generated_at     timestamptz not null default now(),
  unique (club_id, scope, session_ids_hash)
);
```

### Server Actions

**`generateTeamInsight(sessionIds: string[])`**
- Auth + coach/admin role check
- Aggregates team stats across sessions (countEvents per session)
- Builds a prompt: stat totals, per-match breakdown, top performers, concerns
- Streams from `anthropic/claude-haiku-4-5` via AI Gateway (fast + cheap for this use case)
- Saves completed text to `progression_insights`
- Returns the stream to the client

**`generatePlayerInsight(playerKey: string, sessionIds: string[])`**
- Same auth check
- Aggregates player stats across sessions (computePlayerStats)
- Includes trend direction, best/worst matches
- Same model + save pattern

### Stale Detection

Client computes `btoa(sortedSessionIds.join(','))` as a lightweight hash. If the stored insight's `session_ids_hash` doesn't match the current selection, the stale indicator shows.

### Prompt Design (Team)

```
You are an assistant rugby league coach. Analyse this team's performance data and provide a 2-3 sentence insight highlighting: (1) the team's strongest consistent performer, (2) the most pressing concern, and (3) one specific player callout. Be direct and actionable. Use plain English — no markdown, no bullet points.

Team: [club name]
Matches: [N] — [opponent list]
Stats:
- Tackles: [total] total, [avg] per match
- Carries: [total] total, [avg] per match  
- Errors: [total] total, [avg] per match — [trend]
- Tries: [total]
Top tackler: [name] ([N] total)
Top carrier: [name] ([N] total)
Concern: [stat] red in [N] of last [M] matches
```

---

## File Changes

| Action | File |
|--------|------|
| CREATE | `web/supabase/migrations/069_progression_insights.sql` |
| MODIFY | `web/src/lib/supabase/types.ts` — add `ProgressionInsight` type |
| MODIFY | `web/src/app/(app)/analyst/progression/page.tsx` — fetch insights, pass to client |
| REPLACE | `web/src/app/(app)/analyst/progression/ProgressionClient.tsx` — new layout |
| REPLACE | `web/src/app/(app)/analyst/progression/components/MatchSelectorBar.tsx` — premium cards |
| CREATE | `web/src/app/(app)/analyst/progression/components/KeyNumbers.tsx` |
| CREATE | `web/src/app/(app)/analyst/progression/components/AiInsightCard.tsx` |
| CREATE | `web/src/app/(app)/analyst/progression/components/ConcernsPanel.tsx` |
| REPLACE | `web/src/app/(app)/analyst/progression/components/TeamReportTab.tsx` — removed (logic absorbed into ProgressionClient) |
| REPLACE | `web/src/app/(app)/analyst/progression/components/WeaknessHeatmap.tsx` — replaced by ConcernsPanel |
| REPLACE | `web/src/app/(app)/analyst/progression/components/PlayerReportCard.tsx` — replaced by PlayerDossier slide-over |
| CREATE | `web/src/app/(app)/analyst/progression/components/PlayerDossier.tsx` |
| REPLACE | `web/src/app/(app)/analyst/progression/components/ReportCardsTab.tsx` — replaced by PlayerTable |
| CREATE | `web/src/app/(app)/analyst/progression/components/PlayerTable.tsx` |
| CREATE | `web/src/app/(app)/analyst/progression/components/Sidebar.tsx` |
| REPLACE | `web/src/app/(app)/analyst/progression/actions.tsx` — add generateTeamInsight, generatePlayerInsight |

The `ExportPanel.tsx` is **retained unchanged**. The export button moves to the top of the PlayerTable toolbar.

The `ComparisonTable.tsx` is **retained and conditionally rendered**: when compare mode is active and both Match A and B are selected, the comparison table renders between the Key Numbers strip and the AI Insight card (full-width, collapsible). When compare mode is off it is hidden.

---

## What's Removed

- **Tab navigation** (Team Report / Report Cards) — everything lives on one scrolling page
- **Heatmap grid** — replaced by ranked concern bars
- **Grid of player cards** — replaced by the compact sortable table + slide-over dossier

---

## Success Criteria

- Page loads and shows all 3 matches in the selector with correct WIN badge on Clockface match
- Clicking "Generate Insights" produces a 2–3 sentence team insight within 5 seconds, saves it, shows it on next page load without regenerating
- Clicking a player row opens the dossier slide-over with their bar chart and stats
- Stale indicator appears when you include/exclude a match after generating insights
- Sidebar leaderboards update instantly when matches are included/excluded
- Export button still works (CSV + PDF)
