'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { BlockSessionPlan } from '@/lib/supabase/types'

const groq = createGroq()

// ── Focus area rotation ───────────────────────────────────────────────────────

const ALL_FOCUS_AREAS = [
  { area: 'Attacking Width',                 category: 'Attack' },
  { area: 'Short Side Attack',               category: 'Attack' },
  { area: 'Draw & Pass',                     category: 'Attack' },
  { area: 'Dummy Half Play',                 category: 'Attack' },
  { area: 'Support Play & Offloads',         category: 'Attack' },
  { area: 'Set Plays',                       category: 'Attack' },
  { area: 'Line Speed',                      category: 'Defence' },
  { area: 'Defence Scramble',                category: 'Defence' },
  { area: 'Kick Defence & Chase',            category: 'Defence' },
  { area: 'Marker Defence',                  category: 'Defence' },
  { area: 'Completing Sets',                 category: 'Completions & Game Management' },
  { area: 'Kick Chase & Pressure',           category: 'Completions & Game Management' },
  { area: 'Ruck Speed & Awareness',          category: 'Completions & Game Management' },
  { area: 'Catching & Passing',              category: 'Skills in Context' },
  { area: 'Ball Security',                   category: 'Skills in Context' },
]

/**
 * Distributes focus areas across N sessions in a balanced order.
 * Interleaves Attack, Defence, Completions, Skills so no category clumps together.
 * If N > 15 the rotation wraps; if N < 15 we take a representative cross-section.
 */
function planRotation(totalSessions: number, alreadyUsed: string[] = []) {
  // Group areas by category
  const byCategory: Record<string, typeof ALL_FOCUS_AREAS> = {}
  for (const fa of ALL_FOCUS_AREAS) {
    if (!byCategory[fa.category]) byCategory[fa.category] = []
    byCategory[fa.category].push(fa)
  }

  // Interleave: Attack, Defence, Completions, Skills, repeat
  const interleaved: typeof ALL_FOCUS_AREAS = []
  const categories = ['Attack', 'Defence', 'Completions & Game Management', 'Skills in Context']
  const pointers: Record<string, number> = {}
  for (const cat of categories) pointers[cat] = 0

  while (interleaved.length < ALL_FOCUS_AREAS.length) {
    for (const cat of categories) {
      const pool = byCategory[cat]
      if (pointers[cat] < pool.length) {
        interleaved.push(pool[pointers[cat]])
        pointers[cat]++
      }
    }
  }

  // Filter out recently used (last full rotation), then wrap if needed
  const unused = interleaved.filter(f => !alreadyUsed.includes(f.area))
  const pool = unused.length > 0 ? unused : interleaved

  const result: typeof ALL_FOCUS_AREAS = []
  for (let i = 0; i < totalSessions; i++) {
    result.push(pool[i % pool.length])
  }
  return result
}

// ── Zod schema for a single session plan ─────────────────────────────────────

const SessionPlanSchema = z.object({
  warm_up: z.object({
    title: z.string(),
    duration: z.string(),
    description: z.string(),
    setup: z.string(),
  }),
  modified_game_1: z.object({
    title: z.string(),
    duration: z.string(),
    setup: z.string(),
    constraint: z.string(),
    coaching_focus: z.string(),
  }),
  reflect_questions: z.array(z.string()).min(2).max(3),
  modified_game_2: z.object({
    title: z.string(),
    duration: z.string(),
    setup: z.string(),
    progression: z.string(),
  }),
  competition: z.object({
    title: z.string(),
    duration: z.string(),
    setup: z.string(),
    scoring_condition: z.string(),
  }),
  review_points: z.array(z.string()).min(2).max(3),
  coaching_tips: z.string().describe('One paragraph of practical tips for the coach running this session'),
})

const GAME_SENSE_SYSTEM = `You are an expert rugby league coaching AI specialising in Game Sense methodology.

Game Sense principle: Game → Question → Reflect → Adjust → Replay

Core rules:
- Players learn through realistic game scenarios, not isolated drills
- Coach asks questions, never gives answers directly
- Every game has a specific constraint tied to the focus area
- Keep it athlete-centred: decisions over perfect technique

Session structure (60–90 min):
1. Warm-Up (game-based) — 10–15 min
2. Modified Game 1 (constraint) — 15–20 min
3. Question & Reflect — 2–3 min
4. Modified Game 2 (progression) — 15–20 min
5. Game Sense Competition — 15–20 min
6. Review — 3–5 min

Generate creative, specific, immediately usable rugby league session plans.`

async function generateSinglePlan(focusArea: string, category: string, sessionNumber: number, totalSessions: number): Promise<BlockSessionPlan> {
  const prompt = `Session ${sessionNumber} of ${totalSessions}.
Focus area: "${focusArea}" (${category})

Generate a complete Game Sense session plan for this focus area. Be specific about player numbers, grid sizes, and constraints. Make it immediately usable by a rugby league coach.

Respond with ONLY a valid JSON object matching this exact structure (no markdown, no code blocks):
{
  "warm_up": { "title": string, "duration": string, "description": string, "setup": string },
  "modified_game_1": { "title": string, "duration": string, "setup": string, "constraint": string, "coaching_focus": string },
  "reflect_questions": [string, string, string],
  "modified_game_2": { "title": string, "duration": string, "setup": string, "progression": string },
  "competition": { "title": string, "duration": string, "setup": string, "scoring_condition": string },
  "review_points": [string, string, string],
  "coaching_tips": string
}`

  const { text } = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    system: GAME_SENSE_SYSTEM,
    prompt,
  })

  // Strip markdown code fences if the model wraps the JSON
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  const parsed = JSON.parse(cleaned)
  return SessionPlanSchema.parse(parsed) as BlockSessionPlan
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireClubAdminForGroup(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const, supabase, user: null }

  const { data: me } = await supabase
    .from('profiles')
    .select('role, club_role, club_id')
    .eq('id', user.id)
    .single()

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('club_id')
    .eq('id', groupId)
    .single()

  if (!group) return { error: 'Group not found' as const, supabase, user: null }
  if (me?.club_id !== group.club_id && me?.role !== 'admin') return { error: 'Not authorised' as const, supabase, user: null }
  if (me?.club_role !== 'admin' && me?.role !== 'admin') return { error: 'Only club admins can manage coaching blocks' as const, supabase, user: null }

  return { error: null, supabase, user }
}

// ── Create block + generate all sessions ─────────────────────────────────────

export async function createCoachingBlock(groupId: string, formData: FormData) {
  const { error, supabase, user } = await requireClubAdminForGroup(groupId)
  if (error || !user) return { error }

  const name = (formData.get('name') as string)?.trim()
  if (!name) return { error: 'Block name is required' }

  const totalSessions = parseInt(formData.get('total_sessions') as string, 10)
  if (!totalSessions || totalSessions < 2 || totalSessions > 20) return { error: 'Choose between 2 and 20 sessions' }

  // Fetch focus areas already used by this group in previous blocks
  const { data: usedHistory } = await supabase
    .from('block_sessions')
    .select('focus_area, coaching_blocks!inner(group_id)')
    .eq('coaching_blocks.group_id', groupId)
    .eq('status', 'completed')

  const alreadyUsed = (usedHistory ?? []).map(h => h.focus_area)
  const rotation = planRotation(totalSessions, alreadyUsed)

  // Create the block record first
  const { data: block, error: blockErr } = await supabase
    .from('coaching_blocks')
    .insert({ group_id: groupId, name, total_sessions: totalSessions, created_by: user.id })
    .select('id')
    .single()

  if (blockErr) return { error: blockErr.message }

  // Generate all session plans in parallel (Haiku is fast + cheap for this)
  let plans: BlockSessionPlan[]
  try {
    plans = await Promise.all(
      rotation.map((fa, i) => generateSinglePlan(fa.area, fa.category, i + 1, totalSessions))
    )
  } catch (err) {
    // Clean up the block if generation fails
    await supabase.from('coaching_blocks').delete().eq('id', block.id)
    const message = err instanceof Error ? err.message : String(err)
    return { error: `AI generation failed: ${message}` }
  }

  // Insert all block_sessions
  const rows = rotation.map((fa, i) => ({
    block_id: block.id,
    session_number: i + 1,
    focus_area: fa.area,
    category: fa.category,
    ai_plan: plans[i],
    status: 'planned' as const,
  }))

  const { error: sessErr } = await supabase.from('block_sessions').insert(rows)
  if (sessErr) {
    await supabase.from('coaching_blocks').delete().eq('id', block.id)
    return { error: sessErr.message }
  }

  revalidatePath(`/groups/${groupId}`)
  redirect(`/groups/${groupId}/blocks/${block.id}`)
}

// ── Regenerate a single session plan (after a swap) ──────────────────────────

export async function regenerateBlockSession(blockSessionId: string, groupId: string) {
  const { error, supabase } = await requireClubAdminForGroup(groupId)
  if (error) return { error }

  const { data: bs } = await supabase
    .from('block_sessions')
    .select('*, coaching_blocks!inner(total_sessions)')
    .eq('id', blockSessionId)
    .single()

  if (!bs) return { error: 'Session not found' }

  const totalSessions = (bs.coaching_blocks as { total_sessions: number }).total_sessions

  try {
    const plan = await generateSinglePlan(bs.focus_area, bs.category, bs.session_number, totalSessions)
    const { error: upErr } = await supabase
      .from('block_sessions')
      .update({ ai_plan: plan })
      .eq('id', blockSessionId)

    if (upErr) return { error: upErr.message }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: `Regeneration failed: ${message}` }
  }

  revalidatePath(`/groups/${groupId}/blocks/${bs.block_id}`)
  return { success: true }
}

// ── Swap two sessions within a block ─────────────────────────────────────────

export async function swapBlockSessions(
  blockId: string,
  sessionNumberA: number,
  sessionNumberB: number,
  groupId: string,
) {
  const { error, supabase } = await requireClubAdminForGroup(groupId)
  if (error) return { error }

  const { data: sessions } = await supabase
    .from('block_sessions')
    .select('id, session_number, focus_area, category, ai_plan, status')
    .eq('block_id', blockId)
    .in('session_number', [sessionNumberA, sessionNumberB])

  if (!sessions || sessions.length !== 2) return { error: 'Could not find both sessions' }

  const [a, b] = sessions[0].session_number === sessionNumberA ? sessions : [sessions[1], sessions[0]]

  // Swap the focus area + category + plan (but preserve status and dates)
  const { error: errA } = await supabase
    .from('block_sessions')
    .update({ focus_area: b.focus_area, category: b.category, ai_plan: b.ai_plan })
    .eq('id', a.id)

  const { error: errB } = await supabase
    .from('block_sessions')
    .update({ focus_area: a.focus_area, category: a.category, ai_plan: a.ai_plan })
    .eq('id', b.id)

  if (errA || errB) return { error: 'Swap failed' }

  revalidatePath(`/groups/${groupId}/blocks/${blockId}`)
  return { success: true }
}

// ── Prepare a session (set date + notes) ─────────────────────────────────────

export async function prepareBlockSession(
  blockSessionId: string,
  groupId: string,
  scheduledDate: string | null,
  notes: string | null,
) {
  const { error, supabase } = await requireClubAdminForGroup(groupId)
  if (error) return { error }

  const { data: bs } = await supabase
    .from('block_sessions')
    .select('block_id')
    .eq('id', blockSessionId)
    .single()

  if (!bs) return { error: 'Session not found' }

  const { error: upErr } = await supabase
    .from('block_sessions')
    .update({
      scheduled_date: scheduledDate || null,
      notes: notes || null,
      status: 'prepared',
    })
    .eq('id', blockSessionId)

  if (upErr) return { error: upErr.message }

  revalidatePath(`/groups/${groupId}/blocks/${bs.block_id}`)
  return { success: true }
}

// ── Mark a session complete ───────────────────────────────────────────────────

export async function completeBlockSession(blockSessionId: string, groupId: string) {
  const { error, supabase } = await requireClubAdminForGroup(groupId)
  if (error) return { error }

  const { data: bs } = await supabase
    .from('block_sessions')
    .select('block_id')
    .eq('id', blockSessionId)
    .single()

  if (!bs) return { error: 'Session not found' }

  const { error: upErr } = await supabase
    .from('block_sessions')
    .update({ status: 'completed' })
    .eq('id', blockSessionId)

  if (upErr) return { error: upErr.message }

  // Check if all sessions in the block are now complete → auto-complete block
  const { count } = await supabase
    .from('block_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('block_id', bs.block_id)
    .neq('status', 'completed')

  if (count === 0) {
    await supabase
      .from('coaching_blocks')
      .update({ status: 'completed' })
      .eq('id', bs.block_id)
  }

  revalidatePath(`/groups/${groupId}/blocks/${bs.block_id}`)
  return { success: true }
}

// ── Archive / delete a block ──────────────────────────────────────────────────

export async function archiveBlock(blockId: string, groupId: string) {
  const { error, supabase } = await requireClubAdminForGroup(groupId)
  if (error) return { error }

  const { error: upErr } = await supabase
    .from('coaching_blocks')
    .update({ status: 'archived' })
    .eq('id', blockId)

  if (upErr) return { error: upErr.message }

  revalidatePath(`/groups/${groupId}`)
  redirect(`/groups/${groupId}`)
}
