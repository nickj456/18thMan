import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'
import type { GamePlanAiPlan } from '@/lib/supabase/types'

const groq = createGroq()

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

interface GenerateGamePlanBody {
  gamePlanId: string
  opposition: string
  pitch: string | null
  kickOffTime: string | null
  defence: string | null
  attack: string | null
  structure: string | null
  aims: string | null
  backs: string | null
  forwards: string | null
  halfBacks: string | null
  detailLevel: 'brief' | 'standard' | 'detailed'
}

export async function POST(req: Request) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // 2. Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') return new Response('Forbidden', { status: 403 })

    // 3. Parse body
    const body: GenerateGamePlanBody = await req.json()
    const {
      opposition,
      pitch,
      kickOffTime,
      defence,
      attack,
      structure,
      aims,
      backs,
      forwards,
      halfBacks,
      detailLevel,
    } = body

    // 4. Build user message
    const formattedKickOff = kickOffTime
      ? new Date(kickOffTime).toLocaleString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null

    const userMessage = [
      'Create a game plan for the following match:',
      '',
      `Opposition: ${opposition}`,
      pitch ? `Venue: ${pitch}` : '',
      formattedKickOff ? `Kick-off: ${formattedKickOff}` : '',
      `Detail level: ${detailLevel} (brief = short and punchy, standard = balanced, detailed = thorough and comprehensive)`,
      '',
      "COACH'S TACTICAL NOTES:",
      '',
      `Defence: ${defence ?? 'No specific notes provided'}`,
      `Attack: ${attack ?? 'No specific notes provided'}`,
      `Structure: ${structure ?? 'No specific notes provided'}`,
      `Aims: ${aims ?? 'No specific notes provided'}`,
      `Backs guidance: ${backs ?? 'No specific notes provided'}`,
      `Forwards guidance: ${forwards ?? 'No specific notes provided'}`,
      `Half backs guidance: ${halfBacks ?? 'No specific notes provided'}`,
    ]
      .filter(line => line !== null)
      .join('\n')

    // 5. Call generateText
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: GAME_PLAN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    // 6. Parse JSON response — handle both raw JSON and ```json ... ``` fenced blocks
    let plan: GamePlanAiPlan
    try {
      const cleaned = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '')
      plan = JSON.parse(cleaned) as GamePlanAiPlan
    } catch {
      return new Response(JSON.stringify({ error: 'AI returned invalid JSON' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 7. Return plan
    return new Response(JSON.stringify({ plan }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[game-plan/generate] error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
