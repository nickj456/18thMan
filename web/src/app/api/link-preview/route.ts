import { NextRequest, NextResponse } from 'next/server'
import { fetchLinkPreview } from '@/lib/link-preview'
import { createClient } from '@/lib/supabase/server'

// Private/loopback ranges that must not be fetched (SSRF prevention)
const PRIVATE_IP_RE = /^(localhost|127\.|0\.0\.0\.0|::1|169\.254\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/i

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  if (url.length > 2048) return NextResponse.json({ error: 'Invalid url' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  // Block requests to private/internal network addresses
  if (PRIVATE_IP_RE.test(parsed.hostname)) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  let preview
  try {
    preview = await fetchLinkPreview(url)
  } catch (err) {
    console.error('[link-preview] fetch error', { url, err })
    return NextResponse.json({ error: 'Could not fetch preview' }, { status: 422 })
  }
  if (!preview) return NextResponse.json({ error: 'Could not fetch preview' }, { status: 422 })

  return NextResponse.json(preview, {
    headers: { 'Cache-Control': 'private, max-age=3600' },
  })
}
