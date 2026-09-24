import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendTrialExpiryWarningEmail, sendTrialExpiredEmail } from '@/lib/email'
import { getEffectiveTier } from '@/lib/subscription'

const HOUR_MS = 60 * 60 * 1000

// Called by Vercel Cron once a day (see vercel.json). The windows below are
// deliberately wider than the schedule and each email is deduped by its own
// "sent at" column, so a run never misses a trial and never sends twice --
// the old 1-hour windows assumed an hourly schedule and silently skipped
// almost every trial on a daily one.
// Protected by CRON_SECRET env var — Vercel sets Authorization header automatically
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date()

  // ── 1. Send warning emails ─────────────────────────────────────────────────
  // Users whose trial ends within the next 24 hours AND warning hasn't been sent yet
  const warningWindowEnd = new Date(now.getTime() + 24 * HOUR_MS)

  const { data: warnUsers, error: warnErr } = await service
    .from('profiles')
    .select('id, display_name, trial_ends_at')
    .not('trial_ends_at', 'is', null)
    .gt('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', warningWindowEnd.toISOString())
    .is('trial_warning_sent_at', null)

  if (warnErr) {
    console.error('[cron/trial-expiry] warning query error:', warnErr)
  }

  let warnSent = 0
  for (const user of warnUsers ?? []) {
    // Anyone who has paid (or joined a paid club) mid-trial resolves to a
    // tier other than 'trial' -- don't tell them their access is about to lock.
    if ((await getEffectiveTier(service, user.id)) !== 'trial') continue

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
  // Users whose trial ended in the last 48 hours AND the email hasn't been sent
  // yet. The lookback covers a missed daily run but stays bounded, so trials
  // that expired long ago aren't emailed out of the blue.
  const expiredSince = new Date(now.getTime() - 48 * HOUR_MS)

  const { data: expiredUsers, error: expiredErr } = await service
    .from('profiles')
    .select('id, display_name, trial_ends_at')
    .not('trial_ends_at', 'is', null)
    .gt('trial_ends_at', expiredSince.toISOString())
    .lte('trial_ends_at', now.toISOString())
    .is('trial_expired_email_sent_at', null)

  if (expiredErr) {
    console.error('[cron/trial-expiry] expired query error:', expiredErr)
  }

  let expiredSent = 0
  for (const user of expiredUsers ?? []) {
    // Only coaches who actually dropped back to free have lost anything.
    if ((await getEffectiveTier(service, user.id)) !== 'free') continue

    const { data: authUser } = await service.auth.admin.getUserById(user.id)
    const email = authUser?.user?.email
    if (!email) continue

    const result = await sendTrialExpiredEmail(email, user.display_name ?? '')
    if (result.success) {
      await service
        .from('profiles')
        .update({ trial_expired_email_sent_at: now.toISOString() })
        .eq('id', user.id)
      expiredSent++
    }
  }

  console.log(`[cron/trial-expiry] warned: ${warnSent}, expired: ${expiredSent}`)

  return NextResponse.json({
    ok: true,
    warned: warnSent,
    expired: expiredSent,
  })
}
