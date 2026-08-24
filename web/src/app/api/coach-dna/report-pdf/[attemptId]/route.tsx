import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { requireBlendedAttempt } from '@/lib/coach-dna/require-blended-attempt'
import { CoachDnaSummaryPDF } from '@/app/(app)/admin/coach-dna/CoachDnaSummaryPDF'
import { LOGO_DATA_URI } from '@/lib/pdf-logo'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params

  try {
    const supabase = await createClient()
    const result = await requireBlendedAttempt(supabase, attemptId)
    if (result instanceof Response) return result
    const { profile, attempt, summary, clubName } = result

    const pdfBuffer = await renderToBuffer(
      <CoachDnaSummaryPDF
        data={summary}
        completedAt={attempt.completed_at}
        logoSrc={LOGO_DATA_URI}
        coachName={profile.display_name}
        clubName={clubName}
      />,
    )

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="coach-dna-outcome.pdf"',
      },
    })
  } catch (err) {
    console.error('[coach-dna/report-pdf] Failed to generate report PDF:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
