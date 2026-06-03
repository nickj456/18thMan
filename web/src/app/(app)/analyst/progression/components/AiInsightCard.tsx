'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { generateTeamInsight } from '../actions'

interface Props {
  savedContent: string | null
  savedHash: string | null
  currentHash: string
  sessionIds: string[]
  clubName: string
  groupId: string
}

export function AiInsightCard({ savedContent, savedHash, currentHash, sessionIds, clubName, groupId }: Props) {
  const [content, setContent] = useState(savedContent ?? '')
  const [activeHash, setActiveHash] = useState(savedHash)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isStale = activeHash !== null && activeHash !== currentHash
  const hasContent = content.length > 0

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await generateTeamInsight({ sessionIds, clubName, groupId })
        setContent(result.text)
        setActiveHash(result.hash)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate insight.')
      }
    })
  }

  return (
    <div className="relative bg-[#0d0d10] border border-[#e8560a]/20 rounded-xl p-5 overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-[radial-gradient(circle,rgba(232,86,10,0.06),transparent_70%)] pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            'w-1.5 h-1.5 rounded-full bg-[#e8560a] flex-shrink-0',
            isPending && 'animate-pulse',
          )} />
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#e8560a]">
            AI Coaching Insight
          </span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/25 text-[#e8560a] hover:bg-[#e8560a]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Generating…' : hasContent ? 'Regenerate' : 'Generate insights'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {hasContent ? (
        <p className="text-sm text-zinc-300 leading-relaxed">{content}</p>
      ) : !isPending ? (
        <p className="text-sm text-zinc-600 italic">
          Click &ldquo;Generate insights&rdquo; to get AI coaching observations for this selection.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-full" />
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-5/6" />
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-4/6" />
        </div>
      )}

      {isStale && !isPending && (
        <p className="text-[10px] text-zinc-600 mt-3">
          ⚠ Match selection changed — regenerate for updated insights.
        </p>
      )}
    </div>
  )
}
