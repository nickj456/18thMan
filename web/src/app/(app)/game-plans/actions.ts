'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import type { GamePlanDetailLevel, GamePlanAiPlan } from '@/lib/supabase/types'

const GAME_PLAN_SYSTEM_PROMPT = `You are a rugby league head coach writing a game plan for your players.

Your job is to synthesise the coach's tactical notes into a clear, direct, motivating game plan document — written FOR the players to read before the match.

Tone rules:
- Write directly to the players ("Your job is...", "We need to...", "Stay organised...")
- Be direct, clear, and motivating — like a coach in a changing room, not an academic
- NO jargon-heavy tactical analysis. Keep it punchy and readable
- Short sentences. Active voice. Bullet points should be concise
- Each section written specifically for that positional group

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "teamFocus": {
    "intro": "2-3 sentence opening message for the whole squad. Reference the opposition and competition context.",
    "keyMessages": ["4-6 bullet points for the whole squad"]
  },
  "forwards": {
    "positions": "Props | Hooker | Second Rows | Loose Forward",
    "role": "One-line statement of the forwards' job today",
    "points": ["5-6 bullet points written directly to forwards"]
  },
  "backs": {
    "positions": "Fullback | Wingers | Centres",
    "role": "One-line statement of the backs' job today",
    "points": ["5-6 bullet points written directly to backs"]
  },
  "halfBacks": {
    "positions": "Stand Off | Scrum Half",
    "role": "One-line statement of the halves' job today",
    "points": ["5-6 bullet points written directly to the halves"]
  },
  "finalReminders": {
    "closing": "2-3 sentence motivational close. Reference the challenge ahead and the team's standards.",
    "points": ["3-5 final motivational bullet points for the whole squad"],
    "quote": "A relevant motivational quote about teamwork, effort, or performance"
  }
}`

async function getAuthenticatedAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { supabase, user, profile, error: 'Admin access required' }
  }

  return { supabase, user, profile, error: null }
}

export async function createGamePlan(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, error } = await getAuthenticatedAdmin()
  if (error || !user) return { error: error ?? 'Not authenticated' }

  const kickOffTime = (formData.get('kick_off_time') as string | null)?.trim() || null
  const detailLevel = ((formData.get('detail_level') as string | null)?.trim() || 'standard') as GamePlanDetailLevel

  const { data: game_plan, error: dbError } = await supabase
    .from('game_plans')
    .insert({
      opposition: formData.get('opposition') as string,
      pitch: formData.get('pitch') as string,
      kick_off_time: kickOffTime,
      home_logo_url: (formData.get('home_logo_url') as string | null) || null,
      away_logo_url: (formData.get('away_logo_url') as string | null) || null,
      defence: formData.get('defence') as string,
      attack: formData.get('attack') as string,
      structure: formData.get('structure') as string,
      aims: formData.get('aims') as string,
      backs: formData.get('backs') as string,
      forwards: formData.get('forwards') as string,
      half_backs: formData.get('half_backs') as string,
      moves: (formData.get('moves') as string | null) || null,
      detail_level: detailLevel,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (dbError) return { error: dbError.message }

  revalidatePath('/game-plans')
  redirect('/game-plans/' + game_plan.id)
}

export async function updateGamePlan(id: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, user, profile, error } = await getAuthenticatedAdmin()
  if (error || !user) return { error: error ?? 'Not authenticated' }

  // Verify the record exists and user owns it or is admin
  const { data: existing } = await supabase
    .from('game_plans')
    .select('id, created_by')
    .eq('id', id)
    .single()

  if (!existing) return { error: 'Game plan not found' }
  if (existing.created_by !== user.id && profile?.role !== 'admin') {
    return { error: 'Not authorised to update this game plan' }
  }

  const kickOffTime = (formData.get('kick_off_time') as string | null)?.trim() || null
  const detailLevel = ((formData.get('detail_level') as string | null)?.trim() || 'standard') as GamePlanDetailLevel

  const { error: dbError } = await supabase
    .from('game_plans')
    .update({
      opposition: formData.get('opposition') as string,
      pitch: formData.get('pitch') as string,
      kick_off_time: kickOffTime,
      home_logo_url: (formData.get('home_logo_url') as string | null) || null,
      away_logo_url: (formData.get('away_logo_url') as string | null) || null,
      defence: formData.get('defence') as string,
      attack: formData.get('attack') as string,
      structure: formData.get('structure') as string,
      aims: formData.get('aims') as string,
      backs: formData.get('backs') as string,
      forwards: formData.get('forwards') as string,
      half_backs: formData.get('half_backs') as string,
      moves: (formData.get('moves') as string | null) || null,
      detail_level: detailLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (dbError) return { error: dbError.message }

  revalidatePath('/game-plans/' + id)
  return {}
}

export async function generateGamePlan(id: string): Promise<{ error?: string }> {
  const { supabase, user, error } = await getAuthenticatedAdmin()
  if (error || !user) return { error: error ?? 'Not authenticated' }

  const { data: gamePlan } = await supabase
    .from('game_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!gamePlan) return { error: 'Game plan not found' }

  const formattedKickOff = gamePlan.kick_off_time
    ? new Date(gamePlan.kick_off_time).toLocaleString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  const userMessage = [
    'Create a game plan for the following match:',
    '',
    `Opposition: ${gamePlan.opposition}`,
    gamePlan.pitch ? `Venue: ${gamePlan.pitch}` : '',
    formattedKickOff ? `Kick-off: ${formattedKickOff}` : '',
    `Detail level: ${gamePlan.detail_level} (brief = short and punchy, standard = balanced, detailed = thorough and comprehensive)`,
    '',
    "COACH'S TACTICAL NOTES:",
    '',
    `Defence: ${gamePlan.defence ?? 'No specific notes provided'}`,
    `Attack: ${gamePlan.attack ?? 'No specific notes provided'}`,
    `Structure: ${gamePlan.structure ?? 'No specific notes provided'}`,
    `Aims: ${gamePlan.aims ?? 'No specific notes provided'}`,
    `Backs guidance: ${gamePlan.backs ?? 'No specific notes provided'}`,
    `Forwards guidance: ${gamePlan.forwards ?? 'No specific notes provided'}`,
    `Half backs guidance: ${gamePlan.half_backs ?? 'No specific notes provided'}`,
    gamePlan.moves ? `Moves & set plays: ${gamePlan.moves}` : '',
    '',
    ...(() => {
      // Extract all 'ALLCAPS' named plays from every field
      const allText = [
        gamePlan.defence, gamePlan.attack, gamePlan.structure, gamePlan.aims,
        gamePlan.backs, gamePlan.forwards, gamePlan.half_backs, gamePlan.moves,
      ].filter(Boolean).join(' ')
      const namedPlays = [...new Set(
        [...allText.matchAll(/'([A-Z][A-Z]+)'/g)].map(m => m[1])
      )]
      if (namedPlays.length === 0) return []
      return [
        `NAMED PLAYS — you MUST reference these by their exact name in the relevant sections: ${namedPlays.join(', ')}`,
        'Do not explain what they are — just use the name as coaches and players already know them.',
      ]
    })(),
  ].filter(line => line !== null).join('\n')

  let aiPlan: GamePlanAiPlan
  try {
    const groq = createGroq()
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: GAME_PLAN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
    const cleaned = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '')
    aiPlan = JSON.parse(cleaned) as GamePlanAiPlan
  } catch (genError) {
    return { error: genError instanceof Error ? genError.message : 'AI generation failed' }
  }

  const { error: dbError } = await supabase
    .from('game_plans')
    .update({
      ai_plan: aiPlan,
      status: 'generated',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (dbError) return { error: dbError.message }

  revalidatePath('/game-plans/' + id)
  return {}
}

export async function deleteGamePlan(id: string): Promise<{ error?: string }> {
  const { supabase, error } = await getAuthenticatedAdmin()
  if (error) return { error }

  const { error: dbError } = await supabase
    .from('game_plans')
    .delete()
    .eq('id', id)

  if (dbError) return { error: dbError.message }

  revalidatePath('/game-plans')
  redirect('/game-plans')
}

export async function uploadLogo(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const side = formData.get('side') as string | null
  if (side !== 'home' && side !== 'away') return { error: 'Invalid side — must be "home" or "away"' }

  const extension = file.name.includes('.')
    ? file.name.split('.').pop()
    : file.type.split('/')[1] ?? 'png'

  const path = `${user.id}/${side}-${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('game-plan-logos')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('game-plan-logos')
    .getPublicUrl(path)

  return { url: publicUrl }
}
