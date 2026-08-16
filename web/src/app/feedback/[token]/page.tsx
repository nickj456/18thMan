import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { feedbackRequestEligibility } from '@/lib/coach-dna/feedback-request-status'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FeedbackForm } from './FeedbackForm'
import type { FeedbackType } from '@/lib/supabase/types'

export const metadata = { title: 'Coach Feedback' }
export const dynamic = 'force-dynamic'

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: request } = await supabase
    .from('feedback_requests')
    .select('id, feedback_type, status, expires_at, profiles!feedback_requests_coach_id_fkey(display_name, username)')
    .eq('token', token)
    .maybeSingle()
  if (!request) notFound()

  const coach = request.profiles as unknown as { display_name: string | null; username: string } | null
  const coachName = coach?.display_name ?? coach?.username ?? 'this coach'

  const eligibility = feedbackRequestEligibility(request)
  if (eligibility === 'expired') {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle>This feedback request has expired</CardTitle>
            <CardDescription>Ask {coachName} to send you a new link.</CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    )
  }
  if (eligibility === 'paused') {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle>This link isn&apos;t accepting feedback right now</CardTitle>
            <CardDescription>{coachName} has paused this link. Try again later.</CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    )
  }

  const { data: questions } = await supabase
    .from('assessment_questions')
    .select('id, question_text, question_format')
    .eq('assessment_type', request.feedback_type)
    .eq('active', true)
    .order('display_order')
  const ratingQuestions = (questions ?? []).filter(q => q.question_format === 'rating_scale')

  return (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle>
            {request.feedback_type === 'player_voice' ? `Feedback for ${coachName}` : `Peer Feedback for ${coachName}`}
          </CardTitle>
          <CardDescription>
            Your feedback is anonymous and helps {coachName} improve. It takes about 2 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackForm
            token={token}
            feedbackType={request.feedback_type as FeedbackType}
            questions={ratingQuestions.map(q => ({ id: q.id, text: q.question_text }))}
          />
        </CardContent>
      </Card>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12 bg-zinc-950">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <span className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">18th Man · Coach DNA</span>
        </div>
        {children}
      </div>
    </div>
  )
}
