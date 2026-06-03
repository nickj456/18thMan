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

    const maxTotal = Math.max(...rows.map(r => r.total), 1)
    return rows
      .map(r => ({ ...r, barWidth: Math.round((r.total / maxTotal) * 100) }))
      .sort((a, b) => {
        const scoreA = a.badMatchCount * (a.isNegative ? 2 : 1)
        const scoreB = b.badMatchCount * (b.isNegative ? 2 : 1)
        return scoreB - scoreA
      })
      .slice(0, 6)
  }, [sessions, includedIds, statTypes])

  const includedSessions = sessions.filter(s => includedIds.includes(s.id))

  const matchSummary = includedSessions
    .map(s => s.opposition ?? 'Unknown')
    .join(', ')

  if (!rows.length) return null

  return (
    <div className="bg-[#0d0d10] border border-zinc-900 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
          Team concerns
        </p>
        <p className="text-[9px] text-zinc-700 truncate max-w-[200px]" title={matchSummary}>
          {includedSessions.length} match{includedSessions.length !== 1 ? 'es' : ''}: {matchSummary}
        </p>
      </div>
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
