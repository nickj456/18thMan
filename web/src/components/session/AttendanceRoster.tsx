'use client'

import { useTransition } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { toggleAttendance } from '@/app/(app)/groups/[id]/squad/actions'

interface Player {
  id: string
  name: string
  attended: boolean | null
}

export function AttendanceRoster({
  groupId,
  sessionPlanId,
  players,
}: {
  groupId: string
  sessionPlanId: string
  players: Player[]
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {players.map(p => (
        <PlayerToggle
          key={p.id}
          groupId={groupId}
          sessionPlanId={sessionPlanId}
          player={p}
        />
      ))}
    </div>
  )
}

function PlayerToggle({
  groupId,
  sessionPlanId,
  player,
}: {
  groupId: string
  sessionPlanId: string
  player: Player
}) {
  const [isPending, startTransition] = useTransition()
  const attended = player.attended ?? true

  function handleToggle() {
    startTransition(async () => {
      await toggleAttendance(groupId, player.id, sessionPlanId, !attended)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-60 ${
        attended
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
          : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-500 hover:bg-zinc-800'
      }`}
    >
      {attended
        ? <CheckCircle2 size={14} className="shrink-0" />
        : <XCircle size={14} className="shrink-0" />
      }
      <span className="truncate">{player.name}</span>
    </button>
  )
}
