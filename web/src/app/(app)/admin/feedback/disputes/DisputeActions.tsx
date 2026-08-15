'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveDispute } from './actions'

export function DisputeActions({ disputeId }: { disputeId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function resolve(resolution: 'excluded' | 'no_action') {
    startTransition(async () => {
      const result = await resolveDispute(disputeId, resolution)
      if (result.error) toast.error(result.error)
      else {
        toast.success(resolution === 'excluded' ? 'Response excluded from scoring' : 'No action taken')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => resolve('no_action')}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        No action
      </Button>
      <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => resolve('excluded')}>
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        Exclude response
      </Button>
    </div>
  )
}
