import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { NewFeedbackRequestForm } from './NewFeedbackRequestForm'

export const metadata = { title: 'New Feedback Request' }

export default async function NewFeedbackRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const { data: myGroupInvites } = await supabase
    .from('group_invitations')
    .select('group_id, coaching_groups(id, name)')
    .eq('user_id', user.id)
    .eq('status', 'accepted')
  const { data: createdGroups } = await supabase
    .from('coaching_groups')
    .select('id, name')
    .eq('created_by', user.id)

  const invitedTeams = (myGroupInvites ?? [])
    .map(i => i.coaching_groups as unknown as { id: string; name: string } | null)
    .filter((t): t is { id: string; name: string } => t !== null)
  const teamMap = new Map<string, { id: string; name: string }>()
  for (const team of [...invitedTeams, ...(createdGroups ?? [])]) teamMap.set(team.id, team)
  const teams = [...teamMap.values()]

  if (error === 'consent-required') {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="app-heading text-2xl">New Feedback Request</h1>
        <Card>
          <CardHeader>
            <CardTitle>Guardian consent needed</CardTitle>
            <CardDescription>
              Your club needs to confirm guardian consent is on file for this season before you can request
              player or parent feedback. Ask your club admin to confirm this in the club settings, then try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/coach-dna/feedback" className="text-sm text-orange-400 hover:text-orange-300">
              Back to feedback requests
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="app-heading text-2xl">New Feedback Request</h1>
      <Card>
        <CardHeader>
          <CardTitle>Request feedback</CardTitle>
          <CardDescription>
            Peer Observation is for a fellow coach. Player / Parent Voice is scoped to one of your teams and
            requires your club to have confirmed guardian consent for this season.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewFeedbackRequestForm teams={teams} />
        </CardContent>
      </Card>
    </div>
  )
}
