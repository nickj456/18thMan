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
  const [selectedKeys] = useState<string[]>(() => resolvedPlayers.map(p => p.key))

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

        const totalInvolvement = sessions
          .filter(s => includedIds.includes(s.id))
          .reduce((n, s) => {
            const c = countEvents(s.events, player.key)
            return n + (c['carry'] ?? 0) + (c['tackle'] ?? 0)
          }, 0)

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
