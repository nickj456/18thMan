'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteUser } from './actions'
import { toast } from 'sonner'

interface DeleteUserButtonProps {
  userId: string
  displayName: string
}

export function DeleteUserButton({ userId, displayName }: DeleteUserButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUser(userId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${displayName} deleted`)
      }
      setConfirming(false)
    })
  }

  if (confirming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-xl border border-red-500/30 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Delete {displayName}?</h3>
              <p className="text-sm text-zinc-400 mt-1">
                This permanently deletes their account and all associated data. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              {isPending ? 'Deleting…' : 'Delete user'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="flex-1 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      title={`Delete ${displayName}`}
    >
      <Trash2 size={14} />
    </button>
  )
}
