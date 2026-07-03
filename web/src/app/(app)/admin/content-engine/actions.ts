'use server'

import { redirect } from 'next/navigation'
import { generateText } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')
}

const PLATFORM_HINTS: Record<string, string> = {
  x:         'Punchy. Hook first. Short sentences. Can suggest threading. Max ~280 chars.',
  facebook:  'Conversational. Community feel. Ask a question at the end. Max ~1200 chars.',
  instagram: 'Strong opening line. Caption style. Call to action at the end. Max ~2200 chars.',
  linkedin:  'Professional insight. Coaching expertise front and centre. Max ~1300 chars.',
}

export async function generatePosts(
  input: string,
  type: string,
  platforms: string[]
): Promise<{ posts?: Record<string, string>; error?: string }> {
  // Outside the try/catch: redirect() throws a control-flow error that must
  // propagate — catching it would return { error: 'NEXT_REDIRECT' } instead
  // of redirecting non-admins.
  await requireAdmin()

  try {
    const knownPlatforms = platforms.filter(id => id in PLATFORM_HINTS)
    if (!input.trim()) return { error: 'Add some content first.' }
    if (knownPlatforms.length === 0) return { error: 'Select at least one platform.' }

    const platformInstructions = knownPlatforms
      .map(id => `- ${id}: ${PLATFORM_HINTS[id]}`)
      .join('\n')

    const prompt = `You are writing social media posts for Nick, founder of 18thMan.app — a rugby league coaching platform. Nick is a former professional rugby league player with 20+ years of coaching experience. He coaches a community club including a U14s team.

Voice rules (strict):
- Short sentences. Direct. No fluff.
- No em dashes.
- No hashtags.
- No excessive exclamation marks.
- Unpretentious. Sounds like a real coach, not a marketer.
- First person.
- Rugby league specific — not generic sports content.

Content type: ${type}
Topic/content: ${input}

Write posts for these platforms:
${platformInstructions}

Respond with ONLY a valid JSON object. No markdown fences, no explanation, no preamble. Keys are platform IDs. Example:
{"x":"post text","facebook":"post text"}`

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
    })

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('Unexpected response format')
    const posts = JSON.parse(text.slice(start, end + 1)) as Record<string, string>

    return { posts }
  } catch (err) {
    console.error('[content-engine]', err)
    return { error: 'Generation failed. Please try again.' }
  }
}
