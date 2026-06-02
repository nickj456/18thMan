# Design: Multi-Match Team Progression View

**Date:** 2026-06-02  
**Branch:** main  
**Status:** APPROVED  
**Supersedes:** ~/.gstack/projects/nickj456-18thMan/nickj-main-design-20260602-210257.md

---

## Problem Statement

Nick and Jack Burns each use 18th Man Analyst (Electron app) to record match events per player. Sessions are uploaded from the Electron app directly to Supabase. Currently there is no web surface to aggregate those sessions — no way to see how a player's tackle rate changed across 5 games, which stats the team consistently underperforms, or compare two matches side by side.

This feature adds a dedicated Match Analysis section to the 18th Man web platform that reads uploaded sessions and presents team and individual player progression across matches.

---

## Data Flow

```
Electron app (records stats)
  → uploads to Supabase match_sessions table
  → 18th Man web reads match_sessions
  → displays Team Report + Player Report Cards
```

The Electron app upload mechanism is a **separate ticket**. This spec covers:
1. The `match_sessions` Supabase migration (`068_match_sessions.sql`)
2. The `/analyst/progression` web page

---

## Data Model

### New table: `match_sessions`

```sql
create table public.match_sessions (
  id               uuid primary key default gen_random_uuid(),
  analyst_id       uuid not null references public.profiles(id),
  club_id          uuid not null references public.clubs(id),
  opposition       text,
  match_date       date,
  our_score        integer,
  opp_score        integer,
  session_name     text,
  players          jsonb not null default '[]',
  events           jsonb not null default '[]',
  uploaded_at      timestamptz default now(),
  local_session_id text
);
```

**Note:** Uses `club_id uuid references clubs(id)` — not the legacy `profiles.club` text field. This is consistent with all post-migration RLS patterns in the codebase.

**JSONB shapes:**
- `players`: `[{ name: string, number: number, isOpposition: boolean }]`
- `events`: `[{ type: string, playerName: string, playerNumber: number, timestamp: number, half: 1 | 2 }]`

`local_session_id` stores the Electron app's local file ID for deduplication on re-upload.

### RLS Policies

```sql
-- Analysts insert sessions for their own club
create policy "ms_insert"
  on public.match_sessions for insert
  to authenticated
  with check (
    analyst_id = auth.uid()
    and club_id = (select club_id from public.profiles where id = auth.uid())
  );

-- Club members read sessions for their club
create policy "ms_select"
  on public.match_sessions for select
  to authenticated
  using (
    club_id = (select club_id from public.profiles where id = auth.uid())
  );

-- Admins read all
create policy "ms_select_admin"
  on public.match_sessions for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Analysts update/delete their own sessions
create policy "ms_update"
  on public.match_sessions for update
  to authenticated
  using (analyst_id = auth.uid());

create policy "ms_delete"
  on public.match_sessions for delete
  to authenticated
  using (
    analyst_id = auth.uid()
    or (select role from public.profiles where id = auth.uid()) = 'admin'
  );
```

---

## Web Route: `/analyst/progression`

### Access

- Roles: `coach` or `admin`
- Requires `profile.club_id` to be set — redirect to `/clubs` if not
- Added to sidebar under "Main" nav (coach + admin only)

### Page Structure

```
/analyst/progression
├── [sticky] Match Selector bar
│     Multi-select cards — toggle matches in/out of all analysis
│     Compare mode toggle — activates A/B pick for comparison table
│
└── [tabs]
    ├── Team Report
    │     ├── Side-by-side comparison table (compare mode only)
    │     └── Weakness heatmap (all included matches)
    │
    └── Report Cards
          └── Player cards (players in 2+ included sessions)
                ├── Mini recharts line chart per stat (x = match, y = count)
                └── Stat summary table (avg / best / worst / trend)
```

### File Structure

```
web/src/app/(app)/analyst/
  progression/
    page.tsx                        — server component, fetches sessions + profile
    ProgressionClient.tsx           — 'use client', owns match selector + tab state
    components/
      MatchSelectorBar.tsx          — sticky multi-select + compare mode toggle
      TeamReportTab.tsx             — comparison table + heatmap
      ComparisonTable.tsx           — stat rows, A/B columns, delta column
      WeaknessHeatmap.tsx           — stat × match grid, concern row
      ReportCardsTab.tsx            — player grid + export controls
      PlayerReportCard.tsx          — sparkline charts + stat table
      ExportPanel.tsx               — match/player/section selectors + CSV/PDF buttons
```

---

## Component Details

### Match Selector Bar

- Horizontal scroll of match cards ordered by `match_date` ascending
- Each card shows: opposition, date, score (`our_score – opp_score`), event count, analyst display name
- States: included (default, white border), excluded (dimmed), A-selected (orange), B-selected (green)
- Compare mode toggle: when on, the next two clicked cards become A and B
- Selected/excluded state stored in `ProgressionClient` via `useState` — URL search params for shareability (`?included=id1,id2&a=id1&b=id2`)

### Team Report Tab

**Comparison table** (only shown when compare mode is on and 2 matches selected):
- Rows: one per stat type
- Columns: Stat label | Match A count | Match B count | Δ
- Delta: stat-aware polarity — `carry`, `tackle`, `set_completion`, `penalty_won` = positive (more = good). `penalty_conceded` = negative (more = bad). Green/red arrows follow polarity.
- Filterable by player via a dropdown (defaults to "Team total")

**Weakness heatmap**:
- Rows: stat types. Columns: included matches (excluded matches greyed out, still shown for context).
- Cell colour: green (above average for that stat across included matches) → red (below average). Computed per stat, normalised across included matches only.
- Footer row: "⚠ Concern" — flags stats that are red in 3+ of the last 5 included matches.

### Report Cards Tab

**Player identity matching**: `{ name.trim().toLowerCase(), number }` pair across sessions. Name/number mismatches flagged with a yellow warning badge rather than silently merged.

Each player card shows:
- Jersey number + display name + "N of M matches" count
- Warning badge if any stat declines 3+ consecutive included matches
- Mini sparkline chart per stat (recharts `LineChart`, one line per stat, x = match date label, y = event count). Uses recharts installed via shadcn charts.
- Stat table: avg per match | best match (score + opponent) | worst match | trend arrow (↑↑ / ↑ / → / ↓ / ↓↓↓)

Opposition players (`isOpposition: true`) excluded from report cards.

### Export Panel

Triggered by an "Export" button in the Report Cards tab toolbar. Opens a drawer/sheet with:
1. **Matches**: checkboxes mirroring the selector bar (pre-filled from current selection)
2. **Players**: checkboxes for each player with a card (pre-filled: all selected)
3. **Sections**: checkboxes — "Team Report", "Report Cards"
4. **Format**: CSV or PDF
5. Export button

**CSV export**: client-side, generates one sheet per selected section. Team Report sheet has stat × match table. Report Cards sheet has one row per player per stat.

**PDF export**: server action using `@react-pdf/renderer` (already in `package.json`). Renders selected sections with 18th Man branding, logo, club name, export date.

---

## Stat Polarity Map

Defined as a constant used by both the delta column and heatmap:

```ts
const STAT_POLARITY: Record<string, 'positive' | 'negative'> = {
  carry: 'positive',
  tackle: 'positive',
  set_completion: 'positive',
  penalty_won: 'positive',
  penalty_conceded: 'negative',
}
```

Any stat type not in this map defaults to `'positive'`.

---

## New Types

```ts
export interface MatchSession {
  id: string
  analyst_id: string
  club_id: string
  opposition: string | null
  match_date: string | null
  our_score: number | null
  opp_score: number | null
  session_name: string | null
  players: SessionPlayer[]
  events: SessionEvent[]
  uploaded_at: string
  local_session_id: string | null
}

export interface SessionPlayer {
  name: string
  number: number
  isOpposition: boolean
}

export interface SessionEvent {
  type: string
  playerName: string
  playerNumber: number
  timestamp: number
  half: 1 | 2
}

export interface ResolvedPlayer {
  key: string          // `${name.trim().toLowerCase()}::${number}`
  name: string
  number: number
  numberMismatch: boolean  // same name, multiple jersey numbers across sessions
  sessionCount: number
}
```

---

## Sidebar Nav

Add to `app-sidebar.tsx` under the Main group, visible to `coach` and `admin` roles:

```tsx
{ href: '/analyst/progression', label: 'Match Analysis', icon: TrendingUp }
```

---

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Chart library | recharts via shadcn charts | No charting lib installed; shadcn charts is the canonical choice for this stack |
| PDF | `@react-pdf/renderer` | Already in `package.json` |
| CSV | Client-side blob download | No server needed for tabular data |
| `club_id` vs `club` text | `club_id` FK | Consistent with all post-migration RLS; legacy `club` text field is deprecated |
| State management | URL search params (`?included=...&a=...&b=...`) | Sharable links; no extra state lib needed |

---

## Open Questions (deferred)

1. **Electron upload mechanism**: The `match_sessions` RLS allows insert from the Electron app using the user's Supabase auth session. The actual "Upload" UI in the Electron app is a separate ticket.
2. **Re-upload / update**: If an analyst re-uploads a session with more events, should it replace the existing row (matched on `local_session_id`) or create a new one? Recommend replace — defer to Electron app ticket.
3. **Opposition player heatmap**: `isOpposition: true` players are excluded from report cards. Should they appear in the team heatmap? Currently excluded — revisit if needed.
4. **Teams table**: Using `club_id` for grouping works for now. If coaches join multiple clubs, a proper `teams` table with membership will be needed.

---

## Success Criteria

- Analyst uploads a session from the Electron app → appears in the Match Selector bar within one page refresh
- Two analysts from the same club each upload a session → both sessions appear in the same Match Selector bar
- Excluding a match from the selector → heatmap recalculates, excluded match greyed out
- Export to PDF → branded document with selected sections and players
- Player with 3-match declining stat → warning badge appears on their report card
