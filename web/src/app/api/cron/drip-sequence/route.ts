import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { createServiceClient } from '@/lib/supabase/service'
import { LeadMagnetSessionPDF } from '@/components/landing/LeadMagnetSessionPDF'
import { sendLeadMagnetEmail, sendDripConversionEmail } from '@/lib/email'

// Called by Vercel Cron daily at 09:00 UTC (see vercel.json)
// Protected by CRON_SECRET — Vercel sets the Authorization header automatically
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  // Leads that are mid-drip and due their next email (7+ days since last send)
  const { data: leads, error } = await service
    .from('leads')
    .select('id, email, age_group, drip_week')
    .gte('drip_week', 1)
    .lte('drip_week', 4)
    .eq('drip_unsubscribed', false)
    .lte('last_drip_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    console.error('[drip-sequence] Failed to fetch leads:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!leads?.length) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  let logoDataUri: string | undefined
  try {
    const p = resolve(process.cwd(), 'public/logo.png')
    if (existsSync(p)) {
      logoDataUri = `data:image/png;base64,${readFileSync(p).toString('base64')}`
    }
  } catch { /* non-fatal */ }

  let sent = 0
  let failed = 0
  const now = new Date().toISOString()

  for (const lead of leads) {
    const nextWeek = (lead.drip_week as number) + 1

    try {
      if (nextWeek <= 4) {
        // Send the next week's session plan PDF
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const render = renderToBuffer as (el: unknown) => Promise<Buffer>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buffer = await render(createElement(LeadMagnetSessionPDF as any, {
          logoSrc: logoDataUri,
          weekNumber: nextWeek,
        }))

        const result = await sendLeadMagnetEmail(
          lead.email as string,
          (lead.age_group as string | null) ?? null,
          Buffer.from(buffer),
          nextWeek,
        )

        if (!result.success) {
          console.error(`[drip-sequence] Email failed for ${lead.id}:`, result.error)
          failed++
          continue
        }
      } else {
        // Week 4 just sent — now send the conversion email
        const result = await sendDripConversionEmail(
          lead.email as string,
          (lead.age_group as string | null) ?? null,
        )

        if (!result.success) {
          console.error(`[drip-sequence] Conversion email failed for ${lead.id}:`, result.error)
          failed++
          continue
        }
      }

      await service
        .from('leads')
        .update({ drip_week: nextWeek, last_drip_at: now, updated_at: now })
        .eq('id', lead.id)

      sent++
    } catch (err) {
      console.error(`[drip-sequence] Unexpected error for ${lead.id}:`, err)
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed: leads.length, sent, failed })
}
