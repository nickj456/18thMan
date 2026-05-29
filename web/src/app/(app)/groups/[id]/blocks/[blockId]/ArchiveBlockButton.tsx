'use client'

import { useTransition } from 'react'
import { Archive, Loader2 } from 'lucide-react'
import { archiveBlock } from '../actions'
import { toast } from 'sonner'

interface Props {
  blockId: string
  groupId: string
  blockName: string
}

export function ArchiveBlockButton({ blockId, groupId, blockName }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    if (!confirm(`Archive "${blockName}"? It will be hidden from the group but not deleted.`)) return
    startTransition(async () => {
      const result = await archiveBlock(blockId, groupId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <button
      onClick={handleArchive}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
      Archive
    </button>
  )
}
