'use client'

import { cn } from '@/lib/utils'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

interface Props {
  sessions: MatchSessionWithAnalyst[]
  includedIds: string[]
  matchAId: string | null
  matchBId: string | null
  compareMode: boolean
  onToggleIncluded: (id: string) => void
  onToggleCompareMode: () => void
  onSelectA: (id: string) => void
  onSelectB: (id: string) => void
}

function getResult(session: MatchSessionWithAnalyst): 'win' | 'loss' | 'draw' | null {
  if (session.our_score == null || session.opp_score == null) return null
  if (session.our_score > session.opp_score) return 'win'
  if (session.our_score < session.opp_score) return 'loss'
  return 'draw'
}

export function MatchSelectorBar({
  sessions,
  includedIds,
  matchAId,
  matchBId,
  compareMode,
  onToggleIncluded,
  onToggleCompareMode,
  onSelectA,
  onSelectB,
}: Props) {
  function handleCardClick(id: string) {
    if (compareMode) {
      if (!matchAId || matchAId === '') { onSelectA(id); return }
      if ((!matchBId || matchBId === '') && id !== matchAId) { onSelectB(id); return }
      if (id === matchAId) { onSelectA(''); return }
      if (id === matchBId) { onSelectB(''); return }
      onSelectA(id)
    } else {
      onToggleIncluded(id)
    }
  }

  return (
    <div className="sticky top-12 z-10 bg-[#050507]/95 backdrop-blur border-b border-zinc-900 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
          {compareMode ? 'Select Match A, then B' : 'Matches — click to include / exclude'}
        </span>
        <button
          onClick={onToggleCompareMode}
          className={cn(
            'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all',
            compareMode
              ? 'bg-[#e8560a]/15 border-[#e8560a]/50 text-[#e8560a]'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
          )}
        >
          <span className={cn(
            'w-8 h-4 rounded-full relative transition-colors flex-shrink-0',
            compareMode ? 'bg-[#e8560a]' : 'bg-zinc-700',
          )}>
            <span className={cn(
              'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200',
              compareMode ? 'translate-x-4' : 'translate-x-0.5',
            )} />
          </span>
          <span>Compare {compareMode ? '· ON' : 'A/B'}</span>
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {sessions.map(session => {
          const isIncluded = includedIds.includes(session.id)
          const isA = session.id === matchAId
          const isB = session.id === matchBId
          const result = getResult(session)
          const date = session.match_date
            ? new Date(`${session.match_date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
            : '—'
          const score = session.our_score != null && session.opp_score != null
            ? `${session.our_score}–${session.opp_score}`
            : null

          return (
            <button
              key={session.id}
              onClick={() => handleCardClick(session.id)}
              className={cn(
                'flex-shrink-0 w-[172px] text-left rounded-xl border p-3.5 transition-all relative overflow-hidden',
                !compareMode && !isIncluded && 'opacity-40 border-zinc-900 bg-zinc-950 cursor-pointer',
                !compareMode && isIncluded && result === 'win' && 'border-emerald-700/60 bg-[#0d120d] ring-1 ring-emerald-900/30',
                !compareMode && isIncluded && result !== 'win' && 'border-zinc-600 bg-[#0d0d10] hover:border-zinc-500',
                compareMode && isA && 'border-[#e8560a] bg-[#120c08] ring-1 ring-[#e8560a]/20',
                compareMode && isB && 'border-emerald-500 bg-[#081209] ring-1 ring-emerald-900/30',
                compareMode && !isA && !isB && 'border-zinc-800/60 bg-[#0d0d10] hover:border-zinc-600',
              )}
            >
              {/* Include/exclude indicator — top-left */}
              {!compareMode && (
                <span className={cn(
                  'absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded',
                  isIncluded
                    ? 'bg-emerald-900/50 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-600',
                )}>
                  {isIncluded ? '✓ IN' : '✕ OUT'}
                </span>
              )}

              {result && (
                <span className={cn(
                  'absolute top-2 right-2 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-md',
                  result === 'win' && 'bg-emerald-900/50 text-emerald-400',
                  result === 'loss' && 'bg-red-900/50 text-red-400',
                  result === 'draw' && 'bg-yellow-900/50 text-yellow-400',
                )}>
                  {result.toUpperCase()}
                </span>
              )}

              {compareMode && (isA || isB) && (
                <div className={cn('text-[10px] font-black tracking-wider mb-1.5', isA ? 'text-[#e8560a]' : 'text-emerald-400')}>
                  MATCH {isA ? 'A' : 'B'}
                </div>
              )}

              <p className="text-[12px] font-semibold text-zinc-200 truncate pr-8 mb-0.5 leading-tight mt-5">
                vs {session.opposition ?? 'Unknown'}
              </p>
              <p className={cn(
                'text-[11px] font-semibold mb-2.5',
                compareMode && isA ? 'text-[#e8560a]' : compareMode && isB ? 'text-emerald-400' : 'text-zinc-400',
              )}>
                {date}
              </p>

              {score ? (
                <p className={cn(
                  'text-[22px] font-black leading-none tracking-tight mb-0.5',
                  result === 'win' ? 'text-emerald-400' : result === 'loss' ? 'text-red-400' : 'text-zinc-300',
                )}>
                  {score}
                </p>
              ) : (
                <p className="text-[18px] font-black leading-none text-zinc-700 mb-0.5">—</p>
              )}

              <p className="text-[9px] text-zinc-700 mt-2">
                {session.events.length} events
                {session.analyst?.display_name ? ` · ${session.analyst.display_name}` : ''}
              </p>
            </button>
          )
        })}

        <div className="flex-shrink-0 w-[120px] rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-1.5 text-zinc-700 cursor-default">
          <span className="text-xl">+</span>
          <span className="text-[10px]">Upload</span>
        </div>
      </div>
    </div>
  )
}
