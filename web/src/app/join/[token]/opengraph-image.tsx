import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'edge'
export const alt = 'Join a club on 18th Man'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const service = createServiceClient()
  const { data: club } = await service
    .from('clubs')
    .select('name')
    .eq('invite_token', token)
    .single()

  const clubName = club?.name ?? 'a Club'

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0d0d0d',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '900px',
            height: '700px',
            background: 'radial-gradient(ellipse at center, rgba(232,86,10,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Badge */}
        <div
          style={{
            background: 'rgba(232,86,10,0.15)',
            border: '1px solid rgba(232,86,10,0.35)',
            borderRadius: '100px',
            padding: '8px 20px',
            marginBottom: '28px',
            display: 'flex',
          }}
        >
          <span style={{ color: '#e8560a', fontSize: '18px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Club Invite
          </span>
        </div>

        {/* Club name */}
        <div
          style={{
            fontSize: clubName.length > 20 ? '56px' : '72px',
            fontWeight: '900',
            color: '#ffffff',
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: '20px',
            textAlign: 'center',
            maxWidth: '900px',
            display: 'flex',
          }}
        >
          {clubName}
        </div>

        {/* Divider */}
        <div
          style={{
            width: '60px',
            height: '3px',
            background: '#e8560a',
            borderRadius: '2px',
            marginBottom: '20px',
            display: 'flex',
          }}
        />

        {/* Subtitle */}
        <div style={{ fontSize: '26px', color: '#71717a', fontWeight: '500', display: 'flex' }}>
          Join on 18th Man — Rugby League Coaching Platform
        </div>
      </div>
    ),
    { ...size }
  )
}
