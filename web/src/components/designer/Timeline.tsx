'use client'

import { useRef, useCallback } from 'react'
import { Play, Pause, Plus, Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CanvasState, CanvasElement } from './types'
import { TOOL_META } from './tools'

export const FPS = 30

export const DURATION_OPTIONS = [
  { label: '3s', frames: 90 },
  { label: '5s', frames: 150 },
  { label: '8s', frames: 240 },
  { label: '10s', frames: 300 },
  { label: '15s', frames: 450 },
  { label: '20s', frames: 600 },
]

const HEADER_HEIGHT = 36
const RULER_HEIGHT = 24
const ROW_HEIGHT = 28
const MAX_ROWS = 6
const OVERFLOW_HEIGHT = 24

function elementLabel(el: CanvasElement): string {
  switch (el.type) {
    case 'attacker': return `Att ${el.label ?? ''}`.trim()
    case 'defender': return `Def ${el.label ?? ''}`.trim()
    case 'text':     return el.label ?? 'Label'
    default:         return TOOL_META[el.type]?.label ?? 'Element'
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
  onDurationChange: (frames: number) => void
}

export function Timeline({
  state,
  currentFrame,
  isPlaying,
  onFrameChange,
  onAddKeyframe,
  onDeleteKeyframe,
  onTogglePlay,
  onDurationChange,
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
    // Pause before seeking so RAF loop doesn't overwrite the new frame
    if (isPlaying) onTogglePlay()
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

  const elements = state.elements

  // Header + ruler + one row per element (at least one, at most six) + the overflow notice
  const rowCount = Math.max(1, Math.min(elements.length, MAX_ROWS))
  const panelHeight = HEADER_HEIGHT + RULER_HEIGHT + rowCount * ROW_HEIGHT + (elements.length > MAX_ROWS ? OVERFLOW_HEIGHT : 0)

  return (
    <div
      role="region"
      aria-label="Animation timeline"
      className="flex shrink-0 flex-col border-t border-border bg-background"
      style={{ height: panelHeight }}
    >
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {currentSeconds}s / {totalSeconds}s
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">f{currentFrame}</span>
        <div className="mx-1 h-3.5 w-px bg-border" />
        {/* Duration selector */}
        <div className="relative flex items-center">
          <select
            aria-label="Animation duration"
            value={duration}
            onChange={e => onDurationChange(Number(e.target.value))}
            className="h-6 cursor-pointer appearance-none rounded-md border border-input bg-transparent pr-6 pl-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            {DURATION_OPTIONS.map(opt => (
              <option key={opt.frames} value={opt.frames}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={11} aria-hidden className="pointer-events-none absolute right-1.5 text-muted-foreground" />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          {hasKeyframeAtCurrent && (
            <Button
              size="xs"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDeleteKeyframe(currentFrame)}
            >
              <Trash2 />
              Delete keyframe
            </Button>
          )}
          <Button
            size="xs"
            variant={hasKeyframeAtCurrent ? 'outline' : 'secondary'}
            onClick={onAddKeyframe}
            className={cn(hasKeyframeAtCurrent && 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}
          >
            <Plus />
            {hasKeyframeAtCurrent ? 'Update keyframe' : 'Add keyframe'}
          </Button>
        </div>
      </div>

      {/* Timeline tracks */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Ruler row */}
        <div className="flex h-6 shrink-0 border-b border-border">
          <div className="flex w-20 shrink-0 items-center border-r border-border px-2">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground/70 uppercase">Time</span>
          </div>
          <div
            ref={rulerRef}
            className="relative flex-1 cursor-crosshair overflow-hidden bg-muted/30"
            onMouseDown={handleTrackMouseDown}
          >
            {markers.map(f => (
              <div
                key={f}
                className="pointer-events-none absolute top-0 flex flex-col items-center"
                style={{ left: frameToPercent(f) }}
              >
                <div className="h-2.5 w-px bg-border" />
                <span className="mt-px font-mono text-[10px] leading-none whitespace-nowrap text-muted-foreground/70 tabular-nums">
                  {(f / FPS).toFixed(f % 30 === 0 ? 0 : 1)}s
                </span>
              </div>
            ))}
            {/* Playhead on ruler */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary"
              style={{ left: frameToPercent(currentFrame) }}
            />
          </div>
        </div>

        {/* Element rows */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          {elements.length === 0 ? (
            <div className="flex h-7 items-center">
              <div className="h-full w-20 shrink-0 border-r border-border" />
              <div className="flex h-full items-center px-3">
                <span className="text-xs text-muted-foreground">
                  Add elements to the canvas to animate them
                </span>
              </div>
            </div>
          ) : (
            elements.map((el) => {
              const elKfs = keyframes.filter(k => k.elementStates[el.id])
              return (
                <div key={el.id} className="flex h-7 shrink-0 border-b border-border/50">
                  {/* Label */}
                  <div className="flex w-20 shrink-0 items-center border-r border-border px-2">
                    <span className="truncate text-xs text-muted-foreground">{elementLabel(el)}</span>
                  </div>
                  {/* Track */}
                  <div
                    className="relative flex-1 cursor-crosshair overflow-hidden"
                    onMouseDown={handleTrackMouseDown}
                  >
                    {/* Track baseline */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 left-0 flex items-center">
                      <div className="h-px w-full bg-border" />
                    </div>

                    {/* Keyframe diamonds: real buttons so they can be reached by keyboard */}
                    {elKfs.map(kf => (
                      <button
                        key={kf.time}
                        type="button"
                        aria-label={`Keyframe at ${(kf.time / FPS).toFixed(2)}s`}
                        aria-current={kf.time === currentFrame ? 'true' : undefined}
                        className={cn(
                          'absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border transition-transform',
                          'before:absolute before:-inset-2 before:content-[""]',
                          'focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none',
                          kf.time === currentFrame
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground bg-muted-foreground/60 hover:scale-125 hover:border-foreground hover:bg-foreground',
                        )}
                        style={{ left: frameToPercent(kf.time) }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onFrameChange(kf.time) }}
                      />
                    ))}

                    {/* Playhead line */}
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary/40"
                      style={{ left: frameToPercent(currentFrame) }}
                    />
                  </div>
                </div>
              )
            })
          )}

          {/* Overflow notice */}
          {elements.length > MAX_ROWS && (
            <div className="flex h-6 items-center">
              <div className="h-full w-20 shrink-0 border-r border-border" />
              <span className="px-3 text-xs text-muted-foreground">
                +{elements.length - MAX_ROWS} more (all animated)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
