'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyLinkButton } from './CopyLinkButton'
import { deleteFeedbackRequests } from './actions'
import type { FeedbackType } from '@/lib/supabase/types'

const TYPE_LABELS: Record<FeedbackType, string> = {
  player_voice: 'Player / Parent Voice',
  peer_observation: 'Peer Observation',
}

export interface FeedbackRequestRow {
  id: string
  feedback_type: string
  team_id: string | null
  token: string
  expires_at: string
  minimum_response_threshold: number
  status: string
  teamName: string | null
}

export function FeedbackRequestsList({ requests, siteUrl }: { requests: FeedbackRequestRow[]; siteUrl: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDelete() {
    const ids = [...selected]
    if (ids.length === 0) return
    const noun = ids.length === 1 ? 'request' : 'requests'
    if (!confirm(`Delete ${ids.length} feedback ${noun}? This permanently deletes every response, rating, and comment already collected on ${ids.length === 1 ? 'it' : 'them'}. This can’t be undone.`)) return

    startTransition(async () => {
      const result = await deleteFeedbackRequests(ids)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      if (result.partial) {
        toast.warning(`Deleted ${result.deletedCount} of ${ids.length} — some requests couldn't be removed.`)
      } else {
        toast.success(`Deleted ${result.deletedCount} feedback ${result.deletedCount === 1 ? 'request' : 'requests'}.`)
      }
      setSelected(new Set())
      router.refresh()
    })
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-zinc-500">
          No feedback requests yet. Create one to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-2.5">
          <span className="text-sm text-red-300">{selected.size} selected</span>
          <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleDelete}>
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete selected
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {requests.map(request => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 cursor-pointer"
                  checked={selected.has(request.id)}
                  onChange={() => toggle(request.id)}
                  aria-label="Select this feedback request"
                />
                <CardTitle className="text-base">
                  {TYPE_LABELS[request.feedback_type as FeedbackType]}
                  {request.teamName ? ` — ${request.teamName}` : ''}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-zinc-500 space-y-1">
                <p>Status: <span className="text-zinc-300">{request.status}</span></p>
                <p>Minimum responses: <span className="text-zinc-300">{request.minimum_response_threshold}</span></p>
                <p>Expires: <span className="text-zinc-300">{new Date(request.expires_at).toLocaleDateString('en-GB')}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-zinc-400 bg-zinc-900 rounded px-2 py-1 flex-1 truncate">
                  {siteUrl}/feedback/{request.token}
                </code>
                <CopyLinkButton link={`${siteUrl}/feedback/${request.token}`} />
              </div>
              <Link href={`/admin/coach-dna/feedback/${request.id}/responses`} className="text-xs text-orange-400 hover:text-orange-300">
                View responses →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
