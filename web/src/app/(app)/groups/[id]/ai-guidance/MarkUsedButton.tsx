'use client'

import { useTransition } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { markSuggestionUsed } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  historyId: string
  groupId: string
}

export function MarkUsedButton({ historyId, groupId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleMark() {
    startTransition(async () => {
      const result = await markSuggestionUsed(historyId, groupId)
      if (result?.error) toast.error(result.error)
      else { toast.success('Marked as used — rotation updated'); router.refresh() }
    })
  }

  return (
    <button
      onClick={handleMark}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
      Mark as used
    </button>
  )
}
