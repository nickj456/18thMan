'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import type { PlayerStatus } from '@/lib/supabase/types'
import { updatePlayerStatus } from './actions'

const OPTIONS: { value: PlayerStatus; label: string; cls: string }[] = [
  { value: 'available', label: 'Available', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' },
  { value: 'injured', label: 'Injured', cls: 'text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20' },
  { value: 'unavailable', label: 'Unavailable', cls: 'text-zinc-400 bg-zinc-700/40 border-zinc-600/30 hover:bg-zinc-700/60' },
]

export function PlayerStatusToggle({
  groupId,
  playerId,
  current,
}: {
  groupId: string
  playerId: string
  current: PlayerStatus
}) {
  const [isPending, startTransition] = useTransition()

  function handleChange(status: PlayerStatus) {
    if (status === current) return
    startTransition(async () => { await updatePlayerStatus(groupId, playerId, status) })
  }

  return (
    <div className="flex items-center gap-1.5">
      {isPending && <Loader2 size={11} className="animate-spin text-zinc-500" />}
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          disabled={isPending}
          className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${opt.cls} ${
            current === opt.value ? 'ring-1 ring-current ring-offset-1 ring-offset-zinc-900' : 'opacity-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
