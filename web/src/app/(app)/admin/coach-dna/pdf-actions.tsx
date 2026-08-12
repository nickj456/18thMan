'use server'

import { redirect } from 'next/navigation'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { sendCoachDnaSummaryEmail } from '@/lib/email'
import { CoachDnaSummaryPDF } from './CoachDnaSummaryPDF'
import { isCurrentSummaryShape } from '@/lib/coach-dna/summary-shape'
import { LOGO_DATA_URI } from '@/lib/pdf-logo'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

export async function emailSelfAssessmentSummaryPDF(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, club, club_id')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin' && profile?.role !== 'coach') redirect('/dashboard')

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_summary, ai_summary_generated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const summary = coachProfile?.ai_summary as SelfAssessmentSummary | undefined
  if (!summary || !isCurrentSummaryShape(summary)) {
    return { success: false, error: 'Your results need refreshing — open your Coach DNA results page, then try emailing again.' }
  }

  // `ai_summary_generated_at` is set alongside `ai_summary` in the same upsert
  // (see generateSelfAssessmentSummary), so it's always present once a summary
  // exists — fall back to "now" defensively rather than crash on a null.
  const completedAt = coachProfile?.ai_summary_generated_at ?? new Date().toISOString()

  // `club_id` (FK to `clubs`) is the current source of truth; `club` is a
  // legacy free-text fallback for profiles never migrated to it — same
  // resolution order as the admin users table.
  let clubName: string | null = profile?.club ?? null
  if (profile?.club_id) {
    const { data: club } = await supabase.from('clubs').select('name').eq('id', profile.club_id).single()
    clubName = club?.name ?? clubName
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      <CoachDnaSummaryPDF
        data={summary}
        completedAt={completedAt}
        logoSrc={LOGO_DATA_URI}
        coachName={profile?.display_name ?? null}
        clubName={clubName}
      /> as any,
    )
    return await sendCoachDnaSummaryEmail(user.email!, summary, Buffer.from(pdfBuffer))
  } catch (err) {
    console.error('[coach-dna] Failed to generate or send summary PDF:', err)
    return { success: false, error: 'Failed to send your PDF. Please try again.' }
  }
}
