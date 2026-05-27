'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Activity, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSession } from './actions'
import type { Match } from '@/lib/supabase/types'

interface Props {
  groupId: string
  matches: Pick<Match, 'id' | 'opponent' | 'match_date' | 'location'>[]
}

export function CreateSessionForm({ groupId, matches }: Props) {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMatchId) return
    setError(null)
    startTransition(async () => {
      const result = await createSession(groupId, selectedMatchId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
          Select Match
        </label>
        {matches.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-zinc-400">No matches found for this group.</p>
            <Link
              href={`/groups/${groupId}/squad`}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#e8560a]/10 border border-[#e8560a]/20 text-[#e8560a] hover:bg-[#e8560a]/20 transition-colors"
            >
              <Plus size={14} /> Add a match
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <ul className="divide-y divide-zinc-800 bg-zinc-900">
              {matches.map(m => {
                const date = new Date(m.match_date).toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                })
                const isSelected = selectedMatchId === m.id
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedMatchId(m.id)}
                      className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-[#e8560a]/10 border-l-2 border-[#e8560a]'
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          vs {m.opponent}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {date} · {m.location === 'home' ? 'Home' : 'Away'}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#e8560a] shrink-0" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={!selectedMatchId || isPending}
        className="w-full bg-[#e8560a] hover:bg-[#d14d09] text-white"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin mr-2" />
        ) : (
          <Activity size={14} className="mr-2" />
        )}
        Start Tracking
      </Button>
    </form>
  )
}
