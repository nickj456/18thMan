import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CATEGORY_ACCENT: Record<string, string> = {
  Attacking: '#f59e0b',
  Defensive: '#ef4444',
  'Ball Handling': '#38bdf8',
  'Set Piece & Kicking': '#a78bfa',
  'Fitness & Game Sense': '#4ade80',
}

const TOPIC_CATEGORY: Record<string, string> = {
  'Offloading': 'Attacking', 'Support Play': 'Attacking', 'Line Breaks & Edge Play': 'Attacking', 'Dummy Half Play': 'Attacking',
  'Tackle Technique': 'Defensive', 'Line Speed & Drift Defence': 'Defensive', 'Marker Defence': 'Defensive', 'Goal Line Defence': 'Defensive',
  'Pass Accuracy': 'Ball Handling', 'Handling Under Pressure': 'Ball Handling', 'Catching High Balls': 'Ball Handling',
  'Kick-Off Receipts': 'Set Piece & Kicking', 'Grubber Kicks': 'Set Piece & Kicking', 'Bomb Kicks': 'Set Piece & Kicking', 'Scrum Technique': 'Set Piece & Kicking',
  'Agility & Conditioning': 'Fitness & Game Sense', 'Decision Making': 'Fitness & Game Sense', 'Game Management': 'Fitness & Game Sense',
}

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-900-normal.woff2',
      { cache: 'force-cache' },
    )
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

function topicFontSize(topic: string): number {
  if (topic.length <= 10) return 128
  if (topic.length <= 15) return 108
  if (topic.length <= 20) return 88
  return 68
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    console.log('[card] step 1: id =', id)

    const supabase = await createClient()
    console.log('[card] step 2: supabase client created')

    const { data: focus, error: dbError } = await supabase
      .from('weekly_focuses')
      .select('topic, description, next_topic')
      .eq('id', id)
      .single()

    console.log('[card] step 3: db result', { focus: focus?.topic, dbError })

    if (!focus) {
      return new Response('Not found', { status: 404 })
    }

    const category = TOPIC_CATEGORY[focus.topic] ?? 'Ball Handling'
    const accent = CATEGORY_ACCENT[category] ?? '#6366f1'

    const weekLabel = new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    const fontSize = topicFontSize(focus.topic)
    console.log('[card] step 4: loading font')
    const fontData = await loadFont()
    console.log('[card] step 5: font loaded =', !!fontData)

    const fonts = fontData
      ? [{ name: 'Inter', data: fontData, weight: 900 as const, style: 'normal' as const }]
      : []

    console.log('[card] step 6: building ImageResponse')
    return new ImageResponse(
      (
        <div
          style={{
            width: 1080,
            height: 1080,
            background: '#0a0a0a',
            display: 'flex',
            fontFamily: fontData ? '"Inter", sans-serif' : 'sans-serif',
          }}
        >
          {/* Left accent bar */}
          <div style={{ width: 8, background: accent, flexShrink: 0, display: 'flex' }} />

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '72px 88px' }}>

            {/* Top label */}
            <p style={{
              color: '#3f3f46',
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 6,
              textTransform: 'uppercase',
              margin: 0,
            }}>
              Weekly Focus
            </p>

            {/* Hero: category + topic, vertically centred */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>

              {/* Category pill */}
              <div style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                background: `${accent}22`,
                border: `1.5px solid ${accent}55`,
                color: accent,
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 3,
                textTransform: 'uppercase',
                padding: '10px 24px',
                borderRadius: 999,
                marginBottom: 40,
              }}>
                {category}
              </div>

              {/* Topic — the hero */}
              <p style={{
                color: '#ffffff',
                fontSize,
                fontWeight: 900,
                margin: 0,
                lineHeight: 1.0,
                letterSpacing: -2,
              }}>
                {focus.topic}
              </p>

            </div>

            {/* Bottom row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ width: '100%', height: 1, background: '#1c1c1e', marginBottom: 32, display: 'flex' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>

                {/* Brand */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{
                    color: '#ffffff',
                    fontSize: 22,
                    fontWeight: 900,
                    letterSpacing: 5,
                    textTransform: 'uppercase',
                    margin: 0,
                  }}>
                    18TH MAN
                  </p>
                  <p style={{ color: '#3f3f46', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>
                    Rugby League Coaching
                  </p>
                </div>

                {/* Week + next week */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <p style={{ color: '#52525b', fontSize: 17, margin: 0 }}>{weekLabel}</p>
                  {focus.next_topic && (
                    <p style={{ color: '#3f3f46', fontSize: 15, margin: 0 }}>
                      Next: {focus.next_topic}
                    </p>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      ),
      { width: 1080, height: 1080, fonts },
    )
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    console.error('[card] render error:', msg)
    return new Response(`Card generation failed:\n${msg}`, { status: 500 })
  }
}
