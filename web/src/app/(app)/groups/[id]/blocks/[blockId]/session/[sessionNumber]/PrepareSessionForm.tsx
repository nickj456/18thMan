'use client'

import { useTransition, useState } from 'react'
import { Check, Loader2, CalendarDays } from 'lucide-react'
import { prepareBlockSession } from '../../../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  blockSessionId: string
  groupId: string
  blockId: string
  initialDate: string | null
  initialNotes: string | null
  status: 'planned' | 'prepared' | 'completed'
}

export function PrepareSessionForm({ blockSessionId, groupId, blockId, initialDate, initialNotes, status }: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  if (status === 'completed') {
    return (
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-300 flex items-center gap-2">
        <Check size={14} /> This session has been completed.
      </div>
    )
  }

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      const date = fd.get('scheduled_date') as string | null
      const notes = fd.get('notes') as string | null
      const result = await prepareBlockSession(blockSessionId, groupId, date || null, notes || null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        router.push(`/groups/${groupId}/blocks/${blockId}`)
      }
    })
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
        <CalendarDays size={11} /> Prepare This Session
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="scheduled_date" className="block text-xs font-medium text-zinc-400">
            Date <span className="text-zinc-600 font-normal">(optional)</span>
          </label>
          <input
            id="scheduled_date"
            name="scheduled_date"
            type="date"
            defaultValue={initialDate ?? ''}
            className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-xs font-medium text-zinc-400">
          Coach Notes <span className="text-zinc-600 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initialNotes ?? ''}
          placeholder="Any specific notes for your coaching staff about this session…"
          className="w-full text-sm bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#e8560a]/60 resize-none"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-600">
          {status === 'planned' ? 'Mark as ready when you have reviewed the plan' : 'Session is marked ready'}
        </p>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check size={12} /> Saved
            </span>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg bg-[#e8560a] hover:bg-[#d14d09] text-white font-medium transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            {status === 'planned' ? 'Mark as Ready' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  )
}
