'use client'

import { useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteDmConversation } from '@/app/(app)/chat/dm/actions'
import { toast } from 'sonner'

export function DeleteDmButton({ conversationId }: { conversationId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this conversation? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteDmConversation(conversationId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Delete conversation"
      className="ml-auto text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    </button>
  )
}
