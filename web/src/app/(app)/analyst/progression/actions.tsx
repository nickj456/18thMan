'use server'

import { redirect } from 'next/navigation'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { resolvePlayers } from '@/lib/match-analysis/aggregate'
import { ProgressionPDF } from './ProgressionPDF'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

interface PdfInput {
  sessionIds: string[]
  playerKeys: string[]
  sections: string[]
  statTypes: string[]
}

function getLogoDataUri(): string | undefined {
  try {
    const p = resolve(process.cwd(), 'public/logo.png')
    if (!existsSync(p)) return undefined
    return `data:image/png;base64,${readFileSync(p).toString('base64')}`
  } catch {
    return undefined
  }
}

export async function generateProgressionPdf(
  input: PdfInput,
): Promise<{ pdf?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id || !['coach', 'admin'].includes(profile.role ?? '')) {
    return { error: 'Unauthorized' }
  }

  const { data: sessions } = await supabase
    .from('match_sessions')
    .select('*, analyst:profiles!analyst_id(display_name)')
    .eq('club_id', profile.club_id)
    .in('id', input.sessionIds) as { data: MatchSessionWithAnalyst[] | null }

  if (!sessions?.length) return { error: 'No sessions found.' }

  const players = resolvePlayers(sessions)
  const logoSrc = getLogoDataUri()
  const exportDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(
      <ProgressionPDF
        sessions={sessions}
        sessionIds={input.sessionIds}
        playerKeys={input.playerKeys}
        players={players}
        sections={input.sections}
        statTypes={input.statTypes}
        logoSrc={logoSrc}
        exportDate={exportDate}
      /> as any,
    )
    return { pdf: Buffer.from(buffer).toString('base64') }
  } catch (err) {
    console.error('[progression-pdf] Error:', err)
    return { error: 'Failed to generate PDF. Please try again.' }
  }
}
