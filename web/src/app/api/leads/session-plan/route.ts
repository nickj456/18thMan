import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()

    // Upsert lead — update age_group if they submit again
    await supabase.from('leads').upsert(
      {
        email: email.toLowerCase().trim(),
        age_group: typeof age_group === 'string' && age_group ? age_group : null,
        source: 'session_plan',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email,source' },
    )
    // Ignore upsert errors — don't block delivery over a DB hiccup

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const render = renderToBuffer as (el: unknown) => Promise<Buffer>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await render(createElement(LeadMagnetSessionPDF as any, { logoSrc: LOGO_DATA_URI }))

    await sendLeadMagnetEmail(
      email.toLowerCase().trim(),
      typeof age_group === 'string' && age_group ? age_group : null,
      Buffer.from(buffer),
    )

    return Response.json({ success: true })
  } catch (err) {
    console.error('[leads/session-plan] Error:', err)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
