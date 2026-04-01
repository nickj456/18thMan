'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { regenerateDrillGuide } from '@/app/(app)/drills/actions'

export function RegenerateGuideButton({ drillId }: { drillId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleRegenerate() {
    setLoading(true)
    const result = await regenerateDrillGuide(drillId)
    setLoading(false)
    if (result.success) {
      toast.success('AI guide regenerated successfully.')
    } else {
      toast.error(result.error ?? 'Regeneration failed.')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRegenerate}
      disabled={loading}
    >
      <RefreshCw className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Regenerating…' : 'Regenerate AI Guide'}
    </Button>
  )
}
