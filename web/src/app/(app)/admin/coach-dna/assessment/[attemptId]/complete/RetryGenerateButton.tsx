'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { generateSelfAssessmentSummary } from '../../../summary-actions'

export function RetryGenerateButton({ attemptId }: { attemptId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          try {
            await generateSelfAssessmentSummary(attemptId)
            router.refresh()
          } catch {
            // Swallow here — the button just stays clickable for another attempt.
            // The page itself already shows the "couldn't generate" message.
          }
        })
      }}
    >
      {isPending ? 'Trying again...' : 'Try again'}
    </Button>
  )
}
