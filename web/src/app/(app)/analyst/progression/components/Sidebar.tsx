'use client'

import { useMemo } from 'react'
import { countEvents } from '@/lib/match-analysis/aggregate'
import type { MatchSessionWithAnalyst, ResolvedPlayer } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  resolvedPlayers: ResolvedPlayer[]
}

function SeasonRecord({ sessions }: { sessions: MatchSessionWithAnalyst[] }) {
  return (
    <div className="bg-[#0d0d10] border border-zinc-900 rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">
        Season record
      </p>
      <div className="space-y-0">
        {sessions.map((s, i) => {
          const date = s.match_date
            ? new Date(`${s.match_date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : '—'
          const hasScore = s.our_score != null && s.opp_score != null
          const isWin = hasScore && s.our_score! > s.opp_score!

          return (
            <div key={s.id} className={`flex items-center justify-between py-2.5 ${i < sessions.length - 1 ? 'border-b border-zinc-900' : ''}`}>
              <div>
                <p className="text-[12px] font-semibold text-zinc-300 truncate max-w-[140px]">
                  vs {s.opposition ?? 'Unknown'}
                </p>
                <p className="text-[10px] text-zinc-600">{date}</p>
              </div>
              <p className={`text-[15px] font-black tracking-tight ${isWin ? 'text-emerald-400' : hasScore ? 'text-red-400' : 'text-zinc-700'}`}>
                {hasScore ? `${s.our_score}–${s.opp_score}` : '—'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Leaderboard({
  title,
  players,
  sessions,
  includedIds,
  statType,
}: {
  title: string
  players: ResolvedPlayer[]
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  statType: string
}) {
  const top = useMemo(() => {
    return players
      .map(p => ({
        player: p,
        total: sessions
          .filter(s => includedIds.includes(s.id))
          .reduce((n, s) => n + (countEvents(s.events, p.key)[statType] ?? 0), 0),
      }))
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
  }, [players, sessions, includedIds, statType])

  if (!top.length) return null

  return (
    <div className="bg-[#0d0d10] border border-zinc-900 rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">{title}</p>
      <div className="space-y-0">
        {top.map(({ player, total }, i) => (
          <div key={player.key} className={`flex items-center gap-3 py-2.5 ${i < top.length - 1 ? 'border-b border-zinc-900' : ''}`}>
            <span className="text-[11px] font-bold text-zinc-700 w-4">{i + 1}</span>
            <div className="w-7 h-7 rounded-full bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center text-[10px] font-bold text-[#e8560a] flex-shrink-0">
              {player.primaryNumber}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-zinc-300 truncate">{player.name}</p>
              <p className="text-[9px] text-zinc-600">{statType.replace(/_/g, ' ')}</p>
            </div>
            <p className="text-[18px] font-black text-[#e8560a] leading-none">{total}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sidebar({ sessions, includedIds, resolvedPlayers }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <SeasonRecord sessions={sessions} />
      <Leaderboard
        title="Top tacklers"
        players={resolvedPlayers}
        sessions={sessions}
        includedIds={includedIds}
        statType="tackle"
      />
      <Leaderboard
        title="Top ball carriers"
        players={resolvedPlayers}
        sessions={sessions}
        includedIds={includedIds}
        statType="carry"
      />
    </div>
  )
}
