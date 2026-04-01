import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
  Sequence,
} from 'remotion'
import { z } from 'zod'
import { B, difficultyColour, categoryColour, categoryBg } from '../components/Brand'

export const drillCardSchema = z.object({
  drillTitle: z.string(),
  category: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  playerCount: z.string().optional(),
  coachingCues: z.array(z.string()),
  canvasPreviewUrl: z.string().nullable(),
})

type Props = z.infer<typeof drillCardSchema>

export const DrillCard: React.FC<Props> = ({
  drillTitle,
  category,
  difficulty,
  playerCount,
  coachingCues,
  canvasPreviewUrl,
}) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()
  const isSquare = width === height

  // ── Entrance spring ──────────────────────────────────────────
  const logoProgress = spring({ frame, fps, config: { damping: 14, stiffness: 120 }, delay: 0 })
  const titleProgress = spring({ frame, fps, config: { damping: 14, stiffness: 100 }, delay: 6 })
  const badgeProgress = spring({ frame, fps, config: { damping: 16, stiffness: 120 }, delay: 12 })
  const canvasProgress = spring({ frame, fps, config: { damping: 14, stiffness: 80 }, delay: 18 })
  const dividerProgress = spring({ frame, fps, config: { damping: 18, stiffness: 140 }, delay: 26 })

  // Ember pulse glow
  const glowOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.6, 1, 0.6],
    { extrapolateRight: 'clamp' }
  )

  const padding = isSquare ? 64 : 80
  const contentWidth = width - padding * 2

  return (
    <AbsoluteFill style={{ backgroundColor: B.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Background glow ─────────────────────────────────── */}
      <AbsoluteFill>
        <div style={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(232,86,10,${0.12 * glowOpacity}) 0%, transparent 65%)`,
        }} />
        <div style={{
          position: 'absolute',
          bottom: -100,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 65%)',
        }} />
      </AbsoluteFill>

      {/* ── Pitch grid background ────────────────────────────── */}
      <AbsoluteFill style={{ opacity: 0.025 }}>
        <svg width="100%" height="100%" viewBox="0 0 680 1000" preserveAspectRatio="xMidYMid slice">
          <rect x="20" y="20" width="640" height="960" stroke="white" strokeWidth="2" fill="none" />
          <line x1="20" y1="500" x2="660" y2="500" stroke="white" strokeWidth="1.5" />
          <line x1="20" y1="196" x2="660" y2="196" stroke="white" strokeWidth="1" />
          <line x1="20" y1="804" x2="660" y2="804" stroke="white" strokeWidth="1" />
          <circle cx="340" cy="500" r="4" fill="white" />
        </svg>
      </AbsoluteFill>

      {/* ── Top ember bar ────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 5,
        background: `linear-gradient(90deg, ${B.ember}, ${B.emberDim})`,
        transform: `scaleX(${logoProgress})`,
        transformOrigin: 'left',
      }} />

      {/* ── Content ─────────────────────────────────────────── */}
      <AbsoluteFill style={{ padding }}>

        {/* Logo row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: isSquare ? 40 : 60,
          opacity: logoProgress,
          transform: `translateY(${interpolate(logoProgress, [0, 1], [20, 0])}px)`,
        }}>
          <Img
            src={staticFile('logo.png')}
            style={{ width: 52, height: 52, borderRadius: 8 }}
          />
          <div>
            <div style={{
              color: B.text,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>18TH MAN</div>
            <div style={{
              color: B.muted,
              fontSize: 13,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}>Rugby League</div>
          </div>
        </div>

        {/* Category + difficulty badges */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: isSquare ? 28 : 40,
          opacity: badgeProgress,
          transform: `translateY(${interpolate(badgeProgress, [0, 1], [16, 0])}px)`,
        }}>
          <div style={{
            background: categoryBg(category),
            border: `1px solid ${categoryColour[category] ?? '#94a3b8'}44`,
            borderRadius: 100,
            padding: '8px 20px',
            fontSize: 15,
            fontWeight: 700,
            color: categoryColour[category] ?? '#94a3b8',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>{category}</div>
          <div style={{
            background: (difficultyColour[difficulty] ?? '#94a3b8') + '22',
            border: `1px solid ${difficultyColour[difficulty] ?? '#94a3b8'}44`,
            borderRadius: 100,
            padding: '8px 20px',
            fontSize: 15,
            fontWeight: 700,
            color: difficultyColour[difficulty] ?? '#94a3b8',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>{difficulty}</div>
          {playerCount && (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 100,
              padding: '8px 20px',
              fontSize: 15,
              fontWeight: 600,
              color: B.muted,
              letterSpacing: '0.04em',
            }}>{playerCount} players</div>
          )}
        </div>

        {/* Drill title */}
        <div style={{
          fontSize: isSquare ? 72 : 88,
          fontWeight: 900,
          color: B.text,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          marginBottom: isSquare ? 32 : 48,
          opacity: titleProgress,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [40, 0])}px)`,
        }}>{drillTitle}</div>

        {/* Canvas drawing */}
        {canvasPreviewUrl && (
          <div style={{
            width: contentWidth,
            borderRadius: 16,
            overflow: 'hidden',
            border: `1px solid ${B.border}`,
            marginBottom: isSquare ? 32 : 48,
            opacity: canvasProgress,
            transform: `scale(${interpolate(canvasProgress, [0, 1], [0.96, 1])})`,
          }}>
            <Img
              src={canvasPreviewUrl}
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        )}

        {/* Divider */}
        <div style={{
          height: 2,
          background: `linear-gradient(90deg, ${B.ember}, transparent)`,
          width: contentWidth,
          marginBottom: isSquare ? 28 : 40,
          transform: `scaleX(${dividerProgress})`,
          transformOrigin: 'left',
        }} />

        {/* Coaching cues */}
        <div style={{
          color: B.muted,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 20,
          opacity: dividerProgress,
        }}>Coaching Cues</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {coachingCues.map((cue, i) => {
            const cueProgress = spring({
              frame,
              fps,
              config: { damping: 16, stiffness: 120 },
              delay: 30 + i * 8,
            })
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  opacity: cueProgress,
                  transform: `translateX(${interpolate(cueProgress, [0, 1], [-24, 0])}px)`,
                }}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: B.ember,
                  flexShrink: 0,
                }} />
                <div style={{
                  color: B.text,
                  fontSize: isSquare ? 26 : 30,
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}>{cue}</div>
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
          opacity: interpolate(frame, [80, 100], [0, 0.4], { extrapolateRight: 'clamp' }),
        }}>
          <div style={{ color: B.muted, fontSize: 13, letterSpacing: '0.1em' }}>
            18THMAN.APP
          </div>
          <div style={{
            color: B.ember,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}>
            #RUGBYLEAGUE
          </div>
        </div>

      </AbsoluteFill>
    </AbsoluteFill>
  )
}
