import { ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { requireFeedbackModerator } from '../require-moderator'
import { SafeguardingFlagActions } from './SafeguardingFlagActions'

export const metadata = { title: 'Safeguarding Queue' }
export const dynamic = 'force-dynamic'

export default async function SafeguardingQueuePage() {
  const { supabase } = await requireFeedbackModerator()

  // RLS (migration 092) scopes this to the caller's own club (club admin) or
  // all clubs (platform admin) automatically -- no manual club_id filter.
  const { data: flags } = await supabase
    .from('safeguarding_flags')
    .select(`
      id, flagged_text, detection_method, created_at,
      feedback_answers!inner(
        feedback_responses!inner(
          feedback_requests!inner(
            feedback_type,
            profiles!feedback_requests_coach_id_fkey(display_name, username)
          )
        )
      )
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: true })

  type FlagRow = {
    id: string
    flagged_text: string
    detection_method: string
    created_at: string
    feedback_answers: {
      feedback_responses: {
        feedback_requests: {
          feedback_type: string
          profiles: { display_name: string | null; username: string } | null
        }
      }
    }
  }
  const rows = (flags ?? []) as unknown as FlagRow[]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="app-heading text-2xl flex items-center gap-2">
          <ShieldAlert size={20} className="text-red-400" /> Safeguarding Queue
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Automated flags on free-text feedback comments awaiting review.</p>
      </div>

      {rows.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-zinc-500">No flagged content to review.</CardContent>
        </Card>
      )}

      {rows.map(flag => {
        const request = flag.feedback_answers.feedback_responses.feedback_requests
        const coachName = request.profiles?.display_name ?? request.profiles?.username ?? 'Unknown coach'
        return (
          <Card key={flag.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {coachName} — {request.feedback_type === 'player_voice' ? 'Player / Parent Voice' : 'Peer Observation'}
              </CardTitle>
              <CardDescription>
                Flagged {new Date(flag.created_at).toLocaleString('en-GB')} ({flag.detection_method})
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-md p-3">{flag.flagged_text}</p>
              <SafeguardingFlagActions flagId={flag.id} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
