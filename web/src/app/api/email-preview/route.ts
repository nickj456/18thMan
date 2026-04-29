import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCampaignEmailHtml } from '@/lib/email'

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body?.bodyHtml) {
    return NextResponse.json({ error: 'bodyHtml is required' }, { status: 400 })
  }

  const previewBody = (body.bodyHtml as string).replace(/\{\{name\}\}/g, 'Coach')

  const html = buildCampaignEmailHtml({
    bodyHtml: previewBody,
    ctaLabel: body.ctaLabel || undefined,
    ctaUrl: body.ctaUrl || undefined,
    category: 'announcement',
    unsubToken: 'preview-token',
  })

  return NextResponse.json({ html })
}
