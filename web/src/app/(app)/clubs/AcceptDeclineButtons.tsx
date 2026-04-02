'use client'

import { useTransition } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { acceptClubInvite, declineClubInvite } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  invitationId: string
  clubId: string
}

export function AcceptDeclineButtons({ invitationId, clubId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptClubInvite(invitationId, clubId)
      if (result?.error) toast.error(result.error)
      else { toast.success('Welcome to the club!'); router.refresh() }
    })
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await declineClubInvite(invitationId)
      if (result?.error) toast.error(result.error)
      else { toast.success('Invitation declined'); router.refresh() }
    })
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={handleDecline}
        disabled={isPending}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
        Decline
      </button>
      <button
        onClick={handleAccept}
        disabled={isPending}
        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
        Accept
      </button>
    </div>
  )
}
