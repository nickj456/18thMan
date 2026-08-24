'use client'

import { useState } from 'react'
import { ArrowDown, Sparkles } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CoachDnaOutcomeReveal({ attemptId }: { attemptId: string }) {
  const [revealed, setRevealed] = useState(false)
  const reportUrl = `/api/coach-dna/report-pdf/${attemptId}`
  const feedbackSummaryUrl = `/api/coach-dna/feedback-summary-pdf/${attemptId}`

  return (
    <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent p-5 text-center">
      <p className="text-xs font-semibold text-orange-400 uppercase tracking-[0.2em] mb-1">
        Your outcome is ready
      </p>
      <p className="text-sm text-zinc-400 mb-4">
        Your full Coach DNA breakdown, plus a summary of what your players, parents, and peers said.
      </p>
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold text-white uppercase tracking-wide shadow-[0_0_24px_rgba(232,86,10,0.5)] transition-all hover:bg-orange-400 hover:shadow-[0_0_32px_rgba(232,86,10,0.7)]"
        >
          <Sparkles size={16} />
          Get Your Report
          <ArrowDown size={16} />
        </button>
      ) : (
        <div className="flex flex-col justify-center gap-3 animate-in fade-in slide-in-from-bottom-2 sm:flex-row">
          <a
            href={reportUrl}
            download="coach-dna-outcome.pdf"
            className={cn(buttonVariants(), 'flex-1 sm:flex-none')}
          >
            Your Coach DNA Report
          </a>
          <a
            href={feedbackSummaryUrl}
            download="coach-dna-feedback-summary.pdf"
            className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 sm:flex-none')}
          >
            Feedback Summary
          </a>
        </div>
      )}
    </div>
  )
}
