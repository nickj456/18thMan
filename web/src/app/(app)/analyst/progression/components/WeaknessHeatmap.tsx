'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { computeHeatmap } from '@/lib/match-analysis/aggregate'
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
