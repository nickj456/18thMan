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
