'use client'

import { useRef, useCallback } from 'react'
import { Play, Pause, Plus, Trash2 } from 'lucide-react'
import type { CanvasState, CanvasElement } from './types'

export const FPS = 30

function elementLabel(el: CanvasElement): string {
  switch (el.type) {
    case 'attacker': return `Att ${el.label ?? ''}`
    case 'defender': return `Def ${el.label ?? ''}`
    case 'cone':     return 'Cone'
    case 'ball':     return 'Ball'
    case 'arrow':    return 'Arrow'
    case 'line':     return 'Line'
    case 'dotted':   return 'Dotted'
    case 'zone':     return 'Zone'
    case 'text':     return el.label ?? 'Text'
    default:         return 'Element'
  }
}

interface TimelineProps {
  state: CanvasState
  currentFrame: number
  isPlaying: boolean
  onFrameChange: (frame: number) => void
  onAddKeyframe: () => void
  onDeleteKeyframe: (time: number) => void
  onTogglePlay: () => void
}

export function Timeline({
  state,
  currentFrame,
  isPlaying,
  onFrameChange,
  onAddKeyframe,
  onDeleteKeyframe,
  onTogglePlay,
}: TimelineProps) {
  const duration = state.duration ?? 90
  const keyframes = state.keyframes ?? []
  const rulerRef = useRef<HTMLDivElement>(null)

  const frameToPercent = (frame: number) => `${(frame / duration) * 100}%`
  const currentSeconds = (currentFrame / FPS).toFixed(1)
  const totalSeconds = (duration / FPS).toFixed(1)
  const hasKeyframeAtCurrent = keyframes.some(k => k.time === currentFrame)

  const seekFromX = useCallback((clientX: number) => {
    if (!rulerRef.current) return
    const rect = rulerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    onFrameChange(Math.min(Math.round((x / rect.width) * duration), duration))
  }, [duration, onFrameChange])

  function handleTrackMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    seekFromX(e.clientX)
    function onMove(me: MouseEvent) { seekFromX(me.clientX) }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Time markers: every 15f (0.5s), 30f (1s), or 60f (2s) based on duration
  const step = duration <= 60 ? 15 : duration <= 150 ? 30 : 60
  const markers: number[] = []
  for (let f = 0; f <= duration; f += step) markers.push(f)

  // Show up to 4 elements in the timeline
  const elements = state.elements.slice(0, 4)

  return (
    <div
      className="border-t border-zinc-800 bg-zinc-950 flex flex-col shrink-0"
      style={{ height: 172 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-zinc-800 shrink-0">
        <button
          onClick={onTogglePlay}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={11} /> : <Play size={11} />}
        </button>
        <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
          {currentSeconds}s / {totalSeconds}s
        </span>
        <span className="text-[10px] font-mono text-zinc-700">f{currentFrame}</span>
        <div className="flex-1" />
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold select-none">
          Keyframes
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          {hasKeyframeAtCurrent && (
            <button
              onClick={() => onDeleteKeyframe(currentFrame)}
              className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={10} />
              Delete
            </button>
          )}
          <button
            onClick={onAddKeyframe}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded font-medium transition-colors ${
              hasKeyframeAtCurrent
                ? 'text-amber-400 bg-amber-400/15 hover:bg-amber-400/25'
                : 'text-zinc-300 bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            <Plus size={10} />
            {hasKeyframeAtCurrent ? 'Update' : 'Add Keyframe'}
          </button>
        </div>
      </div>

      {/* Timeline tracks */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Ruler row */}
        <div className="flex shrink-0 h-6 border-b border-zinc-800">
          <div className="w-[72px] shrink-0 border-r border-zinc-800 flex items-center px-2">
            <span className="text-[9px] text-zinc-700 uppercase tracking-widest">Time</span>
          </div>
          <div
            ref={rulerRef}
            className="flex-1 relative bg-zinc-900/40 cursor-crosshair overflow-hidden"
            onMouseDown={handleTrackMouseDown}
          >
            {markers.map(f => (
              <div
                key={f}
                className="absolute top-0 flex flex-col items-center pointer-events-none"
                style={{ left: frameToPercent(f) }}
              >
                <div className="w-px h-3 bg-zinc-700" />
                <span className="text-[9px] text-zinc-600 leading-none mt-px whitespace-nowrap">
                  {(f / FPS).toFixed(f % 30 === 0 ? 0 : 1)}s
                </span>
              </div>
            ))}
            {/* Playhead on ruler */}
            <div
              className="absolute top-0 bottom-0 w-px bg-amber-400/80 pointer-events-none"
              style={{ left: frameToPercent(currentFrame) }}
            />
          </div>
        </div>

        {/* Element rows */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {elements.length === 0 ? (
            <div className="flex h-8 items-center">
              <div className="w-[72px] shrink-0 border-r border-zinc-800 h-full" />
              <div className="px-3 flex items-center h-full">
                <span className="text-[10px] text-zinc-700">
                  Add elements to the canvas to animate them
                </span>
              </div>
            </div>
          ) : (
            elements.map((el) => {
              const elKfs = keyframes.filter(k => k.elementStates[el.id])
              return (
                <div key={el.id} className="flex h-[28px] border-b border-zinc-900 shrink-0">
                  {/* Label */}
                  <div className="w-[72px] shrink-0 border-r border-zinc-800 flex items-center px-2">
                    <span className="text-[10px] text-zinc-500 truncate">{elementLabel(el)}</span>
                  </div>
                  {/* Track */}
                  <div
                    className="flex-1 relative cursor-crosshair overflow-hidden"
                    onMouseDown={handleTrackMouseDown}
                  >
                    {/* Track baseline */}
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                      <div className="w-full h-px bg-zinc-800" />
                    </div>

                    {/* Keyframe diamonds */}
                    {elKfs.map(kf => (
                      <div
                        key={kf.time}
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 cursor-pointer z-10 border transition-all ${
                          kf.time === currentFrame
                            ? 'bg-amber-400 border-amber-300 shadow-[0_0_5px_rgba(251,191,36,0.6)]'
                            : 'bg-zinc-500 border-zinc-400 hover:bg-white hover:border-white hover:scale-125'
                        }`}
                        style={{ left: frameToPercent(kf.time) }}
                        onClick={(e) => { e.stopPropagation(); onFrameChange(kf.time) }}
                        title={`Keyframe at ${(kf.time / FPS).toFixed(2)}s (f${kf.time})`}
                      />
                    ))}

                    {/* Playhead line */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-amber-400/30 pointer-events-none"
                      style={{ left: frameToPercent(currentFrame) }}
                    />
                  </div>
                </div>
              )
            })
          )}

          {/* Overflow notice */}
          {state.elements.length > 4 && (
            <div className="flex h-6 items-center">
              <div className="w-[72px] shrink-0 border-r border-zinc-800 h-full" />
              <span className="px-3 text-[10px] text-zinc-700">
                +{state.elements.length - 4} more elements
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Full-height playhead overlay (covers ruler + rows) */}
      <div
        className="pointer-events-none absolute bottom-0 z-20"
        style={{
          left: `calc(72px + ${frameToPercent(currentFrame)})`,
          // height covers from ruler row down — approximation, won't be pixel perfect
        }}
      />
    </div>
  )
}
