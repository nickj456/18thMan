import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '18th Man — Rugby League Coaching Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
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
            width: '800px',
            height: '600px',
            background: 'radial-gradient(ellipse at center, rgba(232,86,10,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Hexagon logo mark */}
        <div
          style={{
            width: '120px',
            height: '120px',
            background: 'rgba(232,86,10,0.15)',
            border: '2px solid rgba(232,86,10,0.4)',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '64px',
              fontWeight: '900',
              color: '#e8560a',
              lineHeight: 1,
            }}
          >
            18
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: '900',
            color: '#ffffff',
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: '16px',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          18TH MAN
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
        <div
          style={{
            fontSize: '28px',
            color: '#71717a',
            fontWeight: '500',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          Rugby League Coaching Platform
        </div>
      </div>
    ),
    { ...size }
  )
}
