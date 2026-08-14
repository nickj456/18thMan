import { Gavel } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { requireFeedbackModerator } from '../require-moderator'
import { DisputeActions } from './DisputeActions'

export const metadata = { title: 'Response Disputes' }
export const dynamic = 'force-dynamic'

export default async function DisputesQueuePage() {
  const { supabase } = await requireFeedbackModerator()

  // RLS (migration 091) scopes this to the caller's own club (club admin) or
  // all clubs (platform admin) automatically -- no manual club_id filter.
  const { data: disputes } = await supabase
    .from('response_disputes')
    .select(`
      id, reason, created_at,
      feedback_responses!inner(
        feedback_requests!inner(
          feedback_type,
          profiles!feedback_requests_coach_id_fkey(display_name, username)
        )
      )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: true })

  type DisputeRow = {
    id: string
    reason: string
    created_at: string
    feedback_responses: {
      feedback_requests: {
        feedback_type: string
        profiles: { display_name: string | null; username: string } | null
      }
    }
  }
  const rows = (disputes ?? []) as unknown as DisputeRow[]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="app-heading text-2xl flex items-center gap-2">
          <Gavel size={20} className="text-amber-400" /> Response Disputes
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Responses a coach has flagged as unfair or inaccurate.</p>
      </div>

      {rows.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-zinc-500">No open disputes.</CardContent>
        </Card>
      )}

      {rows.map(dispute => {
        const request = dispute.feedback_responses.feedback_requests
        const coachName = request.profiles?.display_name ?? request.profiles?.username ?? 'Unknown coach'
        return (
          <Card key={dispute.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {coachName} — {request.feedback_type === 'player_voice' ? 'Player / Parent Voice' : 'Peer Observation'}
              </CardTitle>
              <CardDescription>Raised {new Date(dispute.created_at).toLocaleString('en-GB')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-md p-3">{dispute.reason}</p>
              <DisputeActions disputeId={dispute.id} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
