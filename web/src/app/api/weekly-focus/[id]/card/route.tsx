import { ImageResponse } from 'next/og'
import { INTER_900_B64 } from './font-data'

export const runtime = 'edge'

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
  try {
    const { id } = await params

    const dbUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/weekly_focuses?select=topic,description,next_topic&id=eq.${id}&limit=1`
    const dbRes = await fetch(dbUrl, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        Accept: 'application/json',
      },
    })
    const rows = dbRes.ok
      ? (await dbRes.json()) as { topic: string; description: string; next_topic: string | null }[]
      : []
    const focus = rows[0]

    if (!focus) {
      return new Response('Not found', { status: 404 })
    }

    const category = TOPIC_CATEGORY[focus.topic] ?? 'Ball Handling'
    const accent = CATEGORY_ACCENT[category] ?? '#6366f1'
    const weekLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const fontSize = topicFontSize(focus.topic)
    const fontData = getFont()

    return new ImageResponse(
      (
        <div style={{ width: 1080, height: 1080, background: '#0a0a0a', display: 'flex', fontFamily: '"Inter", sans-serif' }}>
          <div style={{ width: 8, background: accent, flexShrink: 0, display: 'flex' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '72px 88px' }}>

            <p style={{ color: '#3f3f46', fontSize: 13, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase', margin: 0 }}>
              Weekly Focus
            </p>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{
                display: 'inline-flex', alignSelf: 'flex-start',
                background: `${accent}22`, border: `1.5px solid ${accent}55`,
                color: accent, fontSize: 13, fontWeight: 900, letterSpacing: 3,
                textTransform: 'uppercase', padding: '10px 24px', borderRadius: 999, marginBottom: 40,
              }}>
                {category}
              </div>
              <p style={{ color: '#ffffff', fontSize, fontWeight: 900, margin: 0, lineHeight: 1 }}>
                {focus.topic}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: 1, background: '#1c1c1e', marginBottom: 32, display: 'flex' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ color: '#ffffff', fontSize: 22, fontWeight: 900, letterSpacing: 5, textTransform: 'uppercase', margin: 0 }}>
                    18TH MAN
                  </p>
                  <p style={{ color: '#3f3f46', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>
                    Rugby League Coaching
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <p style={{ color: '#52525b', fontSize: 17, margin: 0 }}>{weekLabel}</p>
                  {focus.next_topic && (
                    <p style={{ color: '#3f3f46', fontSize: 15, margin: 0 }}>Next: {focus.next_topic}</p>
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
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    console.error('[card]', msg)
    return new Response(`Error: ${msg}`, { status: 500 })
  }
}
