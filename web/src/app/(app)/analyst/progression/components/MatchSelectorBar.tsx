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
      if (!matchAId) { onSelectA(id); return }
      if (!matchBId && id !== matchAId) { onSelectB(id); return }
      if (id === matchAId) { onSelectA(''); return }
      if (id === matchBId) { onSelectB(''); return }
      onSelectA(id)
    } else {
      onToggleIncluded(id)
    }
  }

  return (
    <div className="sticky top-12 z-10 bg-zinc-950 border-b border-zinc-800 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
          {compareMode ? 'Select Match A then B' : 'Click to include / exclude'}
        </span>
        <button
          onClick={onToggleCompareMode}
          className={cn(
            'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors',
            compareMode
              ? 'bg-[#e8560a]/15 border-[#e8560a]/30 text-[#e8560a]'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200',
          )}
        >
          <span
            className={cn(
              'w-6 h-3.5 rounded-full relative transition-colors',
              compareMode ? 'bg-[#e8560a]' : 'bg-zinc-700',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform',
                compareMode ? 'translate-x-3' : 'translate-x-0.5',
              )}
            />
          </span>
          Compare mode
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {sessions.map(session => {
          const isIncluded = includedIds.includes(session.id)
          const isA = session.id === matchAId
          const isB = session.id === matchBId
          const date = session.match_date
            ? new Date(`${session.match_date}T12:00:00`).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short',
              })
            : '—'
          const score =
            session.our_score != null && session.opp_score != null
              ? `${session.our_score} – ${session.opp_score}`
              : null

          return (
            <button
              key={session.id}
              onClick={() => handleCardClick(session.id)}
              className={cn(
                'flex-shrink-0 min-w-[128px] text-left px-3 py-2.5 rounded-lg border transition-all',
                !compareMode && !isIncluded && 'opacity-40 border-zinc-800 bg-zinc-900/40',
                !compareMode && isIncluded && 'border-zinc-700 bg-zinc-900 hover:border-zinc-500',
                compareMode && isA && 'border-[#e8560a]/60 bg-[#e8560a]/10',
                compareMode && isB && 'border-green-600/50 bg-green-900/20',
                compareMode && !isA && !isB && 'border-zinc-800 bg-zinc-900 hover:border-zinc-600',
              )}
            >
              <div className="flex items-center justify-between mb-1">
                {compareMode && isA && (
                  <span className="text-[9px] font-bold text-[#e8560a] tracking-wider">A</span>
                )}
                {compareMode && isB && (
                  <span className="text-[9px] font-bold text-green-500 tracking-wider">B</span>
                )}
                {!compareMode && isIncluded && (
                  <span className="text-[9px] text-green-500">✓</span>
                )}
                {!compareMode && !isIncluded && (
                  <span className="text-[9px] text-zinc-600">✕</span>
                )}
                <span className="text-[9px] text-zinc-600 ml-auto">{date}</span>
              </div>
              <p className="text-[11px] font-semibold text-zinc-200 truncate">
                vs {session.opposition ?? 'Unknown'}
              </p>
              {score && (
                <p className="text-[10px] text-zinc-500 mt-0.5">{score}</p>
              )}
              <p className="text-[9px] text-zinc-700 mt-0.5 truncate">
                {session.events.length} events
                {session.analyst?.display_name ? ` · ${session.analyst.display_name}` : ''}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
