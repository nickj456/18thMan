'use client'

import { useState, useCallback, useRef } from 'react'
import { Stage, Layer, Line, Arrow, Circle, Rect, Text, Group } from 'react-konva'
import type Konva from 'konva'
import { nanoid } from 'nanoid'
import type {
  Annotation,
  AnnotationTool,
  PencilAnnotation,
  ArrowAnnotation,
  CircleAnnotation,
  RectangleAnnotation,
  LineAnnotation,
  TextAnnotation,
  SpotlightAnnotation,
  CrossAnnotation,
} from './types'

interface Props {
  width: number
  height: number
  activeTool: AnnotationTool | null
  activeColor: string
  annotations: Annotation[]
  onChange: (annotations: Annotation[]) => void
  // Text input overlay: called when user clicks with text tool
  onTextPlace: (x: number, y: number, color: string) => void
}

interface DragState {
  x1: number
  y1: number
  x2: number
  y2: number
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function getPos(e: Konva.KonvaEventObject<MouseEvent>) {
  return e.target.getStage()?.getPointerPosition() ?? null
}

export function VideoAnnotationCanvas({
  width,
  height,
  activeTool,
  activeColor,
  annotations,
  onChange,
  onTextPlace,
}: Props) {
  const [pencilPoints, setPencilPoints] = useState<number[]>([])
  const [drag, setDrag] = useState<DragState | null>(null)
  const isDrawing = useRef(false)

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!activeTool) return
      const pos = getPos(e)
      if (!pos) return

      if (activeTool === 'text') {
        onTextPlace(pos.x, pos.y, activeColor)
        return
      }

      if (activeTool === 'pencil') {
        isDrawing.current = true
        setPencilPoints([pos.x, pos.y])
        return
      }

      isDrawing.current = true
      setDrag({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
    },
    [activeTool, activeColor, onTextPlace]
  )

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing.current) return
      const pos = getPos(e)
      if (!pos) return

      if (activeTool === 'pencil') {
        setPencilPoints((prev) => [...prev, pos.x, pos.y])
      } else {
        setDrag((d) => d ? { ...d, x2: pos.x, y2: pos.y } : null)
      }
    },
    [activeTool]
  )

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return
    isDrawing.current = false

    if (activeTool === 'pencil') {
      if (pencilPoints.length >= 4) {
        const annotation: PencilAnnotation = {
          id: nanoid(), type: 'pencil',
          points: pencilPoints, color: activeColor, strokeWidth: 3,
        }
        onChange([...annotations, annotation])
      }
      setPencilPoints([])
      return
    }

    if (!drag) return
    const { x1, y1, x2, y2 } = drag

    if (activeTool === 'arrow' && dist(x1, y1, x2, y2) > 10) {
      const annotation: ArrowAnnotation = { id: nanoid(), type: 'arrow', x1, y1, x2, y2, color: activeColor }
      onChange([...annotations, annotation])
    } else if (activeTool === 'line' && dist(x1, y1, x2, y2) > 10) {
      const annotation: LineAnnotation = { id: nanoid(), type: 'line', x1, y1, x2, y2, color: activeColor }
      onChange([...annotations, annotation])
    } else if (activeTool === 'circle') {
      const radius = dist(x1, y1, x2, y2)
      if (radius > 8) {
        const annotation: CircleAnnotation = { id: nanoid(), type: 'circle', cx: x1, cy: y1, radius, color: activeColor }
        onChange([...annotations, annotation])
      }
    } else if (activeTool === 'spotlight') {
      const radius = dist(x1, y1, x2, y2)
      if (radius > 8) {
        const annotation: SpotlightAnnotation = { id: nanoid(), type: 'spotlight', cx: x1, cy: y1, radius, color: activeColor }
        onChange([...annotations, annotation])
      }
    } else if (activeTool === 'rectangle') {
      const w = x2 - x1
      const h = y2 - y1
      if (Math.abs(w) > 8 && Math.abs(h) > 8) {
        const annotation: RectangleAnnotation = {
          id: nanoid(), type: 'rectangle',
          x: Math.min(x1, x2), y: Math.min(y1, y2),
          width: Math.abs(w), height: Math.abs(h),
          color: activeColor,
        }
        onChange([...annotations, annotation])
      }
    } else if (activeTool === 'cross') {
      const size = Math.max(dist(x1, y1, x2, y2), 10)
      const annotation: CrossAnnotation = { id: nanoid(), type: 'cross', cx: x1, cy: y1, size, color: activeColor }
      onChange([...annotations, annotation])
    }

    setDrag(null)
  }, [activeTool, pencilPoints, drag, activeColor, annotations, onChange])

  if (width === 0 || height === 0) return null

  // Live preview shape during drag
  const preview = drag ? renderPreview(activeTool, drag, activeColor) : null

  return (
    <Stage
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: activeTool && activeTool !== 'text' ? 'all' : activeTool === 'text' ? 'all' : 'none',
        cursor: activeTool ? 'crosshair' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {annotations.map((a) => renderAnnotation(a))}

        {/* Live pencil preview */}
        {pencilPoints.length >= 4 && (
          <Line points={pencilPoints} stroke={activeColor} strokeWidth={3}
            tension={0.4} lineCap="round" lineJoin="round" listening={false} />
        )}

        {preview}
      </Layer>
    </Stage>
  )
}

function renderAnnotation(a: Annotation) {
  switch (a.type) {
    case 'pencil':
      return <Line key={a.id} points={a.points} stroke={a.color} strokeWidth={a.strokeWidth}
        tension={0.4} lineCap="round" lineJoin="round" listening={false} />

    case 'arrow':
      return <Arrow key={a.id} points={[a.x1, a.y1, a.x2, a.y2]} stroke={a.color} fill={a.color}
        strokeWidth={3} pointerLength={12} pointerWidth={10} listening={false} />

    case 'line':
      return <Line key={a.id} points={[a.x1, a.y1, a.x2, a.y2]} stroke={a.color}
        strokeWidth={3} lineCap="round" listening={false} />

    case 'circle':
      return <Circle key={a.id} x={a.cx} y={a.cy} radius={a.radius} stroke={a.color}
        strokeWidth={3} fill="transparent" listening={false} />

    case 'rectangle':
      return <Rect key={a.id} x={a.x} y={a.y} width={a.width} height={a.height}
        stroke={a.color} strokeWidth={3} fill="transparent" listening={false} />

    case 'text':
      return (
        <Text key={a.id} x={a.x} y={a.y} text={a.text} fill={a.color}
          fontSize={a.fontSize} fontStyle="bold" fontFamily="sans-serif"
          shadowColor="black" shadowBlur={4} shadowOpacity={0.8} listening={false} />
      )

    case 'spotlight':
      return (
        <Circle key={a.id} x={a.cx} y={a.cy} radius={a.radius}
          fill={a.color} opacity={0.25} stroke={a.color} strokeWidth={2} listening={false} />
      )

    case 'cross': {
      const { cx, cy, size, color, id } = a
      const half = size / 2
      return (
        <Group key={id} listening={false}>
          <Line points={[cx - half, cy - half, cx + half, cy + half]} stroke={color} strokeWidth={4} lineCap="round" />
          <Line points={[cx + half, cy - half, cx - half, cy + half]} stroke={color} strokeWidth={4} lineCap="round" />
        </Group>
      )
    }

    default:
      return null
  }
}

function renderPreview(tool: AnnotationTool | null, drag: DragState, color: string) {
  if (!tool) return null
  const { x1, y1, x2, y2 } = drag

  switch (tool) {
    case 'arrow':
      return <Arrow points={[x1, y1, x2, y2]} stroke={color} fill={color}
        strokeWidth={3} pointerLength={12} pointerWidth={10} listening={false} />

    case 'line':
      return <Line points={[x1, y1, x2, y2]} stroke={color}
        strokeWidth={3} lineCap="round" listening={false} />

    case 'circle': {
      const r = dist(x1, y1, x2, y2)
      return <Circle x={x1} y={y1} radius={r} stroke={color} strokeWidth={3} fill="transparent" listening={false} />
    }

    case 'spotlight': {
      const r = dist(x1, y1, x2, y2)
      return <Circle x={x1} y={y1} radius={r} fill={color} opacity={0.25} stroke={color} strokeWidth={2} listening={false} />
    }

    case 'rectangle': {
      const w = x2 - x1
      const h = y2 - y1
      return <Rect x={Math.min(x1, x2)} y={Math.min(y1, y2)}
        width={Math.abs(w)} height={Math.abs(h)}
        stroke={color} strokeWidth={3} fill="transparent" listening={false} />
    }

    case 'cross': {
      const size = Math.max(dist(x1, y1, x2, y2), 10)
      const half = size / 2
      return (
        <Group listening={false}>
          <Line points={[x1 - half, y1 - half, x1 + half, y1 + half]} stroke={color} strokeWidth={4} lineCap="round" />
          <Line points={[x1 + half, y1 - half, x1 - half, y1 + half]} stroke={color} strokeWidth={4} lineCap="round" />
        </Group>
      )
    }

    default:
      return null
  }
}
