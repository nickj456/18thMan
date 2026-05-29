import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from 'remotion'
import { z } from 'zod'
import { B, categoryColour, categoryBg } from '../components/Brand'

export const sessionRecapSchema = z.object({
  sessionTitle: z.string(),
  coachName: z.string(),
  totalDuration: z.number(),
  drills: z.array(z.object({
    title: z.string(),
    duration: z.number(),
    category: z.string(),
  })),
})

type Props = z.infer<typeof sessionRecapSchema>

export const SessionRecap: React.FC<Props> = ({
  sessionTitle,
  coachName,
  totalDuration,
  drills,
}) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const padding = 80

  const logoProgress = spring({ frame, fps, config: { damping: 14, stiffness: 120 } })
  const headerProgress = spring({ frame, fps, config: { damping: 12, stiffness: 80 }, delay: 8 })
  const statsProgress = spring({ frame, fps, config: { damping: 14, stiffness: 100 }, delay: 18 })

  const glowOpacity = interpolate(frame % 90, [0, 45, 90], [0.5, 1, 0.5], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: B.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: -150,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 800,
        height: 800,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(232,86,10,${0.1 * glowOpacity}) 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Top ember bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 5,
        background: `linear-gradient(90deg, ${B.ember}, ${B.emberDim})`,
        transform: `scaleX(${logoProgress})`,
        transformOrigin: 'left',
      }} />

      <AbsoluteFill style={{ padding }}>

        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 56,
          opacity: logoProgress,
          transform: `translateY(${interpolate(logoProgress, [0, 1], [20, 0])}px)`,
        }}>
          <Img src={staticFile('logo.png')} style={{ width: 52, height: 52, borderRadius: 8 }} />
          <div>
            <div style={{ color: B.text, fontSize: 22, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>18TH MAN</div>
            <div style={{ color: B.muted, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Session Recap</div>
          </div>
        </div>

        {/* Session title */}
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          color: B.text,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          marginBottom: 20,
          opacity: headerProgress,
          transform: `translateY(${interpolate(headerProgress, [0, 1], [40, 0])}px)`,
        }}>{sessionTitle}</div>

        <div style={{
          color: B.muted,
          fontSize: 22,
          marginBottom: 48,
          opacity: headerProgress,
        }}>by {coachName}</div>

        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: 24,
          marginBottom: 56,
          opacity: statsProgress,
          transform: `translateY(${interpolate(statsProgress, [0, 1], [20, 0])}px)`,
        }}>
          {[
            { label: 'Duration', value: `${totalDuration}min` },
            { label: 'Drills', value: String(drills.length) },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: B.surface,
              border: `1px solid ${B.border}`,
              borderRadius: 16,
              padding: '20px 32px',
              flex: 1,
            }}>
              <div style={{ color: B.muted, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
              <div style={{ color: B.ember, fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{
          height: 2,
          background: `linear-gradient(90deg, ${B.ember}, transparent)`,
          marginBottom: 40,
          transform: `scaleX(${statsProgress})`,
          transformOrigin: 'left',
        }} />

        {/* Drill list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {drills.map((drill, i) => {
            const drillProgress = spring({
              frame,
              fps,
              config: { damping: 16, stiffness: 110 },
              delay: 28 + i * 10,
            })
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  background: B.surface,
                  border: `1px solid ${B.border}`,
                  borderRadius: 14,
                  padding: '20px 24px',
                  opacity: drillProgress,
                  transform: `translateX(${interpolate(drillProgress, [0, 1], [-32, 0])}px)`,
                }}
              >
                {/* Step number */}
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: B.ember,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#fff',
                  flexShrink: 0,
                }}>{i + 1}</div>

                {/* Drill info */}
                <div style={{ flex: 1 }}>
                  <div style={{ color: B.text, fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>{drill.title}</div>
                  <div style={{
                    display: 'inline-block',
                    background: categoryBg(drill.category),
                    border: `1px solid ${categoryColour[drill.category] ?? '#94a3b8'}33`,
                    borderRadius: 100,
                    padding: '3px 12px',
                    fontSize: 13,
                    fontWeight: 700,
                    color: categoryColour[drill.category] ?? '#94a3b8',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginTop: 6,
                  }}>{drill.category}</div>
                </div>

                {/* Duration */}
                <div style={{
                  color: B.muted,
                  fontSize: 22,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>{drill.duration}m</div>
              </div>
            )
          })}
        </div>

        {/* Bottom watermark */}
        <div style={{
          position: 'absolute',
          bottom: padding,
          left: padding,
          right: padding,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: interpolate(frame, [100, 120], [0, 0.4], { extrapolateRight: 'clamp' }),
        }}>
          <div style={{ color: B.muted, fontSize: 13, letterSpacing: '0.1em' }}>18THMAN.APP</div>
          <div style={{ color: B.ember, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em' }}>#RUGBYLEAGUE</div>
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  )
}
