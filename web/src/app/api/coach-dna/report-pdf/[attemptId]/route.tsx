import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { ensureFreshSummary } from '@/app/(app)/admin/coach-dna/summary-actions'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'
import { CoachDnaSummaryPDF } from '@/app/(app)/admin/coach-dna/CoachDnaSummaryPDF'
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

    // `club_id` (FK to `clubs`) is the current source of truth; `club` is a
    // legacy free-text fallback for profiles never migrated to it -- same
    // resolution order as pdf-actions.tsx's emailSelfAssessmentSummaryPDF.
    let clubName: string | null = profile?.club ?? null
    if (profile?.club_id) {
      const { data: club } = await supabase.from('clubs').select('name').eq('id', profile.club_id).single()
      clubName = club?.name ?? clubName
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      <CoachDnaSummaryPDF
        data={summary}
        completedAt={attempt.completed_at}
        logoSrc={LOGO_DATA_URI}
        coachName={profile?.display_name ?? null}
        clubName={clubName}
      /> as any,
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
