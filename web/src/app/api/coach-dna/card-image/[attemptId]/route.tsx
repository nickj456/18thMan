import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { ensureFreshSummary } from '@/app/(app)/admin/coach-dna/summary-actions'
import { hasBlendedFeedback } from '@/lib/coach-dna/blend-status'
import { buildCardData } from '@/lib/coach-dna/card-data'
import { loadGoogleFont } from '@/lib/coach-dna/google-font'
import { CARD_LOGO_DATA_URI } from '@/lib/coach-dna/card-logo'

interface CardFont {
  name: string
  data: ArrayBuffer
  weight: 400 | 700 | 800
  style: 'normal' | 'italic'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'coach') {
      return new Response('Forbidden', { status: 403 })
    }

    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, coach_id, completed_at')
      .eq('id', attemptId)
      .single()
    if (!attempt || attempt.coach_id !== user.id || !attempt.completed_at) {
      return new Response('Not Found', { status: 404 })
    }

    const summary = await ensureFreshSummary(attemptId, user.id)
    if (!hasBlendedFeedback(summary.sourcedCategories)) {
      return new Response('Not Found', { status: 404 })
    }

    const card = buildCardData(summary)
    const headlineText = `${card.primaryLabel}${card.secondaryLabel ? ` / ${card.secondaryLabel}` : ''}`
    const bodyText = `18TH MANRUGBY LEAGUECOACH DNAStrengthsFocus areas18thman.app · Coach DNA${card.narrativeSnippet ?? ''}${card.strengthLabels.join('')}${card.focusAreaLabels.join('')}`

    const fonts: CardFont[] = []
    try {
      const data = await loadGoogleFont('Barlow Condensed:ital,wght@1,800', headlineText.toUpperCase())
      fonts.push({ name: 'Barlow Condensed', data, weight: 800, style: 'italic' })
    } catch (fontErr) {
      console.error('[coach-dna/card-image] Failed to load Barlow Condensed, falling back to default font:', fontErr)
    }
    try {
      const data = await loadGoogleFont('Geist:wght@400', bodyText)
      fonts.push({ name: 'Geist', data, weight: 400, style: 'normal' })
    } catch (fontErr) {
      console.error('[coach-dna/card-image] Failed to load Geist 400, falling back to default font:', fontErr)
    }
    try {
      const data = await loadGoogleFont('Geist:wght@700', bodyText)
      fonts.push({ name: 'Geist', data, weight: 700, style: 'normal' })
    } catch (fontErr) {
      console.error('[coach-dna/card-image] Failed to load Geist 700, falling back to default font:', fontErr)
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#151517',
            padding: 64,
            color: '#f4f4f5',
            fontFamily: 'Geist, sans-serif',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori/ImageResponse rendering, not a Next.js page */}
            <img src={CARD_LOGO_DATA_URI} alt="" width={42} height={44} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>18TH MAN</span>
              <span style={{ fontSize: 10, fontWeight: 400, color: '#a1a1aa', letterSpacing: 3 }}>RUGBY LEAGUE</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36 }}>
            <span style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 6, color: '#e8560a', fontWeight: 700 }}>
              Coach DNA
            </span>
            <span
              style={{
                fontFamily: 'Barlow Condensed',
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 68,
                textTransform: 'uppercase',
                lineHeight: 1.05,
                letterSpacing: -1,
              }}
            >
              {headlineText}
            </span>
            {card.narrativeSnippet && (
              <span style={{ fontSize: 22, fontWeight: 400, color: '#d4d4d8', lineHeight: 1.4, maxWidth: 900 }}>
                {card.narrativeSnippet}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 64, marginTop: 40 }}>
            {card.strengthLabels.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: '#34d399', fontWeight: 700 }}>
                  Strengths
                </span>
                {card.strengthLabels.map(label => (
                  <span key={label} style={{ fontSize: 24, fontWeight: 700 }}>{label}</span>
                ))}
              </div>
            )}
            {card.focusAreaLabels.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, color: '#fb923c', fontWeight: 700 }}>
                  Focus areas
                </span>
                {card.focusAreaLabels.map(label => (
                  <span key={label} style={{ fontSize: 24, fontWeight: 700 }}>{label}</span>
                ))}
              </div>
            )}
          </div>

          <span style={{ fontSize: 12, fontWeight: 400, color: '#71717a', marginTop: 'auto' }}>18thman.app · Coach DNA</span>
        </div>
      ),
      {
        width: 1200,
        height: 900,
        ...(fonts.length > 0 ? { fonts } : {}),
        headers: { 'cache-control': 'private, max-age=300, must-revalidate' },
      },
    )
  } catch (err) {
    console.error('[coach-dna/card-image] Failed to generate card image:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
