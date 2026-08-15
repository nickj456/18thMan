import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyLinkButton } from './CopyLinkButton'
import type { FeedbackType } from '@/lib/supabase/types'

export const metadata = { title: 'Feedback Requests' }

const TYPE_LABELS: Record<FeedbackType, string> = {
  player_voice: 'Player / Parent Voice',
  peer_observation: 'Peer Observation',
}

export default async function FeedbackRequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const { data: requests } = await supabase
    .from('feedback_requests')
    .select('id, feedback_type, team_id, token, expires_at, minimum_response_threshold, status, created_at')
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })

  const teamIds = [...new Set((requests ?? []).map(r => r.team_id).filter(Boolean))] as string[]
  const { data: teams } = teamIds.length > 0
    ? await supabase.from('coaching_groups').select('id, name').in('id', teamIds)
    : { data: [] }
  const teamMap = Object.fromEntries((teams ?? []).map(t => [t.id, t.name]))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl">Feedback Requests</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Player, parent, and peer feedback on your coaching.</p>
        </div>
        <Button render={<Link href="/admin/coach-dna/feedback/new" />}>New request</Button>
      </div>

      {(requests ?? []).length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-zinc-500">
            No feedback requests yet. Create one to get started.
          </CardContent>
        </Card>
      )}

      {(requests ?? []).map(request => (
        <Card key={request.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {TYPE_LABELS[request.feedback_type as FeedbackType]}
              {request.team_id && teamMap[request.team_id] ? ` — ${teamMap[request.team_id]}` : ''}
            </CardTitle>
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
  )
}
