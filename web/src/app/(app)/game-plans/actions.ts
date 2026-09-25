'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { z } from 'zod'
import {
  GROQ_TEXT_HEAVY, GROQ_CONDENSE, GROQ_NOTES_BUDGET_CHARS,
  GROQ_CONDENSE_INPUT_BUDGET_TOKENS, GROQ_CHARS_PER_TOKEN,
} from '@/lib/ai/groq-models'
import type { GamePlanDetailLevel, GamePlanAiPlan } from '@/lib/supabase/types'


/**
 * Runtime shape check for the model's game plan. `JSON.parse` returns `any`, so
 * casting to GamePlanAiPlan was a compile-time promise the model never made:
 * valid-JSON-but-wrong-shape used to be persisted with status 'generated', and
 * GamePlanView/GamePlanPDF then threw on every subsequent load of that plan --
 * a permanent 500 fixable only by editing the row. Parse, don't cast.
 */
const GamePlanAiSectionSchema = z.object({
  positions: z.string().optional(),
  role: z.string().optional(),
  points: z.array(z.string()),
})

const GamePlanAiPlanSchema = z.object({
  teamFocus: z.object({
    intro: z.string(),
    keyMessages: z.array(z.string()),
  }),
  forwards: GamePlanAiSectionSchema,
  backs: GamePlanAiSectionSchema,
  halfBacks: GamePlanAiSectionSchema,
  finalReminders: z.object({
    closing: z.string(),
    points: z.array(z.string()),
    quote: z.string(),
  }),
})

const GAME_PLAN_SYSTEM_PROMPT = `You are a rugby league head coach writing a game plan for your players.

Your job is to synthesise the coach's tactical notes into a clear, direct, motivating game plan document — written FOR the players to read before the match.

Language: UK English throughout — use British spellings (organise, defence, colour, travelled, etc.) and British rugby league terminology.

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


const CONDENSE_SYSTEM = `You condense a rugby league coach's tactical notes so they fit an AI context limit.

Rules:
- Keep EVERY distinct tactical instruction, named play (any word in CAPS), player name, position and specific number.
- Drop only repetition, filler and restatement.
- Return plain prose. No preamble, no markdown, no bullet characters.
- UK English.`

/**
 * Shrinks a coach's notes so the generation request fits Groq's ceiling.
 *
 * Groq rejects an oversized request outright with "Request too large" rather
 * than throttling it, so no amount of retrying clears it. Long notes have to
 * be shrunk BEFORE generation.
 *
 * Two constraints shape this. Reading the notes costs tokens whether or not we
 * shorten them, and the condense pass has its own per-minute ceiling. So it
 * condenses the LARGEST fields first and stops as soon as the total fits,
 * leaving smaller fields untouched at full fidelity. If the budget runs out
 * before the total fits, it says so rather than silently truncating the
 * coach's tactical detail.
 */
async function condenseNotes(
  fields: [string, string | null][],
  groq: ReturnType<typeof createGroq>,
): Promise<{ fields: [string, string | null][]; fits: boolean; totalChars: number }> {
  const result: [string, string | null][] = fields.map(([label, text]) => [label, text])
  let totalChars = result.reduce((sum, [, text]) => sum + (text?.length ?? 0), 0)

  // Largest first: each call costs the same to read regardless of how much it
  // saves, so spend the budget where it removes the most characters.
  const bySizeDesc = result
    .map((_, i) => i)
    .filter(i => (result[i][1]?.length ?? 0) > 0)
    .sort((a, b) => (result[b][1]?.length ?? 0) - (result[a][1]?.length ?? 0))

  let spentTokens = 0
  const targets: { index: number; label: string; text: string; target: number }[] = []

  for (const i of bySizeDesc) {
    if (totalChars <= GROQ_NOTES_BUDGET_CHARS) break
    const text = result[i][1]
    if (!text) continue
    const cost = Math.ceil(text.length / GROQ_CHARS_PER_TOKEN)
    if (spentTokens + cost > GROQ_CONDENSE_INPUT_BUDGET_TOKENS) break
    // Aim for a quarter of the original; that is where the savings come from.
    const target = Math.max(400, Math.floor(text.length / 4))
    targets.push({ index: i, label: result[i][0], text, target })
    spentTokens += cost
    totalChars -= text.length - target
  }

  if (targets.length === 0) {
    return { fields: result, fits: totalChars <= GROQ_NOTES_BUDGET_CHARS, totalChars }
  }

  // Safe to run together: the combined input is capped above, and this model
  // sits in a different bucket from the one generation will use.
  const condensed = await Promise.all(targets.map(async ({ label, text, target }) => {
    const { text: out } = await generateText({
      model: groq(GROQ_CONDENSE),
      system: CONDENSE_SYSTEM,
      prompt: `Condense these ${label.toUpperCase()} notes to under ${target} characters:` + '\n' + '\n' + text,
      maxOutputTokens: 700,
    })
    return out.trim()
  }))

  let actual = result.reduce((sum, [, text]) => sum + (text?.length ?? 0), 0)
  targets.forEach(({ index, text }, n) => {
    const out = condensed[n]
    // A condense pass that returned nothing, or grew the field, is worse than
    // leaving it alone.
    const replacement = out.length > 0 && out.length < text.length ? out : text
    result[index] = [result[index][0], replacement]
    actual -= text.length - replacement.length
  })

  return { fields: result, fits: actual <= GROQ_NOTES_BUDGET_CHARS, totalChars: actual }
}

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

  // Named plays are extracted from the ORIGINAL notes, before any condensing,
  // so a condense pass can never drop one.
  const originalNotesText = [
    gamePlan.defence, gamePlan.attack, gamePlan.structure, gamePlan.aims,
    gamePlan.backs, gamePlan.forwards, gamePlan.half_backs, gamePlan.moves,
  ].filter(Boolean).join(' ')
  const namedPlays = [...new Set(
    [...originalNotesText.matchAll(/'([A-Z][A-Z]+)'/g)].map(m => m[1])
  )]

  let noteFields: [string, string | null][] = [
    ['Defence', gamePlan.defence],
    ['Attack', gamePlan.attack],
    ['Structure', gamePlan.structure],
    ['Aims', gamePlan.aims],
    ['Backs guidance', gamePlan.backs],
    ['Forwards guidance', gamePlan.forwards],
    ['Half backs guidance', gamePlan.half_backs],
    ['Moves & set plays', gamePlan.moves],
  ]

  const notesChars = noteFields.reduce((sum, [, text]) => sum + (text?.length ?? 0), 0)
  const groq = createGroq()

  if (notesChars > GROQ_NOTES_BUDGET_CHARS) {
    let outcome
    try {
      outcome = await condenseNotes(noteFields, groq)
    } catch (condenseError) {
      const message = condenseError instanceof Error ? condenseError.message : String(condenseError)
      console.error('[game-plans] condensing notes failed:', message)
      return {
        error: `These notes are too long to process (${notesChars.toLocaleString()} characters). `
          + 'Shortening the longest sections and generating again should work.',
      }
    }
    console.log(`[game-plans] condensed notes ${notesChars} -> ${outcome.totalChars} chars for ${id}`)
    if (!outcome.fits) {
      // Say so rather than truncating: losing a coach's tactical detail without
      // telling them is worse than not generating.
      return {
        error: `These notes are too long to process (${notesChars.toLocaleString()} characters, `
          + `and about ${GROQ_NOTES_BUDGET_CHARS.toLocaleString()} is the most that fits). `
          + 'Shortening the longest sections and generating again should work.',
      }
    }
    noteFields = outcome.fields
  }

  const moveNotes = noteFields.find(([label]) => label === 'Moves & set plays')?.[1]

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
    ...noteFields
      .filter(([label]) => label !== 'Moves & set plays')
      .map(([label, text]) => `${label}: ${text ?? 'No specific notes provided'}`),
    moveNotes ? `Moves & set plays: ${moveNotes}` : '',
    '',
    ...(namedPlays.length === 0 ? [] : [
      `NAMED PLAYS - you MUST reference these by their exact name in the relevant sections: ${namedPlays.join(', ')}`,
      'Do not explain what they are - just use the name as coaches and players already know them.',
    ]),
  ].filter(line => line !== null).join('\n')

  let aiPlan: GamePlanAiPlan
  try {
    const { text } = await generateText({
      model: groq(GROQ_TEXT_HEAVY),
      system: GAME_PLAN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
    const cleaned = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '')
    aiPlan = GamePlanAiPlanSchema.parse(JSON.parse(cleaned))
  } catch (genError) {
    // Provider errors leak the org id and rate-limit internals; log them, and
    // hand the coach something they can act on instead.
    const message = genError instanceof Error ? genError.message : String(genError)
    console.error('[game-plans] generation failed:', message)
    // "Request too large" is a hard rejection, not a transient one, so telling
    // the coach to retry would be false advice. Rate limits DO clear, so those
    // get retry wording. Provider text is never echoed: it carries the org id.
    if (/too large|reduce your message size/i.test(message)) {
      return {
        error: 'Even after shortening, these notes are too long to process in one go. '
          + 'Try trimming the longest sections and generating again.',
      }
    }
    if (/rate limit|429/i.test(message)) {
      return { error: 'The AI is busy right now. Wait about 30 seconds and generate again.' }
    }
    return { error: 'Could not generate this game plan right now. Please try again.' }
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
