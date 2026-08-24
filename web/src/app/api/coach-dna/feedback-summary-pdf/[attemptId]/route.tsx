import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ensureFreshSummary } from '@/app/(app)/admin/coach-dna/summary-actions'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'
import { computeFeedbackSummary } from '@/lib/coach-dna/feedback-summary'
import { FeedbackSummaryPDF } from '@/app/(app)/admin/coach-dna/FeedbackSummaryPDF'
import { LOGO_DATA_URI } from '@/lib/pdf-logo'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, display_name, club, club_id')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin' && profile?.role !== 'coach') {
      return new Response('Forbidden', { status: 403 })
    }

    // The attemptId here is only used for the ownership/completion/blended
    // gate, matching the old card-image route's pattern -- the feedback
    // summary itself is keyed off coachId, not the attempt, since feedback
    // isn't tied to one specific assessment attempt.
    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, coach_id, completed_at')
      .eq('id', attemptId)
      .single()
    if (!attempt || attempt.coach_id !== user.id || !attempt.completed_at) {
      return new Response('Not Found', { status: 404 })
    }

    const summary = await ensureFreshSummary(attemptId, user.id)
    if (!hasBlendedFeedback(summary.sourcedCategories)) {
      return new Response('Not Found', { status: 404 })
    }

    let clubName: string | null = profile?.club ?? null
    if (profile?.club_id) {
      const { data: club } = await supabase.from('clubs').select('name').eq('id', profile.club_id).single()
      clubName = club?.name ?? clubName
    }

    const serviceSupabase = createServiceClient()
    const feedbackSummary = await computeFeedbackSummary(serviceSupabase, user.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      <FeedbackSummaryPDF
        data={feedbackSummary}
        logoSrc={LOGO_DATA_URI}
        coachName={profile?.display_name ?? null}
        clubName={clubName}
      /> as any,
    )

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="coach-dna-feedback-summary.pdf"',
      },
    })
  } catch (err) {
    console.error('[coach-dna/feedback-summary-pdf] Failed to generate feedback summary PDF:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
