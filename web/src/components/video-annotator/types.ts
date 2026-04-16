export type AnnotationTool = 'pencil' | 'arrow' | 'circle'

export interface PencilAnnotation {
  id: string
  type: 'pencil'
  points: number[] // flat [x0,y0,x1,y1,...] in video pixel coords
  color: string
  strokeWidth: number
}

export interface ArrowAnnotation {
  id: string
  type: 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

export interface CircleAnnotation {
  id: string
  type: 'circle'
  cx: number
  cy: number
  radius: number
  color: string
}

export type Annotation = PencilAnnotation | ArrowAnnotation | CircleAnnotation

export const ANNOTATION_COLORS = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'White', value: '#ffffff' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Green', value: '#22c55e' },
] as const
