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
  groupId: string
  groupName: string
  allGroups: { id: string; name: string }[]
}

export function ProgressionClient({ sessions, savedInsights, clubName, groupId, groupName, allGroups }: Props) {
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
    setParams({
      compare: compareMode ? null : '1',
      a: compareMode ? null : matchAId,
      b: compareMode ? null : matchBId,
    })
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

  const playerInsights = useMemo(
    () => Object.fromEntries(
      savedInsights
        .filter(i => i.scope !== 'team')
        .map(i => [i.scope, { content: i.content, hash: i.session_ids_hash }]),
    ),
    [savedInsights],
  )

  const sessionA = sessions.find(s => s.id === matchAId) ?? null
  const sessionB = sessions.find(s => s.id === matchBId) ?? null

  // Split club name: last word highlighted in orange
  const nameParts = clubName.split(' ')
  const nameMain = nameParts.slice(0, -1).join(' ')
  const nameLast = nameParts.slice(-1)[0] ?? ''

  return (
    <>
      {/* Hero */}
      <div className="mb-6">
        <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-[#e8560a] mb-2 flex items-center gap-2">
          <span className="inline-block w-5 h-0.5 bg-[#e8560a] rounded" />
          Match Analysis
        </p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[28px] font-black tracking-[-0.6px] text-white leading-none mb-1">
              {nameMain}{nameMain ? ' ' : ''}<span className="text-[#e8560a]">{nameLast}</span>
            </h1>
            <p className="text-[13px] text-zinc-600">
              {sessions.length} match{sessions.length !== 1 ? 'es' : ''} · {resolvedPlayers.length} players tracked
            </p>
          </div>
          {/* Group selector */}
          {allGroups.length > 1 ? (
            <select
              value={groupId}
              onChange={e => router.push(`${pathname}?group=${e.target.value}`)}
              className="text-sm bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-[#e8560a] mb-1"
            >
              {allGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 mb-1">
              {groupName}
            </span>
          )}
        </div>
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

      {/* Comparison table — only when compare mode active with both selected */}
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
            groupId={groupId}
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
          groupId={groupId}
          onClose={() => setOpenPlayer(null)}
        />
      )}
    </>
  )
}
