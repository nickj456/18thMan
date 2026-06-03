'use server'

import { redirect } from 'next/navigation'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { renderToBuffer } from '@react-pdf/renderer'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { createClient } from '@/lib/supabase/server'
import {
  resolvePlayers,
  countEvents,
  getAllStatTypes,
  computePlayerStats,
  getPolarity,
} from '@/lib/match-analysis/aggregate'
import { ProgressionPDF } from './ProgressionPDF'
import type { MatchSessionWithAnalyst } from '@/lib/supabase/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHash(sessionIds: string[]): string {
  return btoa([...sessionIds].sort().join(','))
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

// ── Team insight ──────────────────────────────────────────────────────────────

interface TeamInsightInput {
  sessionIds: string[]
  clubName: string
  groupId: string
}

export async function generateTeamInsight(input: TeamInsightInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id || !['coach', 'admin'].includes(profile.role ?? '')) {
    throw new Error('Unauthorized')
  }

  const { data: sessions } = await supabase
    .from('match_sessions')
    .select('*, analyst:profiles!analyst_id(display_name)')
    .eq('club_id', profile.club_id)
    .in('id', input.sessionIds) as { data: MatchSessionWithAnalyst[] | null }

  if (!sessions?.length) throw new Error('No sessions found')

  const statTypes = getAllStatTypes(sessions)
  const hash = makeHash(input.sessionIds)

  const statTotals: Record<string, number> = {}
  for (const s of sessions) {
    const counts = countEvents(s.events)
    for (const st of statTypes) {
      statTotals[st] = (statTotals[st] ?? 0) + (counts[st] ?? 0)
    }
  }
  const avgPerMatch = (stat: string) =>
    sessions.length ? ((statTotals[stat] ?? 0) / sessions.length).toFixed(1) : '0'

  const players = resolvePlayers(sessions)
  const tackleLeader = players
    .map(p => ({ p, total: sessions.reduce((n, s) => n + (countEvents(s.events, p.key)['tackle'] ?? 0), 0) }))
    .sort((a, b) => b.total - a.total)[0]
  const carryLeader = players
    .map(p => ({ p, total: sessions.reduce((n, s) => n + (countEvents(s.events, p.key)['carry'] ?? 0), 0) }))
    .sort((a, b) => b.total - a.total)[0]

  const concernStats = statTypes.filter(st => {
    if (getPolarity(st) !== 'negative') return false
    const badCount = sessions.filter(s => {
      const val = countEvents(s.events)[st] ?? 0
      const avg = (statTotals[st] ?? 0) / sessions.length
      return val > avg
    }).length
    return badCount >= 2
  })

  const opponents = sessions.map(s => s.opposition ?? 'Unknown').join(', ')

  const prompt = `You are an assistant rugby league coach. Analyse this team's performance data and provide a 2-3 sentence insight highlighting: (1) the team's strongest consistent performer, (2) the most pressing concern, and (3) one specific player callout. Be direct and actionable. Use plain English — no markdown, no bullet points.

Team: ${input.clubName}
Matches: ${sessions.length} — ${opponents}
Stats:
${statTypes.map(st => `- ${st.replace(/_/g, ' ')}: ${statTotals[st] ?? 0} total, ${avgPerMatch(st)} per match`).join('\n')}
${tackleLeader ? `Top tackler: ${tackleLeader.p.name} (${tackleLeader.total} total)` : ''}
${carryLeader ? `Top carrier: ${carryLeader.p.name} (${carryLeader.total} total)` : ''}
${concernStats.length ? `Concerns: ${concernStats.map(s => s.replace(/_/g, ' ')).join(', ')} — high in 2+ matches` : ''}`

  const { text } = await generateText({
    model: gateway('anthropic/claude-haiku-4-5'),
    prompt,
  })

  await supabase.from('progression_insights').upsert(
    { club_id: profile.club_id, group_id: input.groupId, scope: 'team', session_ids_hash: hash, content: text },
    { onConflict: 'group_id,scope,session_ids_hash' },
  )

  return { text, hash }
}

// ── Player insight ─────────────────────────────────────────────────────────────

interface PlayerInsightInput {
  playerKey: string
  playerName: string
  playerNumber: number
  sessionIds: string[]
  groupId: string
}

export async function generatePlayerInsight(input: PlayerInsightInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id || !['coach', 'admin'].includes(profile.role ?? '')) {
    throw new Error('Unauthorized')
  }

  const { data: sessions } = await supabase
    .from('match_sessions')
    .select('*')
    .eq('club_id', profile.club_id)
    .in('id', input.sessionIds) as { data: MatchSessionWithAnalyst[] | null }

  if (!sessions?.length) throw new Error('No sessions found')

  const statTypes = getAllStatTypes(sessions)
  const stats = computePlayerStats(input.playerKey, sessions, input.sessionIds, statTypes)
  const hash = makeHash(input.sessionIds)

  const statLines = stats
    .filter(s => s.avg > 0 || s.best > 0)
    .map(s => `- ${s.statType.replace(/_/g, ' ')}: avg ${s.avg.toFixed(1)}/match, best ${s.best}, worst ${s.worst}, trend ${s.trend}${s.hasDecline ? ' (3+ match decline)' : ''}`)
    .join('\n')

  const prompt = `You are an assistant rugby league coach. Analyse this player's performance data and provide a 2-3 sentence coaching observation. Highlight one strength, one concern if present, and one specific recommendation for training. Be direct and actionable. Use plain English — no markdown, no bullet points.

Player: ${input.playerName} (jersey #${input.playerNumber})
Matches tracked: ${input.sessionIds.length}
Stats:
${statLines}`

  const { text } = await generateText({
    model: gateway('anthropic/claude-haiku-4-5'),
    prompt,
  })

  await supabase.from('progression_insights').upsert(
    { club_id: profile.club_id, group_id: input.groupId, scope: input.playerKey, session_ids_hash: hash, content: text },
    { onConflict: 'group_id,scope,session_ids_hash' },
  )

  return { text, hash }
}

// ── PDF export (unchanged) ────────────────────────────────────────────────────

interface PdfInput {
  sessionIds: string[]
  playerKeys: string[]
  sections: string[]
  statTypes: string[]
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
