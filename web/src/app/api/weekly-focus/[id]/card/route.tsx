import { ImageResponse } from 'next/og'
import { type NextRequest } from 'next/server'

export const runtime = 'edge'

async function loadFont(weight: 400 | 900): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap&subset=latin`,
    { headers: { 'User-Agent': 'Mozilla/4.0' } },
  ).then(r => r.text())

  const url = /src: url\((.+?)\) format\('(opentype|truetype)'\)/.exec(css)?.[1]
  if (!url) throw new Error('Could not parse font URL from Google Fonts CSS')
  return fetch(url).then(r => r.arrayBuffer())
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }

  const [focusRes, fontRegular, fontBold] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/weekly_focuses?id=eq.${id}&select=topic,description,next_topic,club_id`, { headers })
      .then(r => r.json()),
    loadFont(400),
    loadFont(900),
  ])

  const focus = focusRes?.[0]
  const topic: string = focus?.topic ?? 'Weekly Focus'
  const description: string = focus?.description ?? ''
  const nextTopic: string | null = focus?.next_topic ?? null

  let clubName = '18th Man'
  if (focus?.club_id) {
    const clubRes = await fetch(
      `${supabaseUrl}/rest/v1/clubs?id=eq.${focus.club_id}&select=name`,
      { headers },
    ).then(r => r.json())
    clubName = clubRes?.[0]?.name ?? '18th Man'
  }

  // First paragraph, capped at 160 chars
  const firstPara = description.split(/\n\n+/)[0]?.trim() ?? ''
  const shortDesc = firstPara.length > 160 ? firstPara.slice(0, 160).trimEnd() + '…' : firstPara

  const fonts = [
    { name: 'Inter', data: fontRegular, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: fontBold, weight: 900 as const, style: 'normal' as const },
  ]

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#18181b',
        display: 'flex',
        flexDirection: 'column',
        padding: '64px',
        fontFamily: 'Inter',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '56px' }}>
        {/* Logo mark */}
        <div
          style={{
            width: '52px',
            height: '52px',
            background: '#e8560a',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px',
          }}
        >
          <span style={{ color: 'white', fontSize: '20px', fontWeight: 900, lineHeight: 1 }}>18</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: 'white', fontSize: '15px', fontWeight: 900, letterSpacing: '0.12em' }}>18TH MAN</span>
          <span style={{ color: '#71717a', fontSize: '11px', letterSpacing: '0.1em', marginTop: '2px' }}>RUGBY LEAGUE</span>
        </div>
        {/* Spacer */}
        <div style={{ flex: 1, display: 'flex' }} />
        <span style={{ color: '#52525b', fontSize: '15px' }}>{clubName}</span>
      </div>

      {/* Label pill */}
      <div style={{ display: 'flex', marginBottom: '28px' }}>
        <div
          style={{
            background: 'rgba(99,102,241,0.15)',
            borderRadius: '100px',
            padding: '8px 20px',
            display: 'flex',
          }}
        >
          <span style={{ color: '#818cf8', fontSize: '13px', fontWeight: 900, letterSpacing: '0.1em' }}>
            WEEKLY FOCUS
          </span>
        </div>
      </div>

      {/* Topic */}
      <div style={{ display: 'flex', flex: 1 }}>
        <span
          style={{
            color: 'white',
            fontSize: topic.length > 20 ? '64px' : '80px',
            fontWeight: 900,
            lineHeight: 1.05,
          }}
        >
          {topic}
        </span>
      </div>

      {/* Description */}
      {shortDesc ? (
        <div style={{ display: 'flex', marginTop: '32px' }}>
          <span style={{ color: '#a1a1aa', fontSize: '22px', fontWeight: 400, lineHeight: 1.55 }}>
            {shortDesc}
          </span>
        </div>
      ) : null}

      {/* Divider */}
      <div style={{ display: 'flex', marginTop: '48px', marginBottom: '24px', height: '1px', background: '#27272a' }} />

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {nextTopic ? (
          <div style={{ display: 'flex' }}>
            <span style={{ color: '#52525b', fontSize: '15px', marginRight: '8px' }}>Next week:</span>
            <span style={{ color: '#71717a', fontSize: '15px' }}>{nextTopic}</span>
          </div>
        ) : <div style={{ display: 'flex' }} />}
        <div style={{ flex: 1, display: 'flex' }} />
        <span style={{ color: '#e8560a', fontSize: '15px', fontWeight: 900, letterSpacing: '0.04em' }}>
          18thman.app
        </span>
      </div>
    </div>,
    {
      width: 1080,
      height: 1080,
      fonts,
    },
  )
}
