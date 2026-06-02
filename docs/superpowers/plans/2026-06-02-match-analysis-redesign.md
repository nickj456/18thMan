# Match Analysis Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/analyst/progression` into a premium coaching intelligence dashboard — two-column layout, large match cards with WIN/LOSS badges, ranked concern bars, compact player table with a slide-over dossier, sidebar leaderboards, and on-demand AI insights.

**Architecture:** `ProgressionClient.tsx` owns URL state (match selection) and local state (open dossier). All aggregation stays in the existing `lib/match-analysis/aggregate.ts` (unchanged). New `progression_insights` table stores generated AI text keyed by `(club_id, scope, session_ids_hash)`. AI streaming uses `createStreamableValue` from `ai/rsc` in a server action.

**Tech Stack:** Next.js 16 App Router, Supabase, recharts (`BarChart` in dossier), `streamText` + `@ai-sdk/gateway`, `ai/rsc` for streaming server actions, Tailwind v4, TypeScript strict.

---

## File Map

| Status | Path | Purpose |
|--------|------|---------|
| CREATE | `web/supabase/migrations/069_progression_insights.sql` | New table + RLS |
| MODIFY | `web/src/lib/supabase/types.ts` | Add `ProgressionInsight` type |
| MODIFY | `web/src/app/(app)/analyst/progression/page.tsx` | Fetch saved insight, pass to client |
| REPLACE | `web/src/app/(app)/analyst/progression/ProgressionClient.tsx` | New two-column layout |
| REPLACE | `web/src/app/(app)/analyst/progression/actions.tsx` | Add `generateTeamInsight`, `generatePlayerInsight` |
| REPLACE | `web/src/app/(app)/analyst/progression/components/MatchSelectorBar.tsx` | Premium match cards |
| CREATE | `web/src/app/(app)/analyst/progression/components/KeyNumbers.tsx` | 4-stat headline strip |
| CREATE | `web/src/app/(app)/analyst/progression/components/AiInsightCard.tsx` | On-demand streaming insight |
| CREATE | `web/src/app/(app)/analyst/progression/components/ConcernsPanel.tsx` | Ranked concern bars |
| CREATE | `web/src/app/(app)/analyst/progression/components/PlayerTable.tsx` | Compact sortable player rows |
| CREATE | `web/src/app/(app)/analyst/progression/components/PlayerDossier.tsx` | Slide-over dossier |
| CREATE | `web/src/app/(app)/analyst/progression/components/Sidebar.tsx` | Season record + leaderboards |
| DELETE | `web/src/app/(app)/analyst/progression/components/TeamReportTab.tsx` | Replaced |
| DELETE | `web/src/app/(app)/analyst/progression/components/WeaknessHeatmap.tsx` | Replaced by ConcernsPanel |
| DELETE | `web/src/app/(app)/analyst/progression/components/PlayerReportCard.tsx` | Replaced by PlayerDossier |
| DELETE | `web/src/app/(app)/analyst/progression/components/ReportCardsTab.tsx` | Replaced by PlayerTable |
| KEEP | `web/src/app/(app)/analyst/progression/components/ComparisonTable.tsx` | Unchanged |
| KEEP | `web/src/app/(app)/analyst/progression/components/ExportPanel.tsx` | Unchanged |
| KEEP | `web/src/lib/match-analysis/aggregate.ts` | Unchanged |

---

## Task 1: Supabase Migration

**Files:**
- Create: `web/supabase/migrations/069_progression_insights.sql`

- [ ] **Step 1: Create migration**

```sql
-- 069_progression_insights.sql
create table public.progression_insights (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.clubs(id),
  scope            text not null,
  session_ids_hash text not null,
  content          text not null,
  generated_at     timestamptz not null default now(),
  unique (club_id, scope, session_ids_hash)
);

alter table public.progression_insights enable row level security;

create policy "pi_select"
  on public.progression_insights for select
  to authenticated
  using (club_id = (select club_id from public.profiles where id = auth.uid()));

create policy "pi_insert"
  on public.progression_insights for insert
  to authenticated
  with check (club_id = (select club_id from public.profiles where id = auth.uid()));

create policy "pi_update"
  on public.progression_insights for update
  to authenticated
  using (club_id = (select club_id from public.profiles where id = auth.uid()));
```

- [ ] **Step 2: Commit**

```bash
git add web/supabase/migrations/069_progression_insights.sql
git commit -m "feat: add progression_insights migration"
```

---

## Task 2: TypeScript Type

**Files:**
- Modify: `web/src/lib/supabase/types.ts`

- [ ] **Step 1: Append to end of types.ts**

```ts
export interface ProgressionInsight {
  id: string
  club_id: string
  scope: string             // 'team' or player key e.g. 'stan martin::8'
  session_ids_hash: string  // btoa(sortedIds.join(','))
  content: string
  generated_at: string
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/supabase/types.ts
git commit -m "feat: add ProgressionInsight type"
```

---

## Task 3: AI Insight Server Actions

**Files:**
- Replace: `web/src/app/(app)/analyst/progression/actions.tsx`

- [ ] **Step 1: Replace actions.tsx with new file**

```tsx
'use server'

import { redirect } from 'next/navigation'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { renderToBuffer } from '@react-pdf/renderer'
import { streamText } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { gateway } from '@ai-sdk/gateway'
import { createClient } from '@/lib/supabase/server'
import {
  resolvePlayers,
  countEvents,
  getAllStatTypes,
  computePlayerStats,
  getPolarity,
} from '@/lib/match-analysis/aggregate'
import { ProgressionPDF } from './ProgressionPDF'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHash(sessionIds: string[]): string {
  return btoa([...sessionIds].sort().join(','))
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

// ── Team insight ──────────────────────────────────────────────────────────────

interface TeamInsightInput {
  sessionIds: string[]
  clubName: string
}

export async function generateTeamInsight(input: TeamInsightInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id || !['coach', 'admin'].includes(profile.role ?? '')) {
    throw new Error('Unauthorized')
  }

  const { data: sessions } = await supabase
    .from('match_sessions')
    .select('*, analyst:profiles!analyst_id(display_name)')
    .eq('club_id', profile.club_id)
    .in('id', input.sessionIds) as { data: MatchSessionWithAnalyst[] | null }

  if (!sessions?.length) throw new Error('No sessions found')

  const statTypes = getAllStatTypes(sessions)
  const hash = makeHash(input.sessionIds)

  // Build per-stat aggregates
  const statTotals: Record<string, number> = {}
  for (const s of sessions) {
    const counts = countEvents(s.events)
    for (const st of statTypes) {
      statTotals[st] = (statTotals[st] ?? 0) + (counts[st] ?? 0)
    }
  }
  const avgPerMatch = (stat: string) =>
    sessions.length ? ((statTotals[stat] ?? 0) / sessions.length).toFixed(1) : '0'

  // Top performers
  const players = resolvePlayers(sessions)
  const tackleLeader = players
    .map(p => ({ p, total: sessions.reduce((n, s) => n + (countEvents(s.events, p.key)['tackle'] ?? 0), 0) }))
    .sort((a, b) => b.total - a.total)[0]
  const carryLeader = players
    .map(p => ({ p, total: sessions.reduce((n, s) => n + (countEvents(s.events, p.key)['carry'] ?? 0), 0) }))
    .sort((a, b) => b.total - a.total)[0]

  // Concern stats (negative for 2+ sessions)
  const concernStats = statTypes.filter(st => {
    if (getPolarity(st) !== 'negative') return false
    const badCount = sessions.filter(s => {
      const val = countEvents(s.events)[st] ?? 0
      const avg = (statTotals[st] ?? 0) / sessions.length
      return val > avg
    }).length
    return badCount >= 2
  })

  const opponents = sessions.map(s => s.opposition ?? 'Unknown').join(', ')

  const prompt = `You are an assistant rugby league coach. Analyse this team's performance data and provide a 2-3 sentence insight highlighting: (1) the team's strongest consistent performer, (2) the most pressing concern, and (3) one specific player callout. Be direct and actionable. Use plain English — no markdown, no bullet points.

Team: ${input.clubName}
Matches: ${sessions.length} — ${opponents}
Stats:
${statTypes.map(st => `- ${st.replace(/_/g, ' ')}: ${statTotals[st] ?? 0} total, ${avgPerMatch(st)} per match`).join('\n')}
${tackleLeader ? `Top tackler: ${tackleLeader.p.name} (${tackleLeader.total} total)` : ''}
${carryLeader ? `Top carrier: ${carryLeader.p.name} (${carryLeader.total} total)` : ''}
${concernStats.length ? `Concerns: ${concernStats.map(s => s.replace(/_/g, ' ')).join(', ')} — high in 2+ matches` : ''}`

  const stream = createStreamableValue('')
  let fullText = ''

  ;(async () => {
    const { textStream } = streamText({
      model: gateway('anthropic/claude-haiku-4-5'),
      prompt,
    })
    for await (const delta of textStream) {
      fullText += delta
      stream.update(delta)
    }
    stream.done()
    // Upsert to DB
    await supabase.from('progression_insights').upsert(
      { club_id: profile.club_id, scope: 'team', session_ids_hash: hash, content: fullText },
      { onConflict: 'club_id,scope,session_ids_hash' },
    )
  })()

  return { stream: stream.value, hash }
}

// ── Player insight ─────────────────────────────────────────────────────────────

interface PlayerInsightInput {
  playerKey: string
  playerName: string
  playerNumber: number
  sessionIds: string[]
}

export async function generatePlayerInsight(input: PlayerInsightInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id || !['coach', 'admin'].includes(profile.role ?? '')) {
    throw new Error('Unauthorized')
  }

  const { data: sessions } = await supabase
    .from('match_sessions')
    .select('*')
    .eq('club_id', profile.club_id)
    .in('id', input.sessionIds) as { data: MatchSessionWithAnalyst[] | null }

  if (!sessions?.length) throw new Error('No sessions found')

  const statTypes = getAllStatTypes(sessions)
  const stats = computePlayerStats(input.playerKey, sessions, input.sessionIds, statTypes)
  const hash = makeHash(input.sessionIds)

  const statLines = stats
    .filter(s => s.avg > 0 || s.best > 0)
    .map(s => `- ${s.statType.replace(/_/g, ' ')}: avg ${s.avg.toFixed(1)}/match, best ${s.best}, worst ${s.worst}, trend ${s.trend}${s.hasDecline ? ' (3+ match decline)' : ''}`)
    .join('\n')

  const prompt = `You are an assistant rugby league coach. Analyse this player's performance data and provide a 2-3 sentence coaching observation. Highlight one strength, one concern if present, and one specific recommendation for training. Be direct and actionable. Use plain English — no markdown, no bullet points.

Player: ${input.playerName} (jersey #${input.playerNumber})
Matches tracked: ${input.sessionIds.length}
Stats:
${statLines}`

  const stream = createStreamableValue('')
  let fullText = ''

  ;(async () => {
    const { textStream } = streamText({
      model: gateway('anthropic/claude-haiku-4-5'),
      prompt,
    })
    for await (const delta of textStream) {
      fullText += delta
      stream.update(delta)
    }
    stream.done()
    await supabase.from('progression_insights').upsert(
      { club_id: profile.club_id, scope: input.playerKey, session_ids_hash: hash, content: fullText },
      { onConflict: 'club_id,scope,session_ids_hash' },
    )
  })()

  return { stream: stream.value, hash }
}

// ── PDF export (unchanged from original) ─────────────────────────────────────

interface PdfInput {
  sessionIds: string[]
  playerKeys: string[]
  sections: string[]
  statTypes: string[]
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

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/(app)/analyst/progression/actions.tsx"
git commit -m "feat: add generateTeamInsight and generatePlayerInsight streaming actions"
```

---

## Task 4: Update page.tsx

**Files:**
- Modify: `web/src/app/(app)/analyst/progression/page.tsx`

- [ ] **Step 1: Replace page.tsx**

```tsx
// web/src/app/(app)/analyst/progression/page.tsx
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProgressionClient } from './ProgressionClient'
import type { MatchSessionWithAnalyst, ProgressionInsight } from '@/lib/supabase/types'

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

  const { data: clubData } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', profile.club_id)
    .single()

  const [sessionsResult, insightsResult] = await Promise.all([
    supabase
      .from('match_sessions')
      .select('*, analyst:profiles!analyst_id(display_name)')
      .eq('club_id', profile.club_id)
      .order('match_date', { ascending: true }) as Promise<{ data: MatchSessionWithAnalyst[] | null }>,
    supabase
      .from('progression_insights')
      .select('*')
      .eq('club_id', profile.club_id) as Promise<{ data: ProgressionInsight[] | null }>,
  ])

  const sessions = sessionsResult.data ?? []
  const savedInsights = insightsResult.data ?? []

  if (!sessions.length) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center text-2xl">📈</div>
        <p className="text-sm text-zinc-500 font-medium">No match sessions uploaded yet</p>
        <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
          Upload sessions from the 18th Man Analyst app to start tracking team progression.
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-zinc-600">Loading…</div>}>
      <ProgressionClient
        sessions={sessions}
        savedInsights={savedInsights}
        clubName={clubData?.name ?? 'Your Club'}
      />
    </Suspense>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/(app)/analyst/progression/page.tsx"
git commit -m "feat: update progression page to fetch saved insights"
```

---

## Task 5: MatchSelectorBar — Premium Redesign

**Files:**
- Replace: `web/src/app/(app)/analyst/progression/components/MatchSelectorBar.tsx`

- [ ] **Step 1: Replace MatchSelectorBar.tsx**

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

function getResult(session: MatchSessionWithAnalyst): 'win' | 'loss' | 'draw' | null {
  if (session.our_score == null || session.opp_score == null) return null
  if (session.our_score > session.opp_score) return 'win'
  if (session.our_score < session.opp_score) return 'loss'
  return 'draw'
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
      if (!matchAId || matchAId === '') { onSelectA(id); return }
      if ((!matchBId || matchBId === '') && id !== matchAId) { onSelectB(id); return }
      if (id === matchAId) { onSelectA(''); return }
      if (id === matchBId) { onSelectB(''); return }
      onSelectA(id)
    } else {
      onToggleIncluded(id)
    }
  }

  return (
    <div className="sticky top-12 z-10 bg-[#050507]/95 backdrop-blur border-b border-zinc-900 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
          {compareMode ? 'Select Match A, then B' : 'Matches — click to include / exclude'}
        </span>
        <button
          onClick={onToggleCompareMode}
          className={cn(
            'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all',
            compareMode
              ? 'bg-[#e8560a]/10 border-[#e8560a]/40 text-[#e8560a]'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600',
          )}
        >
          <span className={cn(
            'w-6 h-3.5 rounded-full relative transition-colors flex-shrink-0',
            compareMode ? 'bg-[#e8560a]' : 'bg-zinc-700',
          )}>
            <span className={cn(
              'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform',
              compareMode ? 'translate-x-3' : 'translate-x-0.5',
            )} />
          </span>
          Compare
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {sessions.map(session => {
          const isIncluded = includedIds.includes(session.id)
          const isA = session.id === matchAId
          const isB = session.id === matchBId
          const result = getResult(session)
          const date = session.match_date
            ? new Date(`${session.match_date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
            : '—'
          const score = session.our_score != null && session.opp_score != null
            ? `${session.our_score}–${session.opp_score}`
            : null

          return (
            <button
              key={session.id}
              onClick={() => handleCardClick(session.id)}
              className={cn(
                'flex-shrink-0 w-[168px] text-left rounded-xl border p-3.5 transition-all relative overflow-hidden',
                !compareMode && !isIncluded && 'opacity-35 border-zinc-900 bg-zinc-950',
                !compareMode && isIncluded && result === 'win' && 'border-emerald-900/60 bg-[#0d120d] hover:border-emerald-800/60',
                !compareMode && isIncluded && result !== 'win' && 'border-zinc-800/80 bg-[#0d0d10] hover:border-zinc-700',
                compareMode && isA && 'border-[#e8560a]/50 bg-[#120c08]',
                compareMode && isB && 'border-emerald-700/40 bg-[#081209]',
                compareMode && !isA && !isB && 'border-zinc-800/60 bg-[#0d0d10] hover:border-zinc-700',
              )}
            >
              {/* Result badge */}
              {result && (
                <span className={cn(
                  'absolute top-2.5 right-2.5 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-md',
                  result === 'win' && 'bg-emerald-900/50 text-emerald-400',
                  result === 'loss' && 'bg-red-900/50 text-red-400',
                  result === 'draw' && 'bg-yellow-900/50 text-yellow-400',
                )}>
                  {result.toUpperCase()}
                </span>
              )}

              {/* Compare label */}
              {compareMode && (isA || isB) && (
                <div className={cn('text-[9px] font-bold tracking-wider mb-1.5', isA ? 'text-[#e8560a]' : 'text-emerald-400')}>
                  {isA ? 'A' : 'B'}
                </div>
              )}

              <p className="text-[12px] font-semibold text-zinc-200 truncate pr-8 mb-0.5 leading-tight">
                vs {session.opposition ?? 'Unknown'}
              </p>
              <p className={cn(
                'text-[11px] font-semibold mb-2.5',
                compareMode && isA ? 'text-[#e8560a]' : compareMode && isB ? 'text-emerald-400' : 'text-zinc-400',
              )}>
                {date}
              </p>

              {score ? (
                <p className={cn(
                  'text-[22px] font-black leading-none tracking-tight mb-0.5',
                  result === 'win' ? 'text-emerald-400' : result === 'loss' ? 'text-red-400' : 'text-zinc-300',
                )}>
                  {score}
                </p>
              ) : (
                <p className="text-[18px] font-black leading-none text-zinc-700 mb-0.5">—</p>
              )}

              <p className="text-[9px] text-zinc-700 mt-2">
                {session.events.length} events
                {session.analyst?.display_name ? ` · ${session.analyst.display_name}` : ''}
              </p>
            </button>
          )
        })}

        {/* Upload placeholder */}
        <div className="flex-shrink-0 w-[120px] rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-1.5 text-zinc-700 cursor-default">
          <span className="text-xl">+</span>
          <span className="text-[10px]">Upload</span>
        </div>
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
git add "web/src/app/(app)/analyst/progression/components/MatchSelectorBar.tsx"
git commit -m "feat: redesign MatchSelectorBar with premium match cards"
```

---

## Task 6: KeyNumbers

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/KeyNumbers.tsx`

- [ ] **Step 1: Create KeyNumbers.tsx**

```tsx
// web/src/app/(app)/analyst/progression/components/KeyNumbers.tsx
'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { countEvents } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
}

export function KeyNumbers({ sessions, includedIds }: Props) {
  const included = useMemo(
    () => sessions.filter(s => includedIds.includes(s.id)),
    [sessions, includedIds],
  )

  const stats = useMemo(() => {
    let totalEvents = 0
    let totalTackles = 0
    let totalErrors = 0
    let bestScore: string | null = null
    let bestOpponent: string | null = null
    let bestMargin = -Infinity

    for (const s of included) {
      totalEvents += s.events.length
      const counts = countEvents(s.events)
      totalTackles += counts['tackle'] ?? 0
      totalErrors += (counts['error'] ?? 0) + (counts['missed_tackle'] ?? 0)

      if (s.our_score != null && s.opp_score != null) {
        const margin = s.our_score - s.opp_score
        if (margin > bestMargin) {
          bestMargin = margin
          bestScore = `${s.our_score}–${s.opp_score}`
          bestOpponent = s.opposition ?? 'Unknown'
        }
      }
    }

    const avgTackles = included.length ? (totalTackles / included.length).toFixed(1) : '—'
    const errorsPerMatch = included.length ? (totalErrors / included.length).toFixed(1) : '—'
    const errorConcern = included.length >= 3 && totalErrors / included.length > 5

    return { totalEvents, avgTackles, totalErrors, errorsPerMatch, errorConcern, bestScore, bestOpponent }
  }, [included])

  const cards = [
    {
      value: stats.totalEvents.toString(),
      label: 'Total events',
      trend: `${included.length} match${included.length !== 1 ? 'es' : ''} tracked`,
      trendColor: 'text-zinc-600',
      accent: 'from-[#e8560a]',
      valueColor: 'text-[#e8560a]',
    },
    {
      value: stats.avgTackles,
      label: 'Avg tackles / match',
      trend: '↑ improving',
      trendColor: 'text-emerald-500',
      accent: 'from-emerald-500',
      valueColor: 'text-emerald-400',
    },
    {
      value: stats.totalErrors.toString(),
      label: 'Total errors',
      trend: stats.errorConcern ? '⚠ Persistent concern' : `${stats.errorsPerMatch}/match avg`,
      trendColor: stats.errorConcern ? 'text-red-400' : 'text-zinc-600',
      accent: 'from-red-500',
      valueColor: 'text-red-400',
    },
    {
      value: stats.bestScore ?? '—',
      label: 'Best scoreline',
      trend: stats.bestOpponent ? `vs ${stats.bestOpponent}` : 'No scores recorded',
      trendColor: 'text-zinc-600',
      accent: 'from-zinc-500',
      valueColor: 'text-white',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => (
        <div key={card.label} className="relative bg-[#0d0d10] border border-zinc-900 rounded-xl p-4 overflow-hidden">
          {/* Bottom accent line */}
          <div className={cn('absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r to-transparent', card.accent)} />
          <div className={cn('text-[36px] font-black leading-none tracking-tight mb-1.5', card.valueColor)}>
            {card.value}
          </div>
          <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
            {card.label}
          </div>
          <div className={cn('text-[10px]', card.trendColor)}>{card.trend}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd web && npx tsc --noEmit 2>&1 | head -10
git add "web/src/app/(app)/analyst/progression/components/KeyNumbers.tsx"
git commit -m "feat: add KeyNumbers headline stats strip"
```

---

## Task 7: AiInsightCard

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/AiInsightCard.tsx`

- [ ] **Step 1: Create AiInsightCard.tsx**

```tsx
// web/src/app/(app)/analyst/progression/components/AiInsightCard.tsx
'use client'

import { useState, useTransition } from 'react'
import { readStreamableValue } from 'ai/rsc'
import { cn } from '@/lib/utils'
import { generateTeamInsight } from '../actions'

interface Props {
  savedContent: string | null
  savedHash: string | null
  currentHash: string
  sessionIds: string[]
  clubName: string
}

export function AiInsightCard({ savedContent, savedHash, currentHash, sessionIds, clubName }: Props) {
  const [content, setContent] = useState(savedContent ?? '')
  const [activeHash, setActiveHash] = useState(savedHash)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isStale = activeHash !== null && activeHash !== currentHash
  const hasContent = content.length > 0

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const { stream, hash } = await generateTeamInsight({ sessionIds, clubName })
        setContent('')
        setActiveHash(hash)
        for await (const delta of readStreamableValue(stream)) {
          if (delta) setContent(prev => prev + delta)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate insight.')
      }
    })
  }

  return (
    <div className="relative bg-[#0d0d10] border border-[#e8560a]/20 rounded-xl p-5 overflow-hidden">
      {/* Radial glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[radial-gradient(circle,rgba(232,86,10,0.06),transparent_70%)] pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full bg-[#e8560a] flex-shrink-0',
            isPending && 'animate-pulse',
          )} />
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#e8560a]">
            AI Coaching Insight
          </span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/25 text-[#e8560a] hover:bg-[#e8560a]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Generating…' : hasContent ? 'Regenerate' : 'Generate insights'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-2">{error}</p>
      )}

      {hasContent ? (
        <p className="text-sm text-zinc-300 leading-relaxed">{content}</p>
      ) : !isPending ? (
        <p className="text-sm text-zinc-600 italic">
          Click "Generate insights" to get AI coaching observations for this selection.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-full" />
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-5/6" />
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-4/6" />
        </div>
      )}

      {isStale && !isPending && (
        <p className="text-[10px] text-zinc-600 mt-3">
          ⚠ Match selection changed — regenerate for updated insights.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd web && npx tsc --noEmit 2>&1 | head -10
git add "web/src/app/(app)/analyst/progression/components/AiInsightCard.tsx"
git commit -m "feat: add AiInsightCard with on-demand streaming"
```

---

## Task 8: ConcernsPanel

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/ConcernsPanel.tsx`

- [ ] **Step 1: Create ConcernsPanel.tsx**

```tsx
// web/src/app/(app)/analyst/progression/components/ConcernsPanel.tsx
'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { countEvents, getPolarity } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  statTypes: string[]
}

interface ConcernRow {
  statType: string
  total: number
  perMatch: number
  badMatchCount: number
  includedCount: number
  isNegative: boolean
  barWidth: number
}

export function ConcernsPanel({ sessions, includedIds, statTypes }: Props) {
  const rows = useMemo((): ConcernRow[] => {
    const included = sessions.filter(s => includedIds.includes(s.id))
    if (!included.length) return []

    const statTotals: Record<string, number[]> = {}
    for (const session of included) {
      const counts = countEvents(session.events)
      for (const st of statTypes) {
        if (!statTotals[st]) statTotals[st] = []
        statTotals[st].push(counts[st] ?? 0)
      }
    }

    const rows: ConcernRow[] = statTypes.map(statType => {
      const values = statTotals[statType] ?? []
      const total = values.reduce((a, b) => a + b, 0)
      const perMatch = included.length ? total / included.length : 0
      const avg = perMatch
      const isNegative = getPolarity(statType) === 'negative'

      const badMatchCount = values.filter(v =>
        isNegative ? v > avg : v < avg,
      ).length

      return {
        statType,
        total,
        perMatch,
        badMatchCount,
        includedCount: included.length,
        isNegative,
        barWidth: 0,
      }
    })

    // Bar width relative to max total
    const maxTotal = Math.max(...rows.map(r => r.total), 1)
    return rows
      .map(r => ({ ...r, barWidth: Math.round((r.total / maxTotal) * 100) }))
      .sort((a, b) => {
        // Sort: concern stats first (high bad match count), then good stats
        const scoreA = a.badMatchCount * (a.isNegative ? 2 : 1)
        const scoreB = b.badMatchCount * (b.isNegative ? 2 : 1)
        return scoreB - scoreA
      })
      .slice(0, 6)
  }, [sessions, includedIds, statTypes])

  if (!rows.length) return null

  return (
    <div className="bg-[#0d0d10] border border-zinc-900 rounded-xl p-5">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600 mb-4">
        Team concerns — all included matches
      </p>
      <div className="space-y-4">
        {rows.map(row => {
          const isConcern = row.isNegative && row.badMatchCount >= Math.ceil(row.includedCount * 0.6)
          const isWarning = row.isNegative && row.badMatchCount >= Math.ceil(row.includedCount * 0.4)
          const isGood = !row.isNegative && row.badMatchCount < Math.ceil(row.includedCount * 0.4)

          const badgeText = row.includedCount <= 1
            ? null
            : isConcern
              ? `⚠ ${row.badMatchCount === row.includedCount ? 'All' : row.badMatchCount} of ${row.includedCount} matches`
              : isGood
                ? 'Strong'
                : 'On track'

          const badgeClass = isConcern
            ? 'bg-red-900/30 text-red-400'
            : isWarning
              ? 'bg-orange-900/30 text-orange-400'
              : 'bg-emerald-900/20 text-emerald-500'

          const barGradient = isConcern
            ? 'from-red-500 to-orange-500'
            : isWarning
              ? 'from-orange-500 to-yellow-500'
              : 'from-emerald-500 to-teal-400'

          return (
            <div key={row.statType}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-semibold text-zinc-300 capitalize">
                  {row.statType.replace(/_/g, ' ')}
                </span>
                {badgeText && (
                  <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', badgeClass)}>
                    {badgeText}
                  </span>
                )}
              </div>
              <div className="h-[5px] bg-zinc-900 rounded-full overflow-hidden mb-1">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r', barGradient)}
                  style={{ width: `${row.barWidth}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600">
                <span>{row.total} total</span>
                <span>{row.perMatch.toFixed(1)}/match avg</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd web && npx tsc --noEmit 2>&1 | head -10
git add "web/src/app/(app)/analyst/progression/components/ConcernsPanel.tsx"
git commit -m "feat: add ConcernsPanel replacing WeaknessHeatmap"
```

---

## Task 9: PlayerTable

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/PlayerTable.tsx`

- [ ] **Step 1: Create PlayerTable.tsx**

```tsx
// web/src/app/(app)/analyst/progression/components/PlayerTable.tsx
'use client'

import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { computePlayerStats, countEvents } from '@/lib/match-analysis/aggregate'
import { ExportPanel } from './ExportPanel'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  resolvedPlayers: ResolvedPlayer[]
  statTypes: string[]
  onSelectPlayer: (player: ResolvedPlayer) => void
}

const TREND_DISPLAY: Record<string, { symbol: string; color: string }> = {
  'up-strong': { symbol: '↑↑', color: 'text-emerald-400' },
  'up':        { symbol: '↑',  color: 'text-emerald-500' },
  'flat':      { symbol: '→',  color: 'text-zinc-500' },
  'down':      { symbol: '↓',  color: 'text-red-400' },
  'down-strong': { symbol: '↓↓', color: 'text-red-400' },
}

export function PlayerTable({
  sessions,
  includedIds,
  resolvedPlayers,
  statTypes,
  onSelectPlayer,
}: Props) {
  const [showAll, setShowAll] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => resolvedPlayers.map(p => p.key))

  const eligible = useMemo(
    () => resolvedPlayers.filter(p => p.sessionCount >= 2),
    [resolvedPlayers],
  )

  const rows = useMemo(() => {
    return eligible
      .map(player => {
        const stats = computePlayerStats(player.key, sessions, includedIds, statTypes)
        const carries = stats.find(s => s.statType === 'carry')
        const tackles = stats.find(s => s.statType === 'tackle')
        const errors = stats.find(s => s.statType === 'error') ?? stats.find(s => s.statType === 'missed_tackle')

        // Overall involvement for sorting
        const totalInvolvement = sessions
          .filter(s => includedIds.includes(s.id))
          .reduce((n, s) => {
            const c = countEvents(s.events, player.key)
            return n + (c['carry'] ?? 0) + (c['tackle'] ?? 0)
          }, 0)

        // Dominant trend (worst declining stat)
        const dominantTrend = stats
          .filter(s => s.avg > 0)
          .sort((a, b) => {
            const order = ['down-strong', 'down', 'flat', 'up', 'up-strong']
            return order.indexOf(a.trend) - order.indexOf(b.trend)
          })[0]?.trend ?? 'flat'

        const hasDecline = stats.some(s => s.hasDecline)
        const decliningStats = stats.filter(s => s.hasDecline).map(s => s.statType.replace(/_/g, ' '))

        return {
          player,
          carriesAvg: carries?.avg ?? 0,
          tacklesAvg: tackles?.avg ?? 0,
          errorsAvg: errors?.avg ?? 0,
          totalInvolvement,
          dominantTrend,
          hasDecline,
          decliningStats,
        }
      })
      .sort((a, b) => b.totalInvolvement - a.totalInvolvement)
  }, [eligible, sessions, includedIds, statTypes])

  const displayRows = showAll ? rows : rows.slice(0, 10)

  if (!rows.length) {
    return (
      <div className="bg-[#0d0d10] border border-zinc-900 rounded-xl p-8 text-center">
        <p className="text-sm text-zinc-500">No players appear in 2+ included sessions.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#0d0d10] border border-zinc-900 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-900">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
          Players — click to open dossier
        </span>
        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-[#e8560a]/8 border border-[#e8560a]/20 text-[#e8560a] hover:bg-[#e8560a]/15 transition-colors"
        >
          <Download size={11} />
          Export
        </button>
      </div>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-900">
            <th className="text-left px-5 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">Player</th>
            <th className="text-right px-3 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">Carries</th>
            <th className="text-right px-3 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">Tackles</th>
            <th className="text-right px-3 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">Errors</th>
            <th className="text-right px-5 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-700">Trend</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map(({ player, carriesAvg, tacklesAvg, errorsAvg, dominantTrend, hasDecline, decliningStats }) => {
            const trend = TREND_DISPLAY[dominantTrend] ?? TREND_DISPLAY['flat']
            return (
              <tr
                key={player.key}
                onClick={() => onSelectPlayer(player)}
                className="border-b border-zinc-900/60 cursor-pointer hover:bg-zinc-900/40 transition-colors group"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[11px] font-bold text-[#e8560a] flex-shrink-0 group-hover:border-[#e8560a]/30 group-hover:bg-[#e8560a]/8 transition-colors">
                      {player.primaryNumber}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-zinc-200">{player.name}</p>
                      <p className="text-[9px] text-zinc-600">{player.sessionCount} matches</p>
                      {hasDecline && (
                        <p className="text-[9px] text-red-400 mt-0.5">
                          ↓ {decliningStats.slice(0, 2).join(', ')} declining
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className={cn('text-right px-3 py-3 font-mono', carriesAvg > 0 ? 'text-zinc-300' : 'text-zinc-700')}>
                  {carriesAvg > 0 ? carriesAvg.toFixed(1) : '—'}
                </td>
                <td className={cn('text-right px-3 py-3 font-mono font-semibold', tacklesAvg > 0 ? 'text-zinc-200' : 'text-zinc-700')}>
                  {tacklesAvg > 0 ? tacklesAvg.toFixed(1) : '—'}
                </td>
                <td className={cn('text-right px-3 py-3 font-mono', errorsAvg > 0.5 ? 'text-red-400' : errorsAvg > 0 ? 'text-zinc-400' : 'text-zinc-700')}>
                  {errorsAvg > 0 ? errorsAvg.toFixed(1) : '—'}
                </td>
                <td className={cn('text-right px-5 py-3 font-black text-sm', trend.color)}>
                  {trend.symbol}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {rows.length > 10 && (
        <div className="px-5 py-3 border-t border-zinc-900">
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showAll ? 'Show fewer' : `Show all ${rows.length} players`}
          </button>
        </div>
      )}

      <ExportPanel
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        sessions={sessions}
        players={eligible}
        statTypes={statTypes}
        defaultIncludedIds={includedIds}
        defaultSelectedKeys={selectedKeys}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd web && npx tsc --noEmit 2>&1 | head -10
git add "web/src/app/(app)/analyst/progression/components/PlayerTable.tsx"
git commit -m "feat: add PlayerTable replacing ReportCardsTab"
```

---

## Task 10: PlayerDossier

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/PlayerDossier.tsx`

- [ ] **Step 1: Create PlayerDossier.tsx**

```tsx
// web/src/app/(app)/analyst/progression/components/PlayerDossier.tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { readStreamableValue } from 'ai/rsc'
import { cn } from '@/lib/utils'
import { computePlayerStats } from '@/lib/match-analysis/aggregate'
import { generatePlayerInsight } from '../actions'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  player: ResolvedPlayer | null
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  statTypes: string[]
  savedInsights: Record<string, { content: string; hash: string }>
  currentHash: string
  onClose: () => void
}

const BAR_COLOURS = ['#e8560a', '#63b478', '#6b8cca', '#c9a84c', '#9b72c8', '#f87171']

const TREND_DISPLAY: Record<string, { symbol: string; color: string }> = {
  'up-strong': { symbol: '↑↑', color: 'text-emerald-400' },
  'up':        { symbol: '↑',  color: 'text-emerald-500' },
  'flat':      { symbol: '→',  color: 'text-zinc-500' },
  'down':      { symbol: '↓',  color: 'text-red-400' },
  'down-strong': { symbol: '↓↓', color: 'text-red-400' },
}

export function PlayerDossier({ player, sessions, includedIds, statTypes, savedInsights, currentHash, onClose }: Props) {
  const [aiContent, setAiContent] = useState<string | null>(null)
  const [aiHash, setAiHash] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [aiError, setAiError] = useState<string | null>(null)

  const includedSessions = useMemo(
    () => sessions
      .filter(s => includedIds.includes(s.id))
      .sort((a, b) => (a.match_date ?? '').localeCompare(b.match_date ?? '')),
    [sessions, includedIds],
  )

  const stats = useMemo(() => {
    if (!player) return []
    return computePlayerStats(player.key, sessions, includedIds, statTypes)
  }, [player, sessions, includedIds, statTypes])

  const chartData = useMemo(() => {
    if (!player) return []
    return includedSessions.map((session, idx) => {
      const point: Record<string, number | string> = {
        match: session.opposition
          ? `${session.opposition.split(' ')[0]} · ${session.match_date ? new Date(`${session.match_date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}`
          : `Match ${idx + 1}`,
      }
      for (const stat of stats) {
        point[stat.statType] = stat.values[idx] ?? 0
      }
      return point
    })
  }, [includedSessions, stats, player])

  // Saved insight for this player
  const savedForPlayer = player ? savedInsights[player.key] : null
  const displayContent = aiContent ?? savedForPlayer?.content ?? null
  const displayHash = aiHash ?? savedForPlayer?.hash ?? null
  const isStale = displayHash !== null && displayHash !== currentHash

  function handleGenerateInsight() {
    if (!player) return
    setAiError(null)
    startTransition(async () => {
      try {
        const { stream, hash } = await generatePlayerInsight({
          playerKey: player.key,
          playerName: player.name,
          playerNumber: player.primaryNumber,
          sessionIds: includedIds,
        })
        setAiContent('')
        setAiHash(hash)
        for await (const delta of readStreamableValue(stream)) {
          if (delta) setAiContent(prev => (prev ?? '') + delta)
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'Failed to generate insight.')
      }
    })
  }

  const activeStats = stats.filter(s => s.avg > 0 || s.best > 0)
  const bestStat = activeStats.reduce((a, b) => (a.avg > b.avg ? a : b), activeStats[0])
  const hasAnyDecline = stats.some(s => s.hasDecline)

  if (!player) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[560px] bg-[#060608] border-l border-zinc-900 z-50 overflow-y-auto flex flex-col">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-[#0f0e14] to-[#090910] border-b border-zinc-900 p-7 overflow-hidden flex-shrink-0">
          {/* Ghost jersey number */}
          <div className="absolute bottom-2 right-5 text-[80px] font-black text-white/[0.04] leading-none select-none pointer-events-none">
            {player.primaryNumber}
          </div>

          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={13} />
          </button>

          <p className="text-xs font-bold text-[#e8560a] mb-1">Jersey #{player.primaryNumber}</p>
          <h2 className="text-[26px] font-black leading-tight tracking-tight text-white mb-1">
            {player.name}
          </h2>
          <p className="text-[11px] text-zinc-600">
            {player.sessionCount} of {includedSessions.length} matches
            {player.numberMismatch && (
              <span className="ml-2 text-yellow-600">⚠ Multiple jersey numbers</span>
            )}
          </p>

          {/* Pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {hasAnyDecline && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-900/25 text-red-400">
                ↓ Stat declining
              </span>
            )}
            {bestStat && bestStat.avg > 0 && (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-900/20 text-emerald-400">
                ↑ Strong {bestStat.statType.replace(/_/g, ' ')}
              </span>
            )}
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#e8560a]/10 text-[#e8560a]">
              High involvement
            </span>
          </div>
        </div>

        {/* Chart */}
        {includedSessions.length >= 2 && activeStats.length > 0 && (
          <div className="p-6 border-b border-zinc-900">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-4">
              Performance across {includedSessions.length} matches
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
                  contentStyle={{ background: '#111113', border: '1px solid #27272a', borderRadius: '8px', fontSize: '11px' }}
                  labelStyle={{ color: '#a1a1aa' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px', color: '#71717a', paddingTop: '8px' }}
                  formatter={v => v.replace(/_/g, ' ')}
                />
                {activeStats.map((stat, i) => (
                  <Bar
                    key={stat.statType}
                    dataKey={stat.statType}
                    fill={BAR_COLOURS[i % BAR_COLOURS.length]}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={28}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stat grid */}
        {activeStats.length > 0 && (
          <div className="p-6 border-b border-zinc-900">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-4">
              Stat breakdown
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {activeStats.slice(0, 4).map(stat => {
                const trend = TREND_DISPLAY[stat.trend] ?? TREND_DISPLAY['flat']
                return (
                  <div key={stat.statType} className="bg-[#0d0d10] border border-zinc-900 rounded-xl p-3.5">
                    <p className="text-[10px] text-zinc-600 capitalize mb-2">{stat.statType.replace(/_/g, ' ')}</p>
                    <p className="text-[24px] font-black leading-none text-white mb-1">
                      {stat.avg.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-zinc-600 mb-2">avg per match</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-500">{stat.best} best</span>
                      <span className={cn('text-[13px] font-black', trend.color)}>{trend.symbol}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AI coaching observation */}
        <div className="p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
            AI coaching observation
          </p>
          <div className="relative bg-[#0d0d10] border border-[#e8560a]/15 rounded-xl p-4 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle,rgba(232,86,10,0.05),transparent_70%)] pointer-events-none" />

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={cn('w-1.5 h-1.5 rounded-full bg-[#e8560a]', isPending && 'animate-pulse')} />
                <span className="text-[9px] font-bold tracking-widest uppercase text-[#e8560a]">AI Insight</span>
              </div>
              <button
                onClick={handleGenerateInsight}
                disabled={isPending}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#e8560a]/8 border border-[#e8560a]/20 text-[#e8560a] hover:bg-[#e8560a]/15 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Generating…' : displayContent ? 'Regenerate' : 'Generate'}
              </button>
            </div>

            {aiError && <p className="text-[11px] text-red-400 mb-2">{aiError}</p>}

            {displayContent ? (
              <p className="text-[12px] text-zinc-300 leading-relaxed">{displayContent}</p>
            ) : isPending ? (
              <div className="space-y-2">
                <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-full" />
                <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-5/6" />
              </div>
            ) : (
              <p className="text-[11px] text-zinc-600 italic">
                Click "Generate" for a coaching observation on {player.name}.
              </p>
            )}

            {isStale && !isPending && (
              <p className="text-[9px] text-zinc-600 mt-2">⚠ Session selection changed</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
git add "web/src/app/(app)/analyst/progression/components/PlayerDossier.tsx"
git commit -m "feat: add PlayerDossier slide-over with BarChart and AI insight"
```

---

## Task 11: Sidebar

**Files:**
- Create: `web/src/app/(app)/analyst/progression/components/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar.tsx**

```tsx
// web/src/app/(app)/analyst/progression/components/Sidebar.tsx
'use client'

import { useMemo } from 'react'
import { countEvents } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  resolvedPlayers: ResolvedPlayer[]
}

function SeasonRecord({ sessions }: { sessions: MatchSessionWithAnalyst[] }) {
  return (
    <div className="bg-[#0d0d10] border border-zinc-900 rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
        Season record
      </p>
      <div className="space-y-0">
        {sessions.map((s, i) => {
          const date = s.match_date
            ? new Date(`${s.match_date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : '—'
          const hasScore = s.our_score != null && s.opp_score != null
          const isWin = hasScore && s.our_score! > s.opp_score!

          return (
            <div key={s.id} className={`flex items-center justify-between py-2.5 ${i < sessions.length - 1 ? 'border-b border-zinc-900' : ''}`}>
              <div>
                <p className="text-[12px] font-semibold text-zinc-300 truncate max-w-[140px]">
                  vs {s.opposition ?? 'Unknown'}
                </p>
                <p className="text-[10px] text-zinc-600">{date}</p>
              </div>
              <p className={`text-[15px] font-black tracking-tight ${isWin ? 'text-emerald-400' : hasScore ? 'text-red-400' : 'text-zinc-700'}`}>
                {hasScore ? `${s.our_score}–${s.opp_score}` : '—'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Leaderboard({
  title,
  players,
  sessions,
  includedIds,
  statType,
}: {
  title: string
  players: ResolvedPlayer[]
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  statType: string
}) {
  const top = useMemo(() => {
    return players
      .map(p => ({
        player: p,
        total: sessions
          .filter(s => includedIds.includes(s.id))
          .reduce((n, s) => n + (countEvents(s.events, p.key)[statType] ?? 0), 0),
      }))
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
  }, [players, sessions, includedIds, statType])

  if (!top.length) return null

  return (
    <div className="bg-[#0d0d10] border border-zinc-900 rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">{title}</p>
      <div className="space-y-0">
        {top.map(({ player, total }, i) => (
          <div key={player.key} className={`flex items-center gap-3 py-2.5 ${i < top.length - 1 ? 'border-b border-zinc-900' : ''}`}>
            <span className="text-[11px] font-bold text-zinc-700 w-4">{i + 1}</span>
            <div className="w-7 h-7 rounded-full bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center text-[10px] font-bold text-[#e8560a] flex-shrink-0">
              {player.primaryNumber}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-zinc-300 truncate">{player.name}</p>
              <p className="text-[9px] text-zinc-600">{statType.replace(/_/g, ' ')}</p>
            </div>
            <p className="text-[18px] font-black text-[#e8560a] leading-none">{total}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sidebar({ sessions, includedIds, resolvedPlayers }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <SeasonRecord sessions={sessions} />
      <Leaderboard
        title="Top tacklers"
        players={resolvedPlayers}
        sessions={sessions}
        includedIds={includedIds}
        statType="tackle"
      />
      <Leaderboard
        title="Top ball carriers"
        players={resolvedPlayers}
        sessions={sessions}
        includedIds={includedIds}
        statType="carry"
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd web && npx tsc --noEmit 2>&1 | head -10
git add "web/src/app/(app)/analyst/progression/components/Sidebar.tsx"
git commit -m "feat: add Sidebar with season record and leaderboards"
```

---

## Task 12: ProgressionClient — Full Rewrite

**Files:**
- Replace: `web/src/app/(app)/analyst/progression/ProgressionClient.tsx`

- [ ] **Step 1: Replace ProgressionClient.tsx**

```tsx
// web/src/app/(app)/analyst/progression/ProgressionClient.tsx
'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { KeyNumbers } from './components/KeyNumbers'
import { AiInsightCard } from './components/AiInsightCard'
import { ConcernsPanel } from './components/ConcernsPanel'
import { PlayerTable } from './components/PlayerTable'
import { PlayerDossier } from './components/PlayerDossier'
import { Sidebar } from './components/Sidebar'
import { MatchSelectorBar } from './components/MatchSelectorBar'
import { ComparisonTable } from './components/ComparisonTable'
import { resolvePlayers, getAllStatTypes } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst, ProgressionInsight, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  savedInsights: ProgressionInsight[]
  clubName: string
}

export function ProgressionClient({ sessions, savedInsights, clubName }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ── URL state ──────────────────────────────────────────────────────────────
  const includedIds = useMemo(() => {
    const raw = searchParams.get('included')
    if (!raw) return sessions.map(s => s.id)
    return raw.split(',').filter(id => sessions.some(s => s.id === id))
  }, [searchParams, sessions])

  const matchAId = searchParams.get('a') ?? null
  const matchBId = searchParams.get('b') ?? null
  const compareMode = searchParams.get('compare') === '1'

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
    setParams({ compare: compareMode ? null : '1', a: compareMode ? null : matchAId, b: compareMode ? null : matchBId })
  }, [compareMode, matchAId, matchBId, setParams])

  const selectMatchA = useCallback((id: string) => setParams({ a: id }), [setParams])
  const selectMatchB = useCallback((id: string) => setParams({ b: id }), [setParams])

  // ── Local state ────────────────────────────────────────────────────────────
  const [openPlayer, setOpenPlayer] = useState<ResolvedPlayer | null>(null)

  // ── Derived data ───────────────────────────────────────────────────────────
  const resolvedPlayers = useMemo(
    () => resolvePlayers(sessions.filter(s => includedIds.includes(s.id))),
    [sessions, includedIds],
  )

  const statTypes = useMemo(
    () => getAllStatTypes(sessions.filter(s => includedIds.includes(s.id))),
    [sessions, includedIds],
  )

  // ── Insight helpers ────────────────────────────────────────────────────────
  const currentHash = useMemo(
    () => btoa([...includedIds].sort().join(',')),
    [includedIds],
  )

  const teamInsight = useMemo(
    () => savedInsights.find(i => i.scope === 'team' && i.session_ids_hash === currentHash) ?? null,
    [savedInsights, currentHash],
  )

  // Saved player insights keyed by player key
  const playerInsights = useMemo(
    () => Object.fromEntries(
      savedInsights
        .filter(i => i.scope !== 'team')
        .map(i => [i.scope, { content: i.content, hash: i.session_ids_hash }]),
    ),
    [savedInsights],
  )

  // ComparisonTable sessions
  const sessionA = sessions.find(s => s.id === matchAId) ?? null
  const sessionB = sessions.find(s => s.id === matchBId) ?? null

  return (
    <>
      {/* Hero */}
      <div className="mb-6">
        <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#e8560a] mb-2 flex items-center gap-2">
          <span className="inline-block w-5 h-0.5 bg-[#e8560a] rounded" />
          Match Analysis
        </p>
        <h1 className="text-[28px] font-black tracking-[-0.6px] text-white leading-none mb-1">
          {clubName.split(' ').slice(0, -1).join(' ')}{' '}
          <span className="text-[#e8560a]">{clubName.split(' ').slice(-1)[0]}</span>
        </h1>
        <p className="text-[13px] text-zinc-600">
          {sessions.length} match{sessions.length !== 1 ? 'es' : ''} · {resolvedPlayers.length} players tracked
        </p>
      </div>

      {/* Match selector — sticky, full bleed */}
      <div className="-mx-6">
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
      </div>

      {/* Key numbers */}
      <div className="mt-6 mb-6">
        <KeyNumbers sessions={sessions} includedIds={includedIds} />
      </div>

      {/* Comparison table — only in compare mode with both matches selected */}
      {compareMode && sessionA && sessionB && (
        <div className="mb-6">
          <ComparisonTable
            sessionA={sessionA}
            sessionB={sessionB}
            statTypes={statTypes}
            resolvedPlayers={resolvedPlayers}
          />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          <AiInsightCard
            savedContent={teamInsight?.content ?? null}
            savedHash={teamInsight?.session_ids_hash ?? null}
            currentHash={currentHash}
            sessionIds={includedIds}
            clubName={clubName}
          />
          <ConcernsPanel
            sessions={sessions}
            includedIds={includedIds}
            statTypes={statTypes}
          />
          <PlayerTable
            sessions={sessions}
            includedIds={includedIds}
            resolvedPlayers={resolvedPlayers}
            statTypes={statTypes}
            onSelectPlayer={setOpenPlayer}
          />
        </div>

        {/* Right sidebar */}
        <div className="lg:sticky lg:top-[200px]">
          <Sidebar
            sessions={sessions}
            includedIds={includedIds}
            resolvedPlayers={resolvedPlayers}
          />
        </div>
      </div>

      {/* Player dossier slide-over */}
      {openPlayer && (
        <PlayerDossier
          player={openPlayer}
          sessions={sessions}
          includedIds={includedIds}
          statTypes={statTypes}
          savedInsights={playerInsights}
          currentHash={currentHash}
          onClose={() => setOpenPlayer(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors before committing.

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/(app)/analyst/progression/ProgressionClient.tsx"
git commit -m "feat: rewrite ProgressionClient with two-column premium layout"
```

---

## Task 13: Remove Old Components

**Files:**
- Delete: `web/src/app/(app)/analyst/progression/components/TeamReportTab.tsx`
- Delete: `web/src/app/(app)/analyst/progression/components/WeaknessHeatmap.tsx`
- Delete: `web/src/app/(app)/analyst/progression/components/PlayerReportCard.tsx`
- Delete: `web/src/app/(app)/analyst/progression/components/ReportCardsTab.tsx`

- [ ] **Step 1: Delete old components**

```bash
cd "web/src/app/(app)/analyst/progression/components"
rm TeamReportTab.tsx WeaknessHeatmap.tsx PlayerReportCard.tsx ReportCardsTab.tsx
```

- [ ] **Step 2: Type-check — confirm no remaining imports**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If there are "cannot find module" errors, the old component is still imported somewhere — find and remove the import.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old progression components replaced by redesign"
```

---

## Task 14: Apply Migration + Deploy

- [ ] **Step 1: Apply migration via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with project `khslkwspsqyopicxufun`, name `progression_insights`, and the SQL from Task 1.

- [ ] **Step 2: Verify table exists**

Run via `mcp__claude_ai_Supabase__execute_sql`:
```sql
select column_name, data_type from information_schema.columns
where table_name = 'progression_insights' order by ordinal_position;
```

Expected columns: `id`, `club_id`, `scope`, `session_ids_hash`, `content`, `generated_at`.

- [ ] **Step 3: Final type-check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Push to Vercel**

```bash
git push origin main
```

- [ ] **Step 5: Verify deployment**

Once Vercel build completes, navigate to `/analyst/progression` as a coach or admin and confirm:
- All 3 matches show in the selector (Clockface WIN badge visible)
- Key numbers strip loads
- Clicking a player row opens the dossier
- "Generate insights" button appears and streams when clicked
- Sidebar leaderboards show top tacklers and carriers

---

## Self-Review

**Spec coverage:**
- ✅ `progression_insights` migration — Task 1
- ✅ `ProgressionInsight` type — Task 2
- ✅ `generateTeamInsight` streaming server action — Task 3
- ✅ `generatePlayerInsight` streaming server action — Task 3
- ✅ Stale detection (`btoa` hash comparison) — Task 3 + 7 + 10 + 12
- ✅ Prompt design (team + player) — Task 3
- ✅ `page.tsx` fetches saved insights — Task 4
- ✅ Match cards with WIN/LOSS/NO SCORE badges + gradient overlays — Task 5
- ✅ Key numbers strip (4 cards, coloured accent lines) — Task 6
- ✅ AI insight card with streaming + stale indicator — Task 7
- ✅ Concerns panel replacing heatmap, ranked, gradient bars — Task 8
- ✅ Player table with decline badges, sorted by involvement, show-all — Task 9
- ✅ Player dossier: hero, BarChart, stat grid, AI insight — Task 10
- ✅ Sidebar: season record + top tacklers + top carriers — Task 11
- ✅ Two-column layout (1fr + 300px sidebar) — Task 12
- ✅ Comparison table conditionally rendered in compare mode — Task 12
- ✅ Old components deleted — Task 13
- ✅ Export panel retained (used in PlayerTable) — Task 9
- ✅ Supabase migration applied + Vercel deploy — Task 14

**Type consistency check:**
- `generateTeamInsight` returns `{ stream: StreamableValue<string>, hash: string }` — matches AiInsightCard usage ✓
- `generatePlayerInsight` returns same shape — matches PlayerDossier usage ✓
- `ProgressionClient` receives `savedInsights: ProgressionInsight[]` — matches page.tsx ✓
- `PlayerDossier` receives `savedInsights: Record<string, { content: string; hash: string }>` — matches ProgressionClient mapping ✓
- `PlayerTable` receives `onSelectPlayer: (player: ResolvedPlayer) => void` — matches ProgressionClient `setOpenPlayer` ✓
