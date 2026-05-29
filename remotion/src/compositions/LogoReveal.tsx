import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from 'remotion'
import { B } from '../components/Brand'

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame, fps, config: { damping: 10, stiffness: 80 }, delay: 10 })
  const logoOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' })

  const line1Progress = spring({ frame, fps, config: { damping: 14, stiffness: 100 }, delay: 20 })
  const line2Progress = spring({ frame, fps, config: { damping: 14, stiffness: 100 }, delay: 30 })
  const taglineProgress = spring({ frame, fps, config: { damping: 16, stiffness: 120 }, delay: 42 })
  const barProgress = spring({ frame, fps, config: { damping: 18, stiffness: 140 }, delay: 38 })

  const glowPulse = interpolate(frame % 60, [0, 30, 60], [0.6, 1.0, 0.6], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{
      backgroundColor: B.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        width: 700,
        height: 700,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(232,86,10,${0.18 * glowPulse}) 0%, transparent 65%)`,
      }} />

      {/* Pitch lines */}
      <AbsoluteFill style={{ opacity: 0.04 }}>
        <svg width="100%" height="100%" viewBox="0 0 1080 1080" fill="none">
          <circle cx="540" cy="540" r="280" stroke="white" strokeWidth="2" />
          <line x1="0" y1="540" x2="1080" y2="540" stroke="white" strokeWidth="1.5" />
          <circle cx="540" cy="540" r="4" fill="white" />
        </svg>
      </AbsoluteFill>

      {/* Centre content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
      }}>
        {/* Logo mark */}
        <Img
          src={staticFile('logo.png')}
          style={{
            width: 140,
            height: 140,
            borderRadius: 24,
            marginBottom: 36,
            opacity: logoOpacity,
            transform: `scale(${interpolate(logoScale, [0, 1], [0.5, 1])})`,
          }}
        />

        {/* 18TH */}
        <div style={{
          fontSize: 140,
          fontWeight: 900,
          color: B.text,
          lineHeight: 0.9,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          opacity: line1Progress,
          transform: `translateY(${interpolate(line1Progress, [0, 1], [30, 0])}px)`,
        }}>18TH</div>

        {/* MAN */}
        <div style={{
          fontSize: 140,
          fontWeight: 900,
          color: B.ember,
          lineHeight: 0.9,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          opacity: line2Progress,
          transform: `translateY(${interpolate(line2Progress, [0, 1], [30, 0])}px)`,
        }}>MAN</div>

        {/* Divider bar */}
        <div style={{
          height: 3,
          width: 280,
          background: `linear-gradient(90deg, transparent, ${B.ember}, transparent)`,
          marginTop: 28,
          marginBottom: 28,
          transform: `scaleX(${barProgress})`,
        }} />

        {/* Tagline */}
        <div style={{
          color: B.muted,
          fontSize: 22,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          opacity: taglineProgress,
        }}>Rugby League Coaching</div>
      </div>
    </AbsoluteFill>
  )
}
