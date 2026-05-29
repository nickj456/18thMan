'use client'

import { useState, useTransition } from 'react'
import { Activity, Loader2, Plus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSession, createMatch } from './actions'
import type { Match } from '@/lib/supabase/types'

interface Props {
  groupId: string
  matches: Pick<Match, 'id' | 'opponent' | 'match_date' | 'location'>[]
}

export function CreateSessionForm({ groupId, matches: initialMatches }: Props) {
  const [matches, setMatches] = useState(initialMatches)
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Add match form state
  const [showAddMatch, setShowAddMatch] = useState(initialMatches.length === 0)
  const [opponent, setOpponent] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [location, setLocation] = useState<'home' | 'away'>('home')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAddingMatch, startAddTransition] = useTransition()

  function handleAddMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!opponent.trim() || !matchDate) return
    setAddError(null)
    startAddTransition(async () => {
      const result = await createMatch(groupId, opponent.trim(), matchDate, location)
      if ('error' in result) {
        setAddError(result.error)
        return
      }
      const newMatch = {
        id: result.id,
        opponent: opponent.trim(),
        match_date: matchDate,
        location,
      }
      setMatches(prev => [newMatch, ...prev])
      setSelectedMatchId(result.id)
      setShowAddMatch(false)
      setOpponent('')
      setMatchDate('')
      setLocation('home')
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMatchId) return
    setError(null)
    startTransition(async () => {
      const result = await createSession(groupId, selectedMatchId)
      if (result?.error) setError(result.error)
    })
  }

  const inputClass = 'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#e8560a] transition-colors'

  return (
    <div className="space-y-5">
      {/* Add match form */}
      {showAddMatch ? (
        <form onSubmit={handleAddMatch} className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">New Match</p>
          <input
            className={inputClass}
            placeholder="Opponent (e.g. Wigan Warriors)"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
            required
          />
          <input
            type="date"
            className={inputClass}
            value={matchDate}
            onChange={e => setMatchDate(e.target.value)}
            required
          />
          <div className="flex gap-2">
            {(['home', 'away'] as const).map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocation(loc)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  location === loc
                    ? 'bg-[#e8560a]/10 border-[#e8560a]/40 text-[#e8560a]'
                    : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
          {addError && <p className="text-sm text-red-400">{addError}</p>}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isAddingMatch || !opponent.trim() || !matchDate}
              className="flex-1 bg-[#e8560a] hover:bg-[#d14d09] text-white"
            >
              {isAddingMatch ? <Loader2 size={14} className="animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
              Add Match
            </Button>
            {matches.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddMatch(false)}
                className="border-zinc-700 text-zinc-400"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddMatch(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-zinc-700 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
        >
          <Plus size={12} /> Add a match
        </button>
      )}

      {/* Match selector */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {matches.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Select Match
            </label>
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
                          <p className="text-sm font-medium text-zinc-200">vs {m.opponent}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {date} · {m.location === 'home' ? 'Home' : 'Away'}
                          </p>
                        </div>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#e8560a] shrink-0" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

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
    </div>
  )
}
