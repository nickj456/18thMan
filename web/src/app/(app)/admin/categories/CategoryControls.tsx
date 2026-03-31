'use client'

import { useTransition, useState } from 'react'
import { Pencil, Trash2, ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import { updateCategory, deleteCategory, reorderCategory } from './actions'

interface CategoryControlsProps {
  id: string
  name: string
  isFirst: boolean
  isLast: boolean
}

export function CategoryControls({ id, name, isFirst, isLast }: CategoryControlsProps) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSave() {
    const fd = new FormData()
    fd.set('name', editName)
    startTransition(async () => {
      await updateCategory(id, fd)
      setEditing(false)
    })
  }

  return (
    <div className="flex items-center gap-1">
      {editing ? (
        <>
          <input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="text-sm bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40"
            autoFocus
          />
          <button onClick={handleSave} disabled={isPending} className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors">
            <Check size={14} />
          </button>
          <button onClick={() => { setEditing(false); setEditName(name) }} className="p-1.5 rounded text-zinc-500 hover:bg-zinc-800 transition-colors">
            <X size={14} />
          </button>
        </>
      ) : confirmDelete ? (
        <>
          <span className="text-xs text-zinc-500 mr-1">Delete?</span>
          <button
            onClick={() => startTransition(() => deleteCategory(id))}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Yes
          </button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
            No
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => startTransition(() => reorderCategory(id, 'up'))}
            disabled={isPending || isFirst}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => startTransition(() => reorderCategory(id, 'down'))}
            disabled={isPending || isLast}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 transition-colors"
          >
            <ChevronDown size={14} />
          </button>
          <button onClick={() => setEditing(true)} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  )
}
