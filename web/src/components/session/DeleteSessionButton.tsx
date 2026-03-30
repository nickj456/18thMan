'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { deleteSession } from '@/app/(app)/sessions/actions'

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this session? This cannot be undone.')) return
    startTransition(async () => { await deleteSession(sessionId) })
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleDelete}
      disabled={isPending}
      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
    >
      <Trash2 size={13} className="mr-1.5" />
      {isPending ? 'Deleting…' : 'Delete'}
    </Button>
  )
}
