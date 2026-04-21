'use client'

// Remotion composition for drill animation preview.
// Used by AnimationPreview (designer) and DrillAnimationModal (drill cards).
// Must stay in sync with remotion/src/compositions/DrillAnimation.tsx

import { useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion'
import type { CanvasState } from './types'

export const COMP_WIDTH  = 900
export const COMP_HEIGHT = 600

// H-post dimensions — must match PitchBackground.tsx constants
const POST_SPAN   = 35
const POST_TOP    = -80
const POST_BOT    = 30
const BAR_OFFSET  = -10

const GREEN       = '#2d5a27'
const LIGHT_GREEN = '#357a2e'
const WHITE       = '#ffffff'
const NUM_KEYS    = ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height'] as const

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

type CE = CanvasState['elements'][number]

export function getInterpolatedElements(state: CanvasState, frame: number): CE[] {
  const keyframes = state.keyframes
  if (!keyframes || keyframes.length === 0) return state.elements
  return state.elements.map(el => {
    const elKfs = keyframes.filter(k => k.elementStates?.[el.id])
    if (elKfs.length === 0) return el
    const before = [...elKfs].reverse().find(k => k.time <= frame)
    const after  = elKfs.find(k => k.time > frame)
    if (!before && !after) return el
    if (!before) return { ...el, ...after!.elementStates[el.id] }
    if (!after)  return { ...el, ...before.elementStates[el.id] }
    const t = (frame - before.time) / (after.time - before.time)
    const bState = before.elementStates[el.id]
    const aState = after.elementStates[el.id]
    const out: Partial<CE> = {}
    for (const key of NUM_KEYS) {
      const bv = (bState as Record<string, number | undefined>)[key]
      const av = (aState as Record<string, number | undefined>)[key]
      if (bv !== undefined && av !== undefined) {
        (out as Record<string, number>)[key] = lerp(bv, av, t)
      }
    }
    return { ...el, ...out }
  })
}

// Collect arrow defs at the top of the SVG so markerEnd references always resolve
function ArrowDefs({ elements }: { elements: CE[] }) {
  const arrows = elements.filter(el => el.type === 'arrow' && el.x1 !== undefined)
  if (arrows.length === 0) return null
  return (
    <defs>
      {arrows.map(el => (
        <marker key={el.id} id={`arrow-${el.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={el.color ?? '#22c55e'} />
        </marker>
      ))}
    </defs>
  )
}

function RenderEl({ el }: { el: CE }) {
  const color = el.color ?? '#ffffff'
  switch (el.type) {
    case 'attacker': {
      const r  = el.size === 'sm' ? 12 : el.size === 'lg' ? 22 : 16
      const fs = Math.round(r * 0.75)
      return (
        <g transform={`translate(${el.x},${el.y})`}>
          <circle r={r} fill={color} stroke="white" strokeWidth={1.5} />
          <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize={fs} fontWeight="bold">{el.label ?? ''}</text>
        </g>
      )
    }
    case 'defender': {
      const r  = el.size === 'sm' ? 12 : el.size === 'lg' ? 22 : 16
      const fs = Math.round(r * 0.75)
      return (
        <g transform={`translate(${el.x},${el.y})`}>
          <rect x={-r} y={-r} width={r * 2} height={r * 2} fill={color} stroke="white" strokeWidth={1.5} rx={3} />
          <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize={fs} fontWeight="bold">{el.label ?? ''}</text>
        </g>
      )
    }
    case 'cone':
      return <g transform={`translate(${el.x},${el.y})`}><polygon points="0,-14 12,10 -12,10" fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth={1} /></g>
    case 'ball':
      return (
        <g transform={`translate(${el.x},${el.y})`}>
          <ellipse rx={14} ry={9} fill={color} stroke="#5c2d07" strokeWidth={2} />
          <line x1={-8} y1={0} x2={8} y2={0} stroke="white" strokeWidth={1} opacity={0.6} />
        </g>
      )
    case 'arrow':
      if (el.x1 === undefined || el.x2 === undefined) return null
      return (
        <line
          x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
          stroke={color} strokeWidth={2.5}
          markerEnd={`url(#arrow-${el.id})`}
        />
      )
    case 'line':
      if (el.x1 === undefined || el.x2 === undefined) return null
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={2} />
    case 'dotted':
      if (el.x1 === undefined || el.x2 === undefined) return null
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={2} strokeDasharray="4 6" />
    case 'zone':
      return <rect x={el.x} y={el.y} width={el.width ?? 120} height={el.height ?? 80} fill={color} stroke="rgba(239,68,68,0.6)" strokeWidth={1.5} />
    case 'text':
      return <text x={el.x} y={el.y} fill={color} fontSize={16} fontFamily="system-ui, sans-serif">{el.label}</text>
    default:
      return null
  }
}

export function PitchSVG({ bg, flipped }: { bg: CanvasState['background']; flipped?: boolean }) {
  const sw10 = COMP_WIDTH / 10
  const sw6  = COMP_WIDTH / 6
  const W = COMP_WIDTH
  const H = COMP_HEIGHT

  let inner: React.ReactNode

  if (bg === 'blank') {
    const lines: React.ReactNode[] = []
    for (let x = 0; x <= W; x += 50) lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)
    for (let y = 0; y <= H; y += 50) lines.push(<line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)
    inner = <><rect x={0} y={0} width={W} height={H} fill="#1a1a2e" />{lines}</>
  } else if (bg === 'half') {
    inner = (
      <>
        {Array.from({ length: 6 }, (_, i) => <rect key={i} x={i * sw6} y={0} width={sw6} height={H} fill={i % 2 === 0 ? GREEN : LIGHT_GREEN} />)}
        <rect x={20} y={20} width={W - 40} height={H - 40} stroke={WHITE} strokeWidth={2} fill="none" />
        <rect x={20} y={20} width={W * 0.14} height={H - 40} stroke={WHITE} strokeWidth={2} fill="none" />
        <line x1={W * 0.5} y1={20} x2={W * 0.5} y2={H - 20} stroke={WHITE} strokeWidth={2} strokeDasharray="8 4" />
        <line x1={W * 0.28} y1={20} x2={W * 0.28} y2={H - 20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4" />
      </>
    )
  } else if (bg === 'ingoal') {
    const px = W * 0.2
    const py = H / 2
    inner = (
      <>
        {Array.from({ length: 6 }, (_, i) => <rect key={i} x={i * sw6} y={0} width={sw6} height={H} fill={i % 2 === 0 ? GREEN : LIGHT_GREEN} />)}
        <rect x={20} y={20} width={W - 40} height={H - 40} stroke={WHITE} strokeWidth={2} fill="none" />
        {/* Try line */}
        <line x1={px} y1={20} x2={px} y2={H - 20} stroke={WHITE} strokeWidth={2} />
        {/* H goal posts — left upright, right upright, crossbar */}
        <line x1={px - POST_SPAN} y1={py + BAR_OFFSET + POST_TOP} x2={px - POST_SPAN} y2={py + BAR_OFFSET + POST_BOT} stroke="#f59e0b" strokeWidth={4} />
        <line x1={px + POST_SPAN} y1={py + BAR_OFFSET + POST_TOP} x2={px + POST_SPAN} y2={py + BAR_OFFSET + POST_BOT} stroke="#f59e0b" strokeWidth={4} />
        <line x1={px - POST_SPAN} y1={py + BAR_OFFSET} x2={px + POST_SPAN} y2={py + BAR_OFFSET} stroke="#f59e0b" strokeWidth={4} />
      </>
    )
  } else {
    // full pitch
    inner = (
      <>
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * sw10} y={0} width={sw10} height={H} fill={i % 2 === 0 ? GREEN : LIGHT_GREEN} />)}
        <rect x={20} y={20} width={W - 40} height={H - 40} stroke={WHITE} strokeWidth={2} fill="none" />
        <rect x={20} y={20} width={W * 0.08} height={H - 40} stroke={WHITE} strokeWidth={2} fill="none" />
        <rect x={W - 20 - W * 0.08} y={20} width={W * 0.08} height={H - 40} stroke={WHITE} strokeWidth={2} fill="none" />
        <line x1={W / 2} y1={20} x2={W / 2} y2={H - 20} stroke={WHITE} strokeWidth={2} />
        <line x1={W / 2 - W * 0.09} y1={20} x2={W / 2 - W * 0.09} y2={H - 20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4" />
        <line x1={W / 2 + W * 0.09} y1={20} x2={W / 2 + W * 0.09} y2={H - 20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4" />
      </>
    )
  }

  if (flipped) {
    return <g transform={`translate(${W},0) scale(-1,1)`}>{inner}</g>
  }
  return <>{inner}</>
}

export interface DrillAnimationProps {
  canvasJson: CanvasState
  drillTitle?: string
}

export function DrillAnimationComp({ canvasJson, drillTitle }: DrillAnimationProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const elements = getInterpolatedElements(canvasJson, frame)
  return (
    <AbsoluteFill style={{ background: '#07080d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative' }}>
        <svg width={COMP_WIDTH} height={COMP_HEIGHT} viewBox={`0 0 ${COMP_WIDTH} ${COMP_HEIGHT}`} style={{ display: 'block', borderRadius: 8 }}>
          {/* Arrow marker defs must appear before the lines that reference them */}
          <ArrowDefs elements={elements} />
          <PitchSVG bg={canvasJson.background} flipped={canvasJson.pitchFlipped} />
          {elements.map(el => <RenderEl key={el.id} el={el} />)}
        </svg>
        {drillTitle && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
            padding: '6px 14px', borderRadius: 6, borderLeft: '3px solid #e8560a',
            color: '#e8e4dc', fontFamily: 'system-ui, sans-serif',
            fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {drillTitle}
          </div>
        )}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace', fontSize: 11, padding: '2px 6px', borderRadius: 4,
        }}>
          {(frame / fps).toFixed(1)}s
        </div>
      </div>
    </AbsoluteFill>
  )
}
