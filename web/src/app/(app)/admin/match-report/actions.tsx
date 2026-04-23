'use server'

import { renderToBuffer } from '@react-pdf/renderer'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendMatchReportEmail } from '@/lib/email'
import { MatchReportPDF } from './MatchReportPDF'
import type { MatchReportData } from './types'

function getLogoDataUri(): string | undefined {
  try {
    const p = resolve(process.cwd(), 'public/logo.png')
    if (!existsSync(p)) return undefined
    return `data:image/png;base64,${readFileSync(p).toString('base64')}`
  } catch {
    return undefined
  }
}

export async function generateAndSendReport(
  data: MatchReportData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const logoSrc = getLogoDataUri()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(<MatchReportPDF data={data} logoSrc={logoSrc} /> as any)

    const result = await sendMatchReportEmail(
      data.customerEmail,
      {
        serviceType: data.serviceType,
        matchDate: data.matchDate,
        opposition: data.opposition,
        competition: data.competition,
        playerNames: data.players.map(p => p.name),
      },
      Buffer.from(pdfBuffer),
    )

    return result
  } catch (err) {
    console.error('[match-report] Failed to generate or send report:', err)
    return { success: false, error: 'Failed to generate report. Please try again.' }
  }
}
