'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { emailSelfAssessmentSummaryPDF } from '../../../pdf-actions'

export function EmailSummaryButton() {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        disabled={isPending || status === 'sent'}
        onClick={() => {
          startTransition(async () => {
            const result = await emailSelfAssessmentSummaryPDF()
            if (result.success) {
              setStatus('sent')
            } else {
              setStatus('error')
              setError(result.error ?? 'Something went wrong.')
            }
          })
        }}
      >
        {status === 'sent' ? 'PDF sent' : isPending ? 'Sending...' : 'Email me a PDF'}
      </Button>
      {status === 'error' && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
