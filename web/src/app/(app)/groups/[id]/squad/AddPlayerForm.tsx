'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RL_POSITIONS } from '@/lib/supabase/types'
import { addPlayer } from './actions'

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', colour: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'injured', label: 'Injured', colour: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'unavailable', label: 'Unavailable', colour: 'text-zinc-400 bg-zinc-700/40 border-zinc-600/30' },
] as const

export function AddPlayerForm({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false)
  const [positions, setPositions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function togglePosition(pos: string) {
    setPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos],
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    positions.forEach(p => fd.append('positions', p))

    startTransition(async () => {
      const result = await addPlayer(groupId, fd)
      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
      } else {
        formRef.current?.reset()
        setPositions([])
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
      >
        <Plus size={14} /> Add Player
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-200">New Player</p>
        <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <X size={14} />
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <label className="text-xs text-zinc-400">Name *</label>
            <input
              name="name"
              required
              placeholder="e.g. Alex Johnson"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1.5">
            <label className="text-xs text-zinc-400">Date of birth</label>
            <input
              name="dob"
              type="date"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Positions (select all that apply)</label>
          <div className="flex flex-wrap gap-1.5">
            {RL_POSITIONS.map(pos => (
              <button
                key={pos}
                type="button"
                onClick={() => togglePosition(pos)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  positions.includes(pos)
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Status</label>
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="status" value={opt.value} defaultChecked={opt.value === 'available'} className="sr-only peer" />
                <span className={`px-2.5 py-1 rounded-full text-xs border transition-all peer-checked:ring-1 peer-checked:ring-offset-1 peer-checked:ring-offset-zinc-900 peer-checked:ring-current ${opt.colour}`}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" size="sm" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {isPending ? 'Adding…' : 'Add Player'}
          </Button>
        </div>
      </form>
    </div>
  )
}
