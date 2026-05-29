import { readFile } from 'fs/promises'
import path from 'path'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const HOURLY_LIMIT = 20
const DAILY_LIMIT = 50
const ADMIN_EMAIL = 'hello@18thman.app'

const gateway = createOpenAI({
  baseURL: 'https://ai-gateway.vercel.sh/v1',
  apiKey: process.env.VERCEL_OIDC_TOKEN ?? '',
})

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; resetAt: string | null }> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const startOfDayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()

  const [hourlyResult, dailyResult] = await Promise.all([
    serviceClient
      .from('help_chat_requests')
      .select('created_at', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo),
    serviceClient
      .from('help_chat_requests')
      .select('created_at', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDayUtc),
  ])

  const hourlyCount = hourlyResult.count ?? 0
  const dailyCount = dailyResult.count ?? 0

  if (hourlyCount >= HOURLY_LIMIT) {
    const resetAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    return { allowed: false, resetAt }
  }
  if (dailyCount >= DAILY_LIMIT) {
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    return { allowed: false, resetAt: tomorrow.toISOString() }
  }
  return { allowed: true, resetAt: null }
}

async function recordRequest(userId: string): Promise<void> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await serviceClient.from('help_chat_requests').insert({ user_id: userId })
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, role, club_id, subscription_tier, trial_ends_at')
      .eq('id', user.id)
      .single()

    // Admin users bypass rate limiting
    if (profile?.role !== 'admin') {
      const { allowed, resetAt } = await checkRateLimit(user.id)
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: 'rate_limited', resetAt }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Record this request for rate limiting (fire and forget)
    if (profile?.role !== 'admin') {
      recordRequest(user.id).catch(() => {})
    }

    const body = await req.json()
    const { messages } = body

    // Load knowledge files
    const [platformGuide, gameSenseRL] = await Promise.all([
      readFile(path.join(process.cwd(), 'src/lib/help/platform-guide.md'), 'utf-8'),
      readFile(path.join(process.cwd(), '../GameSenseRL.md'), 'utf-8'),
    ])

    // Resolve club name
    let clubName = 'No club'
    if (profile?.club_id) {
      const { data: club } = await supabase
        .from('clubs')
        .select('name')
        .eq('id', profile.club_id)
        .single()
      if (club?.name) clubName = club.name
    }

    const isOnTrial = profile?.trial_ends_at
      ? new Date(profile.trial_ends_at) > new Date()
      : false
    const tier = profile?.subscription_tier ?? 'free'

    const systemPrompt = `You are the 18th Man support assistant. You help coaches and users with:
- How to use the 18th Man platform (features, navigation, account)
- Their account and subscription (personalised based on context below)
- The GameSenseRL coaching methodology

Rules:
- Be concise and direct. No padding.
- If asked about specific drills or drill content, direct the user to the Drill Library at /drills.
- If you cannot answer a question, or the user asks to speak to a human, contact the admin, or get direct support, offer the email address ${ADMIN_EMAIL} and note that responses are typically within 24 hours.
- Do not hallucinate features or policies.
- Do not make up pricing, limits, or capabilities not described in the platform guide.

User context:
- Name: ${profile?.display_name ?? 'Coach'}
- Role: ${profile?.role ?? 'coach'}
- Club: ${clubName}
- Subscription tier: ${tier}
- On trial: ${isOnTrial ? 'yes' : 'no'}

--- PLATFORM GUIDE ---
${platformGuide}

--- GAMESENSERL METHODOLOGY ---
${gameSenseRL}`

    const history = (messages as { role: string; content: string }[]).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const result = streamText({
      model: gateway('anthropic/claude-sonnet-4-6'),
      system: systemPrompt,
      messages: history,
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[help-chat/route] error:', message)
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
