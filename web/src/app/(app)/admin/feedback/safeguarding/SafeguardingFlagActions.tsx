'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dismissSafeguardingFlag, confirmSafeguardingFlag } from './actions'

export function SafeguardingFlagActions({ flagId }: { flagId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function run(action: (id: string) => Promise<{ error?: string; success?: boolean }>, successMessage: string) {
    startTransition(async () => {
      const result = await action(flagId)
      if (result.error) toast.error(result.error)
      else {
        toast.success(successMessage)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(dismissSafeguardingFlag, 'Dismissed — response released to the coach')}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        Dismiss (false positive)
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => run(confirmSafeguardingFlag, 'Confirmed — response stays hidden')}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        Confirm
      </Button>
    </div>
  )
}
