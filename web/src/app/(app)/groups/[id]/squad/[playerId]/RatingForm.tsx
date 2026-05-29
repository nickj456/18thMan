'use client'

import { useState, useTransition } from 'react'
import { Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { upsertMatchRating, upsertSessionRating } from '../actions'

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-colors"
        >
          <Star
            size={18}
            className={
              n <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-zinc-600'
            }
          />
        </button>
      ))}
    </div>
  )
}

export function MatchRatingForm({
  groupId,
  playerId,
  matchId,
  existing,
}: {
  groupId: string
  playerId: string
  matchId: string
  existing?: { rating: number; notes: string | null }
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!rating) return setError('Select a rating')
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('rating', String(rating))
    startTransition(async () => {
      const result = await upsertMatchRating(groupId, playerId, matchId, fd)
      if ('error' in result) setError(result.error ?? 'Error')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        name="notes"
        rows={2}
        defaultValue={existing?.notes ?? ''}
        placeholder="Match notes…"
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !rating} variant="ghost" className="text-xs text-amber-400 hover:text-amber-300">
          {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
          {existing ? 'Update' : 'Save rating'}
        </Button>
      </div>
    </form>
  )
}

export function SessionRatingForm({
  groupId,
  playerId,
  sessionPlanId,
  existing,
}: {
  groupId: string
  playerId: string
  sessionPlanId: string
  existing?: { attended: boolean; rating: number | null; notes: string | null }
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [attended, setAttended] = useState(existing?.attended ?? true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('attended', String(attended))
    if (rating) fd.set('rating', String(rating))
    startTransition(async () => {
      const result = await upsertSessionRating(groupId, playerId, sessionPlanId, fd)
      if ('error' in result) setError(result.error ?? 'Error')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={attended}
            onChange={e => setAttended(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
          />
          <span className="text-xs text-zinc-400">Attended</span>
        </label>
        {attended && <StarPicker value={rating} onChange={setRating} />}
      </div>
      {attended && (
        <textarea
          name="notes"
          rows={2}
          defaultValue={existing?.notes ?? ''}
          placeholder="Session notes…"
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
        />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending} variant="ghost" className="text-xs text-amber-400 hover:text-amber-300">
          {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
          {existing ? 'Update' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
