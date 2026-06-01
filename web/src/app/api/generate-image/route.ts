import { createClient } from '@/lib/supabase/server'

const SIZES: Record<string, '1024x1024' | '1536x1024' | '1024x1536'> = {
  square:   '1024x1024',
  portrait: '1024x1536',
  landscape:'1536x1024',
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const prompt  = searchParams.get('prompt')
  const sizeKey = searchParams.get('size') || 'square'

  if (!prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 })

  // Use GPT-4o Responses API — same engine ChatGPT uses, renders text correctly
  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        input: prompt,
        tools: [{
          type: 'image_generation',
          quality: 'high',
          size: SIZES[sizeKey] ?? SIZES.square,
          output_format: 'png',
        }],
      }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generate-image] fetch error:', msg)
    return Response.json({ error: `Network error: ${msg}` }, { status: 502 })
  }

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    const msg = json?.error?.message ?? `OpenAI error ${res.status}`
    console.error('[generate-image] OpenAI error:', msg)
    return Response.json({ error: msg }, { status: 502 })
  }

  const json = await res.json()

  // Extract base64 image from Responses API output
  const imageOutput = (json?.output ?? []).find(
    (o: { type: string }) => o.type === 'image_generation_call'
  )
  const b64 = imageOutput?.result

  if (!b64) {
    console.error('[generate-image] unexpected response:', JSON.stringify(json).slice(0, 500))
    return Response.json({ error: 'No image in response' }, { status: 502 })
  }

  const buffer = Buffer.from(b64, 'base64')
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  })
}
