'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteGroup } from '@/app/(app)/groups/actions'
import { useRouter } from 'next/navigation'
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
  groupId: string
  groupName: string
}

export function DeleteGroupButton({ groupId, groupName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canConfirm = confirmName === groupName

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGroup(groupId)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/admin')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setConfirmName(''); setError(null) } }}>
      <AlertDialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-red-700/40 text-red-400 hover:bg-red-900/20 hover:border-red-700/60 transition-colors">
          <Trash2 size={14} />
          Delete Group
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-zinc-900 border-zinc-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-zinc-100">Delete &quot;{groupName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-400">
            This will permanently delete <strong className="text-zinc-200">{groupName}</strong> and all associated members, game stats, and invitations. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-1">
          <p className="text-xs text-zinc-500">Type the group name to confirm:</p>
          <input
            value={confirmName}
            onChange={e => setConfirmName(e.target.value)}
            placeholder={groupName}
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500/60"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
            Cancel
          </AlertDialogCancel>
          <button
            onClick={handleDelete}
            disabled={!canConfirm || isPending}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? <><Loader2 size={13} className="animate-spin mr-1.5" />Deleting…</> : 'Delete Group'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
