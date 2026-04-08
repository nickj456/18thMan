import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendTrialExpiryWarningEmail, sendTrialExpiredEmail } from '@/lib/email'

// Called by Vercel Cron every hour (see vercel.json)
// Protected by CRON_SECRET env var — Vercel sets Authorization header automatically
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()

  // ── 1. Send 24h warning emails ─────────────────────────────────────────────
  // Users whose trial ends in 24–25 hours AND warning hasn't been sent yet
  const warningWindowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const warningWindowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  const { data: warnUsers, error: warnErr } = await service
    .from('profiles')
    .select('id, display_name, trial_ends_at')
    .not('trial_ends_at', 'is', null)
    .gte('trial_ends_at', warningWindowStart.toISOString())
    .lte('trial_ends_at', warningWindowEnd.toISOString())
    .is('trial_warning_sent_at', null)

  if (warnErr) {
    console.error('[cron/trial-expiry] warning query error:', warnErr)
  }

  let warnSent = 0
  for (const user of warnUsers ?? []) {
    // Get email from auth
    const { data: authUser } = await service.auth.admin.getUserById(user.id)
    const email = authUser?.user?.email
    if (!email) continue

    const result = await sendTrialExpiryWarningEmail(email, user.display_name ?? '')
    if (result.success) {
      await service
        .from('profiles')
        .update({ trial_warning_sent_at: now.toISOString() })
        .eq('id', user.id)
      warnSent++
    }
  }

  // ── 2. Send expired emails ─────────────────────────────────────────────────
  // Users whose trial ended in the last hour (so we catch each expiry once)
  const expiredSince = new Date(now.getTime() - 60 * 60 * 1000)

  const { data: expiredUsers, error: expiredErr } = await service
    .from('profiles')
    .select('id, display_name, trial_ends_at')
    .not('trial_ends_at', 'is', null)
    .gte('trial_ends_at', expiredSince.toISOString())
    .lte('trial_ends_at', now.toISOString())

  if (expiredErr) {
    console.error('[cron/trial-expiry] expired query error:', expiredErr)
  }

  let expiredSent = 0
  for (const user of expiredUsers ?? []) {
    const { data: authUser } = await service.auth.admin.getUserById(user.id)
    const email = authUser?.user?.email
    if (!email) continue

    const result = await sendTrialExpiredEmail(email, user.display_name ?? '')
    if (result.success) expiredSent++
  }

  console.log(`[cron/trial-expiry] warned: ${warnSent}, expired: ${expiredSent}`)

  return NextResponse.json({
    ok: true,
    warned: warnSent,
    expired: expiredSent,
  })
}
