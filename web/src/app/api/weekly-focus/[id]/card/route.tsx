import { ImageResponse } from 'next/og'
import { INTER_900_B64 } from './font-data'

export const runtime = 'edge'

type AccentKey = 'Attacking' | 'Defensive' | 'Ball Handling' | 'Set Piece & Kicking' | 'Fitness & Game Sense'

const ACCENT: Record<AccentKey, { hex: string; bg: string; border: string; text: string }> = {
  Attacking:           { hex: '#f59e0b', bg: 'rgba(245,158,11,0.13)',  border: 'rgba(245,158,11,0.33)',  text: '#f59e0b' },
  Defensive:           { hex: '#ef4444', bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.33)',   text: '#ef4444' },
  'Ball Handling':     { hex: '#38bdf8', bg: 'rgba(56,189,248,0.13)',  border: 'rgba(56,189,248,0.33)',  text: '#38bdf8' },
  'Set Piece & Kicking':{ hex: '#a78bfa', bg: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.33)', text: '#a78bfa' },
  'Fitness & Game Sense':{ hex: '#4ade80', bg: 'rgba(74,222,128,0.13)', border: 'rgba(74,222,128,0.33)', text: '#4ade80' },
}

const TOPIC_CATEGORY: Record<string, AccentKey> = {
  'Offloading': 'Attacking', 'Support Play': 'Attacking', 'Line Breaks & Edge Play': 'Attacking', 'Dummy Half Play': 'Attacking',
  'Tackle Technique': 'Defensive', 'Line Speed & Drift Defence': 'Defensive', 'Marker Defence': 'Defensive', 'Goal Line Defence': 'Defensive',
  'Pass Accuracy': 'Ball Handling', 'Handling Under Pressure': 'Ball Handling', 'Catching High Balls': 'Ball Handling',
  'Kick-Off Receipts': 'Set Piece & Kicking', 'Grubber Kicks': 'Set Piece & Kicking', 'Bomb Kicks': 'Set Piece & Kicking', 'Scrum Technique': 'Set Piece & Kicking',
  'Agility & Conditioning': 'Fitness & Game Sense', 'Decision Making': 'Fitness & Game Sense', 'Game Management': 'Fitness & Game Sense',
}

function getFont(): ArrayBuffer {
  const binary = atob(INTER_900_B64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
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
  const { id } = await params

  const dbUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/weekly_focuses?select=topic,next_topic&id=eq.${encodeURIComponent(id)}&limit=1`
  const dbRes = await fetch(dbUrl, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      Accept: 'application/json',
    },
  })

  const rows = dbRes.ok
    ? (await dbRes.json()) as { topic: string; next_topic: string | null }[]
    : []

  const focus = rows[0]
  if (!focus) return new Response('Not found', { status: 404 })

  const categoryKey = TOPIC_CATEGORY[focus.topic] ?? 'Ball Handling'
  const accent = ACCENT[categoryKey]
  const weekLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const fontSize = topicFontSize(focus.topic)
  const fontData = getFont()

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1080, background: '#0a0a0a', display: 'flex', fontFamily: 'Inter' }}>
        <div style={{ width: 8, background: accent.hex, display: 'flex' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '72px 88px' }}>

          <p style={{ color: '#3f3f46', fontSize: 13, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase', margin: 0 }}>
            Weekly Focus
          </p>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: accent.bg,
              border: `2px solid ${accent.border}`,
              color: accent.text,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: 3,
              textTransform: 'uppercase',
              padding: '10px 24px',
              borderRadius: 999,
              marginBottom: 40,
            }}>
              {categoryKey}
            </div>

            <p style={{ color: '#ffffff', fontSize, fontWeight: 900, margin: 0, lineHeight: 1 }}>
              {focus.topic}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', height: 1, background: '#1c1c1e', marginBottom: 32, display: 'flex' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <p style={{ color: '#ffffff', fontSize: 22, fontWeight: 900, letterSpacing: 5, textTransform: 'uppercase', margin: 0 }}>
                  18TH MAN
                </p>
                <p style={{ color: '#3f3f46', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', margin: 0, marginTop: 8 }}>
                  Rugby League Coaching
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <p style={{ color: '#52525b', fontSize: 17, margin: 0 }}>{weekLabel}</p>
                {focus.next_topic && (
                  <p style={{ color: '#3f3f46', fontSize: 15, margin: 0, marginTop: 8 }}>Next: {focus.next_topic}</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [{ name: 'Inter', data: fontData, weight: 900, style: 'normal' }],
    },
  )
}
