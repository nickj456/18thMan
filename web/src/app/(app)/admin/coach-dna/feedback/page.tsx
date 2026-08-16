import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { FeedbackRequestsList } from './FeedbackRequestsList'

export const metadata = { title: 'Feedback Requests' }

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

  const rows = (requests ?? []).map(r => ({
    ...r,
    teamName: r.team_id ? (teamMap[r.team_id] ?? null) : null,
  }))

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl">Feedback Requests</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Player, parent, and peer feedback on your coaching.</p>
        </div>
        <Button render={<Link href="/admin/coach-dna/feedback/new" />}>New request</Button>
      </div>

      <FeedbackRequestsList requests={rows} siteUrl={siteUrl} />
    </div>
  )
}
