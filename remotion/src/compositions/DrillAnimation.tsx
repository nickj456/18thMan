import { useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion'
import { z } from 'zod'

// ── Type definitions (mirrors web/src/components/designer/types.ts) ──────────

const canvasElementSchema = z.object({
  id: z.string(),
  type: z.enum(['select','attacker','defender','cone','ball','arrow','line','dotted','zone','text']),
  x: z.number(),
  y: z.number(),
  label: z.string().optional(),
  color: z.string().optional(),
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
})

const keyframeSchema = z.object({
  time: z.number(),
  elementStates: z.record(z.string(), canvasElementSchema.partial()),
})

const canvasStateSchema = z.object({
  background: z.enum(['full','half','blank','ingoal']),
  elements: z.array(canvasElementSchema),
  keyframes: z.array(keyframeSchema).optional(),
  duration: z.number().optional(),
})

export const drillAnimationSchema = z.object({
  canvasJson: canvasStateSchema,
  drillTitle: z.string().optional(),
})

type CanvasElement = z.infer<typeof canvasElementSchema>
type Keyframe = z.infer<typeof keyframeSchema>
type CanvasState = z.infer<typeof canvasStateSchema>

// ── Constants ────────────────────────────────────────────────────────────────

const CW = 900
const CH = 600
const GREEN = '#2d5a27'
const LIGHT_GREEN = '#357a2e'
const WHITE = '#ffffff'

// ── Interpolation ────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

const NUM_KEYS = ['x','y','x1','y1','x2','y2','width','height'] as const

function getInterpolatedElements(state: CanvasState, frame: number): CanvasElement[] {
  const keyframes = state.keyframes
  if (!keyframes || keyframes.length === 0) return state.elements
  return state.elements.map(el => {
    const elKfs = keyframes.filter(k => k.elementStates[el.id])
    if (elKfs.length === 0) return el
    const before = [...elKfs].reverse().find(k => k.time <= frame)
    const after = elKfs.find(k => k.time > frame)
    if (!before && !after) return el
    if (!before) return { ...el, ...after!.elementStates[el.id] }
    if (!after) return { ...el, ...before.elementStates[el.id] }
    const t = (frame - before.time) / (after.time - before.time)
    const bState = before.elementStates[el.id]
    const aState = after.elementStates[el.id]
    const out: Partial<CanvasElement> = {}
    for (const key of NUM_KEYS) {
      const bv = bState[key] as number | undefined
      const av = aState[key] as number | undefined
      if (bv !== undefined && av !== undefined) {
        (out as Record<string, number>)[key] = lerp(bv, av, t)
      }
    }
    return { ...el, ...out }
  })
}

// ── SVG Pitch Backgrounds ────────────────────────────────────────────────────

function FullPitch() {
  const stripeCount = 10
  const sw = CW / stripeCount
  return (
    <>
      {Array.from({ length: stripeCount }, (_, i) => (
        <rect key={i} x={i * sw} y={0} width={sw} height={CH} fill={i % 2 === 0 ? GREEN : LIGHT_GREEN} />
      ))}
      {/* Boundary */}
      <rect x={20} y={20} width={CW - 40} height={CH - 40} stroke={WHITE} strokeWidth={2} fill="none" />
      {/* In-goal areas */}
      <rect x={20} y={20} width={CW * 0.08} height={CH - 40} stroke={WHITE} strokeWidth={2} fill="none" />
      <rect x={CW - 20 - CW * 0.08} y={20} width={CW * 0.08} height={CH - 40} stroke={WHITE} strokeWidth={2} fill="none" />
      {/* Halfway */}
      <line x1={CW / 2} y1={20} x2={CW / 2} y2={CH - 20} stroke={WHITE} strokeWidth={2} />
      {/* 10m */}
      <line x1={CW / 2 - CW * 0.09} y1={20} x2={CW / 2 - CW * 0.09} y2={CH - 20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4" />
      <line x1={CW / 2 + CW * 0.09} y1={20} x2={CW / 2 + CW * 0.09} y2={CH - 20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4" />
      {/* 20m */}
      <line x1={CW * 0.08 + 20 + CW * 0.12} y1={20} x2={CW * 0.08 + 20 + CW * 0.12} y2={CH - 20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4" />
      <line x1={CW - 20 - CW * 0.08 - CW * 0.12} y1={20} x2={CW - 20 - CW * 0.08 - CW * 0.12} y2={CH - 20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4" />
      <text x={30} y={CH - 10} fill={WHITE} fontSize={11} opacity={0.6}>← Attack</text>
      <text x={CW - 100} y={CH - 10} fill={WHITE} fontSize={11} opacity={0.6}>Defence →</text>
    </>
  )
}

function HalfPitch() {
  const stripeCount = 6
  const sw = CW / stripeCount
  return (
    <>
      {Array.from({ length: stripeCount }, (_, i) => (
        <rect key={i} x={i * sw} y={0} width={sw} height={CH} fill={i % 2 === 0 ? GREEN : LIGHT_GREEN} />
      ))}
      <rect x={20} y={20} width={CW - 40} height={CH - 40} stroke={WHITE} strokeWidth={2} fill="none" />
      <rect x={20} y={20} width={CW * 0.14} height={CH - 40} stroke={WHITE} strokeWidth={2} fill="none" />
      <line x1={CW * 0.5} y1={20} x2={CW * 0.5} y2={CH - 20} stroke={WHITE} strokeWidth={2} strokeDasharray="8 4" />
      <line x1={CW * 0.28} y1={20} x2={CW * 0.28} y2={CH - 20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4" />
    </>
  )
}

function BlankGrid() {
  const gridSize = 50
  const lines = []
  for (let x = 0; x <= CW; x += gridSize) {
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={CH} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)
  }
  for (let y = 0; y <= CH; y += gridSize) {
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={CW} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)
  }
  return (
    <>
      <rect x={0} y={0} width={CW} height={CH} fill="#1a1a2e" />
      {lines}
    </>
  )
}

function InGoalArea() {
  const stripeCount = 6
  const sw = CW / stripeCount
  return (
    <>
      {Array.from({ length: stripeCount }, (_, i) => (
        <rect key={i} x={i * sw} y={0} width={sw} height={CH} fill={i % 2 === 0 ? GREEN : LIGHT_GREEN} />
      ))}
      <rect x={20} y={20} width={CW - 40} height={CH - 40} stroke={WHITE} strokeWidth={2} fill="none" />
      <line x1={CW * 0.2} y1={20} x2={CW * 0.2} y2={CH - 20} stroke={WHITE} strokeWidth={2} />
      {/* Posts */}
      <line x1={CW * 0.2} y1={CH / 2 - 30} x2={CW * 0.2} y2={CH / 2 + 30} stroke="#f59e0b" strokeWidth={4} />
      <line x1={CW * 0.2 - 40} y1={CH / 2 - 30} x2={CW * 0.2 + 40} y2={CH / 2 - 30} stroke="#f59e0b" strokeWidth={4} />
    </>
  )
}

// ── Element Renderers ────────────────────────────────────────────────────────

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill={color} />
      </marker>
    </defs>
  )
}

function RenderElement({ el }: { el: CanvasElement }) {
  const color = el.color ?? '#ffffff'
  const markerId = `arrow-${el.id}`

  switch (el.type) {
    case 'attacker':
      return (
        <g transform={`translate(${el.x},${el.y})`}>
          <circle r={16} fill={color} stroke="white" strokeWidth={1.5} />
          <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize={12} fontWeight="bold">
            {el.label ?? ''}
          </text>
        </g>
      )
    case 'defender':
      return (
        <g transform={`translate(${el.x},${el.y})`}>
          <rect x={-14} y={-14} width={28} height={28} fill={color} stroke="white" strokeWidth={1.5} rx={3} />
          <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize={12} fontWeight="bold">
            {el.label ?? ''}
          </text>
        </g>
      )
    case 'cone':
      return (
        <g transform={`translate(${el.x},${el.y})`}>
          <polygon points="0,-14 12,10 -12,10" fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
        </g>
      )
    case 'ball':
      return (
        <g transform={`translate(${el.x},${el.y})`}>
          <ellipse rx={14} ry={9} fill={color} stroke="#5c2d07" strokeWidth={2} />
          <line x1={-8} y1={0} x2={8} y2={0} stroke="white" strokeWidth={1} opacity={0.6} />
        </g>
      )
    case 'arrow':
      if (el.x1 === undefined) return null
      return (
        <>
          <ArrowMarker id={markerId} color={color} />
          <line
            x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
            stroke={color} strokeWidth={2.5}
            markerEnd={`url(#${markerId})`}
          />
        </>
      )
    case 'line':
      if (el.x1 === undefined) return null
      return (
        <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={2} />
      )
    case 'dotted':
      if (el.x1 === undefined) return null
      return (
        <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={2} strokeDasharray="4 6" />
      )
    case 'zone':
      return (
        <rect
          x={el.x} y={el.y}
          width={el.width ?? 120} height={el.height ?? 80}
          fill={color} stroke="rgba(239,68,68,0.6)" strokeWidth={1.5}
        />
      )
    case 'text':
      return (
        <text x={el.x} y={el.y} fill={color} fontSize={16} fontFamily="system-ui, sans-serif">
          {el.label}
        </text>
      )
    default:
      return null
  }
}

// ── Main Composition ─────────────────────────────────────────────────────────

export function DrillAnimation({ canvasJson, drillTitle }: z.infer<typeof drillAnimationSchema>) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const elements = getInterpolatedElements(canvasJson, frame)

  return (
    <AbsoluteFill style={{ background: '#07080d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative' }}>
        <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ display: 'block', borderRadius: 8 }}>
          {/* Background */}
          {canvasJson.background === 'full' && <FullPitch />}
          {canvasJson.background === 'half' && <HalfPitch />}
          {canvasJson.background === 'blank' && <BlankGrid />}
          {canvasJson.background === 'ingoal' && <InGoalArea />}

          {/* Elements */}
          {elements.map(el => <RenderElement key={el.id} el={el} />)}
        </svg>

        {/* Title overlay */}
        {drillTitle && (
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: 6,
            borderLeft: '3px solid #e8560a',
            color: '#e8e4dc',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {drillTitle}
          </div>
        )}

        {/* Frame counter (dev only) */}
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0,0,0,0.5)',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'monospace',
          fontSize: 11,
          padding: '2px 6px',
          borderRadius: 4,
        }}>
          {(frame / fps).toFixed(1)}s · f{frame}
        </div>
      </div>
    </AbsoluteFill>
  )
}
