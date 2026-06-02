# Match Analysis — Team Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/analyst/progression` page on the 18th Man web platform that reads match sessions uploaded by the Analyst Electron app from Supabase and shows a team report (side-by-side comparison + weakness heatmap) and individual player report cards (sparklines + stat tables) with CSV/PDF export.

**Architecture:** Server component fetches all `match_sessions` for the user's club and passes them to a client component that owns URL-based selection state. All data aggregation is pure TypeScript in `lib/match-analysis/aggregate.ts`. Charts use recharts via shadcn. PDF export is a server action using `@react-pdf/renderer`.

**Tech Stack:** Next.js 16 App Router, Supabase server client, shadcn/ui (Tabs, Sheet, Checkbox, Select — all installed), recharts via shadcn chart (install in Task 4), `@react-pdf/renderer` (already in package.json), Tailwind v4, TypeScript strict.

---

## File Map

| Status | Path | Purpose |
|--------|------|---------|
| CREATE | `web/supabase/migrations/068_match_sessions.sql` | New table + RLS |
| MODIFY | `web/src/lib/supabase/types.ts` | Add MatchSession, SessionPlayer, SessionEvent, ResolvedPlayer, MatchSessionWithAnalyst types |
| CREATE | `web/src/lib/match-analysis/aggregate.ts` | Pure aggregation functions (no side effects) |
| MODIFY | `web/src/components/app-sidebar.tsx` | Add Match Analysis nav item (coach + admin) |
| CREATE | `web/src/app/(app)/analyst/progression/page.tsx` | Server component — auth, access gate, data fetch |
| CREATE | `web/src/app/(app)/analyst/progression/ProgressionClient.tsx` | `'use client'` — URL state, tab routing |
| CREATE | `web/src/app/(app)/analyst/progression/components/MatchSelectorBar.tsx` | Horizontal match cards with include/exclude + compare mode |
| CREATE | `web/src/app/(app)/analyst/progression/components/ComparisonTable.tsx` | A vs B stat table with delta column |
| CREATE | `web/src/app/(app)/analyst/progression/components/WeaknessHeatmap.tsx` | Stat × match heatmap grid |
| CREATE | `web/src/app/(app)/analyst/progression/components/TeamReportTab.tsx` | Wraps ComparisonTable + WeaknessHeatmap |
| CREATE | `web/src/app/(app)/analyst/progression/components/PlayerReportCard.tsx` | Sparklines + stat table for one player |
| CREATE | `web/src/app/(app)/analyst/progression/components/ReportCardsTab.tsx` | Player grid + export button |
| CREATE | `web/src/app/(app)/analyst/progression/components/ExportPanel.tsx` | Sheet with match/player/section selectors + CSV/PDF |
| CREATE | `web/src/app/(app)/analyst/progression/actions.ts` | `'use server'` — PDF generation server action |
| CREATE | `web/src/app/(app)/analyst/progression/ProgressionPDF.tsx` | `@react-pdf/renderer` document (no charts — tables only) |

---

## Task 1: Supabase Migration

**Files:**
- Create: `web/supabase/migrations/068_match_sessions.sql`

- [ ] **Step 1: Create migration file**

```sql
-- 068_match_sessions.sql
-- Match sessions uploaded from the 18th Man Analyst Electron app

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
  uploaded_at      timestamptz not null default now(),
  local_session_id text,
  unique (club_id, local_session_id)
);

create index match_sessions_club_id_idx      on public.match_sessions(club_id);
create index match_sessions_match_date_idx   on public.match_sessions(match_date);
create index match_sessions_analyst_id_idx   on public.match_sessions(analyst_id);

alter table public.match_sessions enable row level security;

-- Analysts insert sessions for their own club
create policy "ms_insert"
  on public.match_sessions for insert
  to authenticated
  with check (
    analyst_id = auth.uid()
    and club_id = (select club_id from public.profiles where id = auth.uid())
  );

-- Club members read all sessions for their club
create policy "ms_select"
  on public.match_sessions for select
  to authenticated
  using (
    club_id = (select club_id from public.profiles where id = auth.uid())
  );

-- Admins read all sessions
create policy "ms_select_admin"
  on public.match_sessions for select
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Analysts can update their own sessions
create policy "ms_update"
  on public.match_sessions for update
  to authenticated
  using (analyst_id = auth.uid())
  with check (analyst_id = auth.uid());

-- Analysts and admins can delete sessions
create policy "ms_delete"
  on public.match_sessions for delete
  to authenticated
  using (
    analyst_id = auth.uid()
    or (select role from public.profiles where id = auth.uid()) = 'admin'
  );
```

- [ ] **Step 2: Commit**

```bash
git add web/supabase/migrations/068_match_sessions.sql
git commit -m "feat: add match_sessions migration"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `web/src/lib/supabase/types.ts`

- [ ] **Step 1: Append new types to end of types.ts**

```ts
// ── Match Analysis ─────────────────────────────────────────────────────────────

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

export interface MatchSessionWithAnalyst extends MatchSession {
  analyst: { display_name: string | null } | null
}

export interface ResolvedPlayer {
  key: string             // `${name.toLowerCase()}::${primaryNumber}`
  name: string
  primaryNumber: number
  allNumbers: number[]
  numberMismatch: boolean
  sessionCount: number
}

export type TrendDirection = 'up-strong' | 'up' | 'flat' | 'down' | 'down-strong'

export interface PlayerStatSummary {
  statType: string
  values: number[]           // one per included session (in date order)
  avg: number
  best: number
  worst: number
  trend: TrendDirection
  hasDecline: boolean        // 3+ consecutive drops
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors on the new types.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/supabase/types.ts
git commit -m "feat: add match analysis types"
```

---

## Task 3: Aggregation Library

**Files:**
- Create: `web/src/lib/match-analysis/aggregate.ts`

- [ ] **Step 1: Create the aggregation module**

```ts
// web/src/lib/match-analysis/aggregate.ts
import type {
  MatchSession,
  MatchSessionWithAnalyst,
  ResolvedPlayer,
  SessionEvent,
  TrendDirection,
  PlayerStatSummary,
} from '@/lib/supabase/types'

// ── Stat polarity ──────────────────────────────────────────────────────────────

export const STAT_POLARITY: Record<string, 'positive' | 'negative'> = {
  carry:             'positive',
  tackle:            'positive',
  set_completion:    'positive',
  penalty_won:       'positive',
  penalty_conceded:  'negative',
}

export function getPolarity(statType: string): 'positive' | 'negative' {
  return STAT_POLARITY[statType] ?? 'positive'
}

// ── Player keys ────────────────────────────────────────────────────────────────

export function buildPlayerKey(name: string, number: number): string {
  return `${name.trim().toLowerCase()}::${number}`
}

// ── Stat counting ──────────────────────────────────────────────────────────────

export function countEvents(
  events: SessionEvent[],
  playerKey?: string,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const ev of events) {
    if (playerKey) {
      const key = buildPlayerKey(ev.playerName, ev.playerNumber)
      if (key !== playerKey) continue
    }
    counts[ev.type] = (counts[ev.type] ?? 0) + 1
  }
  return counts
}

// ── Stat types across sessions ─────────────────────────────────────────────────

export function getAllStatTypes(sessions: MatchSession[]): string[] {
  const types = new Set<string>()
  for (const s of sessions) {
    for (const ev of s.events) {
      types.add(ev.type)
    }
  }
  return Array.from(types).sort()
}

// ── Player identity resolution ─────────────────────────────────────────────────

export function resolvePlayers(sessions: MatchSession[]): ResolvedPlayer[] {
  const byNormName = new Map<
    string,
    { displayName: string; numbers: Set<number>; sessionIds: Set<string> }
  >()

  for (const session of sessions) {
    for (const p of session.players) {
      if (p.isOpposition) continue
      const norm = p.name.trim().toLowerCase()
      if (!byNormName.has(norm)) {
        byNormName.set(norm, {
          displayName: p.name.trim(),
          numbers: new Set(),
          sessionIds: new Set(),
        })
      }
      const entry = byNormName.get(norm)!
      entry.numbers.add(p.number)
      entry.sessionIds.add(session.id)
    }
  }

  return Array.from(byNormName.values())
    .map(({ displayName, numbers, sessionIds }) => {
      const allNumbers = Array.from(numbers).sort((a, b) => a - b)
      return {
        key: buildPlayerKey(displayName, allNumbers[0]),
        name: displayName,
        primaryNumber: allNumbers[0],
        allNumbers,
        numberMismatch: allNumbers.length > 1,
        sessionCount: sessionIds.size,
      }
    })
    .sort((a, b) => a.primaryNumber - b.primaryNumber)
}

// ── Trend analysis ─────────────────────────────────────────────────────────────

export function detectConsecutiveDecline(values: number[]): boolean {
  if (values.length < 3) return false
  let streak = 0
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      streak++
      if (streak >= 2) return true // 3 values = 2 consecutive drops
    } else {
      streak = 0
    }
  }
  return false
}

export function computeTrend(values: number[]): TrendDirection {
  if (values.length < 2) return 'flat'
  const half = Math.ceil(values.length / 2)
  const firstHalf = values.slice(0, half)
  const lastHalf = values.slice(values.length - half)
  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const avgLast = lastHalf.reduce((a, b) => a + b, 0) / lastHalf.length
  const delta = avgLast - avgFirst
  const pct = avgFirst === 0 ? 0 : Math.abs(delta / avgFirst)
  if (delta > 0) return pct > 0.2 ? 'up-strong' : 'up'
  if (delta < 0) return pct > 0.2 ? 'down-strong' : 'down'
  return 'flat'
}

// ── Player stat summaries ──────────────────────────────────────────────────────

export function computePlayerStats(
  playerKey: string,
  sessions: MatchSession[],
  includedIds: string[],
  statTypes: string[],
): PlayerStatSummary[] {
  const includedSet = new Set(includedIds)
  const includedSessions = sessions
    .filter(s => includedSet.has(s.id))
    .sort((a, b) => (a.match_date ?? '').localeCompare(b.match_date ?? ''))

  return statTypes.map(statType => {
    const values = includedSessions.map(
      s => countEvents(s.events, playerKey)[statType] ?? 0,
    )
    const nonZero = values.filter(v => v > 0)
    return {
      statType,
      values,
      avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      best: nonZero.length ? Math.max(...values) : 0,
      worst: nonZero.length ? Math.min(...values) : 0,
      trend: computeTrend(values),
      hasDecline: detectConsecutiveDecline(values),
    }
  })
}

// ── Heatmap computation ────────────────────────────────────────────────────────

export interface HeatmapCell {
  sessionId: string
  statType: string
  value: number
  isAboveAverage: boolean
  isExcluded: boolean
}

export function computeHeatmap(
  sessions: MatchSessionWithAnalyst[],
  includedIds: string[],
  statTypes: string[],
): HeatmapCell[] {
  const includedSet = new Set(includedIds)
  const cells: HeatmapCell[] = []

  // Per-stat averages across included sessions only
  const statAverages: Record<string, number> = {}
  for (const statType of statTypes) {
    const includedValues = sessions
      .filter(s => includedSet.has(s.id))
      .map(s => countEvents(s.events)[statType] ?? 0)
    statAverages[statType] =
      includedValues.length
        ? includedValues.reduce((a, b) => a + b, 0) / includedValues.length
        : 0
  }

  for (const session of sessions) {
    const counts = countEvents(session.events)
    for (const statType of statTypes) {
      const value = counts[statType] ?? 0
      const avg = statAverages[statType] ?? 0
      const polarity = getPolarity(statType)
      const isAboveAverage =
        polarity === 'positive' ? value >= avg : value <= avg
      cells.push({
        sessionId: session.id,
        statType,
        value,
        isAboveAverage,
        isExcluded: !includedSet.has(session.id),
      })
    }
  }

  return cells
}

// ── CSV export ─────────────────────────────────────────────────────────────────

export function buildTeamReportCsv(
  sessions: MatchSessionWithAnalyst[],
  includedIds: string[],
  statTypes: string[],
): string {
  const includedSessions = sessions.filter(s => includedIds.includes(s.id))
  const header = [
    'Stat',
    ...includedSessions.map(
      s => `${s.opposition ?? 'Unknown'} (${s.match_date ?? '—'})`,
    ),
  ]
  const rows = statTypes.map(statType => {
    const cells = includedSessions.map(
      s => String(countEvents(s.events)[statType] ?? 0),
    )
    return [statType, ...cells]
  })
  return [header, ...rows].map(r => r.join(',')).join('\n')
}

export function buildReportCardsCsv(
  players: ResolvedPlayer[],
  selectedKeys: string[],
  sessions: MatchSession[],
  includedIds: string[],
  statTypes: string[],
): string {
  const header = ['Player', 'Jersey', 'Stat', 'Avg', 'Best', 'Worst', 'Trend']
  const rows: string[][] = []
  for (const player of players.filter(p => selectedKeys.includes(p.key))) {
    const stats = computePlayerStats(player.key, sessions, includedIds, statTypes)
    for (const s of stats) {
      rows.push([
        player.name,
        String(player.primaryNumber),
        s.statType,
        s.avg.toFixed(1),
        String(s.best),
        String(s.worst),
        s.trend,
      ])
    }
  }
  return [header, ...rows].map(r => r.join(',')).join('\n')
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/match-analysis/aggregate.ts
git commit -m "feat: add match analysis aggregation library"
```

---

## Task 4: Install recharts via shadcn charts

**Files:**
- Auto-created: `web/src/components/ui/chart.tsx`

- [ ] **Step 1: Install**

```bash
cd web && npx shadcn@latest add chart
```

When prompted, confirm overwrite if asked. This installs recharts and creates `src/components/ui/chart.tsx`.

- [ ] **Step 2: Verify**

```bash
cd web && npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ui/chart.tsx web/package.json web/package-lock.json
git commit -m "feat: install recharts via shadcn chart component"
```

---

## Task 5: Sidebar Navigation

**Files:**
- Modify: `web/src/components/app-sidebar.tsx`

- [ ] **Step 1: Add TrendingUp import to lucide-react imports**

In `app-sidebar.tsx`, find the lucide-react import block and add `TrendingUp`:

```ts
import {
  // ... existing icons ...
  TrendingUp,
} from 'lucide-react'
```

- [ ] **Step 2: Add nav item to navItems array**

The `navItems` array is visible to all roles. Match Analysis should only show to `coach` and `admin`. Add it as a conditional item in the JSX — find the section where the main nav items are rendered and add after the existing items in the `SidebarGroupContent`:

```tsx
// In AppSidebar, after the closing </SidebarMenu> of the main nav loop, still inside SidebarGroupContent:
{(role === 'coach' || role === 'admin') && (
  <SidebarMenuItem>
    <SidebarMenuButton
      isActive={pathname.startsWith('/analyst')}
      render={<Link href="/analyst/progression" onClick={closeMobile} />}
    >
      <TrendingUp className="size-4" />
      <span>Match Analysis</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

Place this inside the existing Main `SidebarGroupContent > SidebarMenu`, after the last `{navItems.map(...)}` block.

- [ ] **Step 3: Verify build compiles**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/app-sidebar.tsx
git commit -m "feat: add Match Analysis nav item for coach and admin"
```

---

## Task 6: Server Page + Access Gate

**Files:**
- Create: `web/src/app/(app)/analyst/progression/page.tsx`

- [ ] **Step 1: Create the server component**

```tsx
// web/src/app/(app)/analyst/progression/page.tsx
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProgressionClient } from './ProgressionClient'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

export const metadata = { title: 'Match Analysis — 18th Man' }

export default async function MatchProgressionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')
  if (!profile?.role || !['coach', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: sessions } = await supabase
    .from('match_sessions')
    .select('*, analyst:profiles!analyst_id(display_name)')
    .eq('club_id', profile.club_id)
    .order('match_date', { ascending: true }) as {
      data: MatchSessionWithAnalyst[] | null
    }

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-3 pb-6 border-b border-zinc-800">
        <div className="w-10 h-10 rounded-xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0">
          <TrendingUp size={18} className="text-[#e8560a]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Match Analysis</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Team progression and player report cards across uploaded sessions
          </p>
        </div>
      </div>

      {!sessions?.length ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <TrendingUp size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No match sessions uploaded yet.</p>
          <p className="text-xs text-zinc-600 max-w-xs">
            Upload sessions from the 18th Man Analyst app to start tracking team progression.
          </p>
        </div>
      ) : (
        <Suspense>
          <ProgressionClient sessions={sessions} />
        </Suspense>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(app)/analyst/progression/page.tsx
git commit -m "feat: add /analyst/progression server page with access gate"
```

---

## Task 7: ProgressionClient — URL State Shell

**Files:**
- Create: `web/src/app/(app)/analyst/progression/ProgressionClient.tsx`

- [ ] **Step 1: Create client component**

```tsx
// web/src/app/(app)/analyst/progression/ProgressionClient.tsx
'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTab, TabsPanel } from '@/components/ui/tabs'
import { MatchSelectorBar } from './components/MatchSelectorBar'
import { TeamReportTab } from './components/TeamReportTab'
import { ReportCardsTab } from './components/ReportCardsTab'
import { resolvePlayers, getAllStatTypes } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
}

export function ProgressionClient({ sessions }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Parse URL state
  const includedIds = useMemo(() => {
    const raw = searchParams.get('included')
    if (!raw) return sessions.map(s => s.id)  // default: all included
    return raw.split(',').filter(id => sessions.some(s => s.id === id))
  }, [searchParams, sessions])

  const matchAId = searchParams.get('a') ?? null
  const matchBId = searchParams.get('b') ?? null
  const compareMode = searchParams.get('compare') === '1'
  const activeTab = searchParams.get('tab') ?? 'team'

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) params.delete(k)
        else params.set(k, v)
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const toggleIncluded = useCallback(
    (id: string) => {
      const next = includedIds.includes(id)
        ? includedIds.filter(x => x !== id)
        : [...includedIds, id]
      setParams({ included: next.join(',') })
    },
    [includedIds, setParams],
  )

  const toggleCompareMode = useCallback(() => {
    setParams({
      compare: compareMode ? null : '1',
      a: compareMode ? null : matchAId,
      b: compareMode ? null : matchBId,
    })
  }, [compareMode, matchAId, matchBId, setParams])

  const selectMatchA = useCallback(
    (id: string) => setParams({ a: id }),
    [setParams],
  )

  const selectMatchB = useCallback(
    (id: string) => setParams({ b: id }),
    [setParams],
  )

  const resolvedPlayers = useMemo(
    () => resolvePlayers(sessions.filter(s => includedIds.includes(s.id))),
    [sessions, includedIds],
  )

  const statTypes = useMemo(
    () => getAllStatTypes(sessions.filter(s => includedIds.includes(s.id))),
    [sessions, includedIds],
  )

  return (
    <div className="space-y-0 -mx-6">
      <MatchSelectorBar
        sessions={sessions}
        includedIds={includedIds}
        matchAId={matchAId}
        matchBId={matchBId}
        compareMode={compareMode}
        onToggleIncluded={toggleIncluded}
        onToggleCompareMode={toggleCompareMode}
        onSelectA={selectMatchA}
        onSelectB={selectMatchB}
      />

      <div className="px-6 pt-6">
        <Tabs
          value={activeTab}
          onValueChange={v => setParams({ tab: v })}
          className="w-full"
        >
          <TabsList className="mb-6">
            <TabsTab value="team">Team Report</TabsTab>
            <TabsTab value="cards">Report Cards</TabsTab>
          </TabsList>

          <TabsPanel value="team">
            <TeamReportTab
              sessions={sessions}
              includedIds={includedIds}
              matchAId={matchAId}
              matchBId={matchBId}
              compareMode={compareMode}
              statTypes={statTypes}
              resolvedPlayers={resolvedPlayers}
            />
          </TabsPanel>

          <TabsPanel value="cards">
            <ReportCardsTab
              sessions={sessions}
              includedIds={includedIds}
              resolvedPlayers={resolvedPlayers}
              statTypes={statTypes}
            />
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Check Tabs API — read `web/src/components/ui/tabs.tsx` to confirm correct component names (TabsList, TabsTab, TabsPanel)**

The shadcn tabs in this project use Base UI. Open the file and verify the exported names, then fix the import if needed. The typical exports from this project's shadcn tabs are `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. Adjust the imports and JSX accordingly:

```tsx
// If the exports are TabsTrigger / TabsContent (standard shadcn):
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
// then use:
// <TabsTrigger value="team">Team Report</TabsTrigger>
// <TabsContent value="team">...</TabsContent>
```

- [ ] **Step 3: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/(app)/analyst/progression/ProgressionClient.tsx
git commit -m "feat: add ProgressionClient with URL state management"
```

---

## Task 8: MatchSelectorBar

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/MatchSelectorBar.tsx`

- [ ] **Step 1: Create component**

```tsx
// web/src/app/(app)/analyst/progression/components/MatchSelectorBar.tsx
'use client'

import { cn } from '@/lib/utils'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  matchAId: string | null
  matchBId: string | null
  compareMode: boolean
  onToggleIncluded: (id: string) => void
  onToggleCompareMode: () => void
  onSelectA: (id: string) => void
  onSelectB: (id: string) => void
}

export function MatchSelectorBar({
  sessions,
  includedIds,
  matchAId,
  matchBId,
  compareMode,
  onToggleIncluded,
  onToggleCompareMode,
  onSelectA,
  onSelectB,
}: Props) {
  function handleCardClick(id: string) {
    if (compareMode) {
      if (!matchAId) { onSelectA(id); return }
      if (!matchBId && id !== matchAId) { onSelectB(id); return }
      if (id === matchAId) { onSelectA(''); return }
      if (id === matchBId) { onSelectB(''); return }
      onSelectA(id)
    } else {
      onToggleIncluded(id)
    }
  }

  return (
    <div className="sticky top-12 z-10 bg-zinc-950 border-b border-zinc-800 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
          {compareMode ? 'Select Match A then B' : 'Click to include / exclude'}
        </span>
        <button
          onClick={onToggleCompareMode}
          className={cn(
            'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors',
            compareMode
              ? 'bg-[#e8560a]/15 border-[#e8560a]/30 text-[#e8560a]'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200',
          )}
        >
          <span
            className={cn(
              'w-6 h-3.5 rounded-full relative transition-colors',
              compareMode ? 'bg-[#e8560a]' : 'bg-zinc-700',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform',
                compareMode ? 'translate-x-3' : 'translate-x-0.5',
              )}
            />
          </span>
          Compare mode
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sessions.map(session => {
          const isIncluded = includedIds.includes(session.id)
          const isA = session.id === matchAId
          const isB = session.id === matchBId
          const date = session.match_date
            ? new Date(`${session.match_date}T12:00:00`).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short',
              })
            : '—'
          const score =
            session.our_score != null && session.opp_score != null
              ? `${session.our_score} – ${session.opp_score}`
              : null

          return (
            <button
              key={session.id}
              onClick={() => handleCardClick(session.id)}
              className={cn(
                'flex-shrink-0 min-w-[128px] text-left px-3 py-2.5 rounded-lg border transition-all',
                !compareMode && !isIncluded && 'opacity-40 border-zinc-800 bg-zinc-900/40',
                !compareMode && isIncluded && 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
                compareMode && isA && 'border-[#e8560a]/60 bg-[#e8560a]/10',
                compareMode && isB && 'border-green-600/50 bg-green-900/20',
                compareMode && !isA && !isB && 'border-zinc-800 bg-zinc-900 hover:border-zinc-600',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                {compareMode && isA && (
                  <span className="text-[9px] font-bold text-[#e8560a] tracking-wider">A</span>
                )}
                {compareMode && isB && (
                  <span className="text-[9px] font-bold text-green-500 tracking-wider">B</span>
                )}
                {!compareMode && isIncluded && (
                  <span className="text-[9px] text-green-500">✓</span>
                )}
                {!compareMode && !isIncluded && (
                  <span className="text-[9px] text-zinc-600">✕</span>
                )}
                <span className="text-[9px] text-zinc-600 ml-auto">{date}</span>
              </div>
              <p className="text-[11px] font-semibold text-zinc-200 truncate">
                vs {session.opposition ?? 'Unknown'}
              </p>
              {score && (
                <p className="text-[10px] text-zinc-500 mt-0.5">{score}</p>
              )}
              <p className="text-[9px] text-zinc-700 mt-0.5 truncate">
                {session.events.length} events
                {session.analyst?.display_name ? ` · ${session.analyst.display_name}` : ''}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(app)/analyst/progression/components/MatchSelectorBar.tsx
git commit -m "feat: add MatchSelectorBar with include/exclude and compare mode"
```

---

## Task 9: ComparisonTable

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/ComparisonTable.tsx`

- [ ] **Step 1: Create component**

```tsx
// web/src/app/(app)/analyst/progression/components/ComparisonTable.tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { countEvents, getPolarity } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  sessionA: MatchSessionWithAnalyst
  sessionB: MatchSessionWithAnalyst
  statTypes: string[]
  resolvedPlayers: ResolvedPlayer[]
}

export function ComparisonTable({ sessionA, sessionB, statTypes, resolvedPlayers }: Props) {
  const [playerFilter, setPlayerFilter] = useState<string>('team')

  const playerKey = playerFilter === 'team' ? undefined : playerFilter

  const countsA = countEvents(sessionA.events, playerKey)
  const countsB = countEvents(sessionB.events, playerKey)

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short',
    })
  }

  function DeltaCell({ statType, a, b }: { statType: string; a: number; b: number }) {
    const delta = b - a
    if (delta === 0) return <td className="text-right px-3 py-2.5 text-zinc-500 font-mono text-xs">—</td>

    const polarity = getPolarity(statType)
    const isGood = polarity === 'positive' ? delta > 0 : delta < 0
    const arrow = delta > 0 ? '▲' : '▼'
    const sign = delta > 0 ? '+' : ''

    return (
      <td
        className={cn(
          'text-right px-3 py-2.5 font-semibold font-mono text-xs',
          isGood ? 'text-green-400' : 'text-red-400',
        )}
      >
        {arrow} {sign}{delta}
      </td>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500">
          Side-by-Side Comparison
        </h3>
        <select
          value={playerFilter}
          onChange={e => setPlayerFilter(e.target.value)}
          className="text-xs bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-zinc-300 focus:outline-none focus:border-[#e8560a]"
        >
          <option value="team">Team total</option>
          {resolvedPlayers.map(p => (
            <option key={p.key} value={p.key}>
              #{p.primaryNumber} {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="text-left px-3 py-2.5 text-zinc-500 font-medium">Stat</th>
              <th className="text-right px-3 py-2.5 text-[#e8560a] font-medium">
                A · vs {sessionA.opposition ?? '—'} <span className="text-zinc-600">({formatDate(sessionA.match_date)})</span>
              </th>
              <th className="text-right px-3 py-2.5 text-green-500 font-medium">
                B · vs {sessionB.opposition ?? '—'} <span className="text-zinc-600">({formatDate(sessionB.match_date)})</span>
              </th>
              <th className="text-right px-3 py-2.5 text-zinc-600 font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {statTypes.map((statType, i) => {
              const a = countsA[statType] ?? 0
              const b = countsB[statType] ?? 0
              return (
                <tr
                  key={statType}
                  className={cn(
                    'border-b border-zinc-800/50',
                    i % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20',
                  )}
                >
                  <td className="px-3 py-2.5 text-zinc-300 capitalize">{statType.replace(/_/g, ' ')}</td>
                  <td className="text-right px-3 py-2.5 text-zinc-400 font-mono">{a}</td>
                  <td className="text-right px-3 py-2.5 text-zinc-400 font-mono">{b}</td>
                  <DeltaCell statType={statType} a={a} b={b} />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(app)/analyst/progression/components/ComparisonTable.tsx
git commit -m "feat: add ComparisonTable with stat-aware delta column"
```

---

## Task 10: WeaknessHeatmap

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/WeaknessHeatmap.tsx`

- [ ] **Step 1: Create component**

```tsx
// web/src/app/(app)/analyst/progression/components/WeaknessHeatmap.tsx
'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { computeHeatmap, getPolarity } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  statTypes: string[]
}

export function WeaknessHeatmap({ sessions, includedIds, statTypes }: Props) {
  const cells = useMemo(
    () => computeHeatmap(sessions, includedIds, statTypes),
    [sessions, includedIds, statTypes],
  )

  // Find stats that are red (below average for positive / above for negative) in 3+ of last 5 included
  const concernStats = useMemo(() => {
    const includedSessions = sessions
      .filter(s => includedIds.includes(s.id))
      .slice(-5)

    return statTypes.filter(statType => {
      const badCount = includedSessions.filter(session => {
        const cell = cells.find(
          c => c.sessionId === session.id && c.statType === statType,
        )
        return cell && !cell.isAboveAverage
      }).length
      return badCount >= 3
    })
  }, [cells, sessions, includedIds, statTypes])

  function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short',
    })
  }

  if (!statTypes.length) {
    return <p className="text-sm text-zinc-500 py-8 text-center">No stat data in included matches.</p>
  }

  return (
    <div>
      <h3 className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500 mb-3">
        Weakness Heatmap
      </h3>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="text-xs border-collapse min-w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="text-left px-3 py-2.5 text-zinc-500 font-medium sticky left-0 bg-zinc-900/60 min-w-[120px]">
                Stat
              </th>
              {sessions.map(session => (
                <th
                  key={session.id}
                  className={cn(
                    'text-center px-2 py-2.5 font-medium min-w-[80px]',
                    !includedIds.includes(session.id) ? 'text-zinc-700 opacity-40' : 'text-zinc-400',
                  )}
                >
                  <div>vs {session.opposition ?? '—'}</div>
                  <div className="text-[9px] text-zinc-600 font-normal">
                    {formatDate(session.match_date)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statTypes.map(statType => (
              <tr key={statType} className="border-b border-zinc-800/40">
                <td className="px-3 py-2 text-zinc-300 capitalize sticky left-0 bg-zinc-950">
                  {statType.replace(/_/g, ' ')}
                </td>
                {sessions.map(session => {
                  const cell = cells.find(
                    c => c.sessionId === session.id && c.statType === statType,
                  )
                  if (!cell) return <td key={session.id} className="px-2 py-2 text-center" />
                  return (
                    <td key={session.id} className={cn('px-2 py-2 text-center', cell.isExcluded && 'opacity-25')}>
                      <span
                        className={cn(
                          'inline-block px-2 py-1 rounded text-[11px] font-mono font-medium min-w-[32px] text-center',
                          cell.isAboveAverage
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400',
                        )}
                      >
                        {cell.value}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {concernStats.length > 0 && (
            <tfoot>
              <tr className="border-t border-zinc-700">
                <td className="px-3 py-2.5 text-red-400 font-semibold text-[11px] sticky left-0 bg-zinc-950">
                  ⚠ Concern
                </td>
                {sessions.map(session => {
                  const concerns = concernStats.filter(statType => {
                    const cell = cells.find(
                      c => c.sessionId === session.id && c.statType === statType,
                    )
                    return cell && !cell.isAboveAverage && !cell.isExcluded
                  })
                  return (
                    <td key={session.id} className="px-2 py-2 text-center">
                      {concerns.length > 0 && (
                        <span className="inline-block text-[9px] text-red-400 leading-tight">
                          {concerns.map(s => s.replace(/_/g, ' ')).join(', ')}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {concernStats.length > 0 && (
        <p className="text-[11px] text-zinc-600 mt-2">
          ⚠ {concernStats.map(s => s.replace(/_/g, ' ')).join(', ')} — red in 3+ of last 5 matches
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(app)/analyst/progression/components/WeaknessHeatmap.tsx
git commit -m "feat: add WeaknessHeatmap with stat-aware coloring and concern detection"
```

---

## Task 11: TeamReportTab

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/TeamReportTab.tsx`

- [ ] **Step 1: Create component**

```tsx
// web/src/app/(app)/analyst/progression/components/TeamReportTab.tsx
'use client'

import { ComparisonTable } from './ComparisonTable'
import { WeaknessHeatmap } from './WeaknessHeatmap'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  matchAId: string | null
  matchBId: string | null
  compareMode: boolean
  statTypes: string[]
  resolvedPlayers: ResolvedPlayer[]
}

export function TeamReportTab({
  sessions,
  includedIds,
  matchAId,
  matchBId,
  compareMode,
  statTypes,
  resolvedPlayers,
}: Props) {
  const sessionA = sessions.find(s => s.id === matchAId) ?? null
  const sessionB = sessions.find(s => s.id === matchBId) ?? null

  return (
    <div className="space-y-10">
      {compareMode && sessionA && sessionB ? (
        <ComparisonTable
          sessionA={sessionA}
          sessionB={sessionB}
          statTypes={statTypes}
          resolvedPlayers={resolvedPlayers}
        />
      ) : compareMode ? (
        <div className="rounded-xl border border-zinc-800 p-8 text-center text-sm text-zinc-500">
          {!sessionA
            ? 'Select Match A from the timeline above to start comparing.'
            : 'Select Match B to complete the comparison.'}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 p-6 text-center text-sm text-zinc-500">
          Toggle <strong className="text-zinc-300">Compare mode</strong> above and select two matches to see the side-by-side table.
        </div>
      )}

      <WeaknessHeatmap
        sessions={sessions}
        includedIds={includedIds}
        statTypes={statTypes}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(app)/analyst/progression/components/TeamReportTab.tsx
git commit -m "feat: add TeamReportTab combining comparison and heatmap"
```

---

## Task 12: PlayerReportCard with Sparklines

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/PlayerReportCard.tsx`

- [ ] **Step 1: Create component**

```tsx
// web/src/app/(app)/analyst/progression/components/PlayerReportCard.tsx
'use client'

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { computePlayerStats } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst, ResolvedPlayer, TrendDirection } from '@/lib/supabase/types'

interface Props {
  player: ResolvedPlayer
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  statTypes: string[]
  selected: boolean
  onToggleSelect: () => void
}

function trendArrow(t: TrendDirection) {
  switch (t) {
    case 'up-strong': return { symbol: '↑↑', color: 'text-green-400' }
    case 'up':        return { symbol: '↑',  color: 'text-green-500' }
    case 'flat':      return { symbol: '→',  color: 'text-zinc-500' }
    case 'down':      return { symbol: '↓',  color: 'text-red-400' }
    case 'down-strong': return { symbol: '↓↓', color: 'text-red-400' }
  }
}

export function PlayerReportCard({
  player,
  sessions,
  includedIds,
  statTypes,
  selected,
  onToggleSelect,
}: Props) {
  const includedSessions = useMemo(
    () =>
      sessions
        .filter(s => includedIds.includes(s.id))
        .sort((a, b) => (a.match_date ?? '').localeCompare(b.match_date ?? '')),
    [sessions, includedIds],
  )

  const stats = useMemo(
    () => computePlayerStats(player.key, sessions, includedIds, statTypes),
    [player.key, sessions, includedIds, statTypes],
  )

  const hasAnyDecline = stats.some(s => s.hasDecline)
  const hasAnyActivity = stats.some(s => s.avg > 0)

  // Build recharts data: one point per included session
  const chartData = includedSessions.map((session, idx) => {
    const point: Record<string, number | string> = {
      match: session.opposition ?? `Match ${idx + 1}`,
    }
    for (const stat of stats) {
      point[stat.statType] = stat.values[idx] ?? 0
    }
    return point
  })

  const CHART_COLORS = ['#e8560a', '#63b478', '#6b8cca', '#c9a84c', '#9b72c8']

  function findBestMatch(stat: (typeof stats)[0]) {
    const idx = stat.values.indexOf(stat.best)
    return includedSessions[idx]?.opposition ?? '—'
  }

  function findWorstMatch(stat: (typeof stats)[0]) {
    const nonZeroValues = stat.values.filter(v => v > 0)
    if (!nonZeroValues.length) return '—'
    const worstVal = Math.min(...nonZeroValues)
    const idx = stat.values.indexOf(worstVal)
    return includedSessions[idx]?.opposition ?? '—'
  }

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        selected ? 'border-[#e8560a]/40 bg-[#e8560a]/5' : 'border-zinc-800 bg-zinc-900/30',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="accent-[#e8560a] w-4 h-4 cursor-pointer"
        />
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#e8560a]/15 border border-[#e8560a]/25 text-sm font-bold text-[#e8560a] shrink-0">
          {player.primaryNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-200">{player.name}</p>
          <p className="text-[10px] text-zinc-600">
            {player.sessionCount} of {includedSessions.length} matches
            {player.numberMismatch && (
              <span className="ml-2 text-yellow-500">⚠ jersey #{player.allNumbers.join(', ')}</span>
            )}
          </p>
        </div>
        {hasAnyDecline && (
          <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-900/20 border border-red-800/40 rounded-md px-2 py-1">
            <AlertTriangle size={11} />
            Declining
          </div>
        )}
      </div>

      {!hasAnyActivity ? (
        <p className="text-xs text-zinc-600 px-4 py-6 text-center">No events in included matches.</p>
      ) : (
        <div className="p-4 space-y-4">
          {/* Sparklines */}
          {includedSessions.length >= 2 && (
            <div>
              <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wider font-medium">Trends</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
                  <XAxis
                    dataKey="match"
                    tick={{ fontSize: 9, fill: '#52525b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#52525b' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#18181b',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  {statTypes.map((statType, i) => (
                    <Line
                      key={statType}
                      type="monotone"
                      dataKey={statType}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                      activeDot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stat table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-1.5 text-zinc-600 font-medium">Stat</th>
                <th className="text-right py-1.5 text-zinc-600 font-medium">Avg</th>
                <th className="text-right py-1.5 text-zinc-600 font-medium">Best</th>
                <th className="text-right py-1.5 text-zinc-600 font-medium">Worst</th>
                <th className="text-right py-1.5 text-zinc-600 font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {stats.filter(s => s.avg > 0 || s.best > 0).map(stat => {
                const arrow = trendArrow(stat.trend)
                return (
                  <tr key={stat.statType} className="border-b border-zinc-800/40">
                    <td className="py-1.5 text-zinc-300 capitalize">
                      {stat.statType.replace(/_/g, ' ')}
                      {stat.hasDecline && (
                        <span className="ml-1 text-red-500 text-[9px]">↓↓↓</span>
                      )}
                    </td>
                    <td className="text-right py-1.5 text-zinc-400 font-mono">
                      {stat.avg.toFixed(1)}
                    </td>
                    <td className="text-right py-1.5 text-green-500 font-mono">
                      {stat.best} <span className="text-zinc-600 text-[9px]">({findBestMatch(stat)})</span>
                    </td>
                    <td className="text-right py-1.5 text-red-400 font-mono">
                      {stat.worst} <span className="text-zinc-600 text-[9px]">({findWorstMatch(stat)})</span>
                    </td>
                    <td className={cn('text-right py-1.5 font-semibold', arrow.color)}>
                      {arrow.symbol}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(app)/analyst/progression/components/PlayerReportCard.tsx
git commit -m "feat: add PlayerReportCard with recharts sparklines and stat table"
```

---

## Task 13: ReportCardsTab

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/ReportCardsTab.tsx`

- [ ] **Step 1: Create component**

```tsx
// web/src/app/(app)/analyst/progression/components/ReportCardsTab.tsx
'use client'

import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { PlayerReportCard } from './PlayerReportCard'
import { ExportPanel } from './ExportPanel'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  resolvedPlayers: ResolvedPlayer[]
  statTypes: string[]
}

export function ReportCardsTab({ sessions, includedIds, resolvedPlayers, statTypes }: Props) {
  // Only show players who appear in 2+ included sessions
  const eligiblePlayers = useMemo(
    () => resolvedPlayers.filter(p => p.sessionCount >= 2),
    [resolvedPlayers],
  )

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    eligiblePlayers.map(p => p.key),
  )
  const [exportOpen, setExportOpen] = useState(false)

  function toggleSelect(key: string) {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }

  function selectAll() {
    setSelectedKeys(eligiblePlayers.map(p => p.key))
  }

  function deselectAll() {
    setSelectedKeys([])
  }

  if (!eligiblePlayers.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-zinc-500">No players appear in 2+ included sessions.</p>
        <p className="text-xs text-zinc-600">Include more matches or upload additional sessions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-400">
            {eligiblePlayers.length} players · {selectedKeys.length} selected
          </p>
          <button onClick={selectAll} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            All
          </button>
          <button onClick={deselectAll} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            None
          </button>
        </div>
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/25 text-[#e8560a] hover:bg-[#e8560a]/20 transition-colors"
        >
          <Download size={12} />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {eligiblePlayers.map(player => (
          <PlayerReportCard
            key={player.key}
            player={player}
            sessions={sessions}
            includedIds={includedIds}
            statTypes={statTypes}
            selected={selectedKeys.includes(player.key)}
            onToggleSelect={() => toggleSelect(player.key)}
          />
        ))}
      </div>

      <ExportPanel
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        sessions={sessions}
        players={eligiblePlayers}
        statTypes={statTypes}
        defaultIncludedIds={includedIds}
        defaultSelectedKeys={selectedKeys}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(app)/analyst/progression/components/ReportCardsTab.tsx
git commit -m "feat: add ReportCardsTab with player grid and export button"
```

---

## Task 14: ExportPanel + CSV Export

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/ExportPanel.tsx`

- [ ] **Step 1: Create component**

```tsx
// web/src/app/(app)/analyst/progression/components/ExportPanel.tsx
'use client'

import { useState, useTransition } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { buildTeamReportCsv, buildReportCardsCsv } from '@/lib/match-analysis/aggregate'
import { generateProgressionPdf } from '../actions'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  open: boolean
  onClose: () => void
  sessions: MatchSessionWithAnalyst[]
  players: ResolvedPlayer[]
  statTypes: string[]
  defaultIncludedIds: string[]
  defaultSelectedKeys: string[]
}

export function ExportPanel({
  open,
  onClose,
  sessions,
  players,
  statTypes,
  defaultIncludedIds,
  defaultSelectedKeys,
}: Props) {
  const [selectedIncluded, setSelectedIncluded] = useState<string[]>(defaultIncludedIds)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(defaultSelectedKeys)
  const [sections, setSections] = useState<string[]>(['team', 'cards'])
  const [format, setFormat] = useState<'csv' | 'pdf'>('pdf')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggleMatch(id: string) {
    setSelectedIncluded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function togglePlayer(key: string) {
    setSelectedPlayers(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key])
  }

  function toggleSection(s: string) {
    setSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExport() {
    setError(null)

    if (format === 'csv') {
      if (sections.includes('team')) {
        const csv = buildTeamReportCsv(sessions, selectedIncluded, statTypes)
        downloadBlob(csv, 'team-report.csv', 'text/csv')
      }
      if (sections.includes('cards')) {
        const csv = buildReportCardsCsv(players, selectedPlayers, sessions, selectedIncluded, statTypes)
        downloadBlob(csv, 'player-report-cards.csv', 'text/csv')
      }
      onClose()
      return
    }

    // PDF
    startTransition(async () => {
      const result = await generateProgressionPdf({
        sessionIds: selectedIncluded,
        playerKeys: selectedPlayers,
        sections,
        statTypes,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.pdf) {
        const bytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0))
        downloadBlob(
          new TextDecoder().decode(bytes),
          'match-analysis.pdf',
          'application/pdf',
        )
        // Use blob directly
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'match-analysis.pdf'
        a.click()
        URL.revokeObjectURL(url)
        onClose()
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>Export Report</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Matches */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Matches</p>
            <div className="space-y-1.5">
              {sessions.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIncluded.includes(s.id)}
                    onChange={() => toggleMatch(s.id)}
                    className="accent-[#e8560a]"
                  />
                  <span className="text-sm text-zinc-300">
                    vs {s.opposition ?? '—'} · {s.match_date ?? '—'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Players */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Players</p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedPlayers(players.map(p => p.key))} className="text-[11px] text-zinc-500 hover:text-zinc-300">All</button>
                <button onClick={() => setSelectedPlayers([])} className="text-[11px] text-zinc-500 hover:text-zinc-300">None</button>
              </div>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {players.map(p => (
                <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(p.key)}
                    onChange={() => togglePlayer(p.key)}
                    className="accent-[#e8560a]"
                  />
                  <span className="text-sm text-zinc-300">#{p.primaryNumber} {p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Sections</p>
            <div className="space-y-1.5">
              {[
                { id: 'team', label: 'Team Report (comparison + heatmap)' },
                { id: 'cards', label: 'Player Report Cards' },
              ].map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sections.includes(id)}
                    onChange={() => toggleSection(id)}
                    className="accent-[#e8560a]"
                  />
                  <span className="text-sm text-zinc-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Format</p>
            <div className="flex gap-2">
              {(['pdf', 'csv'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm border transition-colors',
                    format === f
                      ? 'bg-[#e8560a]/15 border-[#e8560a]/40 text-[#e8560a]'
                      : 'border-zinc-700 text-zinc-400 hover:text-zinc-200',
                  )}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleExport}
            disabled={isPending || sections.length === 0 || selectedIncluded.length === 0}
            className="w-full py-2.5 rounded-lg bg-[#e8560a] text-white text-sm font-semibold hover:bg-[#d14d09] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Generating…' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/(app)/analyst/progression/components/ExportPanel.tsx
git commit -m "feat: add ExportPanel with CSV download and PDF trigger"
```

---

## Task 15: PDF Server Action + PDF Document

**Files:**
- Create: `web/src/app/(app)/analyst/progression/actions.ts`
- Create: `web/src/app/(app)/analyst/progression/ProgressionPDF.tsx`

- [ ] **Step 1: Create PDF document component**

Note: `@react-pdf/renderer` cannot render SVG/canvas charts — the PDF contains stat tables only (no sparklines).

```tsx
// web/src/app/(app)/analyst/progression/ProgressionPDF.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { countEvents, getPolarity, computePlayerStats } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

const E = '#e8560a'
const DARK = '#111827'
const MUTED = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE = '#ffffff'
const GREEN = '#059669'
const RED = '#dc2626'

const s = StyleSheet.create({
  page: { backgroundColor: WHITE, paddingBottom: 48, fontSize: 9, fontFamily: 'Helvetica', color: DARK },
  footer: { position: 'absolute', bottom: 16, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid', paddingTop: 6 },
  footerText: { fontSize: 7, color: MUTED },
  header: { backgroundColor: E, paddingHorizontal: 36, paddingVertical: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: WHITE },
  headerSub: { fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  headerLogo: { width: 40, height: 40 },
  content: { paddingHorizontal: 36, paddingTop: 20 },
  sectionLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 2, marginBottom: 10, marginTop: 16 },
  table: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, borderBottomStyle: 'solid' },
  tableRowLast: { flexDirection: 'row' },
  cellLabel: { flex: 2, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: LIGHT, fontSize: 8, color: MUTED },
  cell: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, textAlign: 'right', fontSize: 8 },
  cellHeader: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, textAlign: 'right', fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, backgroundColor: LIGHT },
  playerCard: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4, marginBottom: 10 },
  playerHeader: { backgroundColor: DARK, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  playerNumber: { width: 20, height: 20, borderRadius: 10, backgroundColor: E, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  playerNumberText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: WHITE },
  playerName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: WHITE },
  playerSub: { fontSize: 7, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  concern: { fontSize: 7, color: RED, fontFamily: 'Helvetica-Bold', marginTop: 2 },
})

function Footer({ text }: { text: string }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>18TH MAN · MATCH ANALYSIS</Text>
      <Text style={s.footerText}>{text}</Text>
    </View>
  )
}

interface PDFProps {
  sessions: MatchSessionWithAnalyst[]
  sessionIds: string[]
  playerKeys: string[]
  players: ResolvedPlayer[]
  sections: string[]
  statTypes: string[]
  logoSrc?: string
  exportDate: string
}

export function ProgressionPDF({
  sessions,
  sessionIds,
  playerKeys,
  players,
  sections,
  statTypes,
  logoSrc,
  exportDate,
}: PDFProps) {
  const includedSessions = sessions
    .filter(s => sessionIds.includes(s.id))
    .sort((a, b) => (a.match_date ?? '').localeCompare(b.match_date ?? ''))

  const selectedPlayers = players.filter(p => playerKeys.includes(p.key))

  return (
    <Document title="Match Analysis — 18th Man" author="18th Man">
      {/* Cover page */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 }}>MATCH ANALYSIS</Text>
            <Text style={s.headerTitle}>Team Progression Report</Text>
            <Text style={s.headerSub}>{includedSessions.length} matches · {selectedPlayers.length} players</Text>
          </View>
          {logoSrc && <Image style={s.headerLogo} src={logoSrc} />}
        </View>
        <View style={s.content}>
          <Text style={s.sectionLabel}>MATCHES INCLUDED</Text>
          <View style={s.table}>
            {includedSessions.map((session, i) => (
              <View key={session.id} style={i === includedSessions.length - 1 ? s.tableRowLast : s.tableRow}>
                <Text style={s.cellLabel}>vs {session.opposition ?? '—'}</Text>
                <Text style={[s.cell, { flex: 2 }]}>{session.match_date ?? '—'} · {session.our_score ?? '?'} – {session.opp_score ?? '?'}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.sectionLabel, { marginTop: 20 }]}>EXPORT INFO</Text>
          <Text style={{ fontSize: 8, color: MUTED }}>Generated {exportDate} · 18th Man Match Analysis</Text>
        </View>
        <Footer text={exportDate} />
      </Page>

      {/* Team report page */}
      {sections.includes('team') && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <View>
              <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 }}>TEAM REPORT</Text>
              <Text style={s.headerTitle}>Team Stats by Match</Text>
            </View>
            {logoSrc && <Image style={s.headerLogo} src={logoSrc} />}
          </View>
          <View style={s.content}>
            <View style={s.table}>
              {/* Header row */}
              <View style={s.tableRow}>
                <Text style={[s.cellLabel, { flex: 2 }]}>Stat</Text>
                {includedSessions.map(s => (
                  <Text key={s.id} style={s.cellHeader}>
                    {s.opposition ?? '—'}{'\n'}{s.match_date ?? '—'}
                  </Text>
                ))}
              </View>
              {statTypes.map((statType, i) => {
                const isLast = i === statTypes.length - 1
                return (
                  <View key={statType} style={isLast ? s.tableRowLast : s.tableRow}>
                    <Text style={[s.cellLabel, { flex: 2 }]}>{statType.replace(/_/g, ' ')}</Text>
                    {includedSessions.map(session => {
                      const val = countEvents(session.events)[statType] ?? 0
                      return (
                        <Text key={session.id} style={s.cell}>{val}</Text>
                      )
                    })}
                  </View>
                )
              })}
            </View>
          </View>
          <Footer text="Team Report" />
        </Page>
      )}

      {/* Player report cards */}
      {sections.includes('cards') && selectedPlayers.map(player => {
        const stats = computePlayerStats(player.key, sessions, sessionIds, statTypes)
          .filter(s => s.avg > 0 || s.best > 0)
        const hasDecline = stats.some(s => s.hasDecline)

        return (
          <Page key={player.key} size="A4" style={s.page}>
            <View style={s.header}>
              <View>
                <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 8 }}>PLAYER REPORT CARD</Text>
                <Text style={s.headerTitle}>{player.name}</Text>
                <Text style={s.headerSub}>
                  #{player.primaryNumber} · {player.sessionCount} matches
                  {hasDecline ? ' · ⚠ Stat decline detected' : ''}
                </Text>
              </View>
              {logoSrc && <Image style={s.headerLogo} src={logoSrc} />}
            </View>
            <View style={s.content}>
              <View style={s.table}>
                <View style={s.tableRow}>
                  <Text style={s.cellLabel}>Stat</Text>
                  <Text style={s.cellHeader}>Avg</Text>
                  <Text style={s.cellHeader}>Best</Text>
                  <Text style={s.cellHeader}>Worst</Text>
                  <Text style={s.cellHeader}>Trend</Text>
                </View>
                {stats.map((stat, i) => {
                  const isLast = i === stats.length - 1
                  const trendMap: Record<string, string> = {
                    'up-strong': '↑↑', 'up': '↑', 'flat': '→', 'down': '↓', 'down-strong': '↓↓'
                  }
                  return (
                    <View key={stat.statType} style={isLast ? s.tableRowLast : s.tableRow}>
                      <Text style={s.cellLabel}>{stat.statType.replace(/_/g, ' ')}{stat.hasDecline ? ' ⚠' : ''}</Text>
                      <Text style={s.cell}>{stat.avg.toFixed(1)}</Text>
                      <Text style={[s.cell, { color: GREEN }]}>{stat.best}</Text>
                      <Text style={[s.cell, { color: RED }]}>{stat.worst}</Text>
                      <Text style={s.cell}>{trendMap[stat.trend] ?? '→'}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
            <Footer text={`${player.name} · #${player.primaryNumber}`} />
          </Page>
        )
      })}
    </Document>
  )
}
```

- [ ] **Step 2: Create server action**

```ts
// web/src/app/(app)/analyst/progression/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { resolvePlayers } from '@/lib/match-analysis/aggregate'
import { ProgressionPDF } from './ProgressionPDF'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

interface PdfInput {
  sessionIds: string[]
  playerKeys: string[]
  sections: string[]
  statTypes: string[]
}

function getLogoDataUri(): string | undefined {
  try {
    const p = resolve(process.cwd(), 'public/logo.png')
    if (!existsSync(p)) return undefined
    return `data:image/png;base64,${readFileSync(p).toString('base64')}`
  } catch {
    return undefined
  }
}

export async function generateProgressionPdf(
  input: PdfInput,
): Promise<{ pdf?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id || !['coach', 'admin'].includes(profile.role ?? '')) {
    return { error: 'Unauthorized' }
  }

  const { data: sessions } = await supabase
    .from('match_sessions')
    .select('*, analyst:profiles!analyst_id(display_name)')
    .eq('club_id', profile.club_id)
    .in('id', input.sessionIds) as { data: MatchSessionWithAnalyst[] | null }

  if (!sessions?.length) return { error: 'No sessions found.' }

  const players = resolvePlayers(sessions)
  const logoSrc = getLogoDataUri()
  const exportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      <ProgressionPDF
        sessions={sessions}
        sessionIds={input.sessionIds}
        playerKeys={input.playerKeys}
        players={players}
        sections={input.sections}
        statTypes={input.statTypes}
        logoSrc={logoSrc}
        exportDate={exportDate}
      /> as any,
    )
    return { pdf: Buffer.from(buffer).toString('base64') }
  } catch (err) {
    console.error('[progression-pdf] Error:', err)
    return { error: 'Failed to generate PDF. Please try again.' }
  }
}
```

- [ ] **Step 3: Fix ExportPanel PDF download**

In `ExportPanel.tsx`, the PDF download creates the blob twice. Replace the PDF download block in `handleExport` with the clean version:

```ts
// Replace the PDF block inside handleExport with:
if (result.pdf) {
  const bytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'match-analysis.pdf'
  a.click()
  URL.revokeObjectURL(url)
  onClose()
}
```

- [ ] **Step 4: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/(app)/analyst/progression/actions.ts web/src/app/(app)/analyst/progression/ProgressionPDF.tsx
git commit -m "feat: add PDF export server action and ProgressionPDF document"
```

---

## Task 16: Apply Migration + Deploy

- [ ] **Step 1: Apply migration to Supabase production**

Use the Supabase MCP tool `apply_migration` with the content of `web/supabase/migrations/068_match_sessions.sql`. The migration name should be `match_sessions`.

- [ ] **Step 2: Verify migration applied**

Use Supabase MCP `list_migrations` to confirm `068_match_sessions` appears in the list.

- [ ] **Step 3: Verify table exists**

Use Supabase MCP `execute_sql`:
```sql
select column_name, data_type
from information_schema.columns
where table_name = 'match_sessions'
order by ordinal_position;
```

Expected: `id`, `analyst_id`, `club_id`, `opposition`, `match_date`, `our_score`, `opp_score`, `session_name`, `players`, `events`, `uploaded_at`, `local_session_id`.

- [ ] **Step 4: Final type-check and lint**

```bash
cd web && npx tsc --noEmit && npx eslint src/app/\(app\)/analyst --max-warnings 0
```

Fix any remaining issues.

- [ ] **Step 5: Commit everything and push**

```bash
git add -A
git status  # confirm only expected files
git commit -m "feat: Match Analysis — team progression and player report cards"
git push origin main
```

- [ ] **Step 6: Verify Vercel deployment**

Monitor Vercel deployment. Once live, navigate to `/analyst/progression` as a coach or admin user and confirm:
- Page loads without errors
- Sidebar shows "Match Analysis" for coach/admin
- Empty state displays correctly (no sessions yet)

---

## Self-Review

**Spec coverage check:**
- ✅ `068_match_sessions.sql` — Task 1
- ✅ RLS policies (insert/select/update/delete) — Task 1
- ✅ TypeScript types (MatchSession, SessionPlayer, SessionEvent, ResolvedPlayer, MatchSessionWithAnalyst) — Task 2
- ✅ Aggregation library (countEvents, resolvePlayers, computeHeatmap, computeTrend, detectDecline, STAT_POLARITY) — Task 3
- ✅ recharts via shadcn chart — Task 4
- ✅ Sidebar nav (coach + admin, TrendingUp icon) — Task 5
- ✅ `/analyst/progression` server page with access gate — Task 6
- ✅ URL state management — Task 7
- ✅ Match selector (include/exclude + compare mode) — Task 8
- ✅ Comparison table with A/B columns + stat-aware delta — Task 9
- ✅ Weakness heatmap with concern row — Task 10
- ✅ TeamReportTab — Task 11
- ✅ Player report cards with sparklines + stat table — Task 12
- ✅ 3-consecutive-decline warning badge — Task 12
- ✅ Jersey number mismatch flag — Task 12
- ✅ ReportCardsTab with player selection checkboxes — Task 13
- ✅ Export panel with match/player/section selectors — Task 14
- ✅ CSV export (team + report cards) — Task 14
- ✅ PDF export with `@react-pdf/renderer` — Task 15
- ✅ PDF branding (logo, 18th Man palette) — Task 15
- ✅ Apply migration to Supabase + deploy to Vercel — Task 16

**Notes for implementer:**
- Task 7 has an important note: verify the actual Tab component export names from `components/ui/tabs.tsx` before using — they may be `TabsTrigger`/`TabsContent` not `TabsTab`/`TabsPanel`
- The `ProgressionPDF` uses `as any` on the JSX passed to `renderToBuffer` — this matches the existing `MatchReportPDF` pattern in the codebase
- `@react-pdf/renderer` does NOT support recharts SVG — PDF shows stat tables only, no sparkline charts
- ExportPanel has a redundant blob-creation in the PDF path (Step 3 of Task 15 fixes it)
- URL search params require `<Suspense>` wrapper around `ProgressionClient` — already included in `page.tsx`
