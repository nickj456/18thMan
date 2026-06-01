'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteReview } from './actions'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  reviewId: string
  label: string
}

export function DeleteReviewButton({ reviewId, label }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteReview(reviewId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null) }}>
      <AlertDialogTrigger
        render={
          <button className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-red-700/40 text-red-400 hover:bg-red-900/20 hover:border-red-700/60 transition-colors">
            <Trash2 size={13} />
            Delete
          </button>
        }
      />
      <AlertDialogContent className="bg-zinc-900 border-zinc-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-100">Delete this review?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            This will permanently remove <strong className="text-zinc-200">{label}</strong> and all associated responses from 18th Man. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-xs text-red-400 px-1">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
            Cancel
          </AlertDialogCancel>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? <><Loader2 size={13} className="animate-spin mr-1.5" />Deleting…</> : 'Delete Review'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
