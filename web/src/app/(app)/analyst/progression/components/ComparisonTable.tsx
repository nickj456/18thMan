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
