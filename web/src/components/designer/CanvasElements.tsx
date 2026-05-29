'use client'

import { Circle, Ellipse, Rect, Arrow, Line, Text, Group, Shape } from 'react-konva'
import type Konva from 'konva'
import type { CanvasElement } from './types'

// ── Shared handle styles ─────────────────────────────────────────────────────
const HANDLE_RADIUS = 7
const HANDLE_FILL = '#fff'
const HANDLE_STROKE = '#6366f1'
const HANDLE_STROKE_WIDTH = 2

// ── Player icon sizing ───────────────────────────────────────────────────────
const PLAYER_RADIUS: Record<'sm' | 'md' | 'lg', number> = { sm: 13, md: 18, lg: 24 }
const PLAYER_FONT:   Record<'sm' | 'md' | 'lg', number> = { sm: 10, md: 13, lg: 16 }

// Counteracts the outer ThreeDWrapper Group's scaleY (0.70) so player icons,
// the ball, cones, and text render as proper shapes rather than squished ellipses.
// Lines and zones are intentionally left compressed — they follow pitch perspective.
const INV_3D_SCALE_Y = 1 / 0.70

// ── Rugby league ball (Steeden-style) ────────────────────────────────────────
function RugbyBall({ el, selected, onSelect, onChange, is3D }: ElementProps) {
  const rx = 26
  const ry = 17

  return (
    <Group
      x={el.x}
      y={el.y}
      scaleY={is3D ? INV_3D_SCALE_Y : 1}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
    >

      {/* Ground shadow in 3D mode */}
      {is3D && (
        <Ellipse
          x={4} y={ry + 6}
          radiusX={rx * 0.85} radiusY={ry * 0.28}
          fill="rgba(0,0,0,0.35)"
          listening={false}
        />
      )}

      {/* Main body */}
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()
          ctx.moveTo(-rx, 0)
          ctx.bezierCurveTo(-rx * 0.6, -ry, rx * 0.6, -ry, rx, 0)
          ctx.bezierCurveTo(rx * 0.6, ry, -rx * 0.6, ry, -rx, 0)
          ctx.closePath()
          ctx.fillStrokeShape(shape)
        }}
        fill={is3D ? undefined : '#f5f5f0'}
        fillLinearGradientStartPoint={is3D ? { x: -rx, y: -ry } : undefined}
        fillLinearGradientEndPoint={is3D ? { x: rx * 0.3, y: ry } : undefined}
        fillLinearGradientColorStops={is3D ? [0, '#ffffff', 0.4, '#f5f5f0', 1, '#d4d4c8'] : undefined}
        stroke={selected ? '#6366f1' : '#1a1a1a'}
        strokeWidth={selected ? 2 : 1.5}
      />

      {/* Left red chevrons */}
      <Shape
        sceneFunc={(ctx) => {
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(-rx, 0)
          ctx.bezierCurveTo(-rx * 0.6, -ry, rx * 0.6, -ry, rx, 0)
          ctx.bezierCurveTo(rx * 0.6, ry, -rx * 0.6, ry, -rx, 0)
          ctx.closePath()
          ctx.clip()

          ctx.beginPath()
          ctx.moveTo(-rx + 2, -6)
          ctx.lineTo(-rx * 0.3, -ry + 3)
          ctx.lineTo(-rx * 0.3 + 5, -ry + 3)
          ctx.lineTo(-rx + 7, -6)
          ctx.closePath()
          ctx.fillStyle = '#dc2626'
          ctx.fill()

          ctx.beginPath()
          ctx.moveTo(-rx + 2, 6)
          ctx.lineTo(-rx * 0.3, ry - 3)
          ctx.lineTo(-rx * 0.3 + 5, ry - 3)
          ctx.lineTo(-rx + 7, 6)
          ctx.closePath()
          ctx.fillStyle = '#dc2626'
          ctx.fill()

          ctx.beginPath()
          ctx.moveTo(-rx + 7, -5)
          ctx.lineTo(-rx * 0.3 + 6, -ry + 5)
          ctx.lineTo(-rx * 0.3 + 10, -ry + 5)
          ctx.lineTo(-rx + 11, -5)
          ctx.closePath()
          ctx.fillStyle = '#ea580c'
          ctx.fill()

          ctx.beginPath()
          ctx.moveTo(-rx + 7, 5)
          ctx.lineTo(-rx * 0.3 + 6, ry - 5)
          ctx.lineTo(-rx * 0.3 + 10, ry - 5)
          ctx.lineTo(-rx + 11, 5)
          ctx.closePath()
          ctx.fillStyle = '#ea580c'
          ctx.fill()

          ctx.beginPath()
          ctx.moveTo(rx - 2, -6)
          ctx.lineTo(rx * 0.3, -ry + 3)
          ctx.lineTo(rx * 0.3 - 5, -ry + 3)
          ctx.lineTo(rx - 7, -6)
          ctx.closePath()
          ctx.fillStyle = '#dc2626'
          ctx.fill()

          ctx.beginPath()
          ctx.moveTo(rx - 2, 6)
          ctx.lineTo(rx * 0.3, ry - 3)
          ctx.lineTo(rx * 0.3 - 5, ry - 3)
          ctx.lineTo(rx - 7, 6)
          ctx.closePath()
          ctx.fillStyle = '#dc2626'
          ctx.fill()

          ctx.beginPath()
          ctx.moveTo(rx - 7, -5)
          ctx.lineTo(rx * 0.3 - 6, -ry + 5)
          ctx.lineTo(rx * 0.3 - 10, -ry + 5)
          ctx.lineTo(rx - 11, -5)
          ctx.closePath()
          ctx.fillStyle = '#ea580c'
          ctx.fill()

          ctx.beginPath()
          ctx.moveTo(rx - 7, 5)
          ctx.lineTo(rx * 0.3 - 6, ry - 5)
          ctx.lineTo(rx * 0.3 - 10, ry - 5)
          ctx.lineTo(rx - 11, 5)
          ctx.closePath()
          ctx.fillStyle = '#ea580c'
          ctx.fill()

          ctx.restore()
        }}
        listening={false}
      />

      {/* Horizontal centre seam */}
      <Shape
        sceneFunc={(ctx) => {
          ctx.beginPath()
          ctx.moveTo(-rx + 1, 0)
          ctx.bezierCurveTo(-rx * 0.5, -3, rx * 0.5, -3, rx - 1, 0)
          ctx.strokeStyle = '#374151'
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(-rx + 1, 0)
          ctx.bezierCurveTo(-rx * 0.5, 3, rx * 0.5, 3, rx - 1, 0)
          ctx.strokeStyle = '#374151'
          ctx.lineWidth = 1
          ctx.stroke()
        }}
        listening={false}
      />

      {/* Lace stitching */}
      {[-8, -4, 0, 4, 8].map((dx) => (
        <Line
          key={dx}
          points={[dx, -3, dx, 3]}
          stroke="#374151"
          strokeWidth={1}
          listening={false}
        />
      ))}
      <Line points={[-10, 0, 10, 0]} stroke="#374151" strokeWidth={0.5} listening={false} />

      {/* Specular highlight in 3D mode */}
      {is3D && (
        <Shape
          sceneFunc={(ctx) => {
            ctx.save()
            ctx.beginPath()
            ctx.moveTo(-rx, 0)
            ctx.bezierCurveTo(-rx * 0.6, -ry, rx * 0.6, -ry, rx, 0)
            ctx.bezierCurveTo(rx * 0.6, ry, -rx * 0.6, ry, -rx, 0)
            ctx.clip()
            ctx.beginPath()
            ctx.ellipse(-rx * 0.3, -ry * 0.45, rx * 0.22, ry * 0.18, -0.4, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(255,255,255,0.45)'
            ctx.fill()
            ctx.restore()
          }}
          listening={false}
        />
      )}
    </Group>
  )
}

// ── Attacker ─────────────────────────────────────────────────────────────────
function AttackerEl({ el, selected, onSelect, onChange, onDblClick, is3D }: ElementProps) {
  const r  = PLAYER_RADIUS[el.size ?? 'md']
  const fs = PLAYER_FONT[el.size ?? 'md']
  const baseColor = el.color ?? '#ef4444'

  return (
    <Group x={el.x} y={el.y} scaleY={is3D ? INV_3D_SCALE_Y : 1} draggable onClick={onSelect} onTap={onSelect}
      onDblClick={onDblClick} onDblTap={onDblClick}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}>
      {/* Drop shadow in 3D mode */}
      {is3D && (
        <Ellipse
          x={3} y={r + 5}
          radiusX={r * 1.1} radiusY={r * 0.28}
          fill="rgba(0,0,0,0.38)"
          listening={false}
        />
      )}
      <Circle
        radius={r}
        fill={is3D ? undefined : baseColor}
        fillRadialGradientStartPoint={is3D ? { x: -r * 0.35, y: -r * 0.38 } : undefined}
        fillRadialGradientStartRadius={is3D ? 0 : undefined}
        fillRadialGradientEndPoint={is3D ? { x: r * 0.1, y: r * 0.1 } : undefined}
        fillRadialGradientEndRadius={is3D ? r * 1.35 : undefined}
        fillRadialGradientColorStops={is3D ? [0, '#ff9090', 0.45, baseColor, 1, '#7f1d1d'] : undefined}
        stroke={selected ? '#fff' : 'rgba(255,255,255,0.4)'}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <Text text={el.label ?? 'A'} x={-r} y={-Math.round(fs / 2)} width={r * 2} align="center"
        fill="#fff" fontSize={fs} fontStyle="bold" listening={false} />
    </Group>
  )
}

// ── Defender ─────────────────────────────────────────────────────────────────
function DefenderEl({ el, selected, onSelect, onChange, onDblClick, is3D }: ElementProps) {
  const r  = PLAYER_RADIUS[el.size ?? 'md']
  const fs = PLAYER_FONT[el.size ?? 'md']
  const baseColor = el.color ?? '#3b82f6'

  return (
    <Group x={el.x} y={el.y} scaleY={is3D ? INV_3D_SCALE_Y : 1} draggable onClick={onSelect} onTap={onSelect}
      onDblClick={onDblClick} onDblTap={onDblClick}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}>
      {is3D && (
        <Ellipse
          x={3} y={r + 5}
          radiusX={r * 1.1} radiusY={r * 0.28}
          fill="rgba(0,0,0,0.38)"
          listening={false}
        />
      )}
      <Circle
        radius={r}
        fill={is3D ? undefined : baseColor}
        fillRadialGradientStartPoint={is3D ? { x: -r * 0.35, y: -r * 0.38 } : undefined}
        fillRadialGradientStartRadius={is3D ? 0 : undefined}
        fillRadialGradientEndPoint={is3D ? { x: r * 0.1, y: r * 0.1 } : undefined}
        fillRadialGradientEndRadius={is3D ? r * 1.35 : undefined}
        fillRadialGradientColorStops={is3D ? [0, '#93c5fd', 0.45, baseColor, 1, '#1e3a8a'] : undefined}
        stroke={selected ? '#fff' : 'rgba(255,255,255,0.4)'}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <Text text={el.label ?? 'D'} x={-r} y={-Math.round(fs / 2)} width={r * 2} align="center"
        fill="#fff" fontSize={fs} fontStyle="bold" listening={false} />
    </Group>
  )
}

// ── Cone ─────────────────────────────────────────────────────────────────────
function ConeEl({ el, selected, onSelect, onChange, is3D }: ElementProps) {
  const size = 16

  if (is3D) {
    return (
      <Group x={el.x} y={el.y} scaleY={INV_3D_SCALE_Y} draggable onClick={onSelect} onTap={onSelect}
        onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}>
        {/* Ground shadow */}
        <Ellipse
          x={2} y={size * 0.72}
          radiusX={size * 1.05} radiusY={size * 0.22}
          fill="rgba(0,0,0,0.35)"
          listening={false}
        />
        {/* Cone body with gradient shading */}
        <Shape
          sceneFunc={(ctx, shape) => {
            ctx.beginPath()
            ctx.moveTo(0, -size * 1.1)
            ctx.lineTo(-size * 0.85, size * 0.45)
            ctx.lineTo(size * 0.85, size * 0.45)
            ctx.closePath()
            ctx.fillStrokeShape(shape)
          }}
          fillLinearGradientStartPoint={{ x: -size, y: 0 }}
          fillLinearGradientEndPoint={{ x: size, y: 0 }}
          fillLinearGradientColorStops={[0, '#78350f', 0.3, '#f59e0b', 0.55, '#fde68a', 1, '#78350f']}
          stroke={selected ? '#fff' : 'rgba(255,255,255,0.3)'}
          strokeWidth={selected ? 2 : 1}
        />
        {/* Base ellipse for 3D depth */}
        <Ellipse
          x={0} y={size * 0.45}
          radiusX={size * 0.85} radiusY={size * 0.27}
          fill="#92400e"
          stroke={selected ? '#fff' : 'transparent'}
          strokeWidth={0.5}
          listening={false}
        />
      </Group>
    )
  }

  return (
    <Group x={el.x} y={el.y} scaleY={1} draggable onClick={onSelect} onTap={onSelect}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}>
      <Line points={[0, -size, size * 0.75, size * 0.5, -size * 0.75, size * 0.5]} closed
        fill={el.color ?? '#f59e0b'}
        stroke={selected ? '#fff' : 'rgba(255,255,255,0.4)'} strokeWidth={selected ? 2 : 1} />
    </Group>
  )
}

// ── Arrow (run) — drag endpoints ──────────────────────────────────────────────
function ArrowEl({ el, selected, onSelect, onChange }: ElementProps) {
  const x1 = el.x1 ?? 0
  const y1 = el.y1 ?? 0
  const x2 = el.x2 ?? x1 + 60
  const y2 = el.y2 ?? y1

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      <Arrow
        points={[x1, y1, x2, y2]}
        fill={el.color ?? '#22c55e'}
        stroke={el.color ?? '#22c55e'}
        strokeWidth={selected ? 3 : 2.5}
        pointerLength={12}
        pointerWidth={9}
        hitStrokeWidth={16}
      />
      {selected && (
        <>
          <Circle
            x={x1} y={y1}
            radius={HANDLE_RADIUS}
            fill={HANDLE_FILL}
            stroke={HANDLE_STROKE}
            strokeWidth={HANDLE_STROKE_WIDTH}
            draggable
            onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
              onChange({ ...el, x1: e.target.x(), y1: e.target.y() })
            }}
          />
          <Circle
            x={x2} y={y2}
            radius={HANDLE_RADIUS}
            fill={HANDLE_FILL}
            stroke={HANDLE_STROKE}
            strokeWidth={HANDLE_STROKE_WIDTH}
            draggable
            onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
              onChange({ ...el, x2: e.target.x(), y2: e.target.y() })
            }}
          />
        </>
      )}
    </Group>
  )
}

// ── Line (solid or dotted) — drag endpoints ────────────────────────────────────
function LineEl({ el, selected, onSelect, onChange }: ElementProps) {
  const x1 = el.x1 ?? 0
  const y1 = el.y1 ?? 0
  const x2 = el.x2 ?? x1 + 60
  const y2 = el.y2 ?? y1
  const isDotted = el.type === 'dotted'

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      <Line
        points={[x1, y1, x2, y2]}
        stroke={el.color ?? '#a3a3a3'}
        strokeWidth={selected ? 3 : 2}
        dash={isDotted ? [4, 6] : undefined}
        hitStrokeWidth={16}
      />
      {selected && (
        <>
          <Circle x={x1} y={y1} radius={HANDLE_RADIUS} fill={HANDLE_FILL}
            stroke={HANDLE_STROKE} strokeWidth={HANDLE_STROKE_WIDTH} draggable
            onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
              onChange({ ...el, x1: e.target.x(), y1: e.target.y() })} />
          <Circle x={x2} y={y2} radius={HANDLE_RADIUS} fill={HANDLE_FILL}
            stroke={HANDLE_STROKE} strokeWidth={HANDLE_STROKE_WIDTH} draggable
            onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
              onChange({ ...el, x2: e.target.x(), y2: e.target.y() })} />
        </>
      )}
    </Group>
  )
}

// ── Kick arc — parabolic trajectory with ball at apex ─────────────────────────
function KickEl({ el, selected, onSelect, onChange }: ElementProps) {
  const x1 = el.x1 ?? 0
  const y1 = el.y1 ?? 0
  const x2 = el.x2 ?? x1 + 80
  const y2 = el.y2 ?? y1
  const color = el.color ?? '#fbbf24'

  const cpx = (x1 + x2) / 2
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  const arcLift = Math.max(45, dist * 0.46)
  const cpy = (y1 + y2) / 2 - arcLift

  // Tangent direction at landing for arrowhead angle
  const angle = Math.atan2(y2 - cpy, x2 - cpx)
  const arrowLen = 13

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      {/* Dashed arc trajectory — strokeShape handles Konva hit testing */}
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.quadraticCurveTo(cpx, cpy, x2, y2)
          ctx.strokeShape(shape)
          ctx.restore()

          // Filled arrowhead at landing (solid, no dash)
          ctx.beginPath()
          ctx.moveTo(x2, y2)
          ctx.lineTo(
            x2 - arrowLen * Math.cos(angle - Math.PI / 6),
            y2 - arrowLen * Math.sin(angle - Math.PI / 6),
          )
          ctx.lineTo(
            x2 - arrowLen * Math.cos(angle + Math.PI / 6),
            y2 - arrowLen * Math.sin(angle + Math.PI / 6),
          )
          ctx.closePath()
          ctx.fillStyle = color
          ctx.fill()

          // Mini rugby ball at apex
          ctx.save()
          ctx.translate(cpx, cpy)
          ctx.beginPath()
          ctx.moveTo(-10, 0)
          ctx.bezierCurveTo(-6, -6.5, 6, -6.5, 10, 0)
          ctx.bezierCurveTo(6, 6.5, -6, 6.5, -10, 0)
          ctx.closePath()
          ctx.fillStyle = '#f5f5f0'
          ctx.fill()
          ctx.setLineDash([])
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.stroke()
          // Centre seam
          ctx.beginPath()
          ctx.moveTo(-9, 0)
          ctx.bezierCurveTo(-4.5, -2.5, 4.5, -2.5, 9, 0)
          ctx.moveTo(-9, 0)
          ctx.bezierCurveTo(-4.5, 2.5, 4.5, 2.5, 9, 0)
          ctx.strokeStyle = '#6b7280'
          ctx.lineWidth = 0.8
          ctx.stroke()
          ctx.restore()
        }}
        stroke={color}
        strokeWidth={selected ? 3 : 2.5}
        dash={[7, 4]}
        hitStrokeWidth={20}
      />

      {selected && (
        <>
          <Circle x={x1} y={y1} radius={HANDLE_RADIUS} fill={HANDLE_FILL}
            stroke={HANDLE_STROKE} strokeWidth={HANDLE_STROKE_WIDTH} draggable
            onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
              onChange({ ...el, x1: e.target.x(), y1: e.target.y() })} />
          <Circle x={x2} y={y2} radius={HANDLE_RADIUS} fill={HANDLE_FILL}
            stroke={HANDLE_STROKE} strokeWidth={HANDLE_STROKE_WIDTH} draggable
            onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
              onChange({ ...el, x2: e.target.x(), y2: e.target.y() })} />
        </>
      )}
    </Group>
  )
}

// ── Zone — corner resize handles ───────────────────────────────────────────────
function ZoneEl({ el, selected, onSelect, onChange }: ElementProps) {
  const x = el.x
  const y = el.y
  const w = el.width ?? 120
  const h = el.height ?? 80

  function resizeCorner(cornerX: number, cornerY: number, corner: 'nw' | 'ne' | 'sw' | 'se') {
    const origRight = x + w
    const origBottom = y + h
    switch (corner) {
      case 'nw': return onChange({ ...el, x: cornerX, y: cornerY, width: Math.max(20, origRight - cornerX), height: Math.max(20, origBottom - cornerY) })
      case 'ne': return onChange({ ...el, y: cornerY, width: Math.max(20, cornerX - x), height: Math.max(20, origBottom - cornerY) })
      case 'sw': return onChange({ ...el, x: cornerX, width: Math.max(20, origRight - cornerX), height: Math.max(20, cornerY - y) })
      case 'se': return onChange({ ...el, width: Math.max(20, cornerX - x), height: Math.max(20, cornerY - y) })
    }
  }

  return (
    <Group>
      <Rect
        x={x} y={y} width={w} height={h}
        fill={el.color ?? 'rgba(239,68,68,0.15)'}
        stroke={selected ? '#fff' : '#ef4444'}
        strokeWidth={selected ? 2 : 1.5}
        dash={[8, 4]}
        draggable
        onClick={onSelect} onTap={onSelect}
        onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
      />
      {selected && (
        <>
          {[
            { cx: x,     cy: y,     corner: 'nw' as const },
            { cx: x + w, cy: y,     corner: 'ne' as const },
            { cx: x,     cy: y + h, corner: 'sw' as const },
            { cx: x + w, cy: y + h, corner: 'se' as const },
          ].map(({ cx, cy, corner }) => (
            <Circle
              key={corner}
              x={cx} y={cy}
              radius={HANDLE_RADIUS}
              fill={HANDLE_FILL}
              stroke={HANDLE_STROKE}
              strokeWidth={HANDLE_STROKE_WIDTH}
              draggable
              onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
                resizeCorner(e.target.x(), e.target.y(), corner)}
            />
          ))}
        </>
      )}
    </Group>
  )
}

// ── Text label ────────────────────────────────────────────────────────────────
function TextEl({ el, selected, onSelect, onChange, onDblClick, is3D }: ElementProps) {
  return (
    <Group
      x={el.x} y={el.y}
      scaleY={is3D ? INV_3D_SCALE_Y : 1}
      draggable
      onClick={onSelect} onTap={onSelect}
      onDblClick={onDblClick} onDblTap={onDblClick}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
    >
      <Text
        x={0} y={0}
        text={el.label ?? 'Label'}
        fill={el.color ?? '#fff'}
        fontSize={15}
        fontStyle="bold"
        stroke={selected ? 'rgba(255,255,255,0.4)' : undefined}
        strokeWidth={selected ? 4 : undefined}
      />
    </Group>
  )
}

// ── Orchestrator ──────────────────────────────────────────────────────────────
interface ElementProps {
  el: CanvasElement
  selected: boolean
  onSelect: () => void
  onChange: (updated: CanvasElement) => void
  onDblClick?: () => void
  is3D?: boolean
}

interface CanvasElementsProps {
  elements: CanvasElement[]
  selectedId: string | null
  editingTextId: string | null
  onSelect: (id: string) => void
  onChange: (updated: CanvasElement) => void
  onEditText: (id: string) => void
  is3D?: boolean
}

export function CanvasElements({ elements, selectedId, editingTextId: _editingTextId, onSelect, onChange, onEditText, is3D }: CanvasElementsProps) {
  return (
    <>
      {elements.map((el) => {
        const props: ElementProps = {
          el,
          selected: el.id === selectedId,
          onSelect: () => onSelect(el.id),
          onChange,
          is3D,
          onDblClick: (el.type === 'text' || el.type === 'attacker' || el.type === 'defender')
          ? () => onEditText(el.id)
          : undefined,
        }
        switch (el.type) {
          case 'attacker': return <AttackerEl key={el.id} {...props} />
          case 'defender': return <DefenderEl key={el.id} {...props} />
          case 'cone':     return <ConeEl key={el.id} {...props} />
          case 'ball':     return <RugbyBall key={el.id} {...props} />
          case 'arrow':    return <ArrowEl key={el.id} {...props} />
          case 'line':     return <LineEl key={el.id} {...props} />
          case 'dotted':   return <LineEl key={el.id} {...props} />
          case 'kick':     return <KickEl key={el.id} {...props} />
          case 'zone':     return <ZoneEl key={el.id} {...props} />
          case 'text':     return <TextEl key={el.id} {...props} />
          default:         return null
        }
      })}
    </>
  )
}
