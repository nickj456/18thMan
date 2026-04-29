import { NextResponse } from 'next/server'
import { buildCampaignEmailHtml } from '@/lib/email'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.bodyHtml) {
    return NextResponse.json({ error: 'bodyHtml is required' }, { status: 400 })
  }

  const html = buildCampaignEmailHtml({
    bodyHtml: body.bodyHtml,
    ctaLabel: body.ctaLabel || undefined,
    ctaUrl: body.ctaUrl || undefined,
    category: 'announcement',
    unsubToken: 'preview-token',
  })

  return NextResponse.json({ html })
}
