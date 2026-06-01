import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { createServiceClient } from '@/lib/supabase/service'
import { LeadMagnetSessionPDF } from '@/components/landing/LeadMagnetSessionPDF'
import { sendLeadMagnetEmail } from '@/lib/email'

function getLogoDataUri(): string | undefined {
  try {
    const p = resolve(process.cwd(), 'public/logo.png')
    if (!existsSync(p)) return undefined
    const data = readFileSync(p)
    return `data:image/png;base64,${data.toString('base64')}`
  } catch {
    return undefined
  }
}

const LOGO_DATA_URI = getLogoDataUri()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email: unknown = body?.email
    const age_group: unknown = body?.age_group

    if (typeof email !== 'string' || !email.includes('@')) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // Upsert lead — only update age_group if re-submitting; don't reset drip progress
    const { error: upsertError } = await supabase.from('leads').upsert(
      {
        email: email.toLowerCase().trim(),
        age_group: typeof age_group === 'string' && age_group ? age_group : null,
        source: 'session_plan',
        drip_week: 1,
        last_drip_at: now,
        updated_at: now,
      },
      { onConflict: 'email,source', ignoreDuplicates: false },
    )
    if (upsertError) console.error('[leads/session-plan] Upsert error:', upsertError)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const render = renderToBuffer as (el: unknown) => Promise<Buffer>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ageGroupValue = typeof age_group === 'string' && age_group ? age_group : null
    const buffer = await render(createElement(LeadMagnetSessionPDF as any, { logoSrc: LOGO_DATA_URI, weekNumber: 1, ageGroup: ageGroupValue }))

    await sendLeadMagnetEmail(
      email.toLowerCase().trim(),
      typeof age_group === 'string' && age_group ? age_group : null,
      Buffer.from(buffer),
      1,
    )

    return Response.json({ success: true })
  } catch (err) {
    console.error('[leads/session-plan] Error:', err)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
