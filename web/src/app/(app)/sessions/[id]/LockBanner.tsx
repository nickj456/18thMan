'use client'

import { useEffect, useState, useTransition } from 'react'
import { Lock, Unlock, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { acquireLock, releaseLock } from '../actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  sessionId: string
  groupId: string
  currentUserId: string
  initialLockedBy: string | null
  initialLockedAt: string | null
  lockerName: string | null
  editHref: string
}

const LOCK_TIMEOUT_MS = 30 * 60 * 1000

function isLockExpired(lockedAt: string | null) {
  if (!lockedAt) return true
  return Date.now() - new Date(lockedAt).getTime() > LOCK_TIMEOUT_MS
}

export function LockBanner({
  sessionId, groupId, currentUserId,
  initialLockedBy, initialLockedAt, lockerName: initialLockerName,
  editHref,
}: Props) {
  const [lockedBy, setLockedBy] = useState(initialLockedBy)
  const [lockedAt, setLockedAt] = useState(initialLockedAt)
  const [lockerName, setLockerName] = useState(initialLockerName)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`session-lock-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_plans', filter: `id=eq.${sessionId}` },
        payload => {
          const row = payload.new as { locked_by: string | null; locked_at: string | null }
          setLockedBy(row.locked_by)
          setLockedAt(row.locked_at)
          if (!row.locked_by) setLockerName(null)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  const iMine = lockedBy === currentUserId
  const locked = lockedBy !== null && !isLockExpired(lockedAt)

  function handleEdit() {
    startTransition(async () => {
      const result = await acquireLock(sessionId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        router.push(editHref)
      }
    })
  }

  function handleRelease() {
    startTransition(async () => {
      await releaseLock(sessionId)
      toast.success('Lock released')
      router.refresh()
    })
  }

  if (!locked) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <Unlock size={14} className="text-emerald-400 shrink-0" />
        <p className="text-xs text-zinc-400 flex-1">No one is editing — click to start.</p>
        <button
          onClick={handleEdit}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
          Edit session
        </button>
      </div>
    )
  }

  if (iMine) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
        <Lock size={14} className="text-indigo-400 shrink-0" />
        <p className="text-xs text-indigo-300 flex-1">You&apos;re currently editing this session.</p>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(editHref)}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 transition-colors"
          >
            Continue editing
          </button>
          <button
            onClick={handleRelease}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : 'Release lock'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
      <AlertCircle size={14} className="text-amber-400 shrink-0" />
      <p className="text-xs text-amber-300">
        <span className="font-semibold">{lockerName ?? 'Someone'}</span> is currently editing this session.
        You can view but not edit until they finish or release the lock.
      </p>
    </div>
  )
}
