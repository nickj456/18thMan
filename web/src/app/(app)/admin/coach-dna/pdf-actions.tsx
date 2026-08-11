'use server'

import { redirect } from 'next/navigation'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { sendCoachDnaSummaryEmail } from '@/lib/email'
import { CoachDnaSummaryPDF } from './CoachDnaSummaryPDF'
import type { SelfAssessmentSummary } from '@/lib/supabase/types'

export async function emailSelfAssessmentSummaryPDF(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('ai_summary')
    .eq('user_id', user.id)
    .maybeSingle()

  const summary = coachProfile?.ai_summary as SelfAssessmentSummary | undefined
  if (!summary) return { success: false, error: 'No results to send yet.' }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(<CoachDnaSummaryPDF data={summary} /> as any)
    return await sendCoachDnaSummaryEmail(user.email!, summary, Buffer.from(pdfBuffer))
  } catch (err) {
    console.error('[coach-dna] Failed to generate or send summary PDF:', err)
    return { success: false, error: 'Failed to send your PDF. Please try again.' }
  }
}
