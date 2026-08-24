import type { createClient } from '@/lib/supabase/server'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'
import { ensureFreshSummary } from '@/app/(app)/admin/coach-dna/summary-actions'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface BlendedAttemptContext {
  user: { id: string }
  profile: { role: string | null; display_name: string | null; club: string | null; club_id: string | null }
  attempt: { id: string; coach_id: string; completed_at: string }
  summary: SelfAssessmentSummary
  clubName: string | null
}

/** Shared auth/ownership/blended gate for the two outcome-PDF routes
 *  (report-pdf and feedback-summary-pdf). Both routes need the exact same
 *  sequence -- authenticated admin/coach, owns a completed attempt, has
 *  blended (not self-only) feedback -- before doing their own PDF-specific
 *  work, so a future change to this gate only needs to happen once.
 *
 *  Returns either the resolved context, or a Response the caller should
 *  return immediately (preserving the original status codes: 401 no user,
 *  403 wrong role, 404 missing/foreign/incomplete attempt or self-only
 *  feedback). */
export async function requireBlendedAttempt(
  supabase: SupabaseServerClient,
  attemptId: string,
): Promise<BlendedAttemptContext | Response> {
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

  return {
    user: { id: user.id },
    profile: {
      role: profile?.role ?? null,
      display_name: profile?.display_name ?? null,
      club: profile?.club ?? null,
      club_id: profile?.club_id ?? null,
    },
    attempt: { id: attempt.id, coach_id: attempt.coach_id, completed_at: attempt.completed_at },
    summary,
    clubName,
  }
}
