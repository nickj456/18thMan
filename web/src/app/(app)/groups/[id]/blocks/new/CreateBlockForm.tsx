'use client'

import { useTransition, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { createCoachingBlock } from '../actions'
import { toast } from 'sonner'

const SESSION_OPTIONS = [4, 6, 8, 10, 12, 15]

interface Props {
  groupId: string
}

const loadingMessages = [
  'Analysing focus area rotation…',
  'Planning session structure…',
  'Generating warm-ups and games…',
  'Building coaching frameworks…',
  'Finalising session plans…',
]

export function CreateBlockForm({ groupId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msgIndex, setMsgIndex] = useState(0)
  const [selectedSessions, setSelectedSessions] = useState(8)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    // Cycle through loading messages every 3 seconds
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % loadingMessages.length
      setMsgIndex(i)
    }, 3000)

    startTransition(async () => {
      const result = await createCoachingBlock(groupId, fd)
      clearInterval(interval)
      if (result?.error) toast.error(result.error)
      // On success the server action redirects — no further client action needed
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-xs font-medium text-zinc-400">
          Block Name <span className="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          disabled={isPending}
          autoFocus
          placeholder="e.g. Pre-season 2025, Rounds 1–8"
          className="w-full text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60 disabled:opacity-50"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="total_sessions" className="block text-xs font-medium text-zinc-400">
          Number of Sessions <span className="text-red-400">*</span>
        </label>
        <select
          id="total_sessions"
          name="total_sessions"
          required
          disabled={isPending}
          value={selectedSessions}
          onChange={e => setSelectedSessions(parseInt(e.target.value))}
          className="w-full text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60 disabled:opacity-50"
        >
          {SESSION_OPTIONS.map(n => (
            <option key={n} value={n}>{n} sessions</option>
          ))}
        </select>
        <p className="text-xs text-zinc-600">AI will plan one focus area per session, balanced across all categories</p>
      </div>

      {isPending ? (
        <div className="w-full rounded-xl border border-[#e8560a]/20 bg-[#e8560a]/5 p-5 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Loader2 size={20} className="animate-spin text-[#e8560a]" />
            <span className="text-sm font-medium text-[#e8560a]">Generating {selectedSessions} session plans…</span>
          </div>
          <p className="text-center text-xs text-zinc-500 transition-all">{loadingMessages[msgIndex]}</p>
          {/* Progress dots */}
          <div className="flex justify-center gap-1.5">
            {loadingMessages.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === msgIndex ? 'w-5 bg-[#e8560a]' : 'w-1.5 bg-zinc-700'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-[10px] text-zinc-600">This takes 15–30 seconds — the AI is building every session plan</p>
        </div>
      ) : (
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#e8560a] hover:bg-[#d14d09] text-white text-sm font-medium transition-colors"
        >
          <Sparkles size={14} /> Generate Block Plan
        </button>
      )}
    </form>
  )
}
