import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CATEGORY_BG: Record<string, string> = {
  Attacking: '#78350f',
  Defensive: '#7f1d1d',
  'Ball Handling': '#0c4a6e',
  'Set Piece & Kicking': '#4c1d95',
  'Fitness & Game Sense': '#14532d',
}

const CATEGORY_ACCENT: Record<string, string> = {
  Attacking: '#fbbf24',
  Defensive: '#f87171',
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

  const [focusRes] = await Promise.all([
    supabase
      .from('weekly_focuses')
      .select('topic, description, next_topic, club_id')
      .eq('id', id)
      .single(),
  ])

  if (!focusRes.data) {
    return new Response('Not found', { status: 404 })
  }

  const focus = focusRes.data
  const { data: club } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', focus.club_id)
    .single()

  const category = TOPIC_CATEGORY[focus.topic] ?? 'Attacking'
  const bg = CATEGORY_BG[category] ?? '#1a1a2e'
  const accent = CATEGORY_ACCENT[category] ?? '#6366f1'
  const clubName = club?.name ?? 'Rugby League Club'

  const weekLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          background: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Coloured top band */}
        <div style={{ width: '100%', height: 8, background: accent, display: 'flex' }} />

        {/* Background accent blob */}
        <div style={{
          position: 'absolute',
          top: 60,
          right: -80,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: bg,
          opacity: 0.4,
          display: 'flex',
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '64px 72px', justifyContent: 'space-between' }}>
          {/* Top: club + week */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: accent,
                color: '#09090b',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                padding: '6px 16px',
                borderRadius: 999,
                display: 'flex',
              }}>
                {category}
              </div>
            </div>
            <p style={{ color: '#71717a', fontSize: 22, margin: 0, marginTop: 8 }}>
              Week of {weekLabel}
            </p>
          </div>

          {/* Centre: focus */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <p style={{ color: '#a1a1aa', fontSize: 28, margin: 0, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              This Week's Focus
            </p>
            <p style={{ color: '#ffffff', fontSize: 80, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
              {focus.topic}
            </p>
            <p style={{ color: '#d4d4d8', fontSize: 30, margin: 0, lineHeight: 1.5, maxWidth: 820 }}>
              {focus.description.length > 160 ? focus.description.slice(0, 157) + '…' : focus.description}
            </p>
          </div>

          {/* Bottom: next week + branding */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {focus.next_topic ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ color: '#52525b', fontSize: 18, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Next Week</p>
                <p style={{ color: '#a1a1aa', fontSize: 24, margin: 0, fontWeight: 600 }}>{focus.next_topic}</p>
              </div>
            ) : <div style={{ display: 'flex' }} />}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <p style={{ color: '#ffffff', fontSize: 26, fontWeight: 700, margin: 0 }}>{clubName}</p>
              <p style={{ color: '#52525b', fontSize: 18, margin: 0 }}>Powered by 18th Man</p>
            </div>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div style={{ width: '100%', height: 6, background: accent, display: 'flex', opacity: 0.5 }} />
      </div>
    ),
    { width: 1080, height: 1080 },
  )
}
