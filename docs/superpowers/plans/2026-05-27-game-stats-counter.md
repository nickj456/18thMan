# Game Stats Counter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live sideline game stats counter that lets coaches tap-count carries and tackles per player, track set completion by half, and share results as a PDF or WhatsApp message.

**Architecture:** Event-log data model — each tap inserts a `game_stat_events` row, counts are derived via `COUNT(*)`. A client component subscribes to Supabase Realtime so the review view updates live. Server actions handle all writes. PDF is generated server-side via a route handler.

**Tech Stack:** Next.js App Router, Supabase (Postgres + Realtime + RLS), `@react-pdf/renderer`, shadcn/ui, Tailwind CSS (dark theme).

---

## File Map

| File | Purpose |
|------|---------|
| `web/supabase/migrations/059_game_stats.sql` | Schema + RLS for `game_stat_sessions` and `game_stat_events` |
| `web/src/lib/supabase/types.ts` | Add `StatType`, `GameStatSession`, `GameStatEvent`, `GameStatSessionWithMatch`, `Match` types |
| `web/src/app/(app)/groups/[id]/page.tsx` | Add Game Stats section card |
| `web/src/app/(app)/groups/[id]/game-stats/page.tsx` | List all stat sessions for this group |
| `web/src/app/(app)/groups/[id]/game-stats/new/page.tsx` | Server page: load matches, render form |
| `web/src/app/(app)/groups/[id]/game-stats/new/CreateSessionForm.tsx` | Client form: select match → submit |
| `web/src/app/(app)/groups/[id]/game-stats/new/actions.ts` | Server action: `createSession` |
| `web/src/app/(app)/groups/[id]/game-stats/[sessionId]/page.tsx` | Server page: auth check, load session + players + events |
| `web/src/app/(app)/groups/[id]/game-stats/[sessionId]/GameStatsClient.tsx` | Client component: full tally + review UI |
| `web/src/app/(app)/groups/[id]/game-stats/[sessionId]/actions.ts` | Server actions: `addEvent`, `undoEvent` |
| `web/src/components/game-stats/GameStatsPDF.tsx` | React PDF component for stats export |
| `web/src/app/api/game-stats/[sessionId]/pdf/route.tsx` | GET route: generate + stream PDF |

---

## Task 1: Database Migration

**Files:**
- Create: `web/supabase/migrations/059_game_stats.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 059_game_stats.sql

create type public.stat_type as enum ('carry', 'tackle', 'set_completion');

-- ── Sessions ──────────────────────────────────────────────────────────────────

create table public.game_stat_sessions (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.coaching_groups(id) on delete cascade,
  match_id    uuid not null references public.matches(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  unique (match_id)
);

create index game_stat_sessions_group_id_idx on public.game_stat_sessions(group_id);

-- ── Events (one row per tap) ──────────────────────────────────────────────────

create table public.game_stat_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.game_stat_sessions(id) on delete cascade,
  player_id   uuid references public.players(id) on delete cascade,
  stat_type   public.stat_type not null,
  half        smallint not null default 1 check (half in (1, 2)),
  completed   boolean,
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now()
);

create index game_stat_events_session_id_idx on public.game_stat_events(session_id);
create index game_stat_events_player_id_idx  on public.game_stat_events(player_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.game_stat_sessions enable row level security;
alter table public.game_stat_events    enable row level security;

-- Sessions: club members can read; coach/admin can create if paid tier; creator/admin can delete
create policy "gss_select"
  on public.game_stat_sessions for select
  to authenticated
  using (
    exists (
      select 1
      from public.coaching_groups g
      join public.profiles p on p.club_id = g.club_id
      where g.id = game_stat_sessions.group_id
        and p.id = auth.uid()
    )
  );

create policy "gss_insert"
  on public.game_stat_sessions for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.coaching_groups g
      join public.profiles p on p.club_id = g.club_id
      where g.id = game_stat_sessions.group_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
    and public.effective_tier(auth.uid()) in ('club', 'trial')
  );

create policy "gss_delete"
  on public.game_stat_sessions for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Events: club members read; coach/admin insert; creator/admin delete (undo)
create policy "gse_select"
  on public.game_stat_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.game_stat_sessions s
      join public.coaching_groups g on g.id = s.group_id
      join public.profiles p on p.club_id = g.club_id
      where s.id = game_stat_events.session_id
        and p.id = auth.uid()
    )
  );

create policy "gse_insert"
  on public.game_stat_events for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.game_stat_sessions s
      join public.coaching_groups g on g.id = s.group_id
      join public.profiles p on p.club_id = g.club_id
      where s.id = game_stat_events.session_id
        and p.id = auth.uid()
        and p.role in ('coach', 'admin')
    )
  );

create policy "gse_delete"
  on public.game_stat_events for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

- [ ] **Step 2: Apply the migration to local Supabase**

Run from `web/`:
```bash
npx supabase migration up
```
Expected: migration applied with no errors. If local Supabase isn't running, start it first: `npx supabase start`.

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/059_game_stats.sql
git commit -m "feat: add game_stat_sessions and game_stat_events tables"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `web/src/lib/supabase/types.ts`

- [ ] **Step 1: Add new types to the bottom of `types.ts`**

```typescript
// ── Matches ───────────────────────────────────────────────────────────────────

export type MatchLocation = 'home' | 'away'
export type MatchResult  = 'win' | 'loss' | 'draw'

export interface Match {
  id: string
  group_id: string
  created_by: string
  opponent: string
  match_date: string
  location: MatchLocation
  our_score: number | null
  opponent_score: number | null
  result: MatchResult | null
  created_at: string
  updated_at: string
}

// ── Game Stats ────────────────────────────────────────────────────────────────

export type StatType = 'carry' | 'tackle' | 'set_completion'

export interface GameStatSession {
  id: string
  group_id: string
  match_id: string
  created_by: string
  created_at: string
}

export interface GameStatSessionWithMatch extends GameStatSession {
  match: Pick<Match, 'id' | 'opponent' | 'match_date' | 'location'>
}

export interface GameStatEvent {
  id: string
  session_id: string
  player_id: string | null
  stat_type: StatType
  half: 1 | 2
  completed: boolean | null
  created_by: string
  created_at: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `web/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/supabase/types.ts
git commit -m "feat: add Match, GameStatSession, GameStatEvent types"
```

---

## Task 3: Create Session — Action + Form + Page

**Files:**
- Create: `web/src/app/(app)/groups/[id]/game-stats/new/actions.ts`
- Create: `web/src/app/(app)/groups/[id]/game-stats/new/CreateSessionForm.tsx`
- Create: `web/src/app/(app)/groups/[id]/game-stats/new/page.tsx`

- [ ] **Step 1: Create the server action**

`web/src/app/(app)/groups/[id]/game-stats/new/actions.ts`:
```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createSession(
  groupId: string,
  matchId: string,
): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session, error } = await supabase
    .from('game_stat_sessions')
    .insert({ group_id: groupId, match_id: matchId, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/groups/${groupId}/game-stats/${session.id}`)
}
```

- [ ] **Step 2: Create the client form component**

`web/src/app/(app)/groups/[id]/game-stats/new/CreateSessionForm.tsx`:
```tsx
'use client'

import { useState, useTransition } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSession } from './actions'
import type { Match } from '@/lib/supabase/types'

interface Props {
  groupId: string
  matches: Pick<Match, 'id' | 'opponent' | 'match_date' | 'location'>[]
}

export function CreateSessionForm({ groupId, matches }: Props) {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMatchId) return
    setError(null)
    startTransition(async () => {
      const result = await createSession(groupId, selectedMatchId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Select Match
        </label>
        {matches.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No matches found for this group. Add matches via the Squad → Matches section first.
          </p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {matches.map(m => {
                const date = new Date(m.match_date).toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                })
                const isSelected = selectedMatchId === m.id
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedMatchId(m.id)}
                      className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-[#e8560a]/10 border-l-2 border-[#e8560a]'
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          vs {m.opponent}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {date} · {m.location === 'home' ? 'Home' : 'Away'}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#e8560a] shrink-0" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={!selectedMatchId || isPending}
        className="w-full bg-[#e8560a] hover:bg-[#d14d09] text-white"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin mr-2" />
        ) : (
          <Activity size={14} className="mr-2" />
        )}
        Start Tracking
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Create the server page**

`web/src/app/(app)/groups/[id]/game-stats/new/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CreateSessionForm } from './CreateSessionForm'
import type { Match } from '@/lib/supabase/types'

export const metadata = { title: 'New Game Stats — 18th Man' }

export default async function NewGameStatsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')
  if (!['coach', 'admin'].includes(profile.role)) redirect(`/groups/${id}/game-stats`)

  // Check paid tier
  const { data: tierData } = await supabase.rpc('effective_tier', { p_user_id: user.id })
  if (!['club', 'trial'].includes(tierData as string)) {
    redirect(`/groups/${id}/game-stats?upgrade=1`)
  }

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id')
    .eq('id', id)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  // Matches for this group that don't already have a stats session
  const { data: existingSessionMatchIds } = await supabase
    .from('game_stat_sessions')
    .select('match_id')
    .eq('group_id', id)

  const usedMatchIds = (existingSessionMatchIds ?? []).map(s => s.match_id)

  let matchQuery = supabase
    .from('matches')
    .select('id, opponent, match_date, location')
    .eq('group_id', id)
    .order('match_date', { ascending: false })

  if (usedMatchIds.length > 0) {
    matchQuery = matchQuery.not('id', 'in', `(${usedMatchIds.join(',')})`)
  }

  const { data: matches } = await matchQuery as {
    data: Pick<Match, 'id' | 'opponent' | 'match_date' | 'location'>[] | null
  }

  return (
    <div className="space-y-8 max-w-lg">
      <Link
        href={`/groups/${id}/game-stats`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> Game Stats
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center">
          <Activity size={18} className="text-[#e8560a]" />
        </div>
        <div>
          <h1 className="app-heading text-2xl">New Game Stats</h1>
          <p className="text-xs text-zinc-600 mt-0.5">{group.name}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <p className="text-sm text-zinc-400">
          Select a match to begin tracking. Players will be loaded automatically from your squad.
        </p>
        <CreateSessionForm groupId={id} matches={matches ?? []} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/\(app\)/groups/\[id\]/game-stats/new/
git commit -m "feat: add create game stats session page and action"
```

---

## Task 4: Sessions List Page + Group Page Link

**Files:**
- Create: `web/src/app/(app)/groups/[id]/game-stats/page.tsx`
- Modify: `web/src/app/(app)/groups/[id]/page.tsx`

- [ ] **Step 1: Create the sessions list page**

`web/src/app/(app)/groups/[id]/game-stats/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity, Plus, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { GameStatSessionWithMatch } from '@/lib/supabase/types'

export const metadata = { title: 'Game Stats — 18th Man' }

export default async function GameStatsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ upgrade?: string }>
}) {
  const { id } = await params
  const { upgrade } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id')
    .eq('id', id)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  const { data: sessions } = await supabase
    .from('game_stat_sessions')
    .select('id, group_id, match_id, created_by, created_at, match:matches(id, opponent, match_date, location)')
    .eq('group_id', id)
    .order('created_at', { ascending: false }) as {
      data: GameStatSessionWithMatch[] | null
    }

  const canCreate = ['coach', 'admin'].includes(profile.role)

  return (
    <div className="space-y-8 max-w-2xl">
      <Link
        href={`/groups/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
      >
        <ArrowLeft size={12} /> {group.name}
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center">
            <Activity size={18} className="text-[#e8560a]" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">Game Stats</h1>
            <p className="text-xs text-zinc-600 mt-0.5">{group.name}</p>
          </div>
        </div>
        {canCreate && (
          <Link
            href={`/groups/${id}/game-stats/new`}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/20 text-[#e8560a] hover:bg-[#e8560a]/20 transition-colors"
          >
            <Plus size={14} /> New Session
          </Link>
        )}
      </div>

      {upgrade && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <p className="text-sm text-amber-300 font-medium">Upgrade required</p>
          <p className="text-xs text-amber-400/70 mt-1">
            Game Stats is available on the Club plan. Ask your club admin to upgrade.
          </p>
        </div>
      )}

      {!sessions?.length ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-zinc-800 text-center">
          <Activity size={28} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">No stats sessions yet.</p>
          {canCreate && (
            <Link
              href={`/groups/${id}/game-stats/new`}
              className="text-xs text-[#e8560a] hover:text-[#d14d09] transition-colors"
            >
              Start tracking a match →
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <ul className="divide-y divide-zinc-800 bg-zinc-900">
            {sessions.map(s => {
              const m = Array.isArray(s.match) ? s.match[0] : s.match
              const date = m
                ? new Date(m.match_date).toLocaleDateString('en-GB', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })
                : '—'
              return (
                <li key={s.id}>
                  <Link
                    href={`/groups/${id}/game-stats/${s.id}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0">
                        <Activity size={14} className="text-[#e8560a]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          vs {m?.opponent ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {date} · {m?.location === 'home' ? 'Home' : 'Away'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-zinc-600 group-hover:translate-x-0.5 transition-transform"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add Game Stats section to the group detail page**

In `web/src/app/(app)/groups/[id]/page.tsx`, add `Activity` to the import from `lucide-react`:
```tsx
import { ArrowLeft, Users2, UserPlus, Clock, XCircle, CalendarDays, Plus, Sparkles, LayoutList, ChevronRight, Users, Activity } from 'lucide-react'
```

Then add the Game Stats section between the Squad section and the Coaching Blocks section (after the closing `</section>` of Squad, before the opening `<section>` of Coaching Blocks):

```tsx
      {/* Game Stats */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Activity size={12} className="text-[#e8560a]" /> Game Stats
          </h2>
          <Link href={`/groups/${id}/game-stats`} className="flex items-center gap-1 text-xs text-[#e8560a] hover:text-[#d14d09] transition-colors">
            View all <ChevronRight size={12} />
          </Link>
        </div>
        <Link
          href={`/groups/${id}/game-stats`}
          className="flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0">
              <Activity size={14} className="text-[#e8560a]" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">Game Stats</p>
              <p className="text-xs text-zinc-600">Live carries, tackles &amp; set completion</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </section>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/\(app\)/groups/\[id\]/game-stats/page.tsx web/src/app/\(app\)/groups/\[id\]/page.tsx
git commit -m "feat: add game stats list page and group page link"
```

---

## Task 5: Session Server Page (Auth + Data Loading)

**Files:**
- Create: `web/src/app/(app)/groups/[id]/game-stats/[sessionId]/page.tsx`

- [ ] **Step 1: Create the server page**

`web/src/app/(app)/groups/[id]/game-stats/[sessionId]/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GameStatsClient } from './GameStatsClient'
import type { GameStatSessionWithMatch, GameStatEvent, Player } from '@/lib/supabase/types'

export const metadata = { title: 'Game Stats — 18th Man' }

export default async function GameStatsSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>
}) {
  const { id, sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')

  const { data: session } = await supabase
    .from('game_stat_sessions')
    .select('id, group_id, match_id, created_by, created_at, match:matches(id, opponent, match_date, location)')
    .eq('id', sessionId)
    .single() as { data: GameStatSessionWithMatch | null }

  if (!session) redirect(`/groups/${id}/game-stats`)

  // Verify the user's club matches the group's club
  const { data: group } = await supabase
    .from('coaching_groups')
    .select('club_id')
    .eq('id', session.group_id)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  const { data: players } = await supabase
    .from('players')
    .select('id, name')
    .eq('group_id', session.group_id)
    .order('name') as { data: Pick<Player, 'id' | 'name'>[] | null }

  const { data: events } = await supabase
    .from('game_stat_events')
    .select('id, session_id, player_id, stat_type, half, completed, created_by, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true }) as { data: GameStatEvent[] | null }

  const canTap = ['coach', 'admin'].includes(profile.role)

  return (
    <GameStatsClient
      session={session}
      players={players ?? []}
      initialEvents={events ?? []}
      currentUserId={user.id}
      groupId={id}
      canTap={canTap}
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```
Expected: error about `GameStatsClient` not existing yet — that's fine. The component is created in Task 7.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/\(app\)/groups/\[id\]/game-stats/\[sessionId\]/page.tsx
git commit -m "feat: add game stats session server page"
```

---

## Task 6: Server Actions — addEvent + undoEvent

**Files:**
- Create: `web/src/app/(app)/groups/[id]/game-stats/[sessionId]/actions.ts`

- [ ] **Step 1: Create the actions file**

`web/src/app/(app)/groups/[id]/game-stats/[sessionId]/actions.ts`:
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { StatType } from '@/lib/supabase/types'

export async function addEvent(
  sessionId: string,
  statType: StatType,
  half: 1 | 2,
  playerId: string | null,
  completed: boolean | null,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('game_stat_events')
    .insert({
      session_id: sessionId,
      player_id: playerId,
      stat_type: statType,
      half,
      completed,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export async function undoEvent(
  eventId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('game_stat_events')
    .delete()
    .eq('id', eventId)

  if (error) return { error: error.message }
  return {}
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/\(app\)/groups/\[id\]/game-stats/\[sessionId\]/actions.ts
git commit -m "feat: add addEvent and undoEvent server actions"
```

---

## Task 7: GameStatsClient — Layout Skeleton + Summary Bar + Mode + Tabs

**Files:**
- Create: `web/src/app/(app)/groups/[id]/game-stats/[sessionId]/GameStatsClient.tsx`

This task creates the full component with layout, state, and summary bar. The tab content is wired in Tasks 8–10.

- [ ] **Step 1: Create the client component**

`web/src/app/(app)/groups/[id]/game-stats/[sessionId]/GameStatsClient.tsx`:
```tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addEvent, undoEvent } from './actions'
import type { GameStatSessionWithMatch, GameStatEvent, Player, StatType } from '@/lib/supabase/types'

interface Props {
  session: GameStatSessionWithMatch
  players: Pick<Player, 'id' | 'name'>[]
  initialEvents: GameStatEvent[]
  currentUserId: string
  groupId: string
  canTap: boolean
}

type Tab = 'carries' | 'tackles' | 'sets'
type Mode = 'tap' | 'review'

export function GameStatsClient({
  session,
  players,
  initialEvents,
  currentUserId,
  groupId,
  canTap,
}: Props) {
  const [events, setEvents] = useState<GameStatEvent[]>(initialEvents)
  const [mode, setMode] = useState<Mode>('tap')
  const [activeTab, setActiveTab] = useState<Tab>('carries')
  const [activeHalf, setActiveHalf] = useState<1 | 2>(1)

  const match = Array.isArray(session.match) ? session.match[0] : session.match

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`game_stats:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_stat_events',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setEvents(prev => {
            if (prev.some(e => e.id === payload.new.id)) return prev
            return [...prev, payload.new as GameStatEvent]
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'game_stat_events',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          setEvents(prev => prev.filter(e => e.id !== (payload.old as GameStatEvent).id))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session.id])

  // ── Derived counts ──────────────────────────────────────────────────────────
  const carryEvents  = useMemo(() => events.filter(e => e.stat_type === 'carry'), [events])
  const tackleEvents = useMemo(() => events.filter(e => e.stat_type === 'tackle'), [events])
  const setEvents    = useMemo(() => events.filter(e => e.stat_type === 'set_completion'), [events])

  const totalCarries = carryEvents.length
  const totalTackles = tackleEvents.length
  const setsCompleted = setEvents.filter(e => e.completed).length
  const setsTotal     = setEvents.length

  function playerCount(playerId: string, statType: 'carry' | 'tackle') {
    return events.filter(e => e.player_id === playerId && e.stat_type === statType).length
  }

  // ── Mutations ───────────────────────────────────────────────────────────────
  async function handleAdd(
    statType: StatType,
    playerId: string | null,
    completed: boolean | null,
  ) {
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const optimistic: GameStatEvent = {
      id: tempId,
      session_id: session.id,
      player_id: playerId,
      stat_type: statType,
      half: activeHalf,
      completed,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
    }
    setEvents(prev => [...prev, optimistic])

    const result = await addEvent(session.id, statType, activeHalf, playerId, completed)
    if ('error' in result) {
      setEvents(prev => prev.filter(e => e.id !== tempId))
    } else {
      setEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: result.id } : e))
    }
  }

  async function handleUndo(statType: 'carry' | 'tackle', playerId: string) {
    const target = [...events]
      .reverse()
      .find(
        e =>
          e.stat_type === statType &&
          e.player_id === playerId &&
          e.created_by === currentUserId &&
          !e.id.startsWith('temp-'),
      )
    if (!target) return
    setEvents(prev => prev.filter(e => e.id !== target.id))
    const result = await undoEvent(target.id)
    if (result.error) setEvents(prev => [...prev, target])
  }

  async function handleUndoSet() {
    const target = [...events]
      .reverse()
      .find(
        e =>
          e.stat_type === 'set_completion' &&
          e.created_by === currentUserId &&
          !e.id.startsWith('temp-'),
      )
    if (!target) return
    setEvents(prev => prev.filter(e => e.id !== target.id))
    const result = await undoEvent(target.id)
    if (result.error) setEvents(prev => [...prev, target])
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const matchDate = match
    ? new Date(match.match_date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short',
      })
    : ''

  return (
    <div className="max-w-lg space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="app-heading text-xl">
            vs {match?.opponent ?? '—'}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{matchDate} · Live</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Mode toggle */}
      {canTap && (
        <div className="flex rounded-lg border border-zinc-800 overflow-hidden mb-3">
          {(['tap', 'review'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                mode === m
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m === 'tap' ? 'Tap' : 'Review'}
            </button>
          ))}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 rounded-xl border border-zinc-800 overflow-hidden mb-3">
        <div className="py-3 text-center border-r border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#e8560a]">Carries</p>
          <p className="text-2xl font-bold text-white mt-0.5">{totalCarries}</p>
        </div>
        <div className="py-3 text-center border-r border-zinc-800">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Tackles</p>
          <p className="text-2xl font-bold text-white mt-0.5">{totalTackles}</p>
        </div>
        <div className="py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Sets</p>
          <p className="text-2xl font-bold text-white mt-0.5">
            {setsCompleted}/{setsTotal}
          </p>
        </div>
      </div>

      {mode === 'tap' && canTap ? (
        <>
          {/* Tab bar */}
          <div className="flex rounded-lg border border-zinc-800 overflow-hidden mb-3">
            {(['carries', 'tackles', 'sets'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  activeTab === t
                    ? 'text-[#e8560a] border-b-2 border-[#e8560a]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content — Tasks 8 & 9 */}
          {activeTab === 'carries' && (
            <PlayerStatTab
              players={players}
              statType="carry"
              playerCount={playerCount}
              canTap={canTap}
              onAdd={(playerId) => handleAdd('carry', playerId, null)}
              onUndo={(playerId) => handleUndo('carry', playerId)}
            />
          )}
          {activeTab === 'tackles' && (
            <PlayerStatTab
              players={players}
              statType="tackle"
              playerCount={playerCount}
              canTap={canTap}
              onAdd={(playerId) => handleAdd('tackle', playerId, null)}
              onUndo={(playerId) => handleUndo('tackle', playerId)}
            />
          )}
          {activeTab === 'sets' && (
            <SetsTab
              events={setEvents}
              activeHalf={activeHalf}
              onHalfChange={setActiveHalf}
              onAdd={(completed) => handleAdd('set_completion', null, completed)}
              onUndoLast={handleUndoSet}
            />
          )}
        </>
      ) : (
        <ReviewPanel
          players={players}
          carryEvents={carryEvents}
          tackleEvents={tackleEvents}
          setEvents={setEvents}
          sessionId={session.id}
          groupId={groupId}
          opponent={match?.opponent ?? '—'}
          matchDate={match?.match_date ?? ''}
        />
      )}
    </div>
  )
}

// ── PlayerStatTab ─────────────────────────────────────────────────────────────

function PlayerStatTab({
  players,
  statType,
  playerCount,
  canTap,
  onAdd,
  onUndo,
}: {
  players: Pick<Player, 'id' | 'name'>[]
  statType: 'carry' | 'tackle'
  playerCount: (playerId: string, statType: 'carry' | 'tackle') => number
  canTap: boolean
  onAdd: (playerId: string) => void
  onUndo: (playerId: string) => void
}) {
  const accentClass = statType === 'carry' ? 'bg-[#e8560a]' : 'bg-blue-500'

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <ul className="divide-y divide-zinc-800 bg-zinc-900">
        {players.map(p => {
          const count = playerCount(p.id, statType)
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm text-zinc-200 truncate">{p.name}</span>
              <span className="text-lg font-bold text-white w-8 text-right">{count}</span>
              {canTap && (
                <>
                  <button
                    onClick={() => onUndo(p.id)}
                    disabled={count === 0}
                    aria-label={`Undo last ${statType} for ${p.name}`}
                    className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-zinc-400 transition-colors text-base"
                  >
                    ↩
                  </button>
                  <button
                    onClick={() => onAdd(p.id)}
                    aria-label={`Add ${statType} for ${p.name}`}
                    className={`w-9 h-9 rounded-lg ${accentClass} hover:opacity-90 flex items-center justify-center text-white font-bold text-xl transition-opacity active:scale-95`}
                  >
                    +
                  </button>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── SetsTab ───────────────────────────────────────────────────────────────────

function SetsTab({
  events,
  activeHalf,
  onHalfChange,
  onAdd,
  onUndoLast,
}: {
  events: GameStatEvent[]
  activeHalf: 1 | 2
  onHalfChange: (half: 1 | 2) => void
  onAdd: (completed: boolean) => void
  onUndoLast: () => void
}) {
  const halfEvents = events.filter(e => e.half === activeHalf)
  const completed  = halfEvents.filter(e => e.completed).length
  const total      = halfEvents.length
  const rate       = total > 0 ? Math.round((completed / total) * 100) : 0
  const last5      = [...halfEvents].slice(-5)

  return (
    <div className="space-y-3">
      {/* Half toggle */}
      <div className="flex rounded-lg border border-zinc-800 overflow-hidden">
        {([1, 2] as const).map(h => (
          <button
            key={h}
            onClick={() => onHalfChange(h)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
              activeHalf === h
                ? 'bg-[#e8560a] text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {h === 1 ? '1st Half' : '2nd Half'}
          </button>
        ))}
      </div>

      {/* Big YES / NO buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onAdd(true)}
          className="py-6 rounded-xl bg-emerald-900/40 border border-emerald-700/40 text-emerald-400 font-bold text-lg hover:bg-emerald-800/50 active:scale-95 transition-all"
        >
          YES — COMPLETE ✓
        </button>
        <button
          onClick={() => onAdd(false)}
          className="py-6 rounded-xl bg-red-900/40 border border-red-700/40 text-red-400 font-bold text-lg hover:bg-red-800/50 active:scale-95 transition-all"
        >
          NO — INCOMPLETE ✗
        </button>
      </div>

      {/* Running tally */}
      <div className="grid grid-cols-3 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="py-3 text-center border-r border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Complete</p>
          <p className="text-2xl font-bold text-emerald-400">{completed}</p>
        </div>
        <div className="py-3 text-center border-r border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Incomplete</p>
          <p className="text-2xl font-bold text-red-400">{total - completed}</p>
        </div>
        <div className="py-3 text-center">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Rate</p>
          <p className="text-2xl font-bold text-white">{rate}%</p>
        </div>
      </div>

      {/* Last 5 sets */}
      {last5.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Last {last5.length} sets
          </p>
          <div className="flex gap-2">
            {last5.map(e => (
              <div
                key={e.id}
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                  e.completed
                    ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/40'
                    : 'bg-red-900/60 text-red-400 border border-red-700/40'
                }`}
              >
                {e.completed ? '✓' : '✗'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Undo last */}
      {total > 0 && (
        <button
          onClick={onUndoLast}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
        >
          Undo last set
        </button>
      )}
    </div>
  )
}

// ── ReviewPanel ───────────────────────────────────────────────────────────────

function ReviewPanel({
  players,
  carryEvents,
  tackleEvents,
  setEvents,
  sessionId,
  groupId,
  opponent,
  matchDate,
}: {
  players: Pick<Player, 'id' | 'name'>[]
  carryEvents: GameStatEvent[]
  tackleEvents: GameStatEvent[]
  setEvents: GameStatEvent[]
  sessionId: string
  groupId: string
  opponent: string
  matchDate: string
}) {
  const carriesByPlayer = players
    .map(p => ({ ...p, count: carryEvents.filter(e => e.player_id === p.id).length }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)

  const tacklesByPlayer = players
    .map(p => ({ ...p, count: tackleEvents.filter(e => e.player_id === p.id).length }))
    .filter(p => p.count > 0)
    .sort((a, b) => b.count - a.count)

  const h1Sets       = setEvents.filter(e => e.half === 1)
  const h2Sets       = setEvents.filter(e => e.half === 2)
  const h1Completed  = h1Sets.filter(e => e.completed).length
  const h2Completed  = h2Sets.filter(e => e.completed).length

  const reviewUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/groups/${groupId}/game-stats/${sessionId}`
    : ''

  const date = matchDate
    ? new Date(matchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  const shareText = encodeURIComponent(
    `18th Man — Game Stats\nvs ${opponent} · ${date}\n\nCarries: ${carryEvents.length} | Tackles: ${tackleEvents.length} | Sets: ${h1Completed + h2Completed}/${setEvents.length}\n\n${reviewUrl}`,
  )

  function copyLink() {
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText(reviewUrl)
  }

  return (
    <div className="space-y-4">
      {/* Carries */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#e8560a] mb-2">
          Attack — Carries
        </h2>
        {carriesByPlayer.length === 0 ? (
          <p className="text-xs text-zinc-600 px-1">No carries recorded yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {carriesByPlayer.map(p => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-zinc-200">{p.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e8560a]/20 text-[#e8560a]">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Tackles */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">
          Defence — Tackles
        </h2>
        {tacklesByPlayer.length === 0 ? (
          <p className="text-xs text-zinc-600 px-1">No tackles recorded yet.</p>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {tacklesByPlayer.map(p => (
                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-zinc-200">{p.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Set completion */}
      <section>
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
          Set Completion
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">1st Half</p>
            <p className="text-2xl font-bold text-white">
              {h1Completed}/{h1Sets.length}
            </p>
            {h1Sets.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {Math.round((h1Completed / h1Sets.length) * 100)}%
              </p>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">2nd Half</p>
            <p className="text-2xl font-bold text-white">
              {h2Completed}/{h2Sets.length}
            </p>
            {h2Sets.length > 0 && (
              <p className="text-xs text-zinc-500 mt-0.5">
                {Math.round((h2Completed / h2Sets.length) * 100)}%
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Share bar */}
      <div className="flex gap-2 pt-2">
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-lg border border-emerald-700/40 text-emerald-400 text-xs font-semibold text-center hover:bg-emerald-900/30 transition-colors"
        >
          WhatsApp
        </a>
        <a
          href={`/api/game-stats/${sessionId}/pdf`}
          download
          className="flex-1 py-2.5 rounded-lg border border-[#e8560a]/40 text-[#e8560a] text-xs font-semibold text-center hover:bg-[#e8560a]/10 transition-colors"
        >
          PDF
        </a>
        <button
          onClick={copyLink}
          className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-semibold hover:bg-zinc-800 transition-colors"
        >
          Copy Link
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors (the `Player` type is already defined in `types.ts` from the squad migration).

- [ ] **Step 3: Commit**

```bash
git add web/src/app/\(app\)/groups/\[id\]/game-stats/\[sessionId\]/GameStatsClient.tsx
git commit -m "feat: add GameStatsClient with tally and review modes"
```

---

## Task 8: PDF Component

**Files:**
- Create: `web/src/components/game-stats/GameStatsPDF.tsx`

- [ ] **Step 1: Create the PDF component**

`web/src/components/game-stats/GameStatsPDF.tsx`:
```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const E      = '#e8560a'
const DARK   = '#111827'
const MID    = '#374151'
const MUTED  = '#6b7280'
const LIGHT  = '#f9fafb'
const BORDER = '#e5e7eb'
const WHITE  = '#ffffff'
const GREEN  = '#059669'
const RED    = '#dc2626'

const s = StyleSheet.create({
  page: {
    backgroundColor: WHITE,
    paddingBottom: 56,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: DARK,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
  },
  footerBrand: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: E, letterSpacing: 1.5 },
  footerMeta:  { fontSize: 6.5, color: MUTED },
  coverHeader: {
    backgroundColor: E,
    paddingHorizontal: 44,
    paddingTop: 44,
    paddingBottom: 40,
  },
  coverEyeLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 3,
    marginBottom: 8,
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: WHITE,
    marginBottom: 6,
  },
  coverSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  coverMeta: {
    paddingHorizontal: 44,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
    flexDirection: 'row',
    gap: 32,
  },
  metaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1.5, marginBottom: 3 },
  metaValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK },
  section: { paddingHorizontal: 44, paddingTop: 28 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: E,
    marginBottom: 10,
  },
  table: { borderWidth: 1, borderColor: BORDER, borderStyle: 'solid', borderRadius: 4 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  colName:  { flex: 1, fontSize: 9, color: DARK },
  colCount: { width: 60, fontSize: 9, color: DARK, textAlign: 'right' },
  colHead:  { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1 },
  setGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  setCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 14,
    alignItems: 'center',
  },
  setCardLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1.5, marginBottom: 6 },
  setCardFraction: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: DARK },
  setCardRate: { fontSize: 8, color: MUTED, marginTop: 2 },
})

export interface GameStatsPDFData {
  opponent: string
  matchDate: string
  groupName: string
  location: string
  carries: { name: string; count: number }[]
  tackles: { name: string; count: number }[]
  sets: {
    half1: { completed: number; total: number }
    half2: { completed: number; total: number }
  }
}

function rate(completed: number, total: number) {
  if (total === 0) return '—'
  return `${Math.round((completed / total) * 100)}%`
}

export function GameStatsPDF({ data }: { data: GameStatsPDFData }) {
  const date = new Date(data.matchDate).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Cover header */}
        <View style={s.coverHeader}>
          <Text style={s.coverEyeLabel}>18TH MAN — GAME STATS</Text>
          <Text style={s.coverTitle}>vs {data.opponent}</Text>
          <Text style={s.coverSubtitle}>{data.groupName}</Text>
        </View>

        {/* Meta row */}
        <View style={s.coverMeta}>
          <View>
            <Text style={s.metaLabel}>DATE</Text>
            <Text style={s.metaValue}>{date}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>LOCATION</Text>
            <Text style={s.metaValue}>{data.location}</Text>
          </View>
        </View>

        {/* Carries */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Attack — Carries</Text>
          {data.carries.length === 0 ? (
            <Text style={{ fontSize: 9, color: MUTED }}>No carries recorded.</Text>
          ) : (
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.colHead, { flex: 1 }]}>PLAYER</Text>
                <Text style={[s.colHead, { width: 60, textAlign: 'right' }]}>CARRIES</Text>
              </View>
              {data.carries.map((row, i) => (
                <View
                  key={row.name}
                  style={i === data.carries.length - 1 ? s.tableRowLast : s.tableRow}
                >
                  <Text style={s.colName}>{row.name}</Text>
                  <Text style={s.colCount}>{row.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Tackles */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Defence — Tackles</Text>
          {data.tackles.length === 0 ? (
            <Text style={{ fontSize: 9, color: MUTED }}>No tackles recorded.</Text>
          ) : (
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.colHead, { flex: 1 }]}>PLAYER</Text>
                <Text style={[s.colHead, { width: 60, textAlign: 'right' }]}>TACKLES</Text>
              </View>
              {data.tackles.map((row, i) => (
                <View
                  key={row.name}
                  style={i === data.tackles.length - 1 ? s.tableRowLast : s.tableRow}
                >
                  <Text style={s.colName}>{row.name}</Text>
                  <Text style={s.colCount}>{row.count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Set Completion */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Set Completion</Text>
          <View style={s.setGrid}>
            <View style={s.setCard}>
              <Text style={s.setCardLabel}>1ST HALF</Text>
              <Text style={s.setCardFraction}>
                {data.sets.half1.completed}/{data.sets.half1.total}
              </Text>
              <Text style={s.setCardRate}>
                {rate(data.sets.half1.completed, data.sets.half1.total)} completion rate
              </Text>
            </View>
            <View style={s.setCard}>
              <Text style={s.setCardLabel}>2ND HALF</Text>
              <Text style={s.setCardFraction}>
                {data.sets.half2.completed}/{data.sets.half2.total}
              </Text>
              <Text style={s.setCardRate}>
                {rate(data.sets.half2.completed, data.sets.half2.total)} completion rate
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerBrand}>18TH MAN</Text>
          <Text style={s.footerMeta}>
            vs {data.opponent} · {date}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/game-stats/GameStatsPDF.tsx
git commit -m "feat: add GameStatsPDF component"
```

---

## Task 9: PDF Route Handler

**Files:**
- Create: `web/src/app/api/game-stats/[sessionId]/pdf/route.tsx`

- [ ] **Step 1: Create the route handler**

`web/src/app/api/game-stats/[sessionId]/pdf/route.tsx`:
```tsx
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { GameStatsPDF } from '@/components/game-stats/GameStatsPDF'
import type { GameStatEvent, GameStatSessionWithMatch, Player } from '@/lib/supabase/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .single()

    if (!profile?.club_id) return new Response('Forbidden', { status: 403 })

    const { data: session } = await supabase
      .from('game_stat_sessions')
      .select('id, group_id, match_id, created_by, created_at, match:matches(id, opponent, match_date, location)')
      .eq('id', sessionId)
      .single() as { data: GameStatSessionWithMatch | null }

    if (!session) return new Response('Not Found', { status: 404 })

    const match = Array.isArray(session.match) ? session.match[0] : session.match

    // Verify club access
    const { data: group } = await supabase
      .from('coaching_groups')
      .select('club_id, name')
      .eq('id', session.group_id)
      .single()

    if (!group || group.club_id !== profile.club_id) {
      return new Response('Forbidden', { status: 403 })
    }

    const { data: players } = await supabase
      .from('players')
      .select('id, name')
      .eq('group_id', session.group_id)
      .order('name') as { data: Pick<Player, 'id' | 'name'>[] | null }

    const { data: events } = await supabase
      .from('game_stat_events')
      .select('id, session_id, player_id, stat_type, half, completed, created_by, created_at')
      .eq('session_id', sessionId) as { data: GameStatEvent[] | null }

    const allPlayers = players ?? []
    const allEvents  = events ?? []

    const carryEvents  = allEvents.filter(e => e.stat_type === 'carry')
    const tackleEvents = allEvents.filter(e => e.stat_type === 'tackle')
    const setEvents    = allEvents.filter(e => e.stat_type === 'set_completion')

    const carries = allPlayers
      .map(p => ({ name: p.name, count: carryEvents.filter(e => e.player_id === p.id).length }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count)

    const tackles = allPlayers
      .map(p => ({ name: p.name, count: tackleEvents.filter(e => e.player_id === p.id).length }))
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count)

    const h1Sets = setEvents.filter(e => e.half === 1)
    const h2Sets = setEvents.filter(e => e.half === 2)

    const buffer = await renderToBuffer(
      <GameStatsPDF
        data={{
          opponent:  match?.opponent ?? 'Unknown',
          matchDate: match?.match_date ?? '',
          groupName: group.name,
          location:  match?.location === 'home' ? 'Home' : 'Away',
          carries,
          tackles,
          sets: {
            half1: { completed: h1Sets.filter(e => e.completed).length, total: h1Sets.length },
            half2: { completed: h2Sets.filter(e => e.completed).length, total: h2Sets.length },
          },
        }}
      />,
    )

    const slug = (match?.opponent ?? 'match')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${slug}-game-stats.pdf"`,
      },
    })
  } catch (err) {
    console.error('[game-stats/pdf] Failed:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/api/game-stats/ web/src/components/game-stats/
git commit -m "feat: add game stats PDF route handler"
```

---

## Task 10: End-to-End Manual Verification

- [ ] **Step 1: Start the dev server**

```bash
cd web && npm run dev
```

- [ ] **Step 2: Verify the creation flow**

1. Log in as a paid coach.
2. Navigate to a group → click **Game Stats** section card.
3. Click **New Session** — verify matches from that group appear.
4. Select a match → click **Start Tracking** — should redirect to the session page.

- [ ] **Step 3: Verify the tally screen**

1. On the session page, confirm the summary bar shows 0/0/0.
2. Switch to **Carries** tab — verify all squad players appear.
3. Tap `+` on a player — verify count increments immediately (optimistic).
4. Tap `↩` on the same player — verify count decrements.
5. Switch to **Tackles** tab — repeat.
6. Switch to **Sets** tab — tap **1st Half**, tap **YES** several times and **NO** once. Verify running tally + last 5 chips update correctly.
7. Tap **Undo last set** — verify most recent set is removed.

- [ ] **Step 4: Verify review mode**

1. Tap **Review** toggle — verify carries and tackles are sorted by count desc.
2. Verify set completion shows 1st half and 2nd half separately.
3. Open the session URL in a second browser tab. Tap `+` in the first tab — verify the second tab's review mode updates within ~2 seconds via Realtime.

- [ ] **Step 5: Verify PDF download**

1. In review mode, click **PDF** — verify a PDF downloads with the correct match name, carries table, tackles table, and set completion section.

- [ ] **Step 6: Verify WhatsApp share**

1. Click **WhatsApp** — verify a new tab/window opens with `wa.me/?text=…` pre-filled with the match summary and URL.

- [ ] **Step 7: Verify Copy Link**

1. Click **Copy Link** — paste into a text editor, verify the URL matches the session URL.

- [ ] **Step 8: Verify access gating**

1. Log in as a free-tier user. Navigate to a group → Game Stats → New Session. Verify redirect to `?upgrade=1` with the upgrade notice.
2. Log in as a `viewer` role. Navigate to a session URL. Verify the tally buttons are hidden (review-only mode).

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: game stats counter — complete implementation"
```
