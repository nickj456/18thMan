import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireBlendedAttempt } from '@/lib/coach-dna/require-blended-attempt'
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
    // The attemptId here is only used for the ownership/completion/blended
    // gate, matching the sibling report-pdf route's pattern -- the feedback
    // summary itself is keyed off coachId, not the attempt, since feedback
    // isn't tied to one specific assessment attempt.
    const result = await requireBlendedAttempt(supabase, attemptId)
    if (result instanceof Response) return result
    const { user, profile, clubName } = result

    const serviceSupabase = createServiceClient()
    const feedbackSummary = await computeFeedbackSummary(serviceSupabase, user.id)

    const pdfBuffer = await renderToBuffer(
      <FeedbackSummaryPDF
        data={feedbackSummary}
        logoSrc={LOGO_DATA_URI}
        coachName={profile.display_name}
        clubName={clubName}
      />,
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
