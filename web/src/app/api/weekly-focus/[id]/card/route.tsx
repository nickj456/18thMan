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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: focus } = await supabase
    .from('weekly_focuses')
    .select('topic, description, next_topic')
    .eq('id', id)
    .single()

  if (!focus) {
    return new Response('Not found', { status: 404 })
  }

  const category = TOPIC_CATEGORY[focus.topic] ?? 'Ball Handling'
  const accent = CATEGORY_ACCENT[category] ?? '#6366f1'

  const weekLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const description = focus.description.length > 160
    ? focus.description.slice(0, 157) + '\u2026'
    : focus.description

  // Reduce font size for long topic names
  const topicFontSize = focus.topic.length > 20 ? 68 : focus.topic.length > 14 ? 80 : 96

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          background: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div style={{ width: '100%', height: 8, background: accent, display: 'flex' }} />

        {/* Main content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '64px 80px',
        }}>

          {/* Header: brand + week */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ color: '#ffffff', fontSize: 24, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', margin: 0 }}>
                18TH MAN
              </p>
              <p style={{ color: '#52525b', fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>
                Rugby League Coaching
              </p>
            </div>
            <p style={{ color: '#52525b', fontSize: 18, margin: 0 }}>
              {weekLabel}
            </p>
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: 1, background: '#27272a', marginTop: 48, marginBottom: 56, display: 'flex' }} />

          {/* Category + "Weekly Focus" label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
            <div style={{
              background: accent,
              color: '#09090b',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '8px 20px',
              borderRadius: 999,
              display: 'flex',
            }}>
              {category}
            </div>
            <p style={{ color: '#3f3f46', fontSize: 15, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
              Weekly Focus
            </p>
          </div>

          {/* Topic — hero */}
          <p style={{
            color: '#ffffff',
            fontSize: topicFontSize,
            fontWeight: 900,
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: -1,
          }}>
            {focus.topic}
          </p>

          {/* Description */}
          <p style={{
            color: '#71717a',
            fontSize: 24,
            margin: 0,
            marginTop: 40,
            lineHeight: 1.6,
            maxWidth: 900,
          }}>
            {description}
          </p>

          {/* Spacer */}
          <div style={{ flex: 1, display: 'flex' }} />

          {/* Next week teaser */}
          {focus.next_topic ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ color: '#3f3f46', fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: 3, fontWeight: 600 }}>
                Next Week
              </p>
              <p style={{ color: '#52525b', fontSize: 24, margin: 0, fontWeight: 600 }}>
                {focus.next_topic}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex' }} />
          )}
        </div>

        {/* Bottom accent bar */}
        <div style={{ width: '100%', height: 4, background: accent, display: 'flex', opacity: 0.3 }} />
      </div>
    ),
    { width: 1080, height: 1080 },
  )
}
