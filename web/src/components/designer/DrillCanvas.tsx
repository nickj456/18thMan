'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Stage, Layer, Arrow, Line } from 'react-konva'
import type Konva from 'konva'
import { PitchBackgroundLayer } from './PitchBackground'
import { CanvasElements } from './CanvasElements'
import { Toolbar } from './Toolbar'
import { CANVAS_WIDTH, CANVAS_HEIGHT, DRAW_TOOLS, type CanvasElement, type CanvasState, type ToolType } from './types'
import { nanoid } from 'nanoid'

function makeElement(tool: ToolType, x: number, y: number, count: number): CanvasElement {
  const base = { id: nanoid(), type: tool, x, y }
  switch (tool) {
    case 'attacker': return { ...base, color: '#ef4444', label: String(count) }
    case 'defender': return { ...base, color: '#3b82f6', label: String(count) }
    case 'cone':     return { ...base, color: '#f59e0b' }
    case 'ball':     return { ...base, color: '#92400e' }
    case 'zone':     return { ...base, x, y, color: 'rgba(239,68,68,0.15)', width: 120, height: 80 }
    case 'text':     return { ...base, label: 'Label', color: '#ffffff' }
    default:         return base
  }
}

function defaultLineColor(tool: ToolType) {
  if (tool === 'arrow') return '#22c55e'
  return '#a3a3a3'
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
  stageRef,
}: DrillCanvasProps) {
  const attackerCount = useRef(0)
  const defenderCount = useRef(0)
  const [drawingEl, setDrawingEl] = useState<DrawingState | null>(null)
  // Store all editing data directly — don't look up from state.elements (timing issues)
  const [editingText, setEditingText] = useState<EditingText | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea whenever a new text edit session starts
  useEffect(() => {
    if (editingText) {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [editingText?.id])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) handleDelete()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        onUndo()
      }
      if (e.key === 'Escape') {
        onSelectId(null)
        onToolChange('select')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  function getPos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()?.getPointerPosition() ?? null
  }

  // ── Click-to-place (non-draw tools) ──────────────────────────────────────
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (DRAW_TOOLS.includes(activeTool)) return   // handled by mousedown/up
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

    const el = makeElement(activeTool, pos.x, pos.y, count)
    onStateChange({ ...state, elements: [...state.elements, el] })
    onSelectId(el.id)

    if (activeTool === 'text') {
      // Set editing data directly — don't look up from state (parent hasn't re-rendered yet)
      setEditingText({ id: el.id, x: el.x, y: el.y, label: 'Label', color: '#ffffff' })
    }
  }, [activeTool, state, onStateChange, onSelectId])

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
  }, [activeTool, onSelectId])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawingEl) return
    const pos = getPos(e)
    if (!pos) return
    setDrawingEl((d) => d ? { ...d, x2: pos.x, y2: pos.y } : null)
  }, [drawingEl])

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

  function handleElementChange(updated: CanvasElement) {
    onStateChange({
      ...state,
      elements: state.elements.map((el) => el.id === updated.id ? updated : el),
    })
  }

  function handleDelete() {
    if (!selectedId) return
    onStateChange({ ...state, elements: state.elements.filter((el) => el.id !== selectedId) })
    onSelectId(null)
  }

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

  return (
    <div className="flex flex-1 overflow-hidden">
      <Toolbar
        activeTool={activeTool}
        onToolChange={onToolChange}
        background={state.background}
        onBackgroundChange={(bg) => onStateChange({ ...state, background: bg })}
        pitchFlipped={state.pitchFlipped ?? false}
        onFlipPitch={() => onStateChange({ ...state, pitchFlipped: !state.pitchFlipped })}
        hasSelection={!!selectedId}
        onDelete={handleDelete}
        onUndo={onUndo}
        onClear={onClear}
        canUndo={canUndo}
        hasElements={state.elements.length > 0}
        selectedElement={state.elements.find(e => e.id === selectedId) ?? null}
        onElementChange={handleElementChange}
      />

      <div className="flex-1 overflow-auto bg-zinc-950 flex items-center justify-center p-4">
        <div style={{ position: 'relative', cursor: activeTool === 'select' ? 'default' : isDraw ? 'crosshair' : 'copy' }}>
          {/* Text editing overlay — absolutely positioned over the canvas */}
          {editingText && (
            <textarea
              key={editingText.id}
              ref={textareaRef}
              rows={1}
              style={{
                position: 'absolute',
                left: editingText.x,
                top: editingText.y - 2,
                minWidth: 80,
                fontSize: 15,
                fontWeight: 'bold',
                fontFamily: 'sans-serif',
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
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleStageClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <Layer>
              <PitchBackgroundLayer type={state.background} flipped={state.pitchFlipped} />
            </Layer>
            <Layer>
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
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Status bar */}
      <div className="absolute bottom-2 left-16 flex gap-3 text-[11px] text-zinc-500 pointer-events-none select-none">
        <span>{attackers} att · {defenders} def · {state.elements.length} total</span>
        {activeTool !== 'select' && isDraw && (
          <span className="text-zinc-400">Click and drag to draw · Esc to cancel</span>
        )}
        {activeTool !== 'select' && !isDraw && !editingText && (
          <span className="text-zinc-400">Click canvas to place · Esc to cancel</span>
        )}
        {selectedId && !editingText && (
          <span className="text-zinc-400">Del to delete · double-click text to edit</span>
        )}
        {editingText && (
          <span className="text-zinc-400">Type your label · Enter or click away to save · Esc to cancel</span>
        )}
      </div>
    </div>
  )
}
