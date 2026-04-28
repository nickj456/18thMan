import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendCampaign } from '@/lib/email-campaigns'

// Called by Vercel Cron every minute (see vercel.json)
// Protected by CRON_SECRET — Vercel sets Authorization header automatically
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const now = new Date().toISOString()

  const { data: due } = await service
    .from('email_campaigns')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  if (!due?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let totalSent = 0
  let totalErrors = 0

  for (const campaign of due) {
    const { sent, errors } = await sendCampaign(campaign.id)
    totalSent += sent
    totalErrors += errors
  }

  console.log(`[cron/send-campaigns] campaigns: ${due.length}, sent: ${totalSent}, errors: ${totalErrors}`)

  return NextResponse.json({ ok: true, campaigns: due.length, sent: totalSent, errors: totalErrors })
}
