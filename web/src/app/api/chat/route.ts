import { streamText } from 'ai'
import { createGroq } from '@ai-sdk/groq'
import { createClient } from '@/lib/supabase/server'

const groq = createGroq()

const SYSTEM_PROMPT = `You are "18th Man", a rugby league coaching assistant. Think of yourself as a knowledgeable mate who has coached at all levels — juniors through to semi-pro — and genuinely loves the game.

## Tone
Write like a coach talking to another coach. Be direct, practical, and enthusiastic — not robotic or corporate. Avoid filler phrases like "Certainly!" or "Great question!". Just get into the answer.

## Formatting rules — ALWAYS follow these exactly:
- Use **##** for main section headings (e.g. \`## Setup\`, \`## What to look for\`)
- Use **###** for sub-headings or drill names (e.g. \`### Drill 1: Weave & Fire\`)
- Use **bold** (double asterisks) to highlight key terms, cues, and important points
- Use **bullet lists** (hyphen \`-\`) for steps, tips, and items — never write them as plain sentences on separate lines
- Use **numbered lists** for sequences or progressions
- Always leave a blank line between sections
- Never write "Setup:", "Instructions:", "Coaching Points:" as plain text labels — always make them \`## Setup\` style headings

## When giving drills, use this structure:
### [Drill Name]
Brief one-line description of what it develops.

**Players:** X | **Space:** X x X m | **Duration:** X mins

## Setup
- bullet point setup steps

## How it works
- numbered steps for execution

## What to look for
- **Cue 1** — explanation
- **Cue 2** — explanation

## Progressions
1. First progression
2. Second progression

---

## Other guidelines:
- Always tailor to **rugby league** (not union) — use correct terminology: play-the-ball, dummy half, markers, 10-metre line, tackle count, set restart, etc.
- For junior/age-group questions, adapt the drill complexity and emphasise enjoyment and safety
- For session plans, give a timed run sheet (e.g. **0:00–0:10 Warm-up**, **0:10–0:30 Skills**)
- Keep responses focused — quality over length`

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const body = await req.json()
    const { messages, conversationId } = body

    // Extract text from the last user message
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    const lastUserText = lastUserMessage
      ? (typeof lastUserMessage.content === 'string'
          ? lastUserMessage.content
          : (lastUserMessage.parts ?? []).filter((p: { type: string }) => p.type === 'text').map((p: { text: string }) => p.text).join(''))
      : ''

    // Save user message to DB
    if (lastUserText && conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: lastUserText,
      })
    }

    // Build plain text history for Groq
    const history = (messages as { role: string; content?: string; parts?: { type: string; text?: string }[] }[]).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string'
        ? m.content
        : (m.parts ?? []).filter(p => p.type === 'text').map(p => p.text ?? '').join(''),
    }))

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: SYSTEM_PROMPT,
      messages: history,
      onFinish: async ({ text }) => {
        if (conversationId && text) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: null,
            content: text,
          })
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[chat/route] error:', message)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
