// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx
import { redirect, unstable_rethrow } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { generateSelfAssessmentSummary } from '../../../summary-actions'
import { EmailSummaryButton } from './EmailSummaryButton'
import { RetryGenerateButton } from './RetryGenerateButton'
import { labelFor } from '@/lib/coach-dna/categories'
import { isCurrentSummaryShape } from '@/lib/coach-dna/summary-shape'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

export const metadata = { title: 'Coach DNA — Your Results' }

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

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_summary')
    .eq('user_id', user.id)
    .maybeSingle()

  let summary: SelfAssessmentSummary
  let generationFailed = false
  if (coachProfile?.ai_summary && isCurrentSummaryShape(coachProfile.ai_summary)) {
    summary = coachProfile.ai_summary
  } else {
    // The auth/ownership/completed-at checks above already redirect for every
    // condition generateSelfAssessmentSummary itself also redirects on, so by
    // this point the only realistic throw is a genuine generation failure
    // (Groq call, JSON parse, or DB write) — safe to catch broadly here.
    // Still, if generateSelfAssessmentSummary's own redirect() conditions ever
    // drift out of sync with this page's guards, unstable_rethrow ensures a
    // real Next.js redirect propagates instead of being swallowed as a
    // generation failure.
    try {
      summary = await generateSelfAssessmentSummary(attemptId)
    } catch (err) {
      unstable_rethrow(err)
      console.error('[coach-dna] Failed to generate summary:', err)
      generationFailed = true
      summary = { primaryType: '', secondaryType: null, narrative: '', pros: [], cons: [] }
    }
  }

  if (generationFailed) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Couldn&apos;t generate your results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400">
              Something went wrong generating your summary. Your answers are saved, so it&apos;s
              safe to try again.
            </p>
            <RetryGenerateButton attemptId={attemptId} />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <CardTitle>
              You&apos;re a {labelFor(summary.primaryType)}
              {summary.secondaryType ? ` / ${labelFor(summary.secondaryType)}` : ''} coach
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">
            Based on your self-assessment only. This updates once player and peer feedback comes in.
          </p>
          <p className="text-sm text-zinc-300">{summary.narrative}</p>

          <div>
            <h2 className="text-sm font-semibold text-emerald-400 mb-2">Strengths</h2>
            <ul className="space-y-1.5">
              {summary.pros.map(pro => (
                <li key={pro.categorySlug} className="text-sm text-zinc-400">
                  <span className="text-zinc-200 font-medium">{labelFor(pro.categorySlug)}:</span> {pro.text}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-orange-400 mb-2">Focus areas</h2>
            <ul className="space-y-4">
              {summary.cons.map(con => (
                <li key={con.categorySlug} className="text-sm text-zinc-400">
                  <span className="text-zinc-200 font-medium">{labelFor(con.categorySlug)}:</span> {con.text}
                  {con.resources.length > 0 && (
                    <ul className="mt-1.5 space-y-1 pl-3 border-l border-zinc-800">
                      {con.resources.map(resource => (
                        <li key={resource.title} className="text-xs text-zinc-500">
                          {resource.url ? (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 font-medium"
                            >
                              {resource.title}
                            </a>
                          ) : (
                            <span className="text-zinc-300 font-medium">{resource.title}</span>
                          )}
                          {' — '}{resource.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button render={<Link href="/admin/coach-dna" />}>Back to Coach DNA</Button>
            <EmailSummaryButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
