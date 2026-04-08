import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendWelcomeEmail,
  sendTrialStartEmail,
  sendTrialExpiryWarningEmail,
  sendTrialExpiredEmail,
} from '@/lib/email'

// Dev/admin only — sends all email templates to the logged-in user
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const name = profile?.display_name ?? 'Coach'
  const email = user.email
  const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const { type } = await request.json().catch(() => ({ type: 'all' }))

  const emails: Record<string, () => Promise<unknown>> = {
    welcome: () => sendWelcomeEmail(email, name),
    trial_start: () => sendTrialStartEmail(email, name, trialEndsAt),
    trial_warning: () => sendTrialExpiryWarningEmail(email, name),
    trial_expired: () => sendTrialExpiredEmail(email, name),
  }

  if (type !== 'all' && emails[type]) {
    const result = await emails[type]()
    return NextResponse.json({ sent: [type], result })
  }

  const results: Record<string, unknown> = {}
  for (const [key, fn] of Object.entries(emails)) {
    results[key] = await fn()
  }

  return NextResponse.json({ sent: Object.keys(emails), to: email, results })
}
