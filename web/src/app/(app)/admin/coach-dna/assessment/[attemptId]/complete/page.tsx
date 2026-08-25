// web/src/app/(app)/admin/coach-dna/assessment/[attemptId]/complete/page.tsx
import { redirect, unstable_rethrow } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { ensureFreshSummary } from '../../../summary-actions'
import { EmailSummaryButton } from './EmailSummaryButton'
import { RetryGenerateButton } from './RetryGenerateButton'
import { labelFor } from '@/lib/coach-dna/categories'
import { sourceTagFor, allCategoriesSelfOnly } from '@/lib/coach-dna/source-label'
import { tierLabel } from '@/lib/coach-dna/tier-label'
import { buildGuidance } from '@/lib/coach-dna/guidance'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'
import { feedbackRequestEligibility } from '@/lib/coach-dna/feedback-request-status'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

function CategoryRow({ category, sourcedCategories }: {
  category: SelfAssessmentSummary['categories'][number]
  sourcedCategories: SelfAssessmentSummary['sourcedCategories']
}) {
  const tag = sourceTagFor(sourcedCategories, category.categorySlug)
  return (
    <li className="text-sm text-zinc-400">
      <span className="text-zinc-200 font-medium">{labelFor(category.categorySlug)}</span>
      <span className="text-zinc-500"> · {tierLabel(category.tier)} · {Math.round(category.score)}/100</span>
      {tag && <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full align-middle">{tag}</span>}
      <p className="mt-0.5">{category.text}</p>
      {category.resources.length > 0 && (
        <ul className="mt-1.5 space-y-1 pl-3 border-l border-zinc-800">
          {category.resources.map(resource => (
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
  )
}

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
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, coach_id, completed_at')
    .eq('id', attemptId)
    .single()
  if (!attempt || attempt.coach_id !== user.id || !attempt.completed_at) redirect('/admin/coach-dna')

  let summary: SelfAssessmentSummary
  let generationFailed = false
  try {
    summary = await ensureFreshSummary(attemptId, user.id)
  } catch (err) {
    unstable_rethrow(err)
    console.error('[coach-dna] Failed to generate summary:', err)
    generationFailed = true
    summary = { primaryType: '', secondaryType: null, narrative: '', categories: [] }
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

  const { data: feedbackRequests } = await supabase
    .from('feedback_requests')
    .select('id, minimum_response_threshold, status, expires_at')
    .eq('coach_id', user.id)
  const requestIds = (feedbackRequests ?? []).map(r => r.id)
  const { data: feedbackResponses } = requestIds.length > 0
    ? await supabase.from('feedback_responses').select('id, feedback_request_id').in('feedback_request_id', requestIds)
    : { data: [] }
  const activeRequests = (feedbackRequests ?? []).filter(r => feedbackRequestEligibility(r) !== 'expired')
  const totalReceived = (feedbackResponses ?? []).length
  const totalThreshold = activeRequests.reduce((sum, r) => sum + r.minimum_response_threshold, 0)

  const guidanceSteps = buildGuidance({
    hasAnyFeedbackRequest: (feedbackRequests ?? []).length > 0,
    activeRequestsBelowThreshold: activeRequests.length > 0 && totalReceived < totalThreshold,
    hasBlendedFeedback: hasBlendedFeedback(summary.sourcedCategories),
    focusCategories: summary.categories.filter(c => c.tier === 'focus').map(c => c.categorySlug),
  })

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
          {allCategoriesSelfOnly(summary.sourcedCategories, summary.categories.map(c => c.categorySlug)) && (
            <p className="text-xs text-zinc-500 uppercase tracking-widest">
              Based on your self-assessment only. This updates once player and peer feedback comes in.
            </p>
          )}
          <p className="text-sm text-zinc-300">{summary.narrative}</p>

          <div>
            <h2 className="text-sm font-semibold text-emerald-400 mb-2">Strengths</h2>
            <ul className="space-y-3">
              {summary.categories.filter(c => c.tier === 'strength').map(category => (
                <CategoryRow key={category.categorySlug} category={category} sourcedCategories={summary.sourcedCategories} />
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">Solid ground</h2>
            <ul className="space-y-3">
              {summary.categories.filter(c => c.tier === 'solid').map(category => (
                <CategoryRow key={category.categorySlug} category={category} sourcedCategories={summary.sourcedCategories} />
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-orange-400 mb-2">Focus areas</h2>
            <ul className="space-y-4">
              {summary.categories.filter(c => c.tier === 'focus').map(category => (
                <CategoryRow key={category.categorySlug} category={category} sourcedCategories={summary.sourcedCategories} />
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button render={<Link href="/admin/coach-dna" />}>Back to Coach DNA</Button>
            <EmailSummaryButton />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What to do next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {guidanceSteps.map(step => (
            <div key={step.heading} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-sm font-semibold text-zinc-100">{step.heading}</p>
              <p className="text-sm text-zinc-400 mt-0.5">{step.body}</p>
              {step.href && step.linkLabel && (
                <Link href={step.href} className="inline-block mt-2 text-sm text-orange-400 hover:text-orange-300">
                  {step.linkLabel} →
                </Link>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
