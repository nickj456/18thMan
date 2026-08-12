// web/src/app/(app)/admin/coach-dna/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { startAssessment } from './actions'

const HOW_IT_WORKS = [
  '24 scenario-based questions, about 10 minutes.',
  "For each one, pick the option that's most like you and the one that's least like you.",
  "Answers are forced-choice on purpose. Go with instinct, don't overthink it.",
  'At the end you get your coaching type, strengths, focus areas, and resources to work on them.',
  'This is based on your self-assessment only. It updates as player and peer feedback comes in later.',
]

export const metadata = { title: 'Coach DNA' }

export default async function CoachDnaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const { data: inProgress } = await supabase
    .from('assessment_attempts')
    .select('id')
    .eq('coach_id', user.id)
    .eq('assessment_type', 'self_assessment')
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: completed } = await supabase
    .from('assessment_attempts')
    .select('id')
    .eq('coach_id', user.id)
    .eq('assessment_type', 'self_assessment')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="app-heading text-2xl">Coach DNA</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Discover your coaching style</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coach self-assessment</CardTitle>
          <CardDescription>
            24 scenario-based questions about how you coach. Takes about 10 minutes. You can save
            and come back at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!completed && !inProgress && (
            <div>
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                How it works
              </h2>
              <ul className="space-y-2">
                {HOW_IT_WORKS.map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                    <CheckCircle2 size={15} className="text-orange-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {completed ? (
            <Button render={<Link href={`/admin/coach-dna/assessment/${completed.id}/complete`} />}>
              View your results
            </Button>
          ) : inProgress ? (
            <form action={async () => {
              'use server'
              redirect(`/admin/coach-dna/assessment/${inProgress.id}`)
            }}>
              <Button type="submit">Resume assessment</Button>
            </form>
          ) : (
            <form action={startAssessment}>
              <Button type="submit">Start assessment</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
