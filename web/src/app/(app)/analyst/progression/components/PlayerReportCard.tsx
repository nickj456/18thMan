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
          {/* Sparklines — only when 2+ sessions */}
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
