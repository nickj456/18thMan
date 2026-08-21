// web/src/app/(app)/admin/coach-dna/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle2, ArrowRight, Clock, Users, Eye, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { startAssessment } from './actions'
import { labelFor } from '@/lib/coach-dna/categories'
import { isCurrentSummaryShape } from '@/lib/coach-dna/summary-shape'
import { firstSentence } from '@/lib/coach-dna/narrative'
import { feedbackRequestEligibility } from '@/lib/coach-dna/feedback-request-status'
import type { FeedbackType } from '@/lib/supabase/types'

const HOW_IT_WORKS = [
  '24 scenario-based questions, about 10 minutes.',
  "For each one, pick the option that's most like you and the one that's least like you.",
  "Answers are forced-choice on purpose. Go with instinct, don't overthink it.",
  'At the end you get your coaching type, strengths, focus areas, and resources to work on them.',
  'This is based on your self-assessment only. It updates as player and peer feedback comes in later.',
]

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  player_voice: 'Player / Parent Voice',
  peer_observation: 'Peer Observation',
}

const FEEDBACK_TYPE_ICONS: Record<FeedbackType, LucideIcon> = {
  player_voice: Users,
  peer_observation: Eye,
}

const FEEDBACK_HOW_IT_WORKS = [
  'Player / Parent Voice: pulse feedback from one of your teams. Needs guardian consent on file for the season.',
  'Peer Observation: structured feedback from a fellow coach who watches you run a session.',
  'Responses are anonymous and blend into your Coach DNA profile alongside your self-assessment.',
]

export const metadata = { title: 'Coach DNA' }

// Keep in sync with the page container's `max-w-6xl` below (72rem = 1152px).
const PAGE_MAX_WIDTH_PX = 1152

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

  let summary: { primaryType: string; secondaryType: string | null; narrative: string; pros: { categorySlug: string; text: string }[]; cons: { categorySlug: string; text: string }[] } | null = null
  if (completed) {
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('ai_summary')
      .eq('user_id', user.id)
      .maybeSingle()
    if (coachProfile?.ai_summary && isCurrentSummaryShape(coachProfile.ai_summary)) {
      summary = coachProfile.ai_summary
    }
  }

  const { data: feedbackRequests } = await supabase
    .from('feedback_requests')
    .select('id, feedback_type, minimum_response_threshold, status, expires_at')
    .eq('coach_id', user.id)

  const requestIds = (feedbackRequests ?? []).map(r => r.id)
  const { data: feedbackResponses } = requestIds.length > 0
    ? await supabase
      .from('feedback_responses')
      .select('id, feedback_request_id')
      .in('feedback_request_id', requestIds)
    : { data: [] }

  const responseCountByRequest = new Map<string, number>()
  for (const r of feedbackResponses ?? []) {
    responseCountByRequest.set(r.feedback_request_id, (responseCountByRequest.get(r.feedback_request_id) ?? 0) + 1)
  }

  const activeRequests = (feedbackRequests ?? []).filter(r => feedbackRequestEligibility(r) !== 'expired')

  const feedbackTypeSummaries: { type: FeedbackType; received: number; threshold: number; status: string }[] = []
  const byType = new Map<string, { type: FeedbackType; received: number; threshold: number; status: string }>()
  for (const r of activeRequests) {
    const received = responseCountByRequest.get(r.id) ?? 0
    const eligibility = feedbackRequestEligibility(r)
    const existing = byType.get(r.feedback_type)
    if (existing) {
      existing.received += received
      existing.threshold += r.minimum_response_threshold
      if (eligibility === 'accepting') existing.status = 'active'
    } else {
      const entry = {
        type: r.feedback_type,
        received,
        threshold: r.minimum_response_threshold,
        status: eligibility === 'accepting' ? 'active' : 'paused',
      }
      byType.set(r.feedback_type, entry)
      feedbackTypeSummaries.push(entry)
    }
  }
  const totalReceived = feedbackTypeSummaries.reduce((sum, t) => sum + t.received, 0)
  const totalThreshold = feedbackTypeSummaries.reduce((sum, t) => sum + t.threshold, 0)
  const feedbackPercent = totalThreshold > 0 ? Math.min(100, Math.round((totalReceived / totalThreshold) * 100)) : 0

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="sr-only">Coach DNA</h1>
      <div className="relative h-64 sm:h-72 lg:h-80 rounded-2xl overflow-hidden ring-1 ring-foreground/10">
        <Image
          src="/coach-dna-hero.png"
          alt="Coach DNA. Know your DNA. Lead your team. Grow as a coach."
          fill
          priority
          sizes={`(min-width: ${PAGE_MAX_WIDTH_PX}px) ${PAGE_MAX_WIDTH_PX}px, 100vw`}
          className="object-cover object-top"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Coach self-assessment</CardTitle>
            <CardDescription>
              24 scenario-based questions about how you coach. Takes about 10 minutes. You can
              save and come back at any time.
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

            {completed && summary ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-base font-bold text-zinc-100 tracking-tight">
                    You&apos;re a {labelFor(summary.primaryType)}
                    {summary.secondaryType ? ` / ${labelFor(summary.secondaryType)}` : ''} coach
                  </p>
                </div>
                {summary.narrative && (
                  <p className="text-sm text-zinc-400">{firstSentence(summary.narrative)}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {summary.pros[0] && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-sm font-semibold text-zinc-100">
                        {labelFor(summary.pros[0].categorySlug)}
                      </p>
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mt-1">
                        Top strength
                      </p>
                    </div>
                  )}
                  {summary.cons[0] && (
                    <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                      <p className="text-sm font-semibold text-zinc-100">
                        {labelFor(summary.cons[0].categorySlug)}
                      </p>
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mt-1">
                        Focus area
                      </p>
                    </div>
                  )}
                </div>
                <Link
                  href={`/admin/coach-dna/assessment/${completed.id}/complete`}
                  className="group inline-flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
                >
                  View full breakdown
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            ) : completed ? (
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

        <Card>
          <CardHeader>
            <CardTitle>Feedback requests</CardTitle>
            <CardDescription>
              Request feedback from players, parents, or fellow coaches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!feedbackRequests || feedbackRequests.length === 0 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                    How it works
                  </h2>
                  <ul className="space-y-2">
                    {FEEDBACK_HOW_IT_WORKS.map(item => (
                      <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
                        <CheckCircle2 size={15} className="text-orange-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button render={<Link href="/admin/coach-dna/feedback" />}>
                  View feedback requests
                </Button>
              </div>
            ) : activeRequests.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-zinc-500" />
                  </div>
                  <p className="text-sm text-zinc-400">
                    {feedbackRequests.length} feedback {feedbackRequests.length === 1 ? 'request has' : 'requests have'} expired without a new one started.
                  </p>
                </div>
                <Button render={<Link href="/admin/coach-dna/feedback" />}>
                  View feedback requests
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
                  <div className="flex items-end justify-between gap-3 mb-3">
                    <p className="text-base font-bold text-zinc-100">
                      {totalReceived} of {totalThreshold} responses received
                    </p>
                    <p className="text-2xl font-bold text-orange-400 tracking-tight">{feedbackPercent}%</p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-400"
                      style={{ width: `${feedbackPercent}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {feedbackTypeSummaries.map(t => {
                    const Icon = FEEDBACK_TYPE_ICONS[t.type]
                    return (
                      <div key={t.type} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                        <div className="flex items-center gap-1.5 text-zinc-500 mb-2">
                          <Icon size={13} />
                          <p className="text-xs font-semibold uppercase tracking-widest">
                            {FEEDBACK_TYPE_LABELS[t.type]}
                          </p>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <p className="text-lg font-bold text-zinc-100">
                            {t.received}<span className="text-xs text-zinc-500 font-medium">/{t.threshold}</span>
                          </p>
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-full border',
                              t.status === 'active'
                                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                                : 'text-zinc-400 bg-zinc-800 border-zinc-700'
                            )}
                          >
                            {t.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Link
                  href="/admin/coach-dna/feedback"
                  className="group inline-flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
                >
                  View feedback requests
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
