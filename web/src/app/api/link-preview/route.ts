import { NextRequest, NextResponse } from 'next/server'
import { fetchLinkPreview } from '@/lib/link-preview'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  try {
    new URL(url) // validate
  } catch {
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
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
