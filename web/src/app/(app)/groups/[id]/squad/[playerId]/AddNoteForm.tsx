'use client'

import { useRef, useState, useTransition } from 'react'
import { MessageSquarePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addPlayerNote } from '../actions'

export function AddNoteForm({ groupId, playerId }: { groupId: string; playerId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await addPlayerNote(groupId, playerId, fd)
      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
      } else {
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
      <textarea
        name="note"
        required
        rows={2}
        placeholder="Add a coaching observation…"
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending} variant="ghost" className="text-indigo-400 hover:text-indigo-300">
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <MessageSquarePlus size={12} />}
          {isPending ? 'Saving…' : 'Add note'}
        </Button>
      </div>
    </form>
  )
}
