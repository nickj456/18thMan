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
