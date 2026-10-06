'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Arrow, Line, Shape } from 'react-konva'
import type Konva from 'konva'
import { PitchBackgroundLayer } from './PitchBackground'
import { CanvasElements } from './CanvasElements'
import { Toolbar } from './Toolbar'
import { CANVAS_WIDTH, CANVAS_HEIGHT, DRAW_TOOLS, type CanvasElement, type CanvasState, type PlayerSize, type ToolType } from './types'
import { TOOL_COLORS } from './tools'
import { resolveDesignerKey } from './keyboard'
import { nanoid } from 'nanoid'

// ── Kick arc preview — shown while dragging to draw ──────────────────────────
function KickPreview({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const cpx = (x1 + x2) / 2
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const arcLift = Math.max(45, dist * 0.46)
  const cpy = (y1 + y2) / 2 - arcLift
  const angle = Math.atan2(y2 - cpy, x2 - cpx)
  const arrowLen = 13

  return (
    <Shape
      sceneFunc={(ctx, shape) => {
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.quadraticCurveTo(cpx, cpy, x2, y2)
        ctx.strokeShape(shape)
        ctx.restore()

        ctx.beginPath()
        ctx.moveTo(x2, y2)
        ctx.lineTo(x2 - arrowLen * Math.cos(angle - Math.PI / 6), y2 - arrowLen * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(x2 - arrowLen * Math.cos(angle + Math.PI / 6), y2 - arrowLen * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()

        ctx.save()
        ctx.translate(cpx, cpy)
        ctx.beginPath()
        ctx.moveTo(-10, 0)
        ctx.bezierCurveTo(-6, -6.5, 6, -6.5, 10, 0)
        ctx.bezierCurveTo(6, 6.5, -6, 6.5, -10, 0)
        ctx.closePath()
        ctx.fillStyle = 'rgba(245,245,240,0.9)'
        ctx.fill()
        ctx.setLineDash([])
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.restore()
      }}
      stroke={color}
      strokeWidth={2.5}
      dash={[7, 4]}
      opacity={0.7}
      listening={false}
    />
  )
}

// Piece colours come from TOOL_COLORS so the rail glyphs always match what lands on the pitch.
export function makeElement(tool: ToolType, x: number, y: number, count: number, size: PlayerSize = 'md'): CanvasElement {
  const base = { id: nanoid(), type: tool, x, y }
  switch (tool) {
    case 'attacker': return { ...base, color: TOOL_COLORS.attacker, label: String(count), size }
    case 'defender': return { ...base, color: TOOL_COLORS.defender, label: String(count), size }
    case 'cone':     return { ...base, color: TOOL_COLORS.cone }
    case 'ball':     return { ...base, color: '#92400e' } // stored but unused: the ball is always drawn white
    case 'tackle-bag':    return { ...base, color: TOOL_COLORS['tackle-bag'] }
    case 'tackle-shield': return { ...base, color: TOOL_COLORS['tackle-shield'] }
    case 'flag':          return { ...base, color: TOOL_COLORS.flag }
    case 'disc':          return { ...base, color: TOOL_COLORS.disc }
    case 'agility-ladder':
      return { ...base, color: TOOL_COLORS['agility-ladder'], width: 40, height: 160 }
    case 'zone':     return { ...base, x, y, color: 'rgba(239,68,68,0.15)', width: 120, height: 80 }
    case 'text':     return { ...base, label: 'Label', color: '#ffffff' }
    default:         return base
  }
}

export function defaultLineColor(tool: ToolType) {
  if (tool === 'arrow') return TOOL_COLORS.arrow
  if (tool === 'kick')  return TOOL_COLORS.kick
  return TOOL_COLORS.line
}

interface DrawingState {
  id: string
  type: ToolType
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

interface EditingText {
  id: string
  x: number
  y: number
  label: string
  color: string
}

interface DrillCanvasProps {
  state: CanvasState
  selectedId: string | null
  activeTool: ToolType
  onStateChange: (next: CanvasState) => void
  onSelectId: (id: string | null) => void
  onToolChange: (tool: ToolType) => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
  /** True while an animation plays: editing actions are shown disabled, not just ignored. */
  locked?: boolean
  stageRef: React.RefObject<Konva.Stage | null>
}

export function DrillCanvas({
  state,
  selectedId,
  activeTool,
  onStateChange,
  onSelectId,
  onToolChange,
  onUndo,
  onClear,
  canUndo,
  locked = false,
  stageRef,
}: DrillCanvasProps) {
  const attackerCount = useRef(0)
  const defenderCount = useRef(0)
  const [defaultPlayerSize, setDefaultPlayerSize] = useState<PlayerSize>('md')
  const [drawingEl, setDrawingEl] = useState<DrawingState | null>(null)
  // Store all editing data directly — don't look up from state.elements (timing issues)
  const [editingText, setEditingText] = useState<EditingText | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // Fit canvas to available container space on desktop
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const availW = width - 32
      const availH = height - 32
      const s = Math.min(availW / CANVAS_WIDTH, availH / CANVAS_HEIGHT)
      setScale(Math.max(0.3, s))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Focus textarea whenever a new text edit session starts
  useEffect(() => {
    if (editingText) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [editingText?.id])

  // Works for mouse, touch, and Apple Pencil — getPointerPosition() normalises all three.
  // In 3D mode we inverse the Konva Group transform so newly-placed elements land at
  // the correct canvas-logical position (the Group handles hit-testing for existing
  // elements automatically via its own inverse transform).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getPos = useCallback((e: Konva.KonvaEventObject<any>) => {
    const pos = e.target.getStage()?.getPointerPosition() ?? null
    if (!pos) return null
    return { x: pos.x / scale, y: pos.y / scale }
  }, [scale])

  // ── Click/Tap-to-place (non-draw tools) ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<any>) => {
    if (DRAW_TOOLS.includes(activeTool)) return   // handled by down/up
    if (activeTool === 'select') {
      if (e.target === e.target.getStage()) onSelectId(null)
      return
    }
    const pos = getPos(e)
    if (!pos) return

    if (activeTool === 'attacker') attackerCount.current++
    if (activeTool === 'defender') defenderCount.current++
    const count = activeTool === 'attacker' ? attackerCount.current
                : activeTool === 'defender' ? defenderCount.current : 0

    const el = makeElement(activeTool, pos.x, pos.y, count, defaultPlayerSize)
    onStateChange({ ...state, elements: [...state.elements, el] })
    onSelectId(el.id)

    if (activeTool === 'text') {
      // Set editing data directly — don't look up from state (parent hasn't re-rendered yet)
      setEditingText({ id: el.id, x: el.x, y: el.y, label: 'Label', color: '#ffffff' })
    }
  }, [activeTool, state, onStateChange, onSelectId, defaultPlayerSize, getPos])

  // ── Drag-to-draw (arrow / line / dotted) ─────────────────────────────────
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!DRAW_TOOLS.includes(activeTool)) return
    const pos = getPos(e)
    if (!pos) return
    setDrawingEl({
      id: 'preview',
      type: activeTool,
      x1: pos.x, y1: pos.y,
      x2: pos.x, y2: pos.y,
      color: defaultLineColor(activeTool),
    })
    onSelectId(null)
  }, [activeTool, onSelectId, getPos])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawingEl) return
    const pos = getPos(e)
    if (!pos) return
    setDrawingEl((d) => d ? { ...d, x2: pos.x, y2: pos.y } : null)
  }, [drawingEl, getPos])

  const handleMouseUp = useCallback(() => {
    if (!drawingEl) return
    const dx = drawingEl.x2 - drawingEl.x1
    const dy = drawingEl.y2 - drawingEl.y1
    if (Math.sqrt(dx * dx + dy * dy) > 12) {
      const el: CanvasElement = {
        id: nanoid(),
        type: drawingEl.type,
        x: 0, y: 0,
        x1: drawingEl.x1, y1: drawingEl.y1,
        x2: drawingEl.x2, y2: drawingEl.y2,
        color: drawingEl.color,
      }
      onStateChange({ ...state, elements: [...state.elements, el] })
      onSelectId(el.id)
    }
    setDrawingEl(null)
  }, [drawingEl, state, onStateChange, onSelectId])

  // ── Touch/Apple Pencil draw handlers ─────────────────────────────────────
  const handleTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!DRAW_TOOLS.includes(activeTool)) return
    // Prevent scroll/zoom while drawing
    e.evt.preventDefault()
    const pos = getPos(e)
    if (!pos) return
    setDrawingEl({
      id: 'preview',
      type: activeTool,
      x1: pos.x, y1: pos.y,
      x2: pos.x, y2: pos.y,
      color: defaultLineColor(activeTool),
    })
    onSelectId(null)
  }, [activeTool, onSelectId, getPos])

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!drawingEl) return
    e.evt.preventDefault()
    const pos = getPos(e)
    if (!pos) return
    setDrawingEl((d) => d ? { ...d, x2: pos.x, y2: pos.y } : null)
  }, [drawingEl, getPos])

  function handleElementChange(updated: CanvasElement) {
    onStateChange({
      ...state,
      elements: state.elements.map((el) => el.id === updated.id ? updated : el),
    })
  }

  function handlePlayerSizeChange(size: PlayerSize) {
    setDefaultPlayerSize(size)
    if (selectedId) {
      const el = state.elements.find(e => e.id === selectedId)
      if (el && (el.type === 'attacker' || el.type === 'defender')) {
        handleElementChange({ ...el, size })
      }
    }
  }

  function handleDelete() {
    // The selection can outlive its piece (e.g. after an undo); don't spend a history slot on a no-op.
    if (!selectedId || !state.elements.some((el) => el.id === selectedId)) return
    onStateChange({ ...state, elements: state.elements.filter((el) => el.id !== selectedId) })
    onSelectId(null)
  }

  // Keyboard shortcuts. The guards live in keyboard.ts (unit-tested); the listener is
  // registered once and reads the latest handlers through a ref, so it isn't torn
  // down and re-added on every playback frame.
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      const action = resolveDesignerKey(e, rootRef.current)
      if (!action) return
      switch (action.type) {
        case 'delete':
          handleDelete()
          return
        case 'undo':
          e.preventDefault()
          onUndo()
          return
        case 'cancel':
          setDrawingEl(null)
          onSelectId(null)
          onToolChange('select')
          return
        case 'tool':
          e.preventDefault()
          onToolChange(action.tool)
          return
      }
    }
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  function startTextEdit(id: string) {
    const el = state.elements.find((e) => e.id === id)
    if (!el) return
    // For circle elements (attacker/defender) offset overlay to centre of the icon
    const isCircle = el.type === 'attacker' || el.type === 'defender'
    const defaultLabel = isCircle ? (el.label ?? '') : (el.label ?? 'Label')
    setEditingText({ id, x: el.x - (isCircle ? 18 : 0), y: el.y - (isCircle ? 12 : 0), label: defaultLabel, color: el.color ?? '#ffffff' })
    onSelectId(id)
  }

  function finishTextEdit(value: string | null) {
    if (editingText && value !== null) {
      const el = state.elements.find(e => e.id === editingText.id)
      const isCircle = el?.type === 'attacker' || el?.type === 'defender'
      const trimmed = value.trim()
      const finalLabel = isCircle ? (trimmed || el?.label || '') : (trimmed || 'Label')
      onStateChange({
        ...state,
        elements: state.elements.map((e) =>
          e.id === editingText.id ? { ...e, label: finalLabel } : e
        ),
      })
    }
    setEditingText(null)
  }

  const attackers = state.elements.filter((e) => e.type === 'attacker').length
  const defenders = state.elements.filter((e) => e.type === 'defender').length
  const isDraw = DRAW_TOOLS.includes(activeTool)
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  return (
    <div ref={rootRef} className="flex flex-1 overflow-hidden">
      <Toolbar
        activeTool={activeTool}
        onToolChange={onToolChange}
        background={state.background}
        onBackgroundChange={(bg) => onStateChange({ ...state, background: bg })}
        pitchFlipped={state.pitchFlipped ?? false}
        onFlipPitch={() => onStateChange({ ...state, pitchFlipped: !state.pitchFlipped })}
        playerSize={defaultPlayerSize}
        onPlayerSizeChange={handlePlayerSizeChange}
        hasSelection={!locked && !!selectedId}
        onDelete={handleDelete}
        onUndo={onUndo}
        onClear={onClear}
        canUndo={canUndo}
        hasElements={!locked && state.elements.length > 0}
      />

      <div ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-auto bg-background p-4">
        <div style={{
          position: 'relative',
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
          cursor: activeTool === 'select' ? 'default' : isDraw ? 'crosshair' : 'copy',
        }}>
          {/* Text editing overlay — absolutely positioned over the canvas */}
          {editingText && (
            <textarea
              key={editingText.id}
              ref={textareaRef}
              rows={1}
              style={{
                position: 'absolute',
                left: editingText.x * scale,
                top: (editingText.y - 2) * scale,
                minWidth: 80,
                fontSize: 15,
                fontWeight: 'bold',
                fontFamily: 'var(--font-sans)',
                color: editingText.color,
                background: 'rgba(0,0,0,0.75)',
                border: '1px dashed rgba(255,255,255,0.6)',
                borderRadius: 3,
                outline: 'none',
                padding: '1px 4px',
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.5',
                zIndex: 20,
                whiteSpace: 'pre',
                boxSizing: 'border-box',
              }}
              defaultValue={editingText.label}
              onBlur={(e) => finishTextEdit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  finishTextEdit((e.target as HTMLTextAreaElement).value)
                }
                if (e.key === 'Escape') {
                  finishTextEdit(null)
                }
              }}
              onInput={(e) => {
                const ta = e.target as HTMLTextAreaElement
                ta.style.width = 'auto'
                ta.style.width = Math.max(80, ta.scrollWidth) + 'px'
              }}
            />
          )}
          <Stage
            ref={stageRef}
            width={CANVAS_WIDTH * scale}
            height={CANVAS_HEIGHT * scale}
            scaleX={scale}
            scaleY={scale}
            onClick={handleStageClick}
            onTap={handleStageClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <Layer>
              <PitchBackgroundLayer type={state.background} flipped={state.pitchFlipped} />
            </Layer>
            {/* Pieces only take pointer events in Select mode: a draw or placement
                gesture that starts on top of a piece must not also drag it. */}
            <Layer listening={activeTool === 'select'}>
                <CanvasElements
                  elements={state.elements}
                  selectedId={selectedId}
                  editingTextId={editingText?.id ?? null}
                  onSelect={onSelectId}
                  onChange={handleElementChange}
                  onEditText={startTextEdit}
                />
                {/* Live preview while drawing */}
                {drawingEl && drawingEl.type === 'arrow' && (
                  <Arrow
                    points={[drawingEl.x1, drawingEl.y1, drawingEl.x2, drawingEl.y2]}
                    stroke={drawingEl.color}
                    fill={drawingEl.color}
                    strokeWidth={2.5}
                    pointerLength={12}
                    pointerWidth={9}
                    opacity={0.7}
                    listening={false}
                  />
                )}
                {drawingEl && (drawingEl.type === 'line' || drawingEl.type === 'dotted') && (
                  <Line
                    points={[drawingEl.x1, drawingEl.y1, drawingEl.x2, drawingEl.y2]}
                    stroke={drawingEl.color}
                    strokeWidth={2}
                    dash={drawingEl.type === 'dotted' ? [4, 6] : undefined}
                    opacity={0.7}
                    listening={false}
                  />
                )}
                {drawingEl && drawingEl.type === 'kick' && (
                  <KickPreview
                    x1={drawingEl.x1} y1={drawingEl.y1}
                    x2={drawingEl.x2} y2={drawingEl.y2}
                    color={drawingEl.color}
                  />
                )}
            </Layer>
          </Stage>
        </div>

        {/* Status bar: pinned inside the canvas area so it never overlaps the rail */}
        <div className="pointer-events-none absolute bottom-2 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground select-none">
          <span>{attackers} att · {defenders} def · {state.elements.length} total</span>
          {activeTool !== 'select' && isDraw && (
            <span className="text-foreground/80">{isTouch ? 'Drag to draw · Apple Pencil supported' : 'Click and drag to draw · Esc to cancel'}</span>
          )}
          {activeTool !== 'select' && !isDraw && !editingText && (
            <span className="text-foreground/80">{isTouch ? 'Tap canvas to place' : 'Click canvas to place · Esc to cancel'}</span>
          )}
          {selectedId && !editingText && (
            <span className="text-foreground/80">Del to delete · double-click text to edit</span>
          )}
          {editingText && (
            <span className="text-foreground/80">Type your label · Enter or click away to save · Esc to cancel</span>
          )}
        </div>
      </div>
    </div>
  )
}
