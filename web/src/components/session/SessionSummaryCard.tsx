'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Package, Target, Lightbulb, Loader2 } from 'lucide-react'
import { generateSessionSummary, type SessionSummary } from '@/app/(app)/sessions/actions'
import { useRouter } from 'next/navigation'

interface SessionSummaryCardProps {
  sessionId: string
  summary: SessionSummary | null
  isOwner: boolean
}

export function SessionSummaryCard({ sessionId, summary, isOwner }: SessionSummaryCardProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleGenerate() {
    startTransition(async () => {
      await generateSessionSummary(sessionId)
      router.refresh()
    })
  }

  if (!summary) {
    if (!isOwner) return null
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center space-y-3">
        <div className="flex justify-center">
          <Sparkles size={24} className="text-zinc-500" />
        </div>
        <div>
          <p className="text-sm font-medium">No session summary yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate an AI summary with equipment list, focus areas and coaching notes
          </p>
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={isPending}>
          {isPending
            ? <><Loader2 size={13} className="mr-2 animate-spin" />Generating…</>
            : <><Sparkles size={13} className="mr-2" />Generate summary</>
          }
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-400" />
          <span className="text-sm font-semibold">AI Session Summary</span>
        </div>
        {isOwner && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleGenerate}
            disabled={isPending}
            className="text-xs h-7 text-zinc-500 hover:text-white"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : 'Regenerate'}
          </Button>
        )}
      </div>

      {/* Overview */}
      <div className="px-5 py-4">
        <p className="text-sm text-zinc-300 leading-relaxed">{summary.overview}</p>
      </div>

      {/* Equipment */}
      <div className="px-5 py-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Package size={12} />
          Equipment needed
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.equipment.map((item, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full bg-zinc-800 text-xs text-zinc-300 border border-zinc-700"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Focus areas */}
      <div className="px-5 py-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Target size={12} />
          Focus areas
        </div>
        <ul className="space-y-1">
          {summary.focus_areas.map((area, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
              <span className="text-zinc-300">{area}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Warm-up */}
      <div className="px-5 py-4 space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          <Lightbulb size={12} />
          Warm-up suggestion
        </div>
        <p className="text-sm text-zinc-300">{summary.warm_up_suggestion}</p>
      </div>

      {/* Coaching notes */}
      <div className="px-5 py-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Coaching notes</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{summary.coaching_notes}</p>
      </div>
    </div>
  )
}
