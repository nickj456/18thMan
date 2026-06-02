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

  const savedForPlayer = player ? savedInsights[player.key] : null
  const displayContent = aiContent ?? savedForPlayer?.content ?? null
  const displayHash = aiHash ?? savedForPlayer?.hash ?? null
  const isStale = displayHash !== null && displayHash !== currentHash

  function handleGenerateInsight() {
    if (!player) return
    setAiError(null)
    startTransition(async () => {
      try {
        const result = await generatePlayerInsight({
          playerKey: player.key,
          playerName: player.name,
          playerNumber: player.primaryNumber,
          sessionIds: includedIds,
        })
        setAiContent(result.text)
        setAiHash(result.hash)
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'Failed to generate insight.')
      }
    })
  }

  const activeStats = stats.filter(s => s.avg > 0 || s.best > 0)
  const bestStat = activeStats.reduce<typeof activeStats[0] | null>((a, b) => (!a || b.avg > a.avg ? b : a), null)
  const hasAnyDecline = stats.some(s => s.hasDecline)

  if (!player) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[560px] bg-[#060608] border-l border-zinc-900 z-50 overflow-y-auto flex flex-col">

        {/* Hero */}
        <div className="relative bg-gradient-to-br from-[#0f0e14] to-[#090910] border-b border-zinc-900 p-7 overflow-hidden flex-shrink-0">
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
                  formatter={(v: string) => v.replace(/_/g, ' ')}
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
                      <span className={cn('text-[13px] font-black', trend?.color)}>{trend?.symbol}</span>
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
                Click &ldquo;Generate&rdquo; for a coaching observation on {player.name}.
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
