import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const headers = {
    'svix-id':        request.headers.get('svix-id') ?? '',
    'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
    'svix-signature': request.headers.get('svix-signature') ?? '',
  }

  let event: { type: string; data: { email_id?: string; [key: string]: unknown } }
  try {
    event = new Webhook(secret).verify(rawBody, headers) as typeof event
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const emailId = event.data?.email_id
  if (!emailId) return NextResponse.json({ ok: true })

  const service = createServiceClient()
  const now = new Date().toISOString()

  if (event.type === 'email.opened') {
    await service
      .from('email_sends')
      .update({ opened_at: now })
      .eq('resend_message_id', emailId)
      .is('opened_at', null) // only record first open
  } else if (event.type === 'email.clicked') {
    await service
      .from('email_sends')
      .update({ clicked_at: now })
      .eq('resend_message_id', emailId)
      .is('clicked_at', null) // only record first click
  }

  return NextResponse.json({ ok: true })
}
