'use client'

import { useCallback, useState } from 'react'
import { Player } from '@remotion/player'
import { X, Download, Loader2, Check } from 'lucide-react'
import type { CanvasState } from './types'

// Local re-implementation of DrillAnimation for the Player (avoids cross-package deps)
// Must stay in sync with remotion/src/compositions/DrillAnimation.tsx

import { useCurrentFrame, useVideoConfig, AbsoluteFill } from 'remotion'

const CW = 900
const CH = 600
const GREEN = '#2d5a27'
const LIGHT_GREEN = '#357a2e'
const WHITE = '#ffffff'
const NUM_KEYS = ['x','y','x1','y1','x2','y2','width','height'] as const

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

type CE = CanvasState['elements'][number]

function getInterpolatedElements(state: CanvasState, frame: number): CE[] {
  const keyframes = state.keyframes
  if (!keyframes || keyframes.length === 0) return state.elements
  return state.elements.map(el => {
    const elKfs = keyframes.filter(k => k.elementStates?.[el.id])
    if (elKfs.length === 0) return el
    const before = [...elKfs].reverse().find(k => k.time <= frame)
    const after = elKfs.find(k => k.time > frame)
    if (!before && !after) return el
    if (!before) return { ...el, ...after!.elementStates[el.id] }
    if (!after) return { ...el, ...before.elementStates[el.id] }
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

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill={color} />
      </marker>
    </defs>
  )
}

function RenderEl({ el }: { el: CE }) {
  const color = el.color ?? '#ffffff'
  const mid = `arrow-${el.id}`
  switch (el.type) {
    case 'attacker':
      return (
        <g transform={`translate(${el.x},${el.y})`}>
          <circle r={16} fill={color} stroke="white" strokeWidth={1.5} />
          <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize={12} fontWeight="bold">{el.label ?? ''}</text>
        </g>
      )
    case 'defender':
      return (
        <g transform={`translate(${el.x},${el.y})`}>
          <rect x={-14} y={-14} width={28} height={28} fill={color} stroke="white" strokeWidth={1.5} rx={3} />
          <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize={12} fontWeight="bold">{el.label ?? ''}</text>
        </g>
      )
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
      if (el.x1 === undefined) return null
      return (
        <>
          <ArrowMarker id={mid} color={color} />
          <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={2.5} markerEnd={`url(#${mid})`} />
        </>
      )
    case 'line':
      if (el.x1 === undefined) return null
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={2} />
    case 'dotted':
      if (el.x1 === undefined) return null
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={2} strokeDasharray="4 6" />
    case 'zone':
      return <rect x={el.x} y={el.y} width={el.width ?? 120} height={el.height ?? 80} fill={color} stroke="rgba(239,68,68,0.6)" strokeWidth={1.5} />
    case 'text':
      return <text x={el.x} y={el.y} fill={color} fontSize={16} fontFamily="system-ui, sans-serif">{el.label}</text>
    default:
      return null
  }
}

function PitchSVG({ bg }: { bg: CanvasState['background'] }) {
  const sw10 = CW / 10
  const sw6 = CW / 6
  if (bg === 'blank') {
    const lines = []
    for (let x = 0; x <= CW; x += 50) lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={CH} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)
    for (let y = 0; y <= CH; y += 50) lines.push(<line key={`h${y}`} x1={0} y1={y} x2={CW} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)
    return <><rect x={0} y={0} width={CW} height={CH} fill="#1a1a2e" />{lines}</>
  }
  if (bg === 'half') {
    return (
      <>
        {Array.from({length:6},(_,i)=><rect key={i} x={i*sw6} y={0} width={sw6} height={CH} fill={i%2===0?GREEN:LIGHT_GREEN}/>)}
        <rect x={20} y={20} width={CW-40} height={CH-40} stroke={WHITE} strokeWidth={2} fill="none"/>
        <rect x={20} y={20} width={CW*0.14} height={CH-40} stroke={WHITE} strokeWidth={2} fill="none"/>
        <line x1={CW*0.5} y1={20} x2={CW*0.5} y2={CH-20} stroke={WHITE} strokeWidth={2} strokeDasharray="8 4"/>
        <line x1={CW*0.28} y1={20} x2={CW*0.28} y2={CH-20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4"/>
      </>
    )
  }
  if (bg === 'ingoal') {
    return (
      <>
        {Array.from({length:6},(_,i)=><rect key={i} x={i*sw6} y={0} width={sw6} height={CH} fill={i%2===0?GREEN:LIGHT_GREEN}/>)}
        <rect x={20} y={20} width={CW-40} height={CH-40} stroke={WHITE} strokeWidth={2} fill="none"/>
        <line x1={CW*0.2} y1={20} x2={CW*0.2} y2={CH-20} stroke={WHITE} strokeWidth={2}/>
        <line x1={CW*0.2} y1={CH/2-30} x2={CW*0.2} y2={CH/2+30} stroke="#f59e0b" strokeWidth={4}/>
        <line x1={CW*0.2-40} y1={CH/2-30} x2={CW*0.2+40} y2={CH/2-30} stroke="#f59e0b" strokeWidth={4}/>
      </>
    )
  }
  // full
  return (
    <>
      {Array.from({length:10},(_,i)=><rect key={i} x={i*sw10} y={0} width={sw10} height={CH} fill={i%2===0?GREEN:LIGHT_GREEN}/>)}
      <rect x={20} y={20} width={CW-40} height={CH-40} stroke={WHITE} strokeWidth={2} fill="none"/>
      <rect x={20} y={20} width={CW*0.08} height={CH-40} stroke={WHITE} strokeWidth={2} fill="none"/>
      <rect x={CW-20-CW*0.08} y={20} width={CW*0.08} height={CH-40} stroke={WHITE} strokeWidth={2} fill="none"/>
      <line x1={CW/2} y1={20} x2={CW/2} y2={CH-20} stroke={WHITE} strokeWidth={2}/>
      <line x1={CW/2-CW*0.09} y1={20} x2={CW/2-CW*0.09} y2={CH-20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4"/>
      <line x1={CW/2+CW*0.09} y1={20} x2={CW/2+CW*0.09} y2={CH-20} stroke={WHITE} strokeWidth={1} strokeDasharray="8 4"/>
    </>
  )
}

interface DrillAnimationProps {
  canvasJson: CanvasState
  drillTitle?: string
}

function DrillAnimationComp({ canvasJson, drillTitle }: DrillAnimationProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const elements = getInterpolatedElements(canvasJson, frame)
  return (
    <AbsoluteFill style={{ background: '#07080d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative' }}>
        <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ display: 'block', borderRadius: 8 }}>
          <PitchSVG bg={canvasJson.background} />
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

// ── Modal component ──────────────────────────────────────────────────────────

interface AnimationPreviewProps {
  canvasJson: CanvasState
  drillTitle?: string
  onClose: () => void
}

const isLocalDev = process.env.NODE_ENV === 'development'

export function AnimationPreview({ canvasJson, drillTitle, onClose }: AnimationPreviewProps) {
  const [rendering, setRendering] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const duration = canvasJson.duration ?? 90
  const slug = (drillTitle ?? 'drill').replace(/\s+/g, '-').toLowerCase()

  const handleDownload = useCallback(async () => {
    setRendering(true)
    setError(null)
    setDone(false)
    try {
      const res = await fetch('/api/drills/render-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasJson, drillTitle }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-animation.mp4`
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Render failed')
    } finally {
      setRendering(false)
    }
  }, [canvasJson, drillTitle, slug])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: 940, maxWidth: '95vw' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-white">{drillTitle ?? 'Drill Animation'}</p>
            <p className="text-[11px] text-zinc-500">
              {(canvasJson.keyframes ?? []).length} keyframes · {(duration / 30).toFixed(1)}s · 30fps
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLocalDev ? (
              <button
                onClick={handleDownload}
                disabled={rendering}
                className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors border disabled:opacity-60 disabled:cursor-not-allowed ${
                  done
                    ? 'bg-green-500/15 text-green-400 border-green-500/20'
                    : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 hover:text-amber-300 border-amber-500/20'
                }`}
              >
                {rendering ? <Loader2 size={12} className="animate-spin" /> : done ? <Check size={12} /> : <Download size={12} />}
                {rendering ? 'Rendering…' : done ? 'Downloaded!' : 'Download MP4'}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-600 cursor-default">
                <Download size={12} />
                MP4 export coming soon
              </span>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Player */}
        <div className="p-4 flex items-center justify-center bg-zinc-950">
          <Player
            component={DrillAnimationComp}
            inputProps={{ canvasJson, drillTitle }}
            durationInFrames={duration}
            compositionWidth={CW}
            compositionHeight={CH}
            fps={30}
            style={{ width: '100%', maxWidth: 900 }}
            controls
            loop
            autoPlay
          />
        </div>

        {/* Status bar */}
        {(error || rendering) && (
          <div className={`px-4 py-2.5 border-t border-zinc-800 text-[11px] ${error ? 'text-red-400 bg-red-400/5' : 'text-zinc-500 bg-zinc-900/50'}`}>
            {error ? `Error: ${error}` : 'Rendering — this takes around 10–30 seconds the first time while the compositor warms up…'}
          </div>
        )}
      </div>
    </div>
  )
}
