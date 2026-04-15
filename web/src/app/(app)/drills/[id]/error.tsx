'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function DrillError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[drills/[id]]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <AlertCircle className="size-10 text-destructive" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Could not load drill</h2>
        <p className="text-sm text-muted-foreground">Something went wrong while fetching this drill.</p>
      </div>
      <Button variant="outline" onClick={reset}>Try again</Button>
    </div>
  )
}
