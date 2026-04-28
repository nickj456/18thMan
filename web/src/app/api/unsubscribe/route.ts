import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyUnsubscribeToken } from '@/lib/email-notifications'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse(unsubscribeHtml('Invalid link', 'This unsubscribe link is missing a token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const parsed = verifyUnsubscribeToken(token)
  if (!parsed) {
    return new NextResponse(
      unsubscribeHtml('Link expired', 'This unsubscribe link has expired or is invalid. Visit your settings to manage preferences.'),
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    )
  }

  const { userId, category } = parsed
  const service = createServiceClient()

  const { error: upsertError } = await service
    .from('email_preferences')
    .upsert(
      { user_id: userId, category, enabled: false, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,category' },
    )

  if (upsertError) {
    console.error('[unsubscribe] upsert error:', upsertError)
    return new NextResponse(
      unsubscribeHtml('Something went wrong', 'Could not process your request. Please visit your settings to manage email preferences.'),
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    )
  }

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'
  const label = category.replace(/_/g, ' ')

  return new NextResponse(
    unsubscribeHtml(
      'Unsubscribed',
      `You've been unsubscribed from <strong>${label}</strong> emails. You can manage all your email preferences in your <a href="${SITE_URL}/settings#email-preferences">settings</a>.`,
    ),
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  )
}

function unsubscribeHtml(title: string, message: string): string {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — 18th Man</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:420px;padding:40px 32px;background:#161616;border:1px solid #2a2a2a;border-radius:16px;text-align:center;">
    <img src="${SITE_URL}/logo.png" alt="18th Man" width="48" height="48" style="display:block;margin:0 auto 24px;" />
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#ffffff;">${title}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">${message}</p>
    <a href="${SITE_URL}/settings#email-preferences" style="display:inline-block;padding:12px 24px;background:#e8560a;color:#fff;font-weight:700;font-size:14px;text-decoration:none;border-radius:10px;">Manage email preferences →</a>
  </div>
</body>
</html>`
}
