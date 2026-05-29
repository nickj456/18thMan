'use server'

import { revalidatePath } from 'next/cache'
import { generateText, Output } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const groq = createGroq()
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ALL_FOCUS_AREAS = [
  { area: 'Attacking Width',               category: 'Attack' },
  { area: 'Short Side Attack',             category: 'Attack' },
  { area: 'Dummy Half Play',               category: 'Attack' },
  { area: 'Draw & Pass',                   category: 'Attack' },
  { area: 'Support Play & Offloads',       category: 'Attack' },
  { area: 'Set Plays',                     category: 'Attack' },
  { area: 'Line Speed',                    category: 'Defence' },
  { area: 'Defence Scramble',              category: 'Defence' },
  { area: 'Kick Defence & Chase',          category: 'Defence' },
  { area: 'Marker Defence',                category: 'Defence' },
  { area: 'Completing Sets',               category: 'Completions & Game Management' },
  { area: 'Kick Chase & Pressure',         category: 'Completions & Game Management' },
  { area: 'Ruck Speed & Awareness',        category: 'Completions & Game Management' },
  { area: 'Catching & Passing',            category: 'Skills in Context' },
  { area: 'Ball Security',                 category: 'Skills in Context' },
]

const SuggestionSchema = z.object({
  focus_area: z.string().describe('The selected focus area from the rotation pool'),
  category: z.string().describe('The category this focus area belongs to'),
  rationale: z.string().describe('1-2 sentences explaining why this area was chosen given recent history'),
  warm_up: z.object({
    title: z.string(),
    duration: z.string().describe('e.g. "10–15 min"'),
    description: z.string().describe('Brief description of the warm-up game'),
    setup: z.string().describe('Player numbers, space, equipment'),
  }),
  modified_game_1: z.object({
    title: z.string(),
    duration: z.string(),
    setup: z.string().describe('Player numbers, grid size, equipment'),
    constraint: z.string().describe('The specific constraint that forces the focus area behaviour'),
    coaching_focus: z.string().describe('What to observe and reinforce'),
  }),
  reflect_questions: z.array(z.string()).min(2).max(3).describe('Guided questions to ask players'),
  modified_game_2: z.object({
    title: z.string(),
    duration: z.string(),
    setup: z.string(),
    progression: z.string().describe('How this builds on game 1'),
  }),
  competition: z.object({
    title: z.string(),
    duration: z.string(),
    setup: z.string(),
    scoring_condition: z.string().describe('The scoring rule tied to the focus area'),
  }),
  review_points: z.array(z.string()).min(2).max(3).describe('Key takeaways for the coach to reinforce'),
})

const GAME_SENSE_SYSTEM = `You are an expert rugby league coaching AI specialising in Game Sense methodology.

Game Sense principle: Game → Question → Reflect → Adjust → Replay

Core rules:
- Players learn through realistic game scenarios, not isolated drills
- Coach asks questions, never gives answers directly
- Every game has a specific constraint tied to the focus area
- Keep it athlete-centred: decisions over perfect technique
- Language: frame as challenges and questions, not instructions

Session structure (60–90 min):
1. Warm-Up (game-based) — 10–15 min
2. Modified Game 1 (constraint) — 15–20 min
3. Question & Reflect — 2–3 min
4. Modified Game 2 (progression) — 15–20 min
5. Game Sense Competition — 15–20 min
6. Review — 3–5 min

You must generate creative, specific, realistic rugby league session plans following this structure exactly.`

export async function generateGroupSessionSuggestion(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Check membership and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'viewer') return { error: 'Viewers cannot generate AI suggestions' }

  const { data: membership } = await supabase
    .from('group_invitations')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single()

  if (!membership) return { error: 'You are not a member of this group' }

  // Fetch group info
  const { data: group } = await supabase
    .from('coaching_groups')
    .select('name')
    .eq('id', groupId)
    .single()

  // Fetch training history — most recent first
  const { data: history } = await supabase
    .from('group_training_history')
    .select('focus_area, used, suggested_at')
    .eq('group_id', groupId)
    .order('suggested_at', { ascending: false })

  // Determine rotation: find the area least recently used (or never used)
  const usedAreas = (history ?? []).map(h => h.focus_area)
  const neverUsed = ALL_FOCUS_AREAS.filter(f => !usedAreas.includes(f.area))
  const nextArea = neverUsed.length > 0
    ? neverUsed[0]
    : ALL_FOCUS_AREAS.find(f => f.area === usedAreas[usedAreas.length - 1]) ?? ALL_FOCUS_AREAS[0]

  const recentHistory = (history ?? []).slice(0, 6).map(h => h.focus_area)
  const historyText = recentHistory.length > 0
    ? `Recent sessions (most recent first): ${recentHistory.join(', ')}`
    : 'No previous sessions — this is the first suggestion for this group.'

  const prompt = `Group name: "${group?.name ?? 'Coaching Group'}"

${historyText}

Next focus area to use: "${nextArea.area}" (${nextArea.category})

Generate a complete Game Sense session plan for this focus area following the 6-section structure. Be specific about player numbers, grid sizes, and constraints. Make it immediately usable by a rugby league coach.`

  try {
    const { experimental_output: object } = await generateText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      output: Output.object({ schema: SuggestionSchema }),
      system: GAME_SENSE_SYSTEM,
      prompt,
    })

    // Save to history
    const { data: saved, error: saveError } = await supabase
      .from('group_training_history')
      .insert({
        group_id: groupId,
        focus_area: object.focus_area,
        category: object.category,
        suggestion: object,
        used: false,
      })
      .select('id')
      .single()

    if (saveError) return { error: saveError.message }

    revalidatePath(`/groups/${groupId}/ai-guidance`)
    return { success: true, id: saved.id, suggestion: object }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { error: `AI generation failed: ${message}` }
  }
}

export async function markSuggestionUsed(historyId: string, groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('group_training_history')
    .update({ used: true })
    .eq('id', historyId)

  if (error) return { error: error.message }

  revalidatePath(`/groups/${groupId}/ai-guidance`)
  return { success: true }
}
