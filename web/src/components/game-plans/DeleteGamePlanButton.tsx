'use client'

import { useTransition } from 'react'
import { deleteGamePlan } from '@/app/(app)/game-plans/actions'

interface DeleteGamePlanButtonProps {
  id: string
}

export function DeleteGamePlanButton({ id }: DeleteGamePlanButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Are you sure? This cannot be undone.')) return
    startTransition(async () => {
      await deleteGamePlan(id)
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="mt-6 w-full rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Deleting…' : 'Delete Game Plan'}
    </button>
  )
}
