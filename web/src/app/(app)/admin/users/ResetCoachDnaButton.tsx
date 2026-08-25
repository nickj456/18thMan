'use client'

import { useState, useTransition } from 'react'
import { RotateCcw, Loader2, AlertTriangle } from 'lucide-react'
import { resetCoachDnaData } from './actions'
import { toast } from 'sonner'

interface ResetCoachDnaButtonProps {
  userId: string
  displayName: string
}

export function ResetCoachDnaButton({ userId, displayName }: ResetCoachDnaButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleReset() {
    startTransition(async () => {
      const result = await resetCoachDnaData(userId, reason)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${displayName}'s Coach DNA data reset`)
        setReason('')
      }
      setConfirming(false)
    })
  }

  if (confirming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-xl border border-red-500/30 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Reset {displayName}&apos;s Coach DNA data?</h3>
              <p className="text-sm text-zinc-400 mt-1">
                This permanently deletes their self-assessment, all feedback requests and responses,
                and their cached results. This cannot be undone.
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="reset-reason" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Reason
            </label>
            <textarea
              id="reset-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Coach requested a redo"
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={isPending || !reason.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              {isPending ? 'Resetting…' : 'Reset data'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="flex-1 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      title={`Reset ${displayName}'s Coach DNA data`}
    >
      <RotateCcw size={14} />
    </button>
  )
}
