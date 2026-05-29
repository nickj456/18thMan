'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pin, PinOff, Lock, LockOpen, Pencil, Trash2, Loader2, Check, X } from 'lucide-react'
import { toggleCloseThread, togglePinThread, editThreadTitle, deleteThread } from '@/app/(app)/chat/actions'
import { toast } from 'sonner'

interface AdminThreadControlsProps {
  threadId: string
  title: string
  isClosed: boolean
  isPinned: boolean
}

export function AdminThreadControls({ threadId, title, isClosed, isPinned }: AdminThreadControlsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)

  function handleToggleClose() {
    startTransition(async () => {
      const result = await toggleCloseThread(threadId, !isClosed)
      if (result?.error) toast.error(result.error)
      else toast.success(isClosed ? 'Thread reopened' : 'Thread closed')
    })
  }

  function handleTogglePin() {
    startTransition(async () => {
      const result = await togglePinThread(threadId, !isPinned)
      if (result?.error) toast.error(result.error)
      else toast.success(isPinned ? 'Thread unpinned' : 'Thread pinned')
    })
  }

  function handleSaveTitle() {
    if (!editValue.trim() || editValue.trim() === title) { setEditing(false); return }
    startTransition(async () => {
      const result = await editThreadTitle(threadId, editValue)
      if (result?.error) toast.error(result.error)
      else { toast.success('Title updated'); setEditing(false); router.refresh() }
    })
  }

  function handleDelete() {
    if (!window.confirm('Delete this thread and all its messages? This cannot be undone.')) return
    startTransition(async () => {
      await deleteThread(threadId)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
      <span className="text-xs font-medium text-zinc-500 mr-1">Admin</span>

      {editing ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditing(false) }}
            className="h-7 text-xs flex-1"
            autoFocus
          />
          <button onClick={handleSaveTitle} disabled={isPending} className="text-green-400 hover:text-green-300 p-1">
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          </button>
          <button onClick={() => { setEditing(false); setEditValue(title) }} className="text-zinc-500 hover:text-zinc-300 p-1">
            <X size={13} />
          </button>
        </div>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={isPending}
            className="h-7 px-2 text-xs gap-1.5 text-zinc-400 hover:text-white">
            <Pencil size={12} /> Edit title
          </Button>

          <Button variant="ghost" size="sm" onClick={handleTogglePin} disabled={isPending}
            className="h-7 px-2 text-xs gap-1.5 text-zinc-400 hover:text-white">
            {isPinned ? <><PinOff size={12} /> Unpin</> : <><Pin size={12} /> Pin</>}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleToggleClose} disabled={isPending}
            className="h-7 px-2 text-xs gap-1.5 text-zinc-400 hover:text-white">
            {isClosed ? <><LockOpen size={12} /> Reopen</> : <><Lock size={12} /> Close</>}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={isPending}
            className="h-7 px-2 text-xs gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 ml-auto">
            <Trash2 size={12} /> Delete thread
          </Button>
        </>
      )}
    </div>
  )
}
