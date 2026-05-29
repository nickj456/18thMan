'use client'

import { useState, useTransition } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { swapBlockSessions } from '../actions'
import { toast } from 'sonner'

interface SessionOption {
  id: string
  session_number: number
  focus_area: string
  category: string
}

interface Props {
  blockId: string
  groupId: string
  sessions: SessionOption[]
}

const categoryColour: Record<string, string> = {
  'Attack': 'text-emerald-400',
  'Defence': 'text-red-400',
  'Completions & Game Management': 'text-amber-400',
  'Skills in Context': 'text-indigo-400',
}

export function SwapSessionsButton({ blockId, groupId, sessions }: Props) {
  const [selA, setSelA] = useState<number | null>(null)
  const [selB, setSelB] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  if (sessions.length < 2) {
    return <p className="text-xs text-zinc-600">No sessions available to swap.</p>
  }

  function handleSwap() {
    if (selA === null || selB === null) return
    startTransition(async () => {
      const result = await swapBlockSessions(blockId, selA, selB, groupId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Sessions ${selA} and ${selB} swapped`)
        setSelA(null)
        setSelB(null)
      }
    })
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Session A</label>
          <select
            value={selA ?? ''}
            onChange={e => setSelA(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60"
          >
            <option value="">Pick a session…</option>
            {sessions.map(s => (
              <option key={s.session_number} value={s.session_number} disabled={s.session_number === selB}>
                #{s.session_number} — {s.focus_area}
              </option>
            ))}
          </select>
          {selA !== null && (
            <p className={`text-xs ${categoryColour[sessions.find(s => s.session_number === selA)?.category ?? ''] ?? 'text-zinc-400'}`}>
              {sessions.find(s => s.session_number === selA)?.focus_area}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Session B</label>
          <select
            value={selB ?? ''}
            onChange={e => setSelB(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60"
          >
            <option value="">Pick a session…</option>
            {sessions.map(s => (
              <option key={s.session_number} value={s.session_number} disabled={s.session_number === selA}>
                #{s.session_number} — {s.focus_area}
              </option>
            ))}
          </select>
          {selB !== null && (
            <p className={`text-xs ${categoryColour[sessions.find(s => s.session_number === selB)?.category ?? ''] ?? 'text-zinc-400'}`}>
              {sessions.find(s => s.session_number === selB)?.focus_area}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={handleSwap}
        disabled={isPending || selA === null || selB === null || selA === selB}
        className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors disabled:opacity-40"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
        Swap Sessions
      </button>
    </div>
  )
}
