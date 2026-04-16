'use client'

import { useState, useCallback } from 'react'
import { Stage, Layer, Line, Arrow, Circle } from 'react-konva'
import type Konva from 'konva'
import { nanoid } from 'nanoid'
import type {
  Annotation,
  AnnotationTool,
  PencilAnnotation,
  ArrowAnnotation,
  CircleAnnotation,
} from './types'

interface Props {
  width: number
  height: number
  activeTool: AnnotationTool | null
  activeColor: string
  annotations: Annotation[]
  onChange: (annotations: Annotation[]) => void
}

interface DrawingArrow {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface DrawingCircle {
  cx: number
  cy: number
  radius: number
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
}: Props) {
  // Pencil state
  const [pencilPoints, setPencilPoints] = useState<number[]>([])
  // Arrow state
  const [drawingArrow, setDrawingArrow] = useState<DrawingArrow | null>(null)
  // Circle state
  const [drawingCircle, setDrawingCircle] = useState<DrawingCircle | null>(null)

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!activeTool) return
      const pos = getPos(e)
      if (!pos) return

      if (activeTool === 'pencil') {
        setPencilPoints([pos.x, pos.y])
      } else if (activeTool === 'arrow') {
        setDrawingArrow({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
      } else if (activeTool === 'circle') {
        setDrawingCircle({ cx: pos.x, cy: pos.y, radius: 0 })
      }
    },
    [activeTool]
  )

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPos(e)
      if (!pos) return

      if (activeTool === 'pencil' && pencilPoints.length > 0) {
        setPencilPoints((prev) => [...prev, pos.x, pos.y])
      } else if (activeTool === 'arrow' && drawingArrow) {
        setDrawingArrow((d) => d ? { ...d, x2: pos.x, y2: pos.y } : null)
      } else if (activeTool === 'circle' && drawingCircle) {
        setDrawingCircle((d) =>
          d ? { ...d, radius: dist(d.cx, d.cy, pos.x, pos.y) } : null
        )
      }
    },
    [activeTool, pencilPoints, drawingArrow, drawingCircle]
  )

  const handleMouseUp = useCallback(() => {
    if (activeTool === 'pencil' && pencilPoints.length >= 4) {
      const annotation: PencilAnnotation = {
        id: nanoid(),
        type: 'pencil',
        points: pencilPoints,
        color: activeColor,
        strokeWidth: 3,
      }
      onChange([...annotations, annotation])
    } else if (activeTool === 'arrow' && drawingArrow) {
      if (dist(drawingArrow.x1, drawingArrow.y1, drawingArrow.x2, drawingArrow.y2) > 10) {
        const annotation: ArrowAnnotation = {
          id: nanoid(),
          type: 'arrow',
          x1: drawingArrow.x1,
          y1: drawingArrow.y1,
          x2: drawingArrow.x2,
          y2: drawingArrow.y2,
          color: activeColor,
        }
        onChange([...annotations, annotation])
      }
    } else if (activeTool === 'circle' && drawingCircle) {
      if (drawingCircle.radius > 8) {
        const annotation: CircleAnnotation = {
          id: nanoid(),
          type: 'circle',
          cx: drawingCircle.cx,
          cy: drawingCircle.cy,
          radius: drawingCircle.radius,
          color: activeColor,
        }
        onChange([...annotations, annotation])
      }
    }

    setPencilPoints([])
    setDrawingArrow(null)
    setDrawingCircle(null)
  }, [activeTool, pencilPoints, drawingArrow, drawingCircle, activeColor, annotations, onChange])

  if (width === 0 || height === 0) return null

  return (
    <Stage
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        // Pass pointer events through when no tool is active
        pointerEvents: activeTool ? 'all' : 'none',
        cursor: activeTool ? 'crosshair' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {/* Committed annotations */}
        {annotations.map((a) => {
          if (a.type === 'pencil') {
            return (
              <Line
                key={a.id}
                points={a.points}
                stroke={a.color}
                strokeWidth={a.strokeWidth}
                tension={0.4}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            )
          }
          if (a.type === 'arrow') {
            return (
              <Arrow
                key={a.id}
                points={[a.x1, a.y1, a.x2, a.y2]}
                stroke={a.color}
                fill={a.color}
                strokeWidth={3}
                pointerLength={12}
                pointerWidth={10}
                listening={false}
              />
            )
          }
          if (a.type === 'circle') {
            return (
              <Circle
                key={a.id}
                x={a.cx}
                y={a.cy}
                radius={a.radius}
                stroke={a.color}
                strokeWidth={3}
                fill="transparent"
                listening={false}
              />
            )
          }
          return null
        })}

        {/* Live pencil preview */}
        {pencilPoints.length >= 4 && (
          <Line
            points={pencilPoints}
            stroke={activeColor}
            strokeWidth={3}
            tension={0.4}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        )}

        {/* Live arrow preview */}
        {drawingArrow && (
          <Arrow
            points={[drawingArrow.x1, drawingArrow.y1, drawingArrow.x2, drawingArrow.y2]}
            stroke={activeColor}
            fill={activeColor}
            strokeWidth={3}
            pointerLength={12}
            pointerWidth={10}
            listening={false}
          />
        )}

        {/* Live circle preview */}
        {drawingCircle && drawingCircle.radius > 0 && (
          <Circle
            x={drawingCircle.cx}
            y={drawingCircle.cy}
            radius={drawingCircle.radius}
            stroke={activeColor}
            strokeWidth={3}
            fill="transparent"
            listening={false}
          />
        )}
      </Layer>
    </Stage>
  )
}
