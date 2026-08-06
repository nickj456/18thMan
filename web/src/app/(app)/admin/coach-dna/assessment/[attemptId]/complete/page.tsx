// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export const metadata = { title: 'Coach DNA — Assessment Complete' }

export default async function AssessmentCompletePage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const { attemptId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== user.id || !attempt.completed_at) redirect('/admin/coach-dna')

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <CardTitle>Assessment complete</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Thanks for your honesty. Your Coach DNA profile builds as player and peer feedback
            comes in.
          </p>
          <Button render={<Link href="/admin/coach-dna" />}>Back to Coach DNA</Button>
        </CardContent>
      </Card>
    </div>
  )
}
